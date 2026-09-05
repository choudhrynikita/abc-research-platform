"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import TerminalRefreshBar from "../TerminalRefreshBar";
import { fetchDashboardJson } from "../terminal-fetch";
import TradePlanCard from "../desk/TradePlanCard";

function fmt(v, d = 2) {
  if (v == null || Number.isNaN(Number(v))) return "—";
  return Number(v).toLocaleString("en-IN", { maximumFractionDigits: d });
}

function pct(v) {
  if (v == null || Number.isNaN(Number(v))) return "—";
  const n = Number(v);
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function tone(v) {
  if (v == null) return "";
  if (typeof v === "string") {
    if (v === "BULLISH" || v === "Bullish") return "up";
    if (v === "BEARISH" || v === "Bearish") return "down";
    return "";
  }
  if (v > 0) return "up";
  if (v < 0) return "down";
  return "";
}

export default function CommoditiesTerminal() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  const load = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    fetchDashboardJson(isRefresh ? "/api/commodities/dashboard?refresh=1" : "/api/commodities/dashboard")
      .then((j) => {
        setData(j);
        const first = (j.strategies || []).find((s) => s.status === "Plan") || j.strategies?.[0] || null;
        setSelected((prev) => (j.strategies || []).find((s) => s.id === prev?.id) || first);
      })
      .catch((e) => setError(e.message))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const contracts = data?.contracts || [];
  const strategies = useMemo(() => {
    const all = data?.strategies || [];
    if (filter === "actionable") return all.filter((s) => s.status === "Plan");
    if (filter === "pass") return all.filter((s) => s.status === "Pass");
    if (filter === "all") return all;
    return all.filter((s) => s.commodityId === filter);
  }, [data, filter]);

  if (loading) {
    return (
      <div className="terminal-loading">
        <div className="terminal-spinner" />
        <p>Building MCX gold, silver, crude, gas, copper and USDINR tickets…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="strategy-error glass-card">
        <p>Commodities desk unavailable.</p>
        <p className="error-detail">{error}</p>
        <button className="btn btn-primary" type="button" onClick={() => load(false)}>Retry</button>
      </div>
    );
  }

  const summary = data?.executiveSummary;

  return (
    <div className={`funds-terminal terminal-vertical${refreshing ? " is-refreshing" : ""}`}>
      <TerminalRefreshBar
        onRefresh={() => load(true)}
        refreshing={refreshing}
        refreshedAt={data?.refreshedAt}
        disabled={loading}
      />

      <section className="strategy-exec glass-card">
        <div className="exec-head">
          <div>
            <p className="terminal-eyebrow">Commodities desk</p>
            <h2>Named tickets — GOLDMINI, SILVERM, CRUDEOIL, GAS, COPPER, USDINR</h2>
            <p className="panel-sub">
              Each card is a fill sheet: where, product, side, 1 lot, limit, hard stop. Confirm MCX LTP — rupee levels are COMEX × USDINR estimates.
            </p>
          </div>
          <div className="exec-badges">
            <span className="data-pill">{summary?.actionable ?? 0} actionable</span>
            <span className="data-pill">USDINR {fmt(summary?.usdinr, 2)}</span>
          </div>
        </div>
        <div className="strategy-exec-grid">
          <div>
            <small>Gold (est. ₹ / 10g)</small>
            <strong>{fmt(summary?.gold, 0)}</strong>
          </div>
          <div>
            <small>Gold 1D</small>
            <strong className={tone(summary?.goldChange)}>{pct(summary?.goldChange)}</strong>
          </div>
          <div>
            <small>Gold trend</small>
            <strong className={tone(summary?.goldTrend)}>{summary?.goldTrend || "—"}</strong>
          </div>
          <div>
            <small>Crude (est. ₹ / bbl)</small>
            <strong>{fmt(summary?.crude, 1)}</strong>
          </div>
        </div>
      </section>

      <div className="desk-tape-wrap glass-card">
        <p className="academy-kicker">Tape</p>
        <div className="legs-table-wrap">
          <table className="legs-table">
            <thead>
              <tr>
                <th>Contract</th>
                <th>Trend</th>
                <th>Dollar last</th>
                <th>MCX estimate</th>
                <th>1D</th>
                <th>ATR %</th>
                <th>India wrapper</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.mcx}</strong>
                    <div className="panel-sub">{row.name}</div>
                  </td>
                  <td className={tone(row.trend)}>{row.trend || "—"}</td>
                  <td>{fmt(row.price)}</td>
                  <td>{row.mcxEstimate != null ? `₹${fmt(row.mcxEstimate)}` : "—"}</td>
                  <td className={tone(row.changePct)}>{pct(row.changePct)}</td>
                  <td>{row.atrPct != null ? `${row.atrPct}%` : "—"}</td>
                  <td>{row.proxyName ? `${row.proxyName} ₹${fmt(row.proxy?.price)}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="strategy-horizon-filters" role="group" aria-label="Filter commodity tickets">
        <button type="button" className={`chip sm${filter === "all" ? " active" : ""}`} onClick={() => setFilter("all")}>All strategies</button>
        <button type="button" className={`chip sm${filter === "actionable" ? " active" : ""}`} onClick={() => setFilter("actionable")}>Do this</button>
        <button type="button" className={`chip sm${filter === "pass" ? " active" : ""}`} onClick={() => setFilter("pass")}>Stand aside</button>
        {contracts.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`chip sm${filter === c.id ? " active" : ""}`}
            onClick={() => setFilter(c.id)}
          >
            {c.mcx.replace("MCX ", "").replace("NSE ", "")}
          </button>
        ))}
      </div>

      <section className="strategy-list-section">
        <div className="section-head">
          <h3>{filter === "pass" ? "Stand aside" : filter === "actionable" ? "Tickets to run" : "All strategies"}</h3>
          <p className="panel-sub">Each card is a fill sheet: product, 1 lot, limit, stop. Square before delivery. Confirm SPAN.</p>
        </div>
        <div className="desk-legend" aria-hidden="true">
          <span><strong>BUY 1 lot</strong> dip to support, ATR stop</span>
          <span><strong>SELL 1 lot</strong> fade resistance</span>
          <span><strong>NO TRADE</strong> gas, mixed SMA, low ADX</span>
          <span><strong>Heat</strong> 1.5× ATR in rupees — skip if over 1% of equity</span>
        </div>
        <div className="strategy-grid">
          {strategies.length ? (
            strategies.map((s) => (
              <TradePlanCard
                key={s.id}
                plan={s}
                selected={selected?.id === s.id}
                onSelect={setSelected}
              />
            ))
          ) : (
            <p className="panel-sub">No tickets in this filter. Open All tickets.</p>
          )}
        </div>
      </section>

      {data?.notes?.length ? (
        <ul className="fund-notes">
          {data.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
