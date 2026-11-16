import json

import pandas as pd
import pytest

from tradingbot.backtest import run_backtest, step_dates
from tradingbot.brokers.paper import PaperBroker
from tradingbot.cli import main
from tradingbot.config import Config
from tradingbot.data import synthetic
from tradingbot.engine import SessionState, TradingSession
from tradingbot.models import AccountState, CloseIntent, OpenIntent, Position, StopIntent
from tradingbot.strategies import REGISTRY


def make_cfg(**over) -> Config:
    base = {
        "initial_capital": 10_000,
        "strategies": {"trend": {"type": "trend"}, "dip": {"type": "mean_reversion"}},
        "instruments": [
            {"symbol": "IDX", "kind": "cfd", "strategy": "trend", "margin_rate": 0.05,
             "qty_step": 0.01, "spread_bps": 0},
            {"symbol": "STK", "kind": "stock", "strategy": "dip", "spread_bps": 0},
        ],
    }
    base.update(over)
    return Config.model_validate(base)


def bar(o, h=None, l=None, c=None):
    return {"open": o, "high": h or o, "low": l or o, "close": c or o}


def day(n):
    return pd.Timestamp("2024-01-01") + pd.Timedelta(days=n)


def broker_for(cfg):
    return PaperBroker(cfg.instrument_map(), cfg.costs, cfg.initial_capital)


# -- strategies ---------------------------------------------------------------
@pytest.mark.parametrize("name", sorted(REGISTRY))
def test_indicators_do_not_look_ahead(name):
    df = synthetic("X", "2020-01-01", "2022-12-31")
    strat = REGISTRY[name]()
    full = strat.prepare(df)
    cut = 500
    part = strat.prepare(df.iloc[: cut + 1])
    pd.testing.assert_series_equal(full.iloc[cut], part.iloc[cut])


def test_unknown_strategy_parameter_is_rejected():
    with pytest.raises(ValueError):
        REGISTRY["trend"](lookback=10)


# -- config -------------------------------------------------------------------
def test_stock_short_is_rejected():
    with pytest.raises(ValueError):
        make_cfg(instruments=[{"symbol": "S", "kind": "stock", "strategy": "dip", "allow_short": True}])


def test_undefined_strategy_is_rejected():
    with pytest.raises(ValueError):
        make_cfg(instruments=[{"symbol": "S", "kind": "stock", "strategy": "nope"}])


# -- sizing and risk ----------------------------------------------------------
def account(equity=10_000, positions=None):
    return AccountState(equity, equity, 0.0, positions or {})


def size(session, wanted, acct=None):
    session.state.last_date = "2024-01-01"
    return session._size_entries(wanted, acct or account(), [], day(0))


def test_position_size_follows_risk_per_trade():
    s = TradingSession(make_cfg())
    idx = s.instruments["IDX"]
    (o,) = size(s, [(idx, 1, 100.0, 5.0)])
    assert o.qty == pytest.approx(10.0)  # 10_000 * 0.5 % / 5
    assert o.stop_price == pytest.approx(95.0)
    (o,) = size(s, [(idx, -1, 100.0, 5.0)])
    assert o.qty == pytest.approx(-10.0) and o.stop_price == pytest.approx(105.0)


def test_position_cap_and_gross_leverage_cap():
    s = TradingSession(make_cfg())
    idx, stk = s.instruments["IDX"], s.instruments["STK"]
    (o,) = size(s, [(stk, 1, 100.0, 0.5)])  # risk sizing would want 100 shares = 100 % of equity
    assert o.qty == 25  # capped at 25 % of equity
    held = {"IDX": Position("IDX", 190, 100.0)}  # 1.9x of the 2.0x gross limit in use
    (o,) = size(s, [(stk, 1, 100.0, 0.5)], account(positions=held))
    assert o.qty == 10  # only 0.1x of equity left


def test_max_positions():
    s = TradingSession(make_cfg(risk={"max_positions": 1}))
    opens = size(s, [(s.instruments["IDX"], 1, 100.0, 5.0), (s.instruments["STK"], 1, 100.0, 5.0)])
    assert len(opens) == 1


def trending_frames(n=400, slope=0.3):
    idx = pd.bdate_range("2022-01-03", periods=n)
    close = pd.Series(100 + slope * pd.RangeIndex(n), index=idx, dtype=float)
    df = pd.DataFrame({"open": close, "high": close + 1, "low": close - 1, "close": close, "volume": 1.0})
    return {"IDX": df}


def test_drawdown_triggers_kill_switch_and_blocks_trading():
    s = TradingSession(make_cfg())
    frames = trending_frames()
    s.prepare(frames)
    date = frames["IDX"].index[-1]
    pos = {"IDX": Position("IDX", 5, 100.0, 90.0, 100.0)}
    s.on_close(frames["IDX"].index[-2], account(10_000, pos))
    intents = s.on_close(date, account(8_400, pos))  # -16 % from peak
    assert s.state.halted
    assert intents == [CloseIntent("IDX", "not_aus")]
    assert s.on_close(date, account(8_400)) == []  # stays halted, no new entries


def test_daily_loss_limit_blocks_new_entries():
    frames = trending_frames()
    dates = frames["IDX"].index
    s = TradingSession(make_cfg())
    s.prepare(frames)
    s.on_close(dates[-2], account(10_000, {"X": Position("X", 1, 1.0)}))
    assert not any(isinstance(i, OpenIntent) for i in s.on_close(dates[-1], account(9_700)))
    s2 = TradingSession(make_cfg())
    s2.prepare(frames)
    assert any(isinstance(i, OpenIntent) for i in s2.on_close(dates[-1], account(10_000)))


def test_cooldown_after_stop_out():
    frames = trending_frames()
    dates = frames["IDX"].index
    s = TradingSession(make_cfg())
    s.prepare(frames)
    assert any(isinstance(i, OpenIntent) for i in s.on_close(dates[-10], account()))
    # position never shows up at the broker -> treated as stopped out, entry blocked for a while
    assert s.on_close(dates[-9], account()) == []
    assert any(isinstance(i, OpenIntent) for i in s.on_close(dates[-3], account()))


def test_trailing_stop_only_tightens():
    frames = trending_frames()
    date = frames["IDX"].index[-1]
    s = TradingSession(make_cfg())
    s.prepare(frames)
    close = frames["IDX"]["close"].iloc[-1]
    low_stop = {"IDX": Position("IDX", 1, 100.0, close - 50, close)}
    (i,) = s.on_close(date, account(positions=low_stop))
    assert isinstance(i, StopIntent) and i.stop_price > close - 50
    tight = {"IDX": Position("IDX", 1, 100.0, close - 0.5, close)}
    assert s.on_close(date, account(positions=tight)) == []


# -- paper broker -------------------------------------------------------------
def test_fill_at_next_open_and_stop_at_stop_price():
    b = broker_for(make_cfg())
    b.submit([OpenIntent("IDX", 10, 95.0)])
    assert not b.positions
    b.process_bar(day(0), {"IDX": bar(100, 102, 99, 101)})
    assert b.positions["IDX"].avg_price == 100
    assert b.account().equity == pytest.approx(10_000 + 10 - 0.1)  # +1 * 10, 1 bps commission
    b.process_bar(day(1), {"IDX": bar(100, 101, 94, 96)})
    assert not b.positions
    assert b.trades[0].exit_price == 95.0 and b.trades[0].reason == "stop"


def test_gap_through_stop_fills_at_open():
    b = broker_for(make_cfg())
    b.submit([OpenIntent("IDX", -10, 105.0)])
    b.process_bar(day(0), {"IDX": bar(100)})
    b.process_bar(day(1), {"IDX": bar(110, 111, 109, 110)})
    t = b.trades[0]
    assert t.reason == "stop_gap" and t.exit_price == 110
    assert t.pnl < -100  # worse than the planned 50 risk


def test_entry_beyond_stop_is_skipped():
    b = broker_for(make_cfg())
    b.submit([OpenIntent("IDX", 10, 95.0)])
    b.process_bar(day(0), {"IDX": bar(94)})
    assert not b.positions and not b.trades


def test_spread_financing_and_bookkeeping():
    cfg = make_cfg()
    cfg.instruments[0].spread_bps = 10
    b = broker_for(cfg)
    b.submit([OpenIntent("IDX", 10, 50.0)])
    b.process_bar(day(0), {"IDX": bar(100)})
    assert b.positions["IDX"].avg_price == pytest.approx(100.05)
    b.process_bar(day(3), {"IDX": bar(100)})  # three nights
    assert b.total_financing == pytest.approx(1000 * 0.065 * 3 / 360)
    b.submit([CloseIntent("IDX", "signal")])
    b.process_bar(day(4), {"IDX": bar(100)})
    assert b.trades[0].exit_price == pytest.approx(99.95)
    # flat again: equity change equals the sum of trade results
    assert b.account().equity - 10_000 == pytest.approx(sum(t.pnl for t in b.trades))
    assert b.trades[0].pnl < 0


def test_stock_has_no_financing_and_needs_full_payment():
    b = broker_for(make_cfg())
    b.submit([OpenIntent("STK", 150, 50.0)])  # 15_000 notional > 10_000 equity
    b.process_bar(day(0), {"STK": bar(100)})
    assert not b.positions
    b.submit([OpenIntent("STK", 50, 50.0)])
    b.process_bar(day(1), {"STK": bar(100)})
    b.process_bar(day(5), {"STK": bar(100)})
    assert b.positions["STK"].qty == 50 and b.total_financing == 0


def test_margin_closeout():
    b = broker_for(make_cfg())
    b.submit([OpenIntent("IDX", 1900, 1.0)])  # 19x leverage, 9_500 margin
    b.process_bar(day(0), {"IDX": bar(100)})
    assert "IDX" in b.positions
    b.process_bar(day(1), {"IDX": bar(100, 100, 96.5, 97)})  # -5_700 -> equity < 50 % of margin
    assert not b.positions and b.trades[0].reason == "margin_closeout"


# -- end to end ---------------------------------------------------------------
def e2e_cfg():
    return make_cfg(data={"provider": "synthetic", "start": "2019-01-01", "end": "2021-12-31"})


def e2e_frames():
    return {s: synthetic(s, "2019-01-01", "2021-12-31") for s in ("IDX", "STK")}


def test_backtest_respects_limits_and_books_consistently():
    cfg = e2e_cfg()
    res = run_backtest(cfg, e2e_frames())
    assert len(res.trades) > 5
    assert (res.equity > 0).all()
    assert all(t.qty > 0 for t in res.trades if t.symbol == "STK")
    open_pnl = sum(p.unrealized_pnl for p in res.broker.positions.values())
    open_costs = sum(m["costs"] for m in res.broker.meta.values())
    booked = sum(t.pnl for t in res.trades) + open_pnl - open_costs
    assert res.broker.account().equity - cfg.initial_capital == pytest.approx(booked)


def test_resume_from_saved_state_matches_single_run(tmp_path):
    cfg, frames = e2e_cfg(), e2e_frames()
    full = run_backtest(cfg, frames)
    dates = list(full.equity.index)
    half = len(dates) // 2

    s1 = TradingSession(cfg)
    s1.prepare(frames)
    b1 = broker_for(cfg)
    first = step_dates(s1, b1, dates[:half])
    path = tmp_path / "state.json"
    s1.state.save(path, {"broker": b1.to_dict()})

    state, extra = SessionState.load(path)
    s2 = TradingSession(cfg, state)
    s2.prepare(frames)
    b2 = broker_for(cfg)
    b2.restore(json.loads(json.dumps(extra["broker"])))
    second = step_dates(s2, b2, dates[half:])
    pd.testing.assert_series_equal(pd.concat([first, second]), full.equity)


def test_cli_backtest_and_paper_run(tmp_path, capsys):
    cfg = e2e_cfg().model_dump()
    cfg["state_file"] = str(tmp_path / "state.json")
    path = tmp_path / "cfg.yaml"
    path.write_text(json.dumps(cfg))  # JSON is valid YAML
    report = tmp_path / "r.html"
    assert main(["-c", str(path), "backtest", "--report", str(report)]) == 0
    assert "<svg" in report.read_text()
    assert main(["-c", str(path), "run", "--broker", "paper"]) == 0
    assert main(["-c", str(path), "run", "--broker", "paper"]) == 0  # second run: nothing new
    out = capsys.readouterr().out
    assert '"processed": []' in out
    assert main(["-c", str(path), "status"]) == 0
