# Tradingbot: automatisiertes Trading für Aktien und CFDs

Regelbasierter Handel auf Tagesbasis mit Backtest, Paper-Trading und Anbindung an
Interactive Brokers. Das Konzept mit allen Abwägungen steht in [docs/KONZEPT.md](docs/KONZEPT.md).

**Risikohinweis:** CFDs und Hebel können zu schnellen, hohen Verlusten führen. Die
Mehrheit der Privatkunden verliert mit CFDs Geld. Diese Software ist keine Anlageberatung
und garantiert keine Gewinne. Erst Backtest, dann Paper-Trading, dann kleines Echtgeld.

## Installation

```bash
python -m venv .venv && source .venv/bin/activate
pip install -e ".[yahoo,ibkr,dev]"
pytest
```

## Benutzung

```bash
# Backtest mit Yahoo-Daten (erzeugt reports/backtest.html)
python -m tradingbot backtest

# Ohne Internet ausprobieren: Zufallsdaten (sagt nichts über echte Märkte)
python -m tradingbot backtest --data synthetic

# Paper-Trading vorwärts: einmal pro Handelstag ausführen, z. B. per cron um 07:00
python -m tradingbot run --broker paper
python -m tradingbot status

# Interactive Brokers (IB Gateway oder TWS muss laufen, API aktiviert)
python -m tradingbot run --broker ibkr --dry-run     # zeigt nur, was geordert würde
python -m tradingbot run --broker ibkr               # handelt, aber nur auf Paper-Konten

# Echtgeld: bewusst doppelt abgesichert
TRADINGBOT_ALLOW_LIVE=1 python -m tradingbot run --broker ibkr --live

# Not-Aus (Drawdown-Limit) nach eigener Prüfung aufheben
python -m tradingbot reset-halt
```

`run` verarbeitet nur abgeschlossene Tagesbars. Der heutige Bar wird ignoriert, außer mit
`--include-today` (nur nach Börsenschluss verwenden). Für Paper und IBKR jeweils eine eigene
`state_file` nutzen.

## Konfiguration

Alles steht in `config/default.yaml`: Kapital, Risikogrenzen, Kosten, Strategien und
Instrumente. Je Instrument: `kind` (`stock` oder `cfd`), `strategy`, `margin_rate`
(0.05 = Hebel bis 20:1 möglich, 0.2 = 5:1), `allow_short`, `spread_bps`, `broker_ref`.

Enthaltene Strategien: `trend` (Zeitreihen-Momentum, long/short, nachgezogener Stop),
`mean_reversion` (RSI-2-Rücksetzer im Aufwärtstrend, nur long), `breakout` (Donchian).

## Bekannte Grenzen

- Der IBKR-Adapter ist geschrieben, aber noch nicht gegen ein laufendes Gateway getestet.
  Die IBKR-Symbole in der Beispielkonfiguration (`IBUS500`, `IBUST100`, `XAUUSD`) sind
  ungeprüft und müssen im Paper-Konto verifiziert werden.
- Keine Währungsumrechnung: alle Instrumente müssen in der Kontowährung notieren.
- Nur Tagesdaten. Stops innerhalb eines Tages werden im Backtest aus Hoch/Tief abgeleitet.
- Yahoo-Daten sind für Tests brauchbar, aber keine geprüfte Datenquelle (Dividenden,
  Splits, Index-Daten statt echter CFD-Kurse).
