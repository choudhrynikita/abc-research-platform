"use client";

import { useCallback, useEffect, useState } from "react";
import IpoCard from "./IpoCard";
import IpoDetailView from "./IpoDetailView";
import TerminalExport from "../TerminalExport";

const TABS = [
  { id: "open", label: "Open" },
  { id: "upcoming", label: "Upcoming" },
  { id: "listed", label: "Listed (30D)" },
];

export default function IpoTerminal() {
  const [dashboard, setDashboard] = useState(null);
  const [detail, setDetail] = useState(null);
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState("open");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadDetail = useCallback((symbol) => {
    if (!symbol) return;
    setDetailLoading(true);
    fetch(`/api/ipo/terminal/${encodeURIComponent(symbol)}`)
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!ok && !j.available) {
          setDetail(j);
          return;
        }
        if (!ok) throw new Error(j.message || j.error);
        setDetail(j);
      })
      .catch((e) => setError(e.message))
      .finally(() => setDetailLoading(false));
  }, []);

  const loadDashboard = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/ipo/terminal")
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!ok) throw new Error(j.message || j.error || "Failed to load");
        setDashboard(j);
        const first = j.sections?.open?.[0] || j.sections?.upcoming?.[0] || j.sections?.listed?.[0];
        if (first) setSelected(first);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  useEffect(() => {
    if (selected?.symbol) loadDetail(selected.symbol);
  }, [selected?.symbol, loadDetail]);

  const handleSelect = (ipo) => setSelected(ipo);

  if (loading) {
    return (
      <div className="terminal-loading">
        <div className="terminal-spinner" />
        <p>Fetching verified IPO data from NSE…</p>
      </div>
    );
  }

  if (error && !dashboard) {
    return (
      <div className="strategy-error glass-card">
        <p>IPO data unavailable.</p>
        <p className="error-detail">{error}</p>
        <button className="btn btn-primary" type="button" onClick={loadDashboard}>Retry</button>
      </div>
    );
  }

  const counts = dashboard?.counts || {};
  const list = dashboard?.sections?.[tab] || [];

  return (
    <div className="ipo-terminal">
      <section className="ipo-hub-exec glass-card">
        <div className="exec-head">
          <div>
            <p className="terminal-eyebrow">IPO Research Center</p>
            <h2>Institutional IPO Intelligence</h2>
            <p className="panel-sub">NSE verified · Upcoming, open &amp; recently listed only</p>
          </div>
          <button className="btn btn-ghost btn-sm" type="button" onClick={loadDashboard}>Refresh</button>
          <TerminalExport module="ipo" symbol={selected?.symbol} />
        </div>
        <div className="ipo-count-strip">
          <div><small>Open</small><strong>{counts.open ?? 0}</strong></div>
          <div><small>Upcoming</small><strong>{counts.upcoming ?? 0}</strong></div>
          <div><small>Listed 30D</small><strong>{counts.listed ?? 0}</strong></div>
          <div><small>Updated</small><strong>{dashboard?.refreshedAt ? new Date(dashboard.refreshedAt).toLocaleString() : "—"}</strong></div>
        </div>
      </section>

      <div className="ipo-layout">
        <aside className="ipo-sidebar">
          <div className="ipo-tabs">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`chip${tab === t.id ? " active" : ""}`}
                onClick={() => setTab(t.id)}
              >
                {t.label} ({counts[t.id] ?? 0})
              </button>
            ))}
          </div>
          <div className="ipo-card-list">
            {list.length === 0 ? (
              <p className="ipo-empty">No IPOs in this category — awaiting NSE feed.</p>
            ) : (
              list.map((ipo) => (
                <IpoCard
                  key={ipo.symbol}
                  ipo={ipo}
                  selected={selected?.symbol === ipo.symbol}
                  onSelect={handleSelect}
                />
              ))
            )}
          </div>
        </aside>

        <main className="ipo-main">
          <IpoDetailView data={detail} loading={detailLoading} />
        </main>
      </div>

    </div>
  );
}