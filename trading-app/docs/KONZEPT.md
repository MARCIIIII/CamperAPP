# Konzept: Automatisierte Trading-App (Aktien + CFDs)

Stand: November 2026

## 1. Ziel und ehrliche Einordnung

Die App handelt regelbasiert und ohne manuelle Eingriffe Aktien und CFDs, auch gehebelt.
Sie soll drei Dinge können: Strategien an historischen Daten prüfen (Backtest), sie ohne
Geldrisiko vorwärts laufen lassen (Paper-Trading) und sie über eine Broker-API echt handeln.

Was die App nicht kann: Gewinne garantieren. Je nach Anbieter verlieren 74–89 % der
Privatkunden-Konten mit CFDs Geld. Hebel vergrößert Verluste genauso wie Gewinne, und
ein Backtest ist kein Beweis für die Zukunft. Deshalb ist das Risikomanagement der Kern
der App und nicht die Signallogik, und der Echtgeldmodus ist mehrfach abgesichert.

## 2. Abwägung: Broker

Kriterien: Aktien **und** CFDs über eine API, in Deutschland nutzbar, Demo-/Paper-Konto,
Kosten, Stabilität der API.

| Broker | Echte Aktien | CFDs | API | Paper/Demo | Bewertung |
|---|---|---|---|---|---|
| **Interactive Brokers** | ja | ja (Aktien-, Index-, FX-CFDs) | TWS-API / Gateway, sehr ausgereift | ja | Einziger Kandidat, der beides sauber abdeckt. Niedrige Kosten. Nachteil: Gateway muss laufen, API ist komplex. |
| IG | nein (nur über CFD) | ja | REST + Streaming | ja | Guter reiner CFD-Broker, BaFin-reguliert. Keine echten Aktien per API. |
| Capital.com | nein (nur über CFD) | ja | REST + WebSocket, einfach | ja | Einfachster Einstieg für reine CFDs. Kosten stecken im Spread. |
| Saxo | ja | ja | OpenAPI | ja | Technisch gut, aber höhere Mindestanforderungen und Kosten. |
| Alpaca / Trading 212 | ja | nein | REST | ja | Keine CFDs, scheidet für die Anforderung aus. |

**Entscheidung:** Interactive Brokers als primärer Broker. Die App spricht den Broker aber
nur über eine schmale Schnittstelle an (`brokers/base.py`), sodass ein reiner CFD-Broker
(IG, Capital.com) später als zweiter Adapter ergänzt werden kann.

## 3. Abwägung: Wann Aktie, wann CFD

CFDs kosten Finanzierungszinsen für jede gehaltene Nacht (Referenzzins plus Aufschlag,
grob 5–7 % p.a. auf den vollen Positionswert bei Long-Positionen). Daraus folgt:

- **Echte Aktien** für Long-Positionen ohne Hebel. Keine Finanzierungskosten, kein Emittentenrisiko.
- **CFDs** für Short-Positionen, für Indizes/Rohstoffe/Währungen und überall dort, wo Hebel gewollt ist.
- Der Backtest rechnet Finanzierungskosten, Spread und Kommission mit ein. Eine Strategie,
  die nur ohne Kosten funktioniert, fällt damit durch.

## 4. Abwägung: Strategien

Bewertet nach Belegbarkeit, Robustheit und Umsetzbarkeit für Privatanleger (kein
Geschwindigkeitsvorteil, Tagesdaten).

| Ansatz | Beleglage | Urteil |
|---|---|---|
| **Trendfolge / Zeitreihen-Momentum** | Über 100 Jahre und viele Märkte dokumentiert (AQR, Faber), auch nach Veröffentlichung noch nachweisbar. Lange Durststrecken möglich. | Kernstrategie, long und short über CFDs. |
| **Kurzfristige Mean-Reversion bei Aktien** (RSI-2 im Aufwärtstrend) | Verbreitet, seit Veröffentlichung schwächer geworden, aber wenig korreliert zur Trendfolge. | Zweite Säule, nur long, echte Aktien. |
| **Ausbruch (Donchian)** | Klassische Trendfolge-Variante, ähnliches Profil. | Als Alternative enthalten. |
| Scalping / Hochfrequenz | Privatanleger haben keinen Latenz- und Kostenvorteil. | Verworfen. |
| ML-Kursprognosen | Hohe Überanpassungsgefahr, schwer zu validieren. | Vorerst verworfen, später als Filter denkbar. |
| News-/Sentiment-Handel | Datenqualität und Latenz problematisch. | Verworfen. |

**Entscheidung:** Tagesdaten, Signale zum Tagesschluss, Ausführung zur nächsten Eröffnung.
Zwei unkorrelierte Bausteine (Trendfolge auf CFDs, Mean-Reversion auf Aktien) mit
Positionsgrößen nach Volatilität (ATR). Wenige, feste Parameter, damit nichts
"hinoptimiert" wird.

## 5. Risikomanagement (Kern der App)

Jede Order läuft durch den Risikomanager. Die Grenzen stehen in `config/default.yaml`.

| Regel | Standard | Zweck |
|---|---|---|
| Risiko pro Trade | 0,5 % des Kontowerts | Positionsgröße = Risikobetrag / Stop-Abstand |
| Stop-Loss bei jeder Position | ATR-basiert, liegt beim Broker | Verlust ist auch bei Ausfall der App begrenzt |
| Brutto-Hebel gesamt | max. 2,0 | Hebel ist erlaubt, aber gedeckelt |
| Margin-Auslastung | max. 40 % | Abstand zur Zwangsschließung |
| Positionsgröße je Wert | max. 25 % (Aktie) / 60 % (CFD) des Kontowerts | Klumpenrisiko |
| Anzahl Positionen | max. 10 | Übersicht, Korrelation |
| Tagesverlust | −2 % → keine neuen Positionen am Folgetag | Verlustserien bremsen |
| Drawdown | −15 % vom Höchststand → alles schließen, Handel gesperrt | Not-Aus, nur manuell rücksetzbar |

Regulatorischer Rahmen (EU, Privatkunden, ESMA-Maßnahmen von 2018): Hebel maximal 30:1
(Hauptwährungen), 20:1 (Hauptindizes, Gold), 10:1 (Rohstoffe), 5:1 (Einzelaktien),
2:1 (Krypto); Zwangsschließung bei 50 % der Mindestmargin; keine Nachschusspflicht.
Die Margin-Sätze der Instrumente in der Konfiguration bilden das ab, der Paper-Broker
simuliert auch die 50-%-Zwangsschließung. Die App bleibt mit ihren eigenen Grenzen
deutlich darunter.

Steuern (Deutschland): Gewinne unterliegen der Abgeltungsteuer. IBKR führt sie nicht
automatisch ab, die Erklärung liegt beim Anleger. Die frühere 20.000-€-Grenze für die
Verlustverrechnung bei Termingeschäften wurde nach meinem Kenntnisstand mit dem
Jahressteuergesetz 2024 gestrichen. Das bitte mit einem Steuerberater klären, es ist
hier nicht verifiziert.

## 6. Architektur

```
Daten (CSV / Yahoo / IBKR) ──► Strategien ──► TradingSession ──► Broker
                                 Signale       Risikomanager       ├─ PaperBroker (Simulation)
                                               Order-Absichten     └─ IBKRBroker (ib_async)
```

- **Ein Entscheidungskern für alles.** `TradingSession.on_close()` wird im Backtest, im
  Paper-Betrieb und im Echtbetrieb identisch aufgerufen. Was getestet wird, ist das, was handelt.
- **Kein Blick in die Zukunft.** Indikatoren sind kausal, Orders werden erst zur nächsten
  Eröffnung ausgeführt, Kurslücken über den Stop werden zum schlechteren Eröffnungskurs abgerechnet.
- **Zustand auf Platte.** Höchststand, Not-Aus und Einstiegsdaten liegen in einer JSON-Datei,
  ein Neustart verliert nichts.
- **Sprache:** Python (pandas, ib_async). Für Handelslogik und Datenanalyse der Standard.

Module: `models`, `config`, `indicators`, `strategies/`, `risk`, `engine`, `brokers/`,
`data/`, `backtest`, `metrics`, `report`, `live`, `cli`.

## 7. Sicherheitsstufen bis zum Echtgeld

1. **Backtest** mit Kosten auf echten historischen Daten.
2. **Paper vorwärts** (`run --broker paper`), mindestens 2–3 Monate.
3. **IBKR-Paper-Konto** (`run --broker ibkr`): prüft die echte Order-Abwicklung.
4. **Echtgeld klein**: nur mit `--live` **und** Umgebungsvariable `TRADINGBOT_ALLOW_LIVE=1`.
   Ohne beides verweigert der Adapter jedes Konto, das kein Paper-Konto ist.

## 8. Roadmap

- [x] Konzept, Kern, Risikomanager, Paper-Broker, Backtest, Bericht, CLI, Tests
- [x] IBKR-Adapter (geschrieben, aber noch nicht gegen ein echtes Gateway getestet)
- [ ] Backtest auf echten Daten und Walk-Forward-Validierung
- [ ] Währungsumrechnung (derzeit: alle Instrumente in Kontowährung angenommen)
- [ ] Benachrichtigungen (Telegram/E-Mail) bei Orders und Not-Aus
- [ ] Web-Dashboard, zweiter Broker-Adapter (IG oder Capital.com)

## Quellen

- ESMA, Produktinterventionsmaßnahmen zu CFDs: https://www.esma.europa.eu/press-news/esma-news/esma-adopts-final-product-intervention-measures-cfds-and-binary-options
- Zeitreihen-Momentum: https://quantpedia.com/time-series-momentum-works-everywhere/ und https://fairmodel.econ.yale.edu/ec439/hurst.pdf
- Trendfolge, schnelle und langsame Signale: https://alphaarchitect.com/trend-following-timing-fast-and-slow-trends/
- Broker-Vergleiche (Affiliate-Seiten, mit Vorsicht): https://brokerchooser.com/best-brokers/best-brokers-for-algo-trading-in-germany und https://brokeranalysis.com/best-trading-api-brokers-germany/
- ib_async: https://github.com/ib-api-reloaded/ib_async
