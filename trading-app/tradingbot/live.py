"""Forward trading: one call processes all newly completed daily bars, then exits.

Schedule it once per trading day (cron / Task Scheduler), ideally before the markets open.
"""
from __future__ import annotations

import logging

import pandas as pd

from .backtest import step_dates
from .brokers.paper import PaperBroker
from .config import Config
from .data import load_frames
from .engine import SessionState, TradingSession

log = logging.getLogger(__name__)


def _completed(frames: dict[str, pd.DataFrame], include_today: bool) -> dict[str, pd.DataFrame]:
    """Drop today's bar unless told otherwise: during the session it is still unfinished."""
    if include_today:
        return frames
    today = pd.Timestamp.now().normalize()
    return {s: df[df.index < today] for s, df in frames.items()}


def run_paper(cfg: Config, include_today: bool = False) -> dict:
    frames = _completed(load_frames(cfg), include_today)
    state, extra = SessionState.load(cfg.state_file)
    session = TradingSession(cfg, state)
    session.prepare(frames)
    broker = PaperBroker(session.instruments, cfg.costs, cfg.initial_capital)
    if "broker" in extra:
        broker.restore(extra["broker"])

    all_dates = sorted(set().union(*(df.index for df in frames.values())))
    if broker.last_date is None:
        dates = all_dates[-1:]  # first run: start at the latest bar, do not replay history
    else:
        dates = [d for d in all_dates if d > broker.last_date]
    equity = step_dates(session, broker, dates)

    history = extra.get("equity", []) + [[str(d.date()), float(v)] for d, v in equity.items()]
    state.save(cfg.state_file, {"mode": "paper", "broker": broker.to_dict(), "equity": history})
    for intent in broker.pending:
        log.info("Für nächste Eröffnung vorgemerkt: %s", intent)
    return {"processed": [str(d.date()) for d in dates], "equity": broker.account().equity,
            "pending": len(broker.pending), "halted": state.halted}


def run_ibkr(cfg: Config, live: bool = False, include_today: bool = False,
             dry_run: bool = False) -> dict:
    from .brokers.ibkr import IBKRBroker

    state, extra = SessionState.load(cfg.state_file)
    if extra.get("mode") == "paper":
        raise RuntimeError(
            f"{cfg.state_file} gehört zum Paper-Betrieb. Für IBKR eine eigene state_file verwenden."
        )
    session = TradingSession(cfg, state)
    broker = IBKRBroker(cfg, session.instruments, live=live, dry_run=dry_run)
    broker.connect()
    try:
        frames = _completed({s: broker.history(s) for s in session.instruments}, include_today)
        session.prepare(frames)
        date = max(df.index[-1] for df in frames.values())
        if state.last_date and pd.Timestamp(state.last_date) >= date:
            log.info("Bar %s wurde bereits verarbeitet, nichts zu tun", date.date())
            return {"processed": [], "halted": state.halted}
        account = broker.account()
        intents = session.on_close(date, account)
        broker.submit(intents)
        if not dry_run:
            history = extra.get("equity", []) + [[str(date.date()), account.equity]]
            state.save(cfg.state_file, {"mode": "ibkr", "equity": history})
        return {"processed": [str(date.date())], "equity": account.equity,
                "intents": [str(i) for i in intents], "halted": state.halted}
    finally:
        broker.disconnect()
