"""Backtest loop and performance metrics."""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd

from .brokers.paper import PaperBroker
from .config import Config
from .engine import TradingSession
from .models import Trade


@dataclass
class Result:
    equity: pd.Series
    trades: list[Trade]
    broker: PaperBroker
    session: TradingSession

    def metrics(self) -> dict:
        return compute_metrics(self.equity, self.trades, self.broker)


def step_dates(session: TradingSession, broker: PaperBroker, dates) -> pd.Series:
    """Advance broker and session bar by bar. Shared by backtest and forward paper trading."""
    equity = {}
    for date in dates:
        bars = {
            sym: df.loc[date, ["open", "high", "low", "close"]].to_dict()
            for sym, df in session.frames.items()
            if date in df.index
        }
        broker.process_bar(date, bars)
        account = broker.account()
        broker.submit(session.on_close(date, account))
        equity[date] = account.equity
    return pd.Series(equity, dtype=float)


def run_backtest(cfg: Config, frames: dict[str, pd.DataFrame]) -> Result:
    session = TradingSession(cfg)
    session.prepare(frames)
    broker = PaperBroker(session.instruments, cfg.costs, cfg.initial_capital)
    dates = sorted(set().union(*(df.index for df in frames.values())))
    equity = step_dates(session, broker, dates)
    return Result(equity, broker.trades, broker, session)


def compute_metrics(equity: pd.Series, trades: list[Trade], broker: PaperBroker | None = None) -> dict:
    if len(equity) < 2:
        return {}
    rets = equity.pct_change().dropna()
    years = max((equity.index[-1] - equity.index[0]).days / 365.25, 1e-9)
    total = equity.iloc[-1] / equity.iloc[0]
    downside = rets[rets < 0].std()
    pnls = np.array([t.pnl for t in trades])
    wins, losses = pnls[pnls > 0], pnls[pnls <= 0]
    m = {
        "start": str(equity.index[0].date()),
        "end": str(equity.index[-1].date()),
        "start_equity": float(equity.iloc[0]),
        "end_equity": float(equity.iloc[-1]),
        "total_return": total - 1,
        "cagr": total ** (1 / years) - 1 if total > 0 else -1.0,
        "volatility": rets.std() * np.sqrt(252),
        "sharpe": rets.mean() / rets.std() * np.sqrt(252) if rets.std() > 0 else 0.0,
        "sortino": rets.mean() / downside * np.sqrt(252) if downside and downside > 0 else 0.0,
        "max_drawdown": float((equity / equity.cummax() - 1).min()),
        "trades": len(trades),
        "win_rate": len(wins) / len(pnls) if len(pnls) else 0.0,
        "profit_factor": wins.sum() / -losses.sum() if losses.sum() < 0 else float("inf"),
        "avg_trade": pnls.mean() if len(pnls) else 0.0,
    }
    if broker is not None:
        m["commission"] = broker.total_commission
        m["financing"] = broker.total_financing
    return {k: (float(v) if isinstance(v, (np.floating, float)) else v) for k, v in m.items()}
