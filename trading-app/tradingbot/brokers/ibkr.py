"""Interactive Brokers adapter (TWS / IB Gateway via ib_async).

Status: written against ib_async 2.1 but NOT yet verified against a running gateway.
Test it on an IBKR paper account before anything else.

Only positions in configured instruments are read or touched. Everything else in the
account is ignored.
"""
from __future__ import annotations

import logging
import math
import os

import pandas as pd

from ..config import Config
from ..models import AccountState, CloseIntent, Instrument, Intent, OpenIntent, Position, StopIntent

log = logging.getLogger(__name__)

LIVE_ENV = "TRADINGBOT_ALLOW_LIVE"


class IBKRBroker:
    def __init__(self, cfg: Config, instruments: dict[str, Instrument], live: bool = False,
                 dry_run: bool = False):
        self.cfg, self.instruments, self.live, self.dry_run = cfg, instruments, live, dry_run
        self.ib = None
        self._contracts: dict[str, object] = {}
        self._ticks: dict[str, float] = {}

    # -- connection ---------------------------------------------------------
    def connect(self) -> None:
        from ib_async import IB

        c = self.cfg.ibkr
        self.ib = IB()
        self.ib.connect(c.host, c.port, clientId=c.client_id, timeout=15)
        accounts = self.ib.managedAccounts()
        real = [a for a in accounts if not a.startswith("D")]  # paper accounts start with "D"
        if real and not (self.live and os.environ.get(LIVE_ENV) == "1"):
            self.ib.disconnect()
            raise RuntimeError(
                f"Echtgeld-Konto {real} erkannt. Abbruch. Echtgeld nur mit --live und {LIVE_ENV}=1."
            )
        if real:
            log.warning("ECHTGELD-MODUS aktiv für Konto %s", real)
        for sym, inst in self.instruments.items():
            contract = self._make_contract(inst)
            self.ib.qualifyContracts(contract)
            if not contract.conId:
                raise RuntimeError(f"{sym}: Kontrakt bei IBKR nicht gefunden ({contract})")
            self._contracts[sym] = contract
            details = self.ib.reqContractDetails(contract)
            self._ticks[sym] = details[0].minTick if details else 0.01

    def disconnect(self) -> None:
        if self.ib is not None:
            self.ib.disconnect()

    def _make_contract(self, inst: Instrument, ref: dict | None = None):
        from ib_async import Contract

        ref = ref if ref is not None else inst.broker_ref.get("ibkr", {})
        return Contract(
            symbol=ref.get("symbol", inst.symbol),
            secType=ref.get("sec_type", "CFD" if inst.is_cfd else "STK"),
            exchange=ref.get("exchange", "SMART"),
            currency=ref.get("currency", self.cfg.currency),
        )

    def _round(self, sym: str, price: float) -> float:
        tick = self._ticks.get(sym) or 0.01
        return round(round(price / tick) * tick, 8)

    # -- data ---------------------------------------------------------------
    def history(self, sym: str) -> pd.DataFrame:
        """Daily bars. A CFD may name another contract for data under broker_ref.ibkr.data
        (e.g. the underlying share); otherwise the CFD's own midpoint history is used."""
        from ib_async import util

        inst = self.instruments[sym]
        data_ref = inst.broker_ref.get("ibkr", {}).get("data")
        if data_ref:
            contract = self._make_contract(inst, data_ref)
            self.ib.qualifyContracts(contract)
        else:
            contract = self._contracts[sym]
        what = "MIDPOINT" if contract.secType in ("CFD", "CASH") else "ADJUSTED_LAST"
        days = self.cfg.ibkr.history_days
        duration = f"{days} D" if days <= 365 else f"{math.ceil(days / 365)} Y"
        bars = self.ib.reqHistoricalData(
            contract, endDateTime="", durationStr=duration, barSizeSetting="1 day",
            whatToShow=what, useRTH=True, formatDate=1,
        )
        df = util.df(bars)
        if df is None or df.empty:
            raise RuntimeError(f"{sym}: keine historischen Daten von IBKR")
        df = df.set_index(pd.to_datetime(df["date"]))[["open", "high", "low", "close", "volume"]]
        return df.astype(float).sort_index()

    # -- Broker interface ---------------------------------------------------
    def _summary(self, tag: str) -> float:
        for v in self.ib.accountSummary():
            if v.tag == tag and v.currency in (self.cfg.currency, "BASE", ""):
                return float(v.value)
        raise RuntimeError(f"Kontowert '{tag}' in {self.cfg.currency} nicht gefunden")

    def _stop_trades(self, sym: str) -> list:
        con_id = self._contracts[sym].conId
        return [
            t for t in self.ib.openTrades()
            if t.contract.conId == con_id and t.order.orderType == "STP"
        ]

    def account(self) -> AccountState:
        by_con = {c.conId: sym for sym, c in self._contracts.items()}
        positions = {}
        for item in self.ib.portfolio():
            sym = by_con.get(item.contract.conId)
            if sym is None or item.position == 0:
                continue
            stops = self._stop_trades(sym)
            positions[sym] = Position(
                sym, float(item.position), float(item.averageCost),
                stop_price=float(stops[0].order.auxPrice) if stops else None,
                last_price=float(item.marketPrice),
            )
        return AccountState(
            equity=self._summary("NetLiquidation"),
            balance=self._summary("TotalCashValue"),
            margin_used=self._summary("InitMarginReq"),
            positions=positions,
        )

    def submit(self, intents: list[Intent]) -> None:
        for intent in intents:
            log.info("%s%s", "[dry-run] " if self.dry_run else "", intent)
            if self.dry_run:
                continue
            if isinstance(intent, CloseIntent):
                self._close(intent.symbol)
            elif isinstance(intent, StopIntent):
                self._set_stop(intent.symbol, intent.stop_price)
            elif isinstance(intent, OpenIntent):
                self._open(intent)
        if not self.dry_run:
            self.ib.sleep(2)  # let the gateway acknowledge

    def _position_qty(self, sym: str) -> float:
        con_id = self._contracts[sym].conId
        return sum(p.position for p in self.ib.positions() if p.contract.conId == con_id)

    def _close(self, sym: str) -> None:
        from ib_async import MarketOrder

        for trade in self._stop_trades(sym):
            self.ib.cancelOrder(trade.order)
        qty = self._position_qty(sym)
        if qty:
            self.ib.placeOrder(
                self._contracts[sym], MarketOrder("SELL" if qty > 0 else "BUY", abs(qty))
            )

    def _set_stop(self, sym: str, stop_price: float) -> None:
        from ib_async import StopOrder

        price = self._round(sym, stop_price)
        stops = self._stop_trades(sym)
        if stops:
            order = stops[0].order
            order.auxPrice = price
            self.ib.placeOrder(self._contracts[sym], order)  # same orderId = modify
            return
        qty = self._position_qty(sym)
        if qty:
            order = StopOrder("SELL" if qty > 0 else "BUY", abs(qty), price, tif="GTC")
            self.ib.placeOrder(self._contracts[sym], order)

    def _open(self, intent: OpenIntent) -> None:
        from ib_async import MarketOrder, StopOrder

        sym, contract = intent.symbol, self._contracts[intent.symbol]
        if self._position_qty(sym):
            log.warning("%s: Position existiert bereits, Order verworfen", sym)
            return
        buy = intent.qty > 0
        qty = abs(intent.qty)
        parent = MarketOrder("BUY" if buy else "SELL", qty, transmit=False)
        parent.orderId = self.ib.client.getReqId()
        stop = StopOrder(
            "SELL" if buy else "BUY", qty, self._round(sym, intent.stop_price),
            parentId=parent.orderId, tif="GTC", transmit=True,
        )
        self.ib.placeOrder(contract, parent)
        self.ib.placeOrder(contract, stop)
