"""Simulated broker for backtests and forward paper trading.

Accounting is margin based for every instrument: equity = balance + unrealised P&L.
A stock simply has margin_rate 1.0, so it is fully paid.
Fill model: intents submitted after bar t fill at the open of bar t+1, half a spread
against us. Stops fill at the stop price, or at the open if the bar gaps through it.
"""
from __future__ import annotations

import logging
from dataclasses import asdict

import pandas as pd

from ..config import CostConfig
from ..models import (
    AccountState, CloseIntent, Instrument, Intent, OpenIntent, Position, StopIntent, Trade,
)

log = logging.getLogger(__name__)


class PaperBroker:
    def __init__(self, instruments: dict[str, Instrument], costs: CostConfig, capital: float):
        self.instruments = instruments
        self.costs = costs
        self.balance = capital
        self.positions: dict[str, Position] = {}
        self.meta: dict[str, dict] = {}  # per open position: entry_date, costs
        self.pending: list[Intent] = []
        self.trades: list[Trade] = []
        self.total_commission = 0.0
        self.total_financing = 0.0
        self.last_date: pd.Timestamp | None = None

    # -- Broker interface ---------------------------------------------------
    def account(self) -> AccountState:
        equity = self.balance + sum(p.unrealized_pnl for p in self.positions.values())
        margin = sum(p.notional * self.instruments[s].margin_rate for s, p in self.positions.items())
        return AccountState(equity, self.balance, margin, dict(self.positions))

    def submit(self, intents: list[Intent]) -> None:
        self.pending.extend(intents)

    # -- simulation ---------------------------------------------------------
    def process_bar(self, date: pd.Timestamp, bars: dict[str, dict]) -> None:
        """bars: symbol -> {"open","high","low","close"} for symbols that traded on `date`."""
        self._charge_financing(date)
        held_before = set(self.positions)

        still_pending = []
        for intent in self.pending:
            bar = bars.get(intent.symbol)
            if bar is None:
                still_pending.append(intent)
            elif isinstance(intent, CloseIntent):
                if intent.symbol in self.positions:
                    self._close(intent.symbol, bar["open"], date, intent.reason)
            elif isinstance(intent, StopIntent):
                if intent.symbol in self.positions:
                    self.positions[intent.symbol].stop_price = intent.stop_price
            elif isinstance(intent, OpenIntent):
                self._open(intent, bar["open"], date)
        self.pending = still_pending

        for sym in list(self.positions):
            pos, bar = self.positions[sym], bars.get(sym)
            if bar is None or pos.stop_price is None:
                continue
            d = pos.direction
            gapped = sym in held_before and (bar["open"] - pos.stop_price) * d <= 0
            extreme = bar["low"] if d > 0 else bar["high"]
            if gapped:
                self._close(sym, bar["open"], date, "stop_gap")
            elif (extreme - pos.stop_price) * d <= 0:
                self._close(sym, pos.stop_price, date, "stop")

        for sym, pos in self.positions.items():
            if sym in bars:
                pos.last_price = bars[sym]["close"]

        acct = self.account()
        if acct.margin_used > 0 and acct.equity < self.costs.margin_closeout_level * acct.margin_used:
            log.error("%s Margin-Zwangsschließung", date.date())
            for sym in list(self.positions):
                self._close(sym, self.positions[sym].mark, date, "margin_closeout")
        self.last_date = date

    def _charge_financing(self, date: pd.Timestamp) -> None:
        if self.last_date is None:
            return
        nights = (date - self.last_date).days
        for sym, pos in self.positions.items():
            if not self.instruments[sym].is_cfd:
                continue
            rate = self.costs.cfd_financing_long if pos.qty > 0 else self.costs.cfd_financing_short
            cost = pos.notional * rate * nights / 360
            self.balance -= cost
            self.total_financing += cost
            self.meta[sym]["costs"] += cost

    def _commission(self, inst: Instrument, notional: float) -> float:
        c = self.costs
        bps, minimum = (
            (c.cfd_commission_bps, c.cfd_commission_min)
            if inst.is_cfd
            else (c.stock_commission_bps, c.stock_commission_min)
        )
        fee = max(minimum, notional * bps / 1e4)
        self.balance -= fee
        self.total_commission += fee
        return fee

    def _fill_price(self, inst: Instrument, price: float, side: int) -> float:
        """side +1 = we buy (pay the ask), -1 = we sell (hit the bid)."""
        return price * (1 + side * inst.spread_bps / 2e4)

    def _open(self, intent: OpenIntent, open_price: float, date: pd.Timestamp) -> None:
        sym, inst = intent.symbol, self.instruments[intent.symbol]
        if sym in self.positions:
            log.warning("%s %s: Position existiert bereits, Order verworfen", date.date(), sym)
            return
        side = 1 if intent.qty > 0 else -1
        price = self._fill_price(inst, open_price, side)
        if (price - intent.stop_price) * side <= 0:
            log.info("%s %s: Eröffnung jenseits des Stops, Einstieg verworfen", date.date(), sym)
            return
        acct = self.account()
        need = abs(intent.qty) * price * inst.margin_rate
        if need > acct.equity - acct.margin_used:
            log.warning("%s %s: zu wenig freie Margin, Order abgelehnt", date.date(), sym)
            return
        self.positions[sym] = Position(sym, intent.qty, price, intent.stop_price, price)
        fee = self._commission(inst, abs(intent.qty) * price)
        self.meta[sym] = {"entry_date": str(date.date()), "costs": fee}

    def _close(self, sym: str, ref_price: float, date: pd.Timestamp, reason: str) -> None:
        pos, inst = self.positions.pop(sym), self.instruments[sym]
        meta = self.meta.pop(sym)
        price = self._fill_price(inst, ref_price, -pos.direction)
        gross = pos.qty * (price - pos.avg_price)
        self.balance += gross
        costs = meta["costs"] + self._commission(inst, abs(pos.qty) * price)
        self.trades.append(
            Trade(sym, pos.qty, meta["entry_date"], str(date.date()), pos.avg_price, price,
                  gross - costs, costs, reason)
        )

    # -- persistence (forward paper trading) --------------------------------
    def to_dict(self) -> dict:
        return {
            "balance": self.balance,
            "positions": {s: asdict(p) for s, p in self.positions.items()},
            "meta": self.meta,
            "pending": [{"kind": type(i).__name__, **asdict(i)} for i in self.pending],
            "trades": [asdict(t) for t in self.trades],
            "total_commission": self.total_commission,
            "total_financing": self.total_financing,
            "last_date": str(self.last_date.date()) if self.last_date is not None else None,
        }

    def restore(self, raw: dict) -> None:
        kinds = {"OpenIntent": OpenIntent, "CloseIntent": CloseIntent, "StopIntent": StopIntent}
        self.balance = raw["balance"]
        self.positions = {s: Position(**p) for s, p in raw["positions"].items()}
        self.meta = raw["meta"]
        self.pending = [kinds[i.pop("kind")](**i) for i in raw["pending"]]
        self.trades = [Trade(**t) for t in raw["trades"]]
        self.total_commission = raw["total_commission"]
        self.total_financing = raw["total_financing"]
        self.last_date = pd.Timestamp(raw["last_date"]) if raw["last_date"] else None
