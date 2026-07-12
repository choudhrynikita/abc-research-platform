"use client";

import { useCallback, useEffect, useState } from "react";
import MetaBar from "../MetaBar";

function formatTs(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export default function ReportsModule() {
  const [reports, setReports] = useState([]);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/report-center")
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.message || j.error || "Failed to load report archive");
        return j;
      })
      .then((j) => {
        setReports(Array.isArray(j.reports) ? j.reports : []);
        setMeta(j._meta || null);
      })
      .catch((e) => setError(e.message || "Live Data Currently Unavailable"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="terminal-loading" role="status" aria-live="polite">
        <div className="terminal-spinner" />
        <p>Loading report archive…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-panel" role="alert">
        <p>Live Data Currently Unavailable</p>
        <p className="error-detail">{error}</p>
        <button type="button" className="btn btn-primary" onClick={load}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <MetaBar meta={meta} />
      <header className="terminal-hero" style={{ marginBottom: 16 }}>
        <div>
          <p className="terminal-eyebrow">Institutional Archive</p>
          <h2>Report Archive</h2>
          <p className="terminal-sub">
            Generated research reports with PDF, Excel, and CSV export. Values reflect verified sources at generation time.
          </p>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={load}>
          Refresh
        </button>
      </header>
      {!reports.length ? (
        <p className="hint-block">
          No reports generated yet. Use any module&apos;s export / generate controls to create institutional reports.
        </p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Type</th>
                <th scope="col">Created</th>
                <th scope="col">Confidence</th>
                <th scope="col">Export</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{r.type}</td>
                  <td>{formatTs(r.createdAt)}</td>
                  <td>{r.confidence != null ? `${r.confidence}%` : "—"}</td>
                  <td>
                    <a href={`/api/report-center/${r.id}/export/csv`} className="btn btn-ghost btn-sm">
                      CSV
                    </a>{" "}
                    <a href={`/api/report-center/${r.id}/export/xlsx`} className="btn btn-ghost btn-sm">
                      Excel
                    </a>{" "}
                    <a href={`/api/report-center/${r.id}/export/pdf`} className="btn btn-ghost btn-sm">
                      PDF
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
