"""Broker adapters. Every broker offers account() and submit(intents)."""
from __future__ import annotations

from typing import Protocol

from ..models import AccountState, Intent


class Broker(Protocol):
    def account(self) -> AccountState: ...

    def submit(self, intents: list[Intent]) -> None: ...
