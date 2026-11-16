"""Decision core. The same TradingSession.on_close() runs in backtest, paper and live."""
from __future__ import annotations

import json
import logging
import math
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Optional

import pandas as pd

from .config import Config
from .models import AccountState, CloseIntent, Instrument, Intent, OpenIntent, StopIntent
from .strategies import build_strategies

log = logging.getLogger(__name__)

COOLDOWN_BARS = 5  # bars to wait before re-entering a symbol after a stop-out


@dataclass
class SessionState:
    peak_equity: float = 0.0
    prev_equity: float = 0.0
    halted: bool = False
    halt_reason: str = ""
    last_date: Optional[str] = None
    entry_dates: dict[str, str] = field(default_factory=dict)
    stopped_dates: dict[str, str] = field(default_factory=dict)

    def save(self, path: str | Path, extra: dict | None = None) -> None:
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_suffix(".tmp")
        tmp.write_text(json.dumps({"session": asdict(self), **(extra or {})}, indent=2))
        tmp.replace(path)

    @staticmethod
    def load(path: str | Path) -> tuple["SessionState", dict]:
        path = Path(path)
        if not path.exists():
            return SessionState(), {}
        raw = json.loads(path.read_text())
        return SessionState(**raw.pop("session", {})), raw


def round_qty(qty: float, step: float) -> float:
    return round(math.floor(qty / step + 1e-9) * step, 8)


class TradingSession:
    def __init__(self, config: Config, state: SessionState | None = None):
        self.cfg = config
        self.risk = config.risk
        self.instruments: dict[str, Instrument] = config.instrument_map()
        self.strategies = build_strategies(config.strategies)
        self.state = state or SessionState()
        self.frames: dict[str, pd.DataFrame] = {}
        self.ind: dict[str, pd.DataFrame] = {}

    def prepare(self, frames: dict[str, pd.DataFrame]) -> None:
        self.frames = frames
        self.ind = {
            sym: self.strategies[self.instruments[sym].strategy].prepare(df)
            for sym, df in frames.items()
            if sym in self.instruments
        }

    # -- risk state ---------------------------------------------------------
    def _update_risk(self, equity: float) -> bool:
        """Update peak/halt state. Returns True if new entries are allowed on this bar."""
        s = self.state
        s.peak_equity = max(s.peak_equity, equity)
        if not s.halted and equity <= s.peak_equity * (1 - self.risk.max_drawdown):
            s.halted = True
            s.halt_reason = (
                f"Drawdown {1 - equity / s.peak_equity:.1%} >= Limit {self.risk.max_drawdown:.0%}"
            )
            log.error("NOT-AUS: %s", s.halt_reason)
        entries_ok = True
        if s.prev_equity > 0 and equity / s.prev_equity - 1 <= -self.risk.daily_loss_limit:
            entries_ok = False
            log.warning("Tagesverlust-Limit erreicht, keine neuen Positionen")
        s.prev_equity = equity
        return entries_ok and not s.halted

    def reset_halt(self, equity: float | None = None) -> None:
        s = self.state
        s.halted, s.halt_reason = False, ""
        if equity is not None:
            s.peak_equity = equity  # drawdown is measured from here again

    def _bars_between(self, sym: str, since: str, date: pd.Timestamp) -> int:
        idx = self.frames[sym].index
        return int(((idx > pd.Timestamp(since)) & (idx <= date)).sum())

    # -- decision -----------------------------------------------------------
    def on_close(self, date: pd.Timestamp, account: AccountState) -> list[Intent]:
        s = self.state
        entries_ok = self._update_risk(account.equity)
        s.last_date = str(date.date())

        # Positions that vanished without our Close were stopped out by the broker.
        for sym in list(s.entry_dates):
            if sym not in account.positions:
                del s.entry_dates[sym]
                s.stopped_dates[sym] = s.last_date

        if s.halted:
            s.entry_dates.clear()
            return [CloseIntent(sym, "not_aus") for sym in account.positions]

        closes: list[Intent] = []
        stops: list[Intent] = []
        wanted: list[tuple[Instrument, int, float, float]] = []  # inst, dir, price, stop_dist

        for sym, inst in self.instruments.items():
            ind = self.ind.get(sym)
            if ind is None or date not in ind.index:
                continue
            pos = account.positions.get(sym)
            direction = pos.direction if pos else 0
            held = self._bars_between(sym, s.entry_dates[sym], date) if sym in s.entry_dates else 0
            sig = self.strategies[inst.strategy].decide(ind.loc[date], direction, held)
            if sig is None:
                continue
            price = float(self.frames[sym].at[date, "close"])
            target = sig.target
            if target == -1 and not inst.allow_short:
                target = 0

            if pos and target is not None and target != direction:
                closes.append(CloseIntent(sym, "signal"))
                s.entry_dates.pop(sym, None)
                pos = None
            if pos:
                new_stop = price - direction * sig.stop_distance
                tighter = pos.stop_price is None or (
                    sig.trail and (new_stop - pos.stop_price) * direction > 0
                )
                if tighter:
                    stops.append(StopIntent(sym, new_stop))
            elif target:
                wanted.append((inst, target, price, sig.stop_distance))

        opens = self._size_entries(wanted, account, closes, date) if entries_ok else []
        return closes + stops + opens

    def _size_entries(self, wanted, account: AccountState, closes, date) -> list[Intent]:
        r, s = self.risk, self.state
        equity = account.equity
        closing = {c.symbol for c in closes}
        kept = [p for sym, p in account.positions.items() if sym not in closing]
        exposure = sum(p.notional for p in kept)
        margin = sum(p.notional * self._margin_rate(p.symbol) for p in kept)
        count = len(kept)
        opens: list[Intent] = []

        for inst, direction, price, stop_dist in wanted:
            sym = inst.symbol
            if sym in s.stopped_dates:
                if self._bars_between(sym, s.stopped_dates[sym], date) < COOLDOWN_BARS:
                    continue
                del s.stopped_dates[sym]
            if count >= r.max_positions or equity <= 0:
                break
            caps = [
                equity * r.risk_per_trade / stop_dist,
                equity * inst.max_position_pct / price,
                (equity * r.max_gross_leverage - exposure) / price,
                (equity * r.max_margin_usage - margin) / (price * inst.margin_rate),
            ]
            qty = round_qty(min(caps), inst.qty_step)
            if qty <= 0:
                continue
            opens.append(OpenIntent(sym, direction * qty, price - direction * stop_dist, "signal"))
            s.entry_dates[sym] = s.last_date
            exposure += qty * price
            margin += qty * price * inst.margin_rate
            count += 1
        return opens

    def _margin_rate(self, symbol: str) -> float:
        inst = self.instruments.get(symbol)
        return inst.margin_rate if inst else 1.0
