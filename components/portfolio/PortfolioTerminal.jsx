"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const DATA_UNAVAILABLE = "Data Unavailable";

function fmtInr(v) {
  if (v == null || Number.isNaN(Number(v))) return DATA_UNAVAILABLE;
  return `₹${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function fmtPct(v) {
  if (v == null || Number.isNaN(Number(v))) return DATA_UNAVAILABLE;
  const n = Number(v);
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

export default function PortfolioTerminal() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [portfolioId, setPortfolioId] = useState("default");
  const [form, setForm] = useState({ symbol: "", quantity: "", avgCost: "" });

  const load = useCallback(async (id = portfolioId) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/portfolios?id=${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error(`Portfolio API ${res.status}`);
      const json = await res.json();
      const body = json.data || json;
      setData(body);
      if (body.portfolio?.id) setPortfolioId(body.portfolio.id);
    } catch (e) {
      setError(e.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [portfolioId]);

  useEffect(() => {
    load("default");
  }, []);

  async function saveHolding(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/portfolios/${encodeURIComponent(portfolioId)}/holdings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: form.symbol.trim(),
          quantity: Number(form.quantity),
          avgCost: Number(form.avgCost),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      setForm({ symbol: "", quantity: "", avgCost: "" });
      await load(portfolioId);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeHolding(sym) {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/portfolios/${encodeURIComponent(portfolioId)}/holdings/${encodeURIComponent(sym)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Remove failed");
      }
      await load(portfolioId);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const summary = data?.summary;
  const holdings = data?.holdings || [];
  const sectors = data?.sectorAllocation || [];

  return (
    <div className="portfolio-terminal terminal-page">
      <header className="terminal-header glass-card">
        <div>
          <p className="terminal-eyebrow">Portfolio Analysis</p>
          <h1>{data?.portfolio?.name || "Core Equity Portfolio"}</h1>
          <p className="panel-sub">
            P&amp;L = verified live price × quantity − user cost basis. Missing prices are never
            estimated. Broker CSV import supported — live broker APIs require separate keys.
          </p>
          {data?.persistence && (
            <p className="panel-sub">
              Storage: <strong>{data.persistence.storageMode}</strong>
              {data.persistence.storageMode === "vercel-tmp" &&
                " — set Vercel KV for permanent multi-instance storage"}
            </p>
          )}
        </div>
        <div className="terminal-hero-actions">
          <a className="btn btn-secondary btn-sm" href={`/api/portfolios/export?id=${encodeURIComponent(portfolioId)}`}>
            Export CSV
          </a>
          <a
            className="btn btn-secondary btn-sm"
            href={`/api/portfolios/export-analysis?id=${encodeURIComponent(portfolioId)}`}
          >
            Export analysis
          </a>
          <button type="button" className="btn btn-secondary" onClick={() => load(portfolioId)} disabled={loading}>
            Refresh
          </button>
        </div>
      </header>

      {summary && (
        <div className="pf-summary glass-card">
          <div>
            <small>Market value</small>
            <strong>{fmtInr(summary.totalMarketValue)}</strong>
          </div>
          <div>
            <small>Cost basis</small>
            <strong>{fmtInr(summary.totalCostBasis)}</strong>
          </div>
          <div>
            <small>Unrealized P&amp;L</small>
            <strong
              className={
                summary.totalUnrealizedPnl == null
                  ? ""
                  : summary.totalUnrealizedPnl >= 0
                    ? "up"
                    : "down"
              }
            >
              {fmtInr(summary.totalUnrealizedPnl)}{" "}
              <span className="pf-sub">{fmtPct(summary.totalUnrealizedPnlPct)}</span>
            </strong>
          </div>
          <div>
            <small>Day P&amp;L</small>
            <strong
              className={
                summary.totalDayPnl == null ? "" : summary.totalDayPnl >= 0 ? "up" : "down"
              }
            >
              {fmtInr(summary.totalDayPnl)}
            </strong>
          </div>
          <div>
            <small>Priced / total</small>
            <strong>
              {summary.holdingsWithPrice ?? 0}/{holdings.length}
            </strong>
          </div>
        </div>
      )}

      <form className="pf-add-form glass-card" onSubmit={saveHolding}>
        <h3>Add / update holding</h3>
        <p className="panel-sub">Enter verified average cost from your broker — never invented.</p>
        <div className="pf-form-grid">
          <label>
            Symbol
            <input
              value={form.symbol}
              onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value }))}
              placeholder="RELIANCE.NS"
              required
              disabled={busy}
            />
          </label>
          <label>
            Quantity
            <input
              type="number"
              min="0"
              step="any"
              value={form.quantity}
              onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
              required
              disabled={busy}
            />
          </label>
          <label>
            Avg cost (₹)
            <input
              type="number"
              min="0"
              step="any"
              value={form.avgCost}
              onChange={(e) => setForm((f) => ({ ...f, avgCost: e.target.value }))}
              required
              disabled={busy}
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            Save holding
          </button>
        </div>
      </form>

      <div className="pf-import glass-card">
        <h3>Import broker CSV</h3>
        <p className="panel-sub">
          Headers: symbol, quantity (qty), avgCost (avg price). Imports cost basis only — not a live
          broker connection. Live P&amp;L still uses Yahoo verified prices.
        </p>
        <input
          type="file"
          accept=".csv,text/csv"
          disabled={busy}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setBusy(true);
            setError(null);
            try {
              const text = await file.text();
              const res = await fetch(
                `/api/portfolios/${encodeURIComponent(portfolioId)}/import`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ csv: text, replace: false }),
                }
              );
              const json = await res.json();
              if (!res.ok) throw new Error(json.error || "Import failed");
              await load(portfolioId);
            } catch (err) {
              setError(err.message);
            } finally {
              setBusy(false);
              e.target.value = "";
            }
          }}
        />
      </div>

      {error && (
        <div className="glass-card error-banner" role="alert">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="glass-card loading-panel">
          <p>Loading portfolio with verified market prices…</p>
        </div>
      ) : holdings.length === 0 ? (
        <div className="glass-card empty-state">
          <h3>No holdings yet</h3>
          <p>Add positions with quantity and average cost to compute verified P&amp;L.</p>
        </div>
      ) : (
        <>
          <div className="wl-table-wrap glass-card">
            <table className="wl-table pf-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Qty</th>
                  <th>Avg cost</th>
                  <th>Last</th>
                  <th>Day %</th>
                  <th>Mkt value</th>
                  <th>P&amp;L</th>
                  <th>Weight</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {holdings.map((h) => {
                  const pnlCls =
                    h.unrealizedPnl == null ? "" : h.unrealizedPnl >= 0 ? "up" : "down";
                  return (
                    <tr key={h.symbol}>
                      <td>
                        <Link href={`/nifty500/stock/${encodeURIComponent(h.symbol)}`}>
                          {h.symbol.replace(".NS", "")}
                        </Link>
                        {!h.dataAvailable && (
                          <div className="pf-na-hint" title={h.unavailableReason || undefined}>
                            {DATA_UNAVAILABLE}
                          </div>
                        )}
                      </td>
                      <td>{h.quantity ?? DATA_UNAVAILABLE}</td>
                      <td>{fmtInr(h.avgCost)}</td>
                      <td>{fmtInr(h.lastPrice)}</td>
                      <td
                        className={
                          h.changePercent == null
                            ? ""
                            : h.changePercent >= 0
                              ? "up"
                              : "down"
                        }
                      >
                        {fmtPct(h.changePercent)}
                      </td>
                      <td>{fmtInr(h.marketValue)}</td>
                      <td className={pnlCls}>
                        {fmtInr(h.unrealizedPnl)}
                        <div className="pf-sub">{fmtPct(h.unrealizedPnlPct)}</div>
                      </td>
                      <td>
                        {h.weightPct != null ? `${h.weightPct}%` : DATA_UNAVAILABLE}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          onClick={() => removeHolding(h.symbol)}
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
          </div>

          {sectors.length > 0 && (
            <div className="glass-card pf-sectors">
              <h3>Sector allocation</h3>
              <p className="panel-sub">Weights from valued holdings only (verified prices).</p>
              <ul className="pf-sector-list">
                {sectors.map((s) => (
                  <li key={s.sector}>
                    <span>{s.sector}</span>
                    <strong>
                      {fmtInr(s.marketValue)} ·{" "}
                      {s.weightPct != null ? `${s.weightPct}%` : DATA_UNAVAILABLE}
                    </strong>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data?.policy && (
            <p className="panel-sub pf-policy">
              {data.policy.factVsOpinion} {data.policy.notAdvice}
            </p>
          )}
        </>
      )}
    </div>
  );
}
