"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import MarketOverviewBar from "./MarketOverviewBar";
import MarketMoversPanel from "./MarketMoversPanel";
import SectorHeatmap from "./SectorHeatmap";
import StockCard from "./StockCard";
import TerminalExport from "../TerminalExport";
import InteractivePriceChart from "../charts/InteractivePriceChart";

function formatRefreshTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString();
}

function IntegrityPanel({ data }) {
  const [open, setOpen] = useState(true);
  if (!data?.dataIntegrity) return null;
  const withFund = (data.top50 || []).filter((s) => s.fundamentalsAvailable).length;
  const total = (data.top50 || []).length;
  return (
    <div className="integrity-panel glass-card">
      <button
        type="button"
        className="expand-head"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <h4>Data Integrity</h4>
        <span aria-hidden>{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <>
          <p className="panel-sub">
            Policy: never hallucinate. Missing metrics show as &quot;Data Unavailable&quot;.
          </p>
          <ul>
            <li>Prices: {data.dataIntegrity.priceSource}</li>
            <li>Fundamentals: {data.dataIntegrity.fundamentalsSource}</li>
            <li>
              Shareholding: {data.dataIntegrity.shareholdingSource || "Licensed feed required"}
            </li>
            <li>
              Fundamentals coverage: {withFund}/{total} recommendations
            </li>
          </ul>
        </>
      )}
    </div>
  );
}

const FILTERS = [
  { id: "all", label: "All" },
  { id: "buy", label: "Buy" },
  { id: "watch", label: "Watch" },
  { id: "breakout", label: "Near Breakout" },
  { id: "golden", label: "Golden Cross" },
];

export default function Nifty500Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sector, setSector] = useState("all");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/nifty500/top50")
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!ok) throw new Error(j.message || j.error || "Failed to load dashboard");
        setData(j);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const stocks = useMemo(() => {
    let list = data?.top50 || [];
    if (sector !== "all") list = list.filter((s) => s.sector === sector);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) => s.name?.toLowerCase().includes(q) || s.symbol?.toLowerCase().includes(q)
      );
    }
    if (filter === "buy") list = list.filter((s) => s.recommendation?.action === "BUY");
    if (filter === "watch") list = list.filter((s) => s.recommendation?.action === "WATCH");
    if (filter === "breakout") {
      list = list.filter((s) => {
        const p = s.price;
        const r = s.technicals?.resistance;
        return p != null && r != null && p >= r * 0.98;
      });
    }
    if (filter === "golden") {
      list = list.filter((s) => {
        const t = s.technicals;
        return t?.sma20 != null && t?.sma50 != null && t.sma20 > t.sma50;
      });
    }
    return list;
  }, [data, sector, filter, search]);

  if (loading) {
    return (
      <div className="terminal-loading">
        <div className="terminal-spinner" />
        <p>Fetching verified market data &amp; running quantitative screen…</p>
        <small>This may take 30–60 seconds while live quotes load.</small>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-panel terminal-error">
        <p>Verified market data is currently unavailable.</p>
        <p className="error-detail">{error}</p>
        <button className="btn btn-primary" type="button" onClick={load}>Retry</button>
      </div>
    );
  }

  const movers = data?.marketMovers;

  return (
    <div className="inst-terminal">
      <header className="terminal-hero">
        <div>
          <p className="terminal-eyebrow">Institutional Equity Research</p>
          <h2>{data?.title}</h2>
          <p className="terminal-sub">{data?.subtitle}</p>
          {data?.universe?.note && <p className="universe-note">{data.universe.note}</p>}
        </div>
        <div className="terminal-hero-actions">
          <button className="btn btn-secondary btn-sm" type="button" onClick={load}>
            Refresh
          </button>
          <TerminalExport module="nifty500" />
          <span className="freshness-pill">
            Updated {formatRefreshTime(data?.dataIntegrity?.refreshedAt)}
          </span>
        </div>
      </header>

      <MarketOverviewBar data={data} />

      <InteractivePriceChart
        symbol="^NSEI"
        title="NIFTY 50 — Interactive Market Chart"
        subtitle="Verified OHLCV · Official Yahoo Finance feed"
        defaultRange="6mo"
        showVolume
        showSma20
        showSma50
      />

      <MarketMoversPanel movers={movers} />

      <div className="terminal-toolbar glass-card">
        <label className="visually-hidden" htmlFor="nifty500-search">
          Search ticker or company
        </label>
        <input
          id="nifty500-search"
          type="search"
          className="terminal-search"
          placeholder="Search ticker or company…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search ticker or company"
        />
        <label className="visually-hidden" htmlFor="nifty500-sector">
          Filter by sector
        </label>
        <select
          id="nifty500-sector"
          value={sector}
          onChange={(e) => setSector(e.target.value)}
          className="terminal-select"
          aria-label="Filter by sector"
        >
          <option value="all">All Sectors</option>
          {(data?.filters?.sectors || []).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <div className="filter-chips" role="group" aria-label="Recommendation filters">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`chip${filter === f.id ? " active" : ""}`}
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="terminal-grid">
        <div className="stocks-column">
          <div className="section-head">
            <h3>Top Recommendations</h3>
            <span>{stocks.length} stocks</span>
          </div>
          <div className="stock-grid">
            {stocks.map((stock, i) => (
              <StockCard key={stock.symbol} stock={stock} rank={i + 1} />
            ))}
          </div>
          {!stocks.length && (
            <p className="empty-state">No stocks match the current filters with verified data.</p>
          )}
        </div>
        <aside className="terminal-aside">
          <SectorHeatmap sectors={data?.sectorHeatmap} />
          <IntegrityPanel data={data} />
        </aside>
      </div>
    </div>
  );
}