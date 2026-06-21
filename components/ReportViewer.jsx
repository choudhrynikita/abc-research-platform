"use client";

import MetaBar from "./MetaBar";

function DataTypeTag({ type }) {
  const map = {
    verified: <span className="tag factual">Verified Data</span>,
    "model-opinion": <span className="tag opinion">AI / Model Opinion</span>,
    unavailable: <span className="tag unavailable">Data Unavailable</span>,
  };
  return map[type] || null;
}

function ExportButtons({ reportId }) {
  if (!reportId) return null;
  return (
    <div className="export-toolbar">
      <span className="export-label">Export report:</span>
      <a href={`/api/report-center/${reportId}/export/csv`} className="btn btn-secondary btn-sm">CSV</a>
      <a href={`/api/report-center/${reportId}/export/xlsx`} className="btn btn-secondary btn-sm">Excel</a>
      <a href={`/api/report-center/${reportId}/export/pdf`} className="btn btn-secondary btn-sm">PDF</a>
    </div>
  );
}

export default function ReportViewer({ payload, meta }) {
  if (!payload?.report) {
    return <p className="loading">No report data.</p>;
  }

  const { reportId, report, _meta } = payload;
  const metaInfo = _meta || meta;

  return (
    <div>
      <MetaBar meta={metaInfo} report={report} />
      <div className="report-header">
        <h2>{report.title}</h2>
        <p className="report-ts">
          Generated: {new Date(report.generatedAt).toLocaleString()}
          {report.dataFreshness?.fetchedAt && (
            <span className="tag factual"> Data: {new Date(report.dataFreshness.fetchedAt).toLocaleString()}</span>
          )}
        </p>
        {report.confidence != null && (
          <span className="confidence-badge">Confidence: {report.confidence}% (computed from data completeness)</span>
        )}
        <ExportButtons reportId={reportId} />
      </div>
      {(report.sections || []).map((s, i) => (
        <section key={i} className="report-section">
          <h3>{s.title} <DataTypeTag type={s.dataType} /></h3>
          {s.content && <p>{s.content}</p>}
          {s.bullets?.length > 0 && (
            <ul>{s.bullets.map((b, j) => <li key={j}>{b}</li>)}</ul>
          )}
          {s.table && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>{s.table.headers.map((h) => <th key={h}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {s.table.rows.map((row, ri) => (
                    <tr key={ri}>{row.map((c, ci) => <td key={ci}>{c ?? "Unavailable"}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}
      {report.disclaimer && <p className="hint-block">{report.disclaimer}</p>}
    </div>
  );
}