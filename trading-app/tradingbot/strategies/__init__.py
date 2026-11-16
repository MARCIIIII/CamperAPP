"""Strategies.

A strategy has two steps so backtest and live share the exact same logic:
  prepare(df)  -> indicator columns for the whole history (vectorised, causal)
  decide(row, position_direction, bars_held) -> Signal for the latest closed bar
"""
from __future__ import annotations

from typing import Optional

import numpy as np
import pandas as pd

from ..indicators import atr, rsi, sma
from ..models import Signal


class Strategy:
    def __init__(self, **params):
        unknown = set(params) - set(self.defaults)
        if unknown:
            raise ValueError(f"{type(self).__name__}: unbekannte Parameter {sorted(unknown)}")
        self.p = {**self.defaults, **params}

    defaults: dict = {}

    def prepare(self, df: pd.DataFrame) -> pd.DataFrame:
        raise NotImplementedError

    def decide(self, row: pd.Series, direction: int, bars_held: int) -> Optional[Signal]:
        """Return None while indicators are still warming up."""
        raise NotImplementedError


class TrendFollowing(Strategy):
    """Time-series momentum: vote of the return sign over several lookbacks.

    Long when the average vote is >= threshold, short when <= -threshold, else flat.
    Stop trails at stop_atr * ATR.
    """

    defaults = {"lookbacks": [63, 126, 252], "threshold": 0.3, "atr_period": 20, "stop_atr": 3.0}

    def prepare(self, df):
        out = pd.DataFrame(index=df.index)
        votes = [np.sign(df["close"] / df["close"].shift(n) - 1) for n in self.p["lookbacks"]]
        out["score"] = pd.concat(votes, axis=1).mean(axis=1, skipna=False)
        out["atr"] = atr(df, self.p["atr_period"])
        return out

    def decide(self, row, direction, bars_held):
        if pd.isna(row["score"]) or pd.isna(row["atr"]) or row["atr"] <= 0:
            return None
        t = self.p["threshold"]
        target = 1 if row["score"] >= t else -1 if row["score"] <= -t else 0
        return Signal(target, self.p["stop_atr"] * row["atr"], trail=True)


class MeanReversion(Strategy):
    """Buy short-term weakness inside a long-term uptrend (RSI-2 style). Long only."""

    defaults = {
        "rsi_period": 2, "rsi_entry": 10.0, "trend_sma": 200, "exit_sma": 5,
        "max_hold": 10, "atr_period": 20, "stop_atr": 2.5,
    }

    def prepare(self, df):
        out = pd.DataFrame(index=df.index)
        out["close"] = df["close"]
        out["rsi"] = rsi(df["close"], self.p["rsi_period"])
        out["trend"] = sma(df["close"], self.p["trend_sma"])
        out["exit"] = sma(df["close"], self.p["exit_sma"])
        out["atr"] = atr(df, self.p["atr_period"])
        return out

    def decide(self, row, direction, bars_held):
        if row[["rsi", "trend", "exit", "atr"]].isna().any() or row["atr"] <= 0:
            return None
        stop = self.p["stop_atr"] * row["atr"]
        if direction != 0:
            done = row["close"] > row["exit"] or bars_held >= self.p["max_hold"]
            return Signal(0 if done else None, stop)
        if row["close"] > row["trend"] and row["rsi"] < self.p["rsi_entry"]:
            return Signal(1, stop)
        return Signal(None, stop)


class Breakout(Strategy):
    """Donchian channel breakout: enter on an N-bar extreme, exit on the opposite M-bar extreme."""

    defaults = {"entry": 55, "exit": 20, "atr_period": 20, "stop_atr": 2.0}

    def prepare(self, df):
        out = pd.DataFrame(index=df.index)
        out["close"] = df["close"]
        # shift(1): the channel is built from bars before the current one
        out["hi_entry"] = df["high"].rolling(self.p["entry"]).max().shift(1)
        out["lo_entry"] = df["low"].rolling(self.p["entry"]).min().shift(1)
        out["hi_exit"] = df["high"].rolling(self.p["exit"]).max().shift(1)
        out["lo_exit"] = df["low"].rolling(self.p["exit"]).min().shift(1)
        out["atr"] = atr(df, self.p["atr_period"])
        return out

    def decide(self, row, direction, bars_held):
        if row.isna().any() or row["atr"] <= 0:
            return None
        stop = self.p["stop_atr"] * row["atr"]
        c = row["close"]
        if direction > 0 and c < row["lo_exit"]:
            return Signal(0, stop)
        if direction < 0 and c > row["hi_exit"]:
            return Signal(0, stop)
        if direction <= 0 and c > row["hi_entry"]:
            return Signal(1, stop)
        if direction >= 0 and c < row["lo_entry"]:
            return Signal(-1, stop)
        return Signal(None, stop)


REGISTRY = {"trend": TrendFollowing, "mean_reversion": MeanReversion, "breakout": Breakout}


def build_strategies(spec: dict[str, dict]) -> dict[str, Strategy]:
    """spec: name -> {"type": <registry key>, ...params}."""
    out = {}
    for name, raw in spec.items():
        params = dict(raw)
        kind = params.pop("type", name)
        if kind not in REGISTRY:
            raise ValueError(f"Unbekannter Strategietyp '{kind}' (verfügbar: {sorted(REGISTRY)})")
        out[name] = REGISTRY[kind](**params)
    return out
