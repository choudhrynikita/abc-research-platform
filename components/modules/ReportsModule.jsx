"use client";

import { useEffect, useState } from "react";
import MetaBar from "../MetaBar";

export default function ReportsModule() {
  const [reports, setReports] = useState([]);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/report-center")
      .then((r) => r.json())
      .then((j) => {
        setReports(j.reports || []);
        setMeta(j._meta);
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="error-panel"><p>{error}</p></div>;

  return (
    <div>
      <MetaBar meta={meta} />
      <h3>Report Archive</h3>
      {!reports.length ? (
        <p className="hint-block">No reports generated yet. Use any module to create institutional reports.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Name</th><th>Type</th><th>Created</th><th>Confidence</th><th>Export</th></tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{r.type}</td>
                  <td>{new Date(r.createdAt).toLocaleString()}</td>
                  <td>{r.confidence ?? "—"}%</td>
                  <td>
                    <a href={`/api/report-center/${r.id}/export/csv`} className="btn btn-ghost btn-sm">CSV</a>{" "}
                    <a href={`/api/report-center/${r.id}/export/xlsx`} className="btn btn-ghost btn-sm">Excel</a>{" "}
                    <a href={`/api/report-center/${r.id}/export/pdf`} className="btn btn-ghost btn-sm">PDF</a>
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