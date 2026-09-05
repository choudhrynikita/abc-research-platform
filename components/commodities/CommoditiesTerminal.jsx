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

function usd(v, unit) {
  if (v == null || Number.isNaN(Number(v))) return "—";
  const n = Number(v);
  const body = n.toLocaleString("en-US", { maximumFractionDigits: n >= 100 ? 2 : 4 });
  return unit ? `$${body}/${unit}` : `$${body}`;
}

function nativeUnit(row) {
  const u = String(row?.unit || "");
  if (u.startsWith("USD/")) return u.slice(4);
  return "";
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
  const notice = data?.loadWarning || data?.message;

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
              Each card is one fill sheet: product, side, 1 lot, ATR dip limit, hard stop, conversion, broker path.
              COMEX gold is USD/oz. MCX Gold Mini is ₹/10g. Confirm LTP before you send.
            </p>
          </div>
          <div className="exec-badges">
            <span className="data-pill">{summary?.actionable ?? 0} to run</span>
            <span className="data-pill">{summary?.strategies ?? 0} tickets</span>
            <span className="data-pill">USDINR {fmt(summary?.usdinr, 2)}</span>
          </div>
        </div>
        {notice ? <p className="strategy-defer-note">{notice}</p> : null}
        <div className="strategy-exec-grid">
          <div>
            <small>Gold COMEX</small>
            <strong>{summary?.goldNativeLabel || usd(summary?.goldNative, "oz")}</strong>
          </div>
          <div>
            <small>Gold est. ₹ / 10g</small>
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
            <small>USDINR</small>
            <strong>{fmt(summary?.usdinr, 4)}</strong>
          </div>
          <div>
            <small>Crude est. ₹ / bbl</small>
            <strong>{fmt(summary?.crude, 1)}</strong>
          </div>
        </div>
        {summary?.goldConversion ? <p className="panel-sub">{summary.goldConversion}</p> : null}
        {summary?.goldBees ? <p className="panel-sub">{summary.goldBees}</p> : null}
      </section>

      <div className="desk-tape-wrap glass-card">
        <p className="academy-kicker">Tape</p>
        {contracts.length ? (
          <div className="legs-table-wrap">
            <table className="legs-table">
              <thead>
                <tr>
                  <th>Contract</th>
                  <th>Native last</th>
                  <th>USDINR</th>
                  <th>MCX est.</th>
                  <th>BeES</th>
                  <th>SMA 20 / 50</th>
                  <th>ADX</th>
                  <th>Trend</th>
                  <th>1D</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.mcx}</strong>
                      <div className="panel-sub">{row.name}{row.error ? ` · ${row.error}` : ""}</div>
                      {row.conversion ? <div className="panel-sub">{row.conversion}</div> : null}
                    </td>
                    <td>{row.nativeLastLabel || (String(row.unit || "").startsWith("USD/") ? usd(row.price, nativeUnit(row)) : fmt(row.price, row.id === "usdinr" ? 4 : 2))}</td>
                    <td>{row.id === "usdinr" ? "—" : fmt(row.usdinr, 4)}</td>
                    <td>{row.mcxEstimate != null ? `₹${fmt(row.mcxEstimate, row.id === "crude" || row.id === "natgas" ? 1 : 0)}` : "—"}</td>
                    <td>
                      {row.proxyName && row.proxy?.price != null
                        ? `₹${fmt(row.proxy.price)}`
                        : row.proxyName
                          ? row.proxyName
                          : "—"}
                      {row.beesCheck ? <div className="panel-sub">{row.beesCheck}</div> : null}
                    </td>
                    <td>
                      {row.sma20 != null && row.sma50 != null
                        ? `${row.id === "usdinr" ? fmt(row.sma20, 4) : usd(row.sma20, nativeUnit(row))} / ${row.id === "usdinr" ? fmt(row.sma50, 4) : usd(row.sma50, nativeUnit(row))}`
                        : "—"}
                    </td>
                    <td>
                      {row.adx != null ? `ADX ${Number(row.adx).toFixed(1)}` : "—"}
                      {row.rsi != null ? ` · RSI ${Number(row.rsi).toFixed(1)}` : ""}
                      {row.atrPct != null ? ` · ATR ${row.atrPct}%` : ""}
                    </td>
                    <td className={tone(row.trend)}>{row.trend || "—"}</td>
                    <td className={tone(row.changePct)}>{pct(row.changePct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="panel-sub">Tape empty — tickets below still name the Indian contract. Refresh, then confirm LTP on MCX.</p>
        )}
      </div>

      <div className="strategy-horizon-filters" role="group" aria-label="Filter commodity tickets">
        <button type="button" className={`chip sm${filter === "all" ? " active" : ""}`} onClick={() => setFilter("all")}>All tickets</button>
        <button type="button" className={`chip sm${filter === "actionable" ? " active" : ""}`} onClick={() => setFilter("actionable")}>Run these</button>
        <button type="button" className={`chip sm${filter === "pass" ? " active" : ""}`} onClick={() => setFilter("pass")}>Stand aside</button>
        {contracts.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`chip sm${filter === c.id ? " active" : ""}`}
            onClick={() => setFilter(c.id)}
          >
            {chipLabel(c)}
          </button>
        ))}
      </div>

      <section className="strategy-list-section">
        <div className="desk-section-head">
          <h3>{filter === "pass" ? "Stand aside" : filter === "actionable" ? "Tickets to run" : "Fill sheets"}</h3>
          <p className="panel-sub">
            Product, side, 1 lot, ATR dip limit, stop, conversion (COMEX × USDINR), numbered how-to. Square crude before the 19th. Gas defaults to no trade.
          </p>
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
            <p className="panel-sub">No tickets in this filter. Tap All tickets.</p>
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

function chipLabel(c) {
  return String(c.mcx || c.id || "").replace("MCX ", "").replace("NSE ", "");
}
