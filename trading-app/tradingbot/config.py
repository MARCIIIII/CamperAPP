"""Configuration: validated with pydantic, loaded from YAML."""
from __future__ import annotations

from pathlib import Path
from typing import Literal

import yaml
from pydantic import BaseModel, Field, model_validator

from .models import Instrument


class RiskConfig(BaseModel):
    risk_per_trade: float = Field(0.005, gt=0, le=0.05)
    max_gross_leverage: float = Field(2.0, gt=0, le=10)
    max_margin_usage: float = Field(0.4, gt=0, le=0.9)
    max_positions: int = Field(10, ge=1)
    daily_loss_limit: float = Field(0.02, gt=0, le=0.5)
    max_drawdown: float = Field(0.15, gt=0, le=0.9)


class CostConfig(BaseModel):
    stock_commission_bps: float = 5.0
    stock_commission_min: float = 1.25
    cfd_commission_bps: float = 1.0
    cfd_commission_min: float = 0.0
    # Annual overnight financing on CFD notional. Positive = cost to the trader.
    cfd_financing_long: float = 0.065
    cfd_financing_short: float = 0.01
    margin_closeout_level: float = 0.5  # ESMA: close out at 50 % of required margin


class InstrumentConfig(BaseModel):
    symbol: str
    kind: Literal["stock", "cfd"]
    strategy: str
    margin_rate: float | None = Field(None, gt=0, le=1)
    allow_short: bool | None = None
    qty_step: float = Field(1.0, gt=0)
    spread_bps: float = Field(2.0, ge=0)
    max_position_pct: float | None = Field(None, gt=0)
    broker_ref: dict = {}

    @model_validator(mode="after")
    def _defaults(self):
        cfd = self.kind == "cfd"
        if self.margin_rate is None:
            self.margin_rate = 0.2 if cfd else 1.0
        if self.allow_short is None:
            self.allow_short = cfd
        if self.max_position_pct is None:
            self.max_position_pct = 0.6 if cfd else 0.25
        if not cfd and self.allow_short:
            raise ValueError(f"{self.symbol}: Leerverkauf nur über CFDs (kind: cfd)")
        return self

    def to_instrument(self) -> Instrument:
        return Instrument(**self.model_dump())


class DataConfig(BaseModel):
    provider: Literal["csv", "yahoo", "synthetic"] = "csv"
    csv_dir: str = "data"
    start: str | None = None
    end: str | None = None


class IBKRConfig(BaseModel):
    host: str = "127.0.0.1"
    port: int = 4002  # IB Gateway paper. 4001 gateway live, 7497 TWS paper, 7496 TWS live
    client_id: int = 17
    history_days: int = 400


class Config(BaseModel):
    initial_capital: float = Field(10_000, gt=0)
    currency: str = "EUR"
    state_file: str = "state/session.json"
    risk: RiskConfig = RiskConfig()
    costs: CostConfig = CostConfig()
    data: DataConfig = DataConfig()
    ibkr: IBKRConfig = IBKRConfig()
    strategies: dict[str, dict] = {}
    instruments: list[InstrumentConfig]

    @model_validator(mode="after")
    def _check(self):
        symbols = [i.symbol for i in self.instruments]
        if len(symbols) != len(set(symbols)):
            raise ValueError("Symbole müssen eindeutig sein")
        for i in self.instruments:
            if i.strategy not in self.strategies:
                raise ValueError(f"{i.symbol}: Strategie '{i.strategy}' ist nicht definiert")
        return self

    def instrument_map(self) -> dict[str, Instrument]:
        return {i.symbol: i.to_instrument() for i in self.instruments}


def load_config(path: str | Path) -> Config:
    with open(path, encoding="utf-8") as fh:
        return Config.model_validate(yaml.safe_load(fh))
