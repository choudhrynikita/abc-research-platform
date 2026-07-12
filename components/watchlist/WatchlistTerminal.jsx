"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const DATA_UNAVAILABLE = "Data Unavailable";

function fmtPrice(v) {
  if (v == null || Number.isNaN(Number(v))) return DATA_UNAVAILABLE;
  return Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function fmtPct(v) {
  if (v == null || Number.isNaN(Number(v))) return DATA_UNAVAILABLE;
  const n = Number(v);
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

export default function WatchlistTerminal() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [symbol, setSymbol] = useState("");
  const [busy, setBusy] = useState(false);
  const [listId, setListId] = useState("default");

  const load = useCallback(async (id = listId) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/watchlists?id=${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error(`Watchlist API ${res.status}`);
      const json = await res.json();
      const body = json.data || json;
      setData(body);
      if (body.list?.id) setListId(body.list.id);
    } catch (e) {
      setError(e.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [listId]);

  useEffect(() => {
    load("default");
  }, []);

  async function addSymbol(e) {
    e.preventDefault();
    if (!symbol.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/watchlists/${encodeURIComponent(listId)}/symbols`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: symbol.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Add failed");
      setSymbol("");
      await load(listId);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeSymbol(sym) {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/watchlists/${encodeURIComponent(listId)}/symbols/${encodeURIComponent(sym)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Remove failed");
      }
      await load(listId);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const items = data?.items || [];

  return (
    <div className="watchlist-terminal terminal-page">
      <header className="terminal-header glass-card">
        <div>
          <p className="terminal-eyebrow">Watchlists</p>
          <h1>{data?.list?.name || "Primary Watchlist"}</h1>
          <p className="panel-sub">
            Live quotes from Yahoo Finance only. Missing prices show Data Unavailable — never estimated.
          </p>
        </div>
        <div className="terminal-hero-actions">
          <a className="btn btn-secondary btn-sm" href={`/api/watchlists/export?id=${encodeURIComponent(listId)}`}>
            Export CSV
          </a>
          <button type="button" className="btn btn-secondary" onClick={() => load(listId)} disabled={loading}>
            Refresh
          </button>
        </div>
      </header>
      {data?.persistence && (
        <p className="panel-sub glass-card" style={{ padding: "10px 14px", margin: 0 }}>
          Storage mode: <strong>{data.persistence.storageMode}</strong>
          {data.persistence.brokerLink && (
            <> · {data.persistence.brokerLink.reason}</>
          )}
        </p>
      )}

      {data?.breadth && (
        <div className="wl-breadth glass-card">
          <div>
            <small>Advancing</small>
            <strong className="up">{data.breadth.advancing}</strong>
          </div>
          <div>
            <small>Declining</small>
            <strong className="down">{data.breadth.declining}</strong>
          </div>
          <div>
            <small>With quotes</small>
            <strong>{data.breadth.withQuotes}</strong>
          </div>
          <div>
            <small>Unavailable</small>
            <strong>{data.breadth.withoutQuotes}</strong>
          </div>
        </div>
      )}

      <form className="wl-add-form glass-card" onSubmit={addSymbol}>
        <label htmlFor="wl-symbol">Add symbol (e.g. RELIANCE or RELIANCE.NS)</label>
        <div className="wl-add-row">
          <input
            id="wl-symbol"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="SYMBOL"
            autoComplete="off"
            disabled={busy}
          />
          <button type="submit" className="btn btn-primary" disabled={busy || !symbol.trim()}>
            Add
          </button>
        </div>
      </form>

      {error && (
        <div className="glass-card error-banner" role="alert">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="glass-card loading-panel">
          <p>Loading verified quotes…</p>
        </div>
      ) : items.length === 0 ? (
        <div className="glass-card empty-state">
          <h3>Watchlist empty</h3>
          <p>Add NSE tickers to track. Quotes use verified Yahoo Finance data only.</p>
        </div>
      ) : (
        <div className="wl-table-wrap glass-card">
          <table className="wl-table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Name</th>
                <th>Sector</th>
                <th>Last</th>
                <th>Change</th>
                <th>Volume</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((row) => {
                const chg = row.changePercent;
                const chgCls = chg == null ? "" : chg >= 0 ? "up" : "down";
                return (
                  <tr key={row.symbol}>
                    <td>
                      <Link href={`/nifty500/stock/${encodeURIComponent(row.symbol)}`}>
                        {row.symbol.replace(".NS", "")}
                      </Link>
                    </td>
                    <td>{row.name || DATA_UNAVAILABLE}</td>
                    <td>{row.sector || DATA_UNAVAILABLE}</td>
                    <td>{fmtPrice(row.price)}</td>
                    <td className={chgCls}>{fmtPct(chg)}</td>
                    <td>
                      {row.volume != null
                        ? Number(row.volume).toLocaleString("en-IN")
                        : DATA_UNAVAILABLE}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        onClick={() => removeSymbol(row.symbol)}
                        disabled={busy}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {data?.refreshedAt && (
            <p className="panel-sub wl-meta">
              Refreshed {new Date(data.refreshedAt).toLocaleString()} ·{" "}
              {data.policy?.note}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
