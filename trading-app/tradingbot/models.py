"""Core data types shared by strategies, risk, engine and brokers."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional, Union


@dataclass(frozen=True)
class Instrument:
    symbol: str
    kind: str  # "stock" or "cfd"
    strategy: str
    margin_rate: float = 1.0  # 1.0 = fully paid (stock), 0.2 = 5:1, 0.05 = 20:1
    allow_short: bool = False
    qty_step: float = 1.0
    spread_bps: float = 2.0  # full bid/ask spread in basis points
    max_position_pct: float = 0.25  # max notional as fraction of equity
    broker_ref: dict = field(default_factory=dict)  # broker-specific contract details

    @property
    def is_cfd(self) -> bool:
        return self.kind == "cfd"


@dataclass
class Position:
    symbol: str
    qty: float  # signed: >0 long, <0 short
    avg_price: float
    stop_price: Optional[float] = None
    last_price: Optional[float] = None

    @property
    def direction(self) -> int:
        return 1 if self.qty > 0 else -1

    @property
    def mark(self) -> float:
        return self.last_price if self.last_price is not None else self.avg_price

    @property
    def notional(self) -> float:
        return abs(self.qty) * self.mark

    @property
    def unrealized_pnl(self) -> float:
        return self.qty * (self.mark - self.avg_price)


@dataclass
class AccountState:
    equity: float
    balance: float
    margin_used: float
    positions: dict[str, Position]

    @property
    def gross_exposure(self) -> float:
        return sum(p.notional for p in self.positions.values())


@dataclass(frozen=True)
class Signal:
    """Strategy output for one instrument on one bar.

    target: +1 long, -1 short, 0 flat, None = keep whatever is open.
    stop_distance: price distance for the initial stop (and the trail, if trail=True).
    """

    target: Optional[int]
    stop_distance: float
    trail: bool = False


@dataclass(frozen=True)
class OpenIntent:
    symbol: str
    qty: float  # signed
    stop_price: float
    reason: str = ""


@dataclass(frozen=True)
class CloseIntent:
    symbol: str
    reason: str = ""


@dataclass(frozen=True)
class StopIntent:
    symbol: str
    stop_price: float


Intent = Union[OpenIntent, CloseIntent, StopIntent]


@dataclass
class Trade:
    """A closed round trip, recorded by the paper broker."""

    symbol: str
    qty: float
    entry_date: str
    exit_date: str
    entry_price: float
    exit_price: float
    pnl: float  # net of commission and financing
    costs: float
    reason: str
