"""Daily OHLCV data: CSV files, Yahoo Finance, or synthetic series for tests and demos."""
from __future__ import annotations

import zlib
from pathlib import Path

import numpy as np
import pandas as pd

from .config import Config

COLUMNS = ["open", "high", "low", "close", "volume"]


def _clean(df: pd.DataFrame) -> pd.DataFrame:
    df = df.rename(columns=str.lower)
    if "volume" not in df:
        df["volume"] = 0.0
    df = df[COLUMNS].astype(float)
    df.index = pd.to_datetime(df.index).tz_localize(None).normalize()
    df = df[~df.index.duplicated(keep="last")].sort_index()
    return df.dropna(subset=["open", "high", "low", "close"])


def load_csv(path: str | Path) -> pd.DataFrame:
    """CSV with a date column first, then open, high, low, close[, volume]."""
    return _clean(pd.read_csv(path, index_col=0, parse_dates=True))


def load_yahoo(ticker: str, start: str | None, end: str | None) -> pd.DataFrame:
    import yfinance as yf  # optional dependency

    raw = yf.download(ticker, start=start or "2010-01-01", end=end, auto_adjust=True, progress=False)
    if raw.empty:
        raise RuntimeError(f"Keine Yahoo-Daten für {ticker}")
    if isinstance(raw.columns, pd.MultiIndex):
        raw.columns = raw.columns.get_level_values(0)
    return _clean(raw)


def synthetic(symbol: str, start: str = "2015-01-01", end: str = "2025-12-31") -> pd.DataFrame:
    """Random walk with slowly changing drift. Deterministic per symbol. NOT market data."""
    rng = np.random.default_rng(zlib.crc32(symbol.encode()))
    idx = pd.bdate_range(start, end)
    n = len(idx)
    regimes = rng.choice([-0.0006, 0.0002, 0.0009], size=n // 120 + 1)
    drift = np.repeat(regimes, 120)[:n]
    vol = 0.012 * np.exp(0.3 * np.sin(np.arange(n) / 90 + rng.uniform(0, 6)))
    close = 100 * np.exp(np.cumsum(drift + vol * rng.standard_normal(n)))
    open_ = np.r_[100.0, close[:-1]] * np.exp(0.3 * vol * rng.standard_normal(n))
    span = np.abs(vol * rng.standard_normal(n)) * 0.6
    high = np.maximum(open_, close) * (1 + span)
    low = np.minimum(open_, close) * (1 - span)
    return pd.DataFrame(
        {"open": open_, "high": high, "low": low, "close": close, "volume": 1e6}, index=idx
    )


def load_frames(cfg: Config) -> dict[str, pd.DataFrame]:
    d = cfg.data
    frames = {}
    for inst in cfg.instruments:
        if d.provider == "csv":
            df = load_csv(Path(d.csv_dir) / f"{inst.symbol}.csv")
        elif d.provider == "yahoo":
            df = load_yahoo(inst.broker_ref.get("yahoo", inst.symbol), d.start, d.end)
        else:
            df = synthetic(inst.symbol, d.start or "2015-01-01", d.end or "2025-12-31")
        frames[inst.symbol] = df.loc[d.start : d.end]
    return frames
