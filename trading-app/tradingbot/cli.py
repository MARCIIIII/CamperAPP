"""Command line: python -m tradingbot <backtest|run|status|reset-halt>."""
from __future__ import annotations

import argparse
import json
import logging

from .backtest import run_backtest
from .config import load_config
from .data import load_frames
from .engine import SessionState
from .report import text_summary, write_html


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="tradingbot", description="Automatisiertes Trading: Aktien + CFDs")
    p.add_argument("-c", "--config", default="config/default.yaml")
    p.add_argument("-v", "--verbose", action="store_true")
    sub = p.add_subparsers(dest="cmd", required=True)

    bt = sub.add_parser("backtest", help="Strategien an historischen Daten prüfen")
    bt.add_argument("--data", choices=["csv", "yahoo", "synthetic"], help="Datenquelle überschreiben")
    bt.add_argument("--report", default="reports/backtest.html")

    run = sub.add_parser("run", help="Neue Tagesbars verarbeiten und Orders erzeugen")
    run.add_argument("--broker", choices=["paper", "ibkr"], default="paper")
    run.add_argument("--live", action="store_true", help="Echtgeld erlauben (zusätzlich TRADINGBOT_ALLOW_LIVE=1)")
    run.add_argument("--dry-run", action="store_true", help="IBKR: Orders nur anzeigen")
    run.add_argument("--include-today", action="store_true", help="Heutigen Bar als abgeschlossen behandeln")

    sub.add_parser("status", help="Gespeicherten Zustand anzeigen")
    sub.add_parser("reset-halt", help="Not-Aus nach Prüfung manuell aufheben")

    args = p.parse_args(argv)
    logging.basicConfig(
        level=logging.INFO if args.verbose or args.cmd == "run" else logging.WARNING,
        format="%(asctime)s %(levelname)s %(message)s",
    )
    cfg = load_config(args.config)

    if args.cmd == "backtest":
        if args.data:
            cfg.data.provider = args.data
        result = run_backtest(cfg, load_frames(cfg))
        metrics = result.metrics()
        print(text_summary(metrics))
        if cfg.data.provider == "synthetic":
            print("\nHinweis: synthetische Zufallsdaten. Die Zahlen sagen nichts über echte Märkte.")
        if result.session.state.halted:
            print(f"\nNot-Aus im Backtest ausgelöst: {result.session.state.halt_reason}")
        print(f"\nBericht: {write_html(args.report, 'Backtest', metrics, result.equity, result.trades)}")

    elif args.cmd == "run":
        from . import live

        if args.broker == "paper":
            out = live.run_paper(cfg, include_today=args.include_today)
        else:
            out = live.run_ibkr(cfg, live=args.live, include_today=args.include_today,
                                dry_run=args.dry_run)
        print(json.dumps(out, indent=2, ensure_ascii=False))

    elif args.cmd == "status":
        state, extra = SessionState.load(cfg.state_file)
        broker = extra.get("broker", {})
        print(json.dumps({
            "mode": extra.get("mode"), "last_date": state.last_date, "halted": state.halted,
            "halt_reason": state.halt_reason, "peak_equity": state.peak_equity,
            "last_equity": state.prev_equity, "positions": broker.get("positions", {}),
            "pending": broker.get("pending", []), "closed_trades": len(broker.get("trades", [])),
        }, indent=2, ensure_ascii=False))

    elif args.cmd == "reset-halt":
        state, extra = SessionState.load(cfg.state_file)
        if not state.halted:
            print("Kein Not-Aus aktiv.")
        else:
            print(f"Hebe Not-Aus auf: {state.halt_reason}")
            state.halted, state.halt_reason = False, ""
            state.peak_equity = state.prev_equity  # drawdown is measured from here again
            state.save(cfg.state_file, extra)
    return 0
