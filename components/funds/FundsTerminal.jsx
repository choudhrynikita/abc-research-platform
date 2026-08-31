"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import TerminalRefreshBar from "../TerminalRefreshBar";
import { fetchDashboardJson } from "../terminal-fetch";

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
        <span className="strategy-horizon-pill">{row.tracks}</span>
      </header>
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
          <small>NAV (AMFI)</small>
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
          <small>3M</small>
          <strong className={tone(row.ret3m)}>{pct(row.ret3m)}</strong>
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
        <span className="strategy-horizon-pill">{row.kind}</span>
      </header>
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
        <div>
          <small>Code</small>
          <strong>{row.code || "—"}</strong>
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
  const [tab, setTab] = useState("etf");
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
          const bees = j.etfs?.find((e) => e.nse === "NIFTYBEES") || j.etfs?.[0] || null;
          if (!prev) return bees;
          return j.etfs?.find((e) => e.nse === prev.nse) || bees;
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
  const kindFilter = tab === "etf" ? null : tab;
  const filteredFeatured = useMemo(() => {
    if (!kindFilter || kindFilter === "funds") return featured;
    return featured.filter((f) => f.kind === kindFilter);
  }, [featured, kindFilter]);

  if (loading) {
    return (
      <div className="terminal-loading">
        <div className="terminal-spinner" />
        <p>Loading AMFI NAVs and Nifty BeES quotes…</p>
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
            <p className="terminal-eyebrow">Funds desk</p>
            <h2>Mutual funds & index ETFs</h2>
            <p className="panel-sub">
              Nifty BeES and peers trade like stocks. Mutual-fund NAVs print once a day on AMFI.
              Premium/discount tells you if the ETF is rich vs its NAV.
            </p>
          </div>
          <div className="exec-badges">
            <span className="data-pill">{summary?.etfCount ?? 0} ETF quotes</span>
            <span className="data-pill">{fmt(summary?.schemeCount, 0)} AMFI schemes</span>
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
          ["etf", "Index ETFs (BeES)"],
          ["funds", "Featured mutual funds"],
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

      {tab === "etf" ? (
        <section className="strategy-list-section">
          <div className="section-head">
            <h3>Index & commodity ETFs</h3>
            <p className="panel-sub">
              Nifty BeES is an ETF: you buy it on NSE like a share. It tracks Nifty 50. Bank BeES, Junior BeES,
              Gold BeES work the same way for their indices / metal.
            </p>
          </div>
          <div className="strategy-grid">
            {etfs.map((row) => (
              <EtfCard
                key={row.nse}
                row={row}
                selected={selected?.nse === row.nse}
                onSelect={setSelected}
              />
            ))}
          </div>
        </section>
      ) : (
        <section className="strategy-list-section">
          <div className="section-head">
            <h3>{tab === "funds" ? "Featured mutual funds" : `Featured · ${tab}`}</h3>
            <p className="panel-sub">
              Growth options where AMFI matched. Search above for any of the {fmt(summary?.schemeCount, 0)} schemes.
            </p>
          </div>
          <div className="strategy-grid">
            {filteredFeatured.map((row) => (
              <FundCard key={row.code} row={row} />
            ))}
          </div>
        </section>
      )}

      {selected && tab === "etf" ? (
        <section className="glass-card fund-detail">
          <p className="academy-kicker">Selected ETF</p>
          <h3>
            {selected.nse} · {selected.name}
          </h3>
          <p>
            Tracks {selected.tracks}. Last {fmtRs(selected.price)} versus AMFI NAV {fmtRs(selected.nav, 4)}
            {selected.premiumPct != null
              ? ` (${pct(selected.premiumPct)} ${selected.premiumPct >= 0 ? "premium" : "discount"}).`
              : "."}{" "}
            52-week {fmtRs(selected.low52)} – {fmtRs(selected.high52)}. Volume {fmt(selected.volume, 0)}.
          </p>
          <p className="panel-sub">
            A Nifty BeES-style ETF is not a mutual fund SIP unit. You pay the NSE price, you can sell in the
            cash session, and tracking error + TER still eat a little of the index. Prefer a tight premium and
            liquid volume.
          </p>
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
