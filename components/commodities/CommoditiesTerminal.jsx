"use client";

import { useCallback, useEffect, useState } from "react";
import TerminalRefreshBar from "../TerminalRefreshBar";
import { fetchDashboardJson } from "../terminal-fetch";

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
    if (v === "BULLISH") return "up";
    if (v === "BEARISH") return "down";
    return "";
  }
  if (v > 0) return "up";
  if (v < 0) return "down";
  return "";
}

function zone(z) {
  if (!z) return "—";
  if (typeof z === "string") return z;
  if (z.low != null && z.high != null) return `${fmt(z.low)} – ${fmt(z.high)}`;
  return "—";
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
        setSelected((prev) => j.contracts?.find((c) => c.id === prev?.id) || j.contracts?.[0] || null);
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

  if (loading) {
    return (
      <div className="terminal-loading">
        <div className="terminal-spinner" />
        <p>Loading gold, silver, crude, gas, copper and USDINR…</p>
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

  const contracts = data?.contracts || [];
  const strategies = (data?.strategies || []).filter((s) => filter === "all" || s.commodityId === filter);
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
            <h2>Gold, silver, crude, gas, copper, USDINR</h2>
            <p className="panel-sub">
              COMEX/NYMEX last prices plus Indian BeES wrappers. MCX rupee lots can differ the same minute — treat this as the map, confirm on your MCX LTP.
            </p>
          </div>
          <div className="exec-badges">
            <span className="data-pill">{summary?.contractsLive ?? 0} quotes</span>
            <span className="data-pill">{summary?.strategies ?? 0} plans</span>
          </div>
        </div>
        <div className="strategy-exec-grid">
          <div>
            <small>Gold</small>
            <strong>{fmt(summary?.gold)}</strong>
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
            <small>WTI crude</small>
            <strong>{fmt(summary?.crude)}</strong>
          </div>
          <div>
            <small>Crude 1D</small>
            <strong className={tone(summary?.crudeChange)}>{pct(summary?.crudeChange)}</strong>
          </div>
        </div>
      </section>

      <section className="strategy-list-section">
        <div className="section-head">
          <h3>Contracts</h3>
        </div>
        <div className="strategy-grid">
          {contracts.map((row) => (
            <article
              key={row.id}
              className={`fund-card glass-card${selected?.id === row.id ? " selected" : ""}`}
              onClick={() => setSelected(row)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && setSelected(row)}
            >
              <header className="fund-card-head">
                <div>
                  <h4>{row.name}</h4>
                  <p>{row.mcx} · {row.venue}</p>
                </div>
                <span className="strategy-horizon-pill">{row.kind}</span>
              </header>
              <div className="fund-metrics">
                <div>
                  <small>Last</small>
                  <strong>{fmt(row.price)}</strong>
                </div>
                <div>
                  <small>1D</small>
                  <strong className={tone(row.changePct)}>{pct(row.changePct)}</strong>
                </div>
                <div>
                  <small>Trend</small>
                  <strong className={tone(row.trend)}>{row.trend || "—"}</strong>
                </div>
                <div>
                  <small>ATR</small>
                  <strong>{fmt(row.atr)}</strong>
                </div>
                <div>
                  <small>1M</small>
                  <strong className={tone(row.ret1m)}>{pct(row.ret1m)}</strong>
                </div>
                {row.proxy ? (
                  <div>
                    <small>{row.proxyName}</small>
                    <strong>{fmt(row.proxy.price)}</strong>
                  </div>
                ) : null}
              </div>
              {row.error ? <p className="panel-sub">{row.error}</p> : null}
            </article>
          ))}
        </div>
      </section>

      <div className="strategy-horizon-filters" role="group" aria-label="Filter commodity plans">
        <button type="button" className={`chip sm${filter === "all" ? " active" : ""}`} onClick={() => setFilter("all")}>All plans</button>
        {contracts.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`chip sm${filter === c.id ? " active" : ""}`}
            onClick={() => setFilter(c.id)}
          >
            {c.name}
          </button>
        ))}
      </div>

      <section className="strategy-list-section">
        <div className="section-head">
          <h3>Trading plans</h3>
          <p className="panel-sub">ATR-sized trend or range plans from verified daily candles. Confirm MCX LTP and SPAN before you size.</p>
        </div>
        <div className="strategy-grid">
          {strategies.map((s) => (
            <article key={s.id} className="fund-card glass-card">
              <header className="fund-card-head">
                <div>
                  <h4>{s.name}</h4>
                  <p>{s.mcx} · {s.type} · {s.holdingPeriod}</p>
                </div>
                <span className={`strategy-horizon-pill ${tone(s.bias)}`}>{s.bias}</span>
              </header>
              <div className="fund-metrics">
                <div>
                  <small>Last</small>
                  <strong>{fmt(s.last)}</strong>
                </div>
                <div>
                  <small>Entry zone</small>
                  <strong>{zone(s.entryZone)}</strong>
                </div>
                <div>
                  <small>Stop</small>
                  <strong>{typeof s.stopLoss === "number" ? fmt(s.stopLoss) : s.stopLoss || "—"}</strong>
                </div>
                <div>
                  <small>T1</small>
                  <strong>{typeof s.targets?.t1 === "number" ? fmt(s.targets.t1) : s.targets?.t1 || "—"}</strong>
                </div>
              </div>
              {s.why?.length ? (
                <ul className="why-rationale">
                  {s.why.map((w) => (
                    <li key={w.text}>
                      {w.category ? <span className={`why-tag why-${w.category.toLowerCase()}`}>{w.category}</span> : null}
                      <span>{w.text}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {s.caution ? <p className="strategy-defer-note">{s.caution}</p> : null}
            </article>
          ))}
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
