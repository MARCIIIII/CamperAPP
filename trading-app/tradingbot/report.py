"""Text summary and a self-contained HTML report (inline SVG, no dependencies)."""
from __future__ import annotations

from html import escape
from pathlib import Path

import pandas as pd

from .models import Trade

LABELS = [
    ("total_return", "Gesamtrendite", "pct"), ("cagr", "Rendite p.a.", "pct"),
    ("volatility", "Volatilität p.a.", "pct"), ("sharpe", "Sharpe", "num"),
    ("sortino", "Sortino", "num"), ("max_drawdown", "Max. Drawdown", "pct"),
    ("trades", "Trades", "int"), ("win_rate", "Trefferquote", "pct"),
    ("profit_factor", "Profit-Faktor", "num"), ("avg_trade", "Ø Ergebnis je Trade", "money"),
    ("commission", "Kommissionen", "money"), ("financing", "Finanzierungskosten", "money"),
    ("end_equity", "Endkapital", "money"),
]


def _fmt(value, kind: str) -> str:
    if kind == "pct":
        return f"{value:+.1%}"
    if kind == "int":
        return str(value)
    if kind == "money":
        return f"{value:,.2f}"
    return f"{value:.2f}"


def text_summary(metrics: dict) -> str:
    lines = [f"Zeitraum: {metrics.get('start')} bis {metrics.get('end')}"]
    lines += [f"{label:<24}{_fmt(metrics[key], kind):>14}" for key, label, kind in LABELS if key in metrics]
    return "\n".join(lines)


def _svg_line(series: pd.Series, color: str, w: int = 900, h: int = 260) -> str:
    lo, hi = float(series.min()), float(series.max())
    span = (hi - lo) or 1.0
    n = max(len(series) - 1, 1)
    step = max(len(series) // 1500, 1)
    pts = " ".join(
        f"{i / n * w:.1f},{h - (v - lo) / span * h:.1f}"
        for i, v in list(enumerate(series.values))[::step]
    )
    return (
        f'<svg viewBox="0 0 {w} {h}" preserveAspectRatio="none" style="width:100%;height:{h}px">'
        f'<polyline fill="none" stroke="{color}" stroke-width="1.5" points="{pts}"/></svg>'
        f'<div class="axis"><span>{series.index[0].date()} · {lo:,.2f}</span>'
        f'<span>{series.index[-1].date()} · max {hi:,.2f}</span></div>'
    )


def write_html(path: str | Path, title: str, metrics: dict, equity: pd.Series, trades: list[Trade]) -> Path:
    dd = (equity / equity.cummax() - 1) * 100
    cards = "".join(
        f"<div class='card'><span>{label}</span><b>{_fmt(metrics[key], kind)}</b></div>"
        for key, label, kind in LABELS if key in metrics
    )
    rows = "".join(
        f"<tr><td>{escape(t.symbol)}</td><td>{'Long' if t.qty > 0 else 'Short'}</td>"
        f"<td>{abs(t.qty):g}</td><td>{t.entry_date}</td><td>{t.exit_date}</td>"
        f"<td>{t.entry_price:.2f}</td><td>{t.exit_price:.2f}</td>"
        f"<td class='{'pos' if t.pnl > 0 else 'neg'}'>{t.pnl:+.2f}</td><td>{escape(t.reason)}</td></tr>"
        for t in reversed(trades[-300:])
    )
    html = f"""<!doctype html><html lang="de"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>{escape(title)}</title>
<style>
body{{font:14px system-ui,sans-serif;margin:0;padding:24px;background:#0f1419;color:#e6e9ec}}
h1{{font-size:20px}}h2{{font-size:15px;margin-top:28px;color:#9aa5b1}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px}}
.card{{background:#1a2129;border-radius:8px;padding:10px 12px}}
.card span{{display:block;color:#9aa5b1;font-size:12px}}.card b{{font-size:17px}}
.axis{{display:flex;justify-content:space-between;color:#9aa5b1;font-size:12px}}
.wrap{{overflow-x:auto}}table{{border-collapse:collapse;width:100%}}
td,th{{padding:5px 8px;text-align:right;border-bottom:1px solid #26303a;white-space:nowrap}}
td:first-child,th:first-child{{text-align:left}}.pos{{color:#4cc38a}}.neg{{color:#ff6b6b}}
</style>
<h1>{escape(title)}</h1>
<p>{metrics.get('start')} bis {metrics.get('end')}</p>
<div class="grid">{cards}</div>
<h2>Kontowert</h2>{_svg_line(equity, '#5aa9ff')}
<h2>Drawdown in %</h2>{_svg_line(dd, '#ff6b6b', h=120)}
<h2>Trades (letzte {min(len(trades), 300)} von {len(trades)})</h2>
<div class="wrap"><table><tr><th>Symbol</th><th>Richtung</th><th>Menge</th><th>Einstieg</th><th>Ausstieg</th>
<th>Kurs ein</th><th>Kurs aus</th><th>Ergebnis</th><th>Grund</th></tr>{rows}</table></div>
</html>"""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(html, encoding="utf-8")
    return path
