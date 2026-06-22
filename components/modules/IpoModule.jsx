"use client";

import { useEffect, useState } from "react";
import MetaBar from "../MetaBar";
import ReportViewer from "../ReportViewer";

function ipoCell(v) {
  if (v == null || v === "") return "Verified IPO data unavailable.";
  return v;
}

function subCell(metric) {
  if (!metric) return "Verified IPO data unavailable.";
  return metric.available ? metric.display : metric.display || "Verified IPO data unavailable.";
}

function IpoTable({ title, rows, cols, onRowClick }) {
  if (!rows?.length) {
    return (
      <>
        <h3>{title}</h3>
        <p className="hint-block">Verified IPO data unavailable. No {title.toLowerCase()} in NSE feed.</p>
      </>
    );
  }

  const colMap = {
    Company: (r) => r.companyName,
    Symbol: (r) => r.symbol,
    Industry: (r) => ipoCell(r.industry),
    "Issue Size": (r) => ipoCell(r.issueSize),
    "Price Band": (r) => ipoCell(r.issuePrice),
    "Lot Size": (r) => ipoCell(r.lotSize),
    Open: (r) => ipoCell(r.issueStartDate),
    Close: (r) => ipoCell(r.issueEndDate),
    Listing: (r) => ipoCell(r.listingDate),
    Exchange: (r) => ipoCell(r.exchange),
    Retail: (r) => subCell(r.subscription?.retail),
    HNI: (r) => subCell(r.subscription?.hni),
    QIB: (r) => subCell(r.subscription?.qib),
    Employee: (r) => subCell(r.subscription?.employee),
    "Overall Sub": (r) => r.overallSubscription != null ? `${r.overallSubscription}x` : subCell(r.subscription?.overall),
    "Issue Price": (r) => ipoCell(r.issuePrice),
    "Current Price": (r) => r.currentMarketPrice?.display ?? "Verified IPO data unavailable.",
    "Gain/Loss": (r) => r.listingGainLoss?.display ?? "Verified IPO data unavailable.",
  };

  return (
    <>
      <h3>{title}</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.symbol} className="ipo-row" style={{ cursor: "pointer" }} onClick={() => onRowClick(r.symbol)}>
                {cols.map((col) => (
                  <td key={col}>{colMap[col] ? colMap[col](r) : ipoCell(r[col])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function IpoModule() {
  const [dashboard, setDashboard] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [meta, setMeta] = useState(null);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);

  async function loadReport(symbol) {
    setReportLoading(true);
    try {
      const res = await fetch(`/api/reports/generate/ipo/${encodeURIComponent(symbol)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || json.error);
      setReport(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setReportLoading(false);
    }
  }

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ipo/dashboard");
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || j.error);
      setDashboard(j.dashboard);
      setAlerts(j.alerts || []);
      setMeta(j._meta);
      if (j.dashboard?.open?.[0]) await loadReport(j.dashboard.open[0].symbol);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveAlertPrefs() {
    await fetch("/api/ipo-alerts/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newIpo: true, opening: true, closing: true, subscription: true, listing: true, gmp: false }),
    });
  }

  if (loading) return <p className="loading">Fetching verified IPO data from NSE...</p>;
  if (error && !dashboard) {
    return (
      <div className="error-panel">
        <h3>IPO data unavailable</h3>
        <p>{error}</p>
        <button className="btn btn-secondary" type="button" onClick={loadDashboard}>
          Retry
        </button>
      </div>
    );
  }

  const listed = dashboard.listedEnriched || dashboard.listed;

  return (
    <div>
      <MetaBar meta={meta} report={{ dataFreshness: { fetchedAt: dashboard.fetchedAt } }} />
      {alerts.length > 0 && (
        <section className="alerts-strip">
          <strong>IPO Alerts</strong>
          <ul>{alerts.slice(0, 8).map((a, i) => <li key={i}>[{a.type}] {a.message}</li>)}</ul>
        </section>
      )}
      <section className="executive-dashboard">
        <h3>IPO Market Snapshot</h3>
        <section className="overview-grid">
          <div className="metric-card"><div className="label">Open IPOs</div><div className="value">{dashboard.counts.open}</div></div>
          <div className="metric-card"><div className="label">Upcoming</div><div className="value">{dashboard.counts.upcoming}</div></div>
          <div className="metric-card"><div className="label">Recently Listed</div><div className="value">{dashboard.counts.listed}</div></div>
          <div className="metric-card"><div className="label">Data Freshness</div><div className="value">{new Date(dashboard.fetchedAt).toLocaleString()}</div></div>
        </section>
        <p className="hint-block">Source: NSE India IPO APIs. GMP never displayed without verified source.</p>
      </section>
      <IpoTable title="Open IPOs" rows={dashboard.open} cols={["Company", "Symbol", "Price Band", "Close", "Retail", "HNI", "QIB", "Employee", "Overall Sub"]} onRowClick={loadReport} />
      <IpoTable title="Upcoming IPOs" rows={dashboard.upcoming} cols={["Company", "Symbol", "Industry", "Issue Size", "Price Band", "Lot Size", "Open", "Close", "Listing", "Exchange"]} onRowClick={loadReport} />
      <IpoTable title="Recently Listed IPOs" rows={listed} cols={["Company", "Symbol", "Issue Price", "Listing", "Current Price", "Gain/Loss"]} onRowClick={loadReport} />
      <section className="ipo-alerts-panel">
        <h3>IPO Alert Preferences</h3>
        <button className="btn btn-secondary btn-sm" onClick={saveAlertPrefs}>Save Preferences</button>
      </section>
      {reportLoading && <p className="loading">Generating IPO research report...</p>}
      {report && <ReportViewer payload={report} />}
    </div>
  );
}