"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import TerminalRefreshBar from "../TerminalRefreshBar";
import { fetchDashboardJson } from "../terminal-fetch";
import TradePlanCard from "../desk/TradePlanCard";

function fmt(v, d = 2) {
  if (v == null || Number.isNaN(Number(v))) return "—";
  return Number(v).toLocaleString("en-IN", { maximumFractionDigits: d });
}

function fmtRs(v, d = 2) {
  if (v == null || Number.isNaN(Number(v))) return "—";
  return `₹${fmt(v, d)}`;
}

function pct(v) {
  if (v == null || Number.isNaN(Number(v))) return "—";
  const n = Number(v);
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
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

function EtfCard({ row, selected, onSelect }) {
  return (
    <article
      className={`fund-card glass-card${selected ? " selected" : ""}`}
      onClick={() => onSelect?.(row)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect?.(row)}
    >
      <header className="fund-card-head">
        <div>
          <h4>{row.nse}</h4>
          <p>{row.name}</p>
        </div>
        <span className="strategy-horizon-pill">{row.playbook?.action || row.tracks}</span>
      </header>
      {row.playbook?.tradeLine ? <p className="etf-action-chip">{row.playbook.tradeLine}</p> : null}
      <div className="fund-metrics">
        <div>
          <small>Last (NSE)</small>
          <strong>{fmtRs(row.price)}</strong>
        </div>
        <div>
          <small>1D</small>
          <strong className={tone(row.changePct)}>{pct(row.changePct)}</strong>
        </div>
        <div>
          <small>NAV</small>
          <strong>{fmtRs(row.nav, 4)}</strong>
        </div>
        <div>
          <small>Prem / disc</small>
          <strong className={tone(row.premiumPct)}>{pct(row.premiumPct)}</strong>
        </div>
        <div>
          <small>1M</small>
          <strong className={tone(row.ret1m)}>{pct(row.ret1m)}</strong>
        </div>
        <div>
          <small>Trend</small>
          <strong className={tone(row.trend)}>{row.trend || "—"}</strong>
        </div>
      </div>
      {row.error ? <p className="panel-sub">Quote unavailable: {row.error}</p> : null}
    </article>
  );
}

function FundCard({ row }) {
  return (
    <article className="fund-card glass-card">
      <header className="fund-card-head">
        <div>
          <h4>{row.name}</h4>
          <p>{row.amc || row.category}</p>
        </div>
        <span className="strategy-horizon-pill">{row.playbook?.action || row.kind}</span>
      </header>
      {row.playbook?.tradeLine ? <p className="etf-action-chip">{row.playbook.tradeLine}</p> : null}
      <div className="fund-metrics">
        <div>
          <small>NAV</small>
          <strong>{fmtRs(row.nav, 4)}</strong>
        </div>
        <div>
          <small>1D vs prior print</small>
          <strong className={tone(row.changePct)}>{pct(row.changePct)}</strong>
        </div>
        <div>
          <small>NAV date</small>
          <strong>{row.date || "—"}</strong>
        </div>
      </div>
      {row.blurb ? <p className="panel-sub">{row.blurb}</p> : null}
    </article>
  );
}

export default function FundsTerminal() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState("playbook");
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState(null);
  const [searching, setSearching] = useState(false);

  const load = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    fetchDashboardJson(isRefresh ? "/api/funds/dashboard?refresh=1" : "/api/funds/dashboard")
      .then((j) => {
        setData(j);
        setSelected((prev) => {
          const next = j.strategies?.find((s) => s.id === prev?.id);
          return next || j.strategies?.find((s) => s.status === "Plan") || j.strategies?.[0] || null;
        });
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

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSearch(null);
      return undefined;
    }
    const t = setTimeout(() => {
      setSearching(true);
      fetch(`/api/funds/search?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((j) => setSearch(j))
        .catch(() => setSearch({ results: [], error: "Search failed" }))
        .finally(() => setSearching(false));
    }, 280);
    return () => clearTimeout(t);
  }, [query]);

  const etfs = data?.etfs || [];
  const featured = data?.featured || [];
  const summary = data?.executiveSummary;
  const playbook = data?.strategies || [];
  const kindFilter = tab === "etf" || tab === "playbook" || tab === "funds" ? null : tab;
  const filteredFeatured = useMemo(() => {
    if (!kindFilter) return featured;
    return featured.filter((f) => f.kind === kindFilter);
  }, [featured, kindFilter]);

  if (loading) {
    return (
      <div className="terminal-loading">
        <div className="terminal-spinner" />
        <p>Loading AMFI NAVs, Nifty BeES quotes and SIP tickets…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="strategy-error glass-card">
        <p>Funds desk unavailable.</p>
        <p className="error-detail">{error}</p>
        <button className="btn btn-primary" type="button" onClick={() => load(false)}>
          Retry
        </button>
      </div>
    );
  }

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
            <p className="terminal-eyebrow">Mutual funds & ETFs</p>
            <h2>Named tickets — Nifty BeES, Gold BeES, SIPs, skip rules</h2>
            <p className="panel-sub">
              Every card says BUY, WAIT or SIP with a rupee size. Nifty BeES is an ETF you fill on NSE.
              Index funds print a NAV. Skip a fill when the ETF is more than 0.7% rich to NAV.
            </p>
          </div>
          <div className="exec-badges">
            <span className="data-pill">{summary?.actionable ?? playbook.filter((s) => s.status === "Plan").length} playbooks</span>
            <span className="data-pill">NAV {summary?.navDate || "—"}</span>
          </div>
        </div>
        <div className="strategy-exec-grid">
          <div>
            <small>Nifty BeES</small>
            <strong>{fmtRs(summary?.niftyBees)}</strong>
          </div>
          <div>
            <small>BeES 1D</small>
            <strong className={tone(summary?.niftyBeesChange)}>{pct(summary?.niftyBeesChange)}</strong>
          </div>
          <div>
            <small>BeES NAV</small>
            <strong>{fmtRs(summary?.niftyBeesNav, 4)}</strong>
          </div>
          <div>
            <small>Prem / disc</small>
            <strong className={tone(summary?.niftyBeesPremium)}>{pct(summary?.niftyBeesPremium)}</strong>
          </div>
        </div>
      </section>

      <label className="funds-search glass-card">
        <span>Search AMFI schemes</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Parag Parikh, Nifty BeES, UTI index…"
        />
      </label>

      {query.trim().length >= 2 && (
        <section className="strategy-list-section">
          <div className="section-head">
            <h3>Search</h3>
            <p className="panel-sub">{searching ? "Looking up AMFI…" : `${search?.results?.length || 0} matches`}</p>
          </div>
          <div className="strategy-grid">
            {(search?.results || []).map((row) => (
              <FundCard key={row.code + row.name} row={row} />
            ))}
          </div>
        </section>
      )}

      <div className="strategy-horizon-filters" role="tablist" aria-label="Funds desk views">
        {[
          ["playbook", "Do this"],
          ["etf", "ETF tape"],
          ["funds", "Featured funds"],
          ["index", "Index funds"],
          ["flexicap", "Flexi / multi cap"],
          ["elss", "ELSS"],
          ["debt", "Debt"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`chip sm${tab === id ? " active" : ""}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "playbook" ? (
        <section className="strategy-list-section">
          <div className="section-head">
            <h3>Playbook — the actual trades</h3>
            <p className="panel-sub">
              Core Nifty SIP, Gold BeES overlay, Bank/IT/Junior satellites, cash bucket, 70/20/10 book.
            </p>
          </div>
          <div className="desk-legend" aria-hidden="true">
            <span><strong>BUY / SIP</strong> fill this size</span>
            <span><strong>WAIT</strong> premium too rich or tape extended</span>
            <span><strong>Stop / rule</strong> when this product is wrong</span>
            <span><strong>Do this</strong> numbered ticket, in order</span>
          </div>
          <div className="strategy-grid">
            {playbook.map((s) => (
              <TradePlanCard
                key={s.id}
                plan={s}
                selected={selected?.id === s.id}
                onSelect={setSelected}
              />
            ))}
          </div>
        </section>
      ) : null}

      {tab === "etf" ? (
        <section className="strategy-list-section">
          <div className="section-head">
            <h3>Index & commodity ETFs</h3>
            <p className="panel-sub">
              Tape only. The playbook tab is the strategy. Prefer a tight premium and CNC delivery.
            </p>
          </div>
          <div className="strategy-grid">
            {etfs.map((row) => (
              <EtfCard
                key={row.nse}
                row={row}
                selected={selected?.contract === row.nse}
                onSelect={() => setSelected(playbook.find((s) => s.contract === row.nse) || { id: row.nse, contract: row.nse })}
              />
            ))}
          </div>
        </section>
      ) : null}

      {tab !== "playbook" && tab !== "etf" ? (
        <section className="strategy-list-section">
          <div className="section-head">
            <h3>{tab === "funds" ? "Featured mutual funds" : `Featured · ${tab}`}</h3>
            <p className="panel-sub">
              Direct–Growth NAVs. Use the 70/20/10 playbook rather than chasing last quarter's trophy.
            </p>
          </div>
          <div className="strategy-grid">
            {filteredFeatured.map((row) => (
              <FundCard key={row.code} row={row} />
            ))}
          </div>
        </section>
      ) : null}

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
