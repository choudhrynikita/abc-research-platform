"use client";

import { extractValue, formatMetric, DATA_UNAVAILABLE } from "../nifty500/MetricValue";

function fmt(value, type) {
  const raw = extractValue(value) ?? (typeof value === "number" ? value : null);
  if (raw == null && (value == null || value === "—")) return DATA_UNAVAILABLE;
  if (typeof value === "string" && value !== "—" && extractValue(value) == null && Number.isNaN(Number(value))) {
    return value;
  }
  return formatMetric(raw, type) ?? (raw != null ? String(raw) : DATA_UNAVAILABLE);
}

export default function PeerComparisonPanel({ data }) {
  if (!data?.available) {
    return (
      <section id="section-competitors" className="research-section glass-card muted-section">
        <header className="research-section-head">
          <div>
            <h3>Competitor Analysis</h3>
            <p className="panel-sub">Verified peer mappings only — competitors are never invented</p>
          </div>
        </header>
        <p className="panel-sub">
          {data?.message || "Peer data not configured for this symbol."}
        </p>
        <p className="metric-na">
          Source Does Not Provide This Information — add peers in competitors.json or ensure same-sector constituents exist.
        </p>
      </section>
    );
  }

  const { highlights, peers, subject } = data;

  const columns = [
    { key: "name", label: "Company" },
    { key: "price", label: "Price", type: "price" },
    { key: "marketCap", label: "Mkt Cap", type: "cr" },
    { key: "revenue", label: "Revenue", type: "cr" },
    { key: "netProfit", label: "Net Profit", type: "cr" },
    { key: "ebitda", label: "EBITDA", type: "cr" },
    { key: "peRatio", label: "P/E", type: "x" },
    { key: "pbRatio", label: "P/B", type: "x" },
    { key: "evEbitda", label: "EV/EBITDA", type: "x" },
    { key: "roe", label: "ROE", type: "ratio" },
    { key: "debtToEquity", label: "D/E", type: "number" },
    { key: "dividendYield", label: "Div Yield", type: "yield" },
    { key: "revenueGrowth", label: "Rev Gr", type: "ratio" },
    { key: "profitGrowth", label: "Profit Gr", type: "ratio" },
    { key: "trend", label: "Trend", type: "text" },
  ];

  const rows = [
    subject?.price != null ? { ...subject, _subject: true } : null,
    ...(peers || []),
  ].filter(Boolean);

  return (
    <section id="section-competitors" className="research-section glass-card">
      <header className="research-section-head">
        <div>
          <h3>Competitor Analysis</h3>
          <p className="panel-sub">{data.message}</p>
          {data.peerSource && <p className="panel-sub">Peer source: {data.peerSource}</p>}
        </div>
        <span className="fund-status fund-status-ok">{peers.length} peers</span>
      </header>

      {highlights && Object.keys(highlights).length > 0 && (
        <div className="peer-highlights">
          {highlights.bestGrowth && (
            <span className="highlight-chip">Best Growth: {highlights.bestGrowth}</span>
          )}
          {highlights.highestRoe && (
            <span className="highlight-chip">Highest ROE: {highlights.highestRoe}</span>
          )}
          {highlights.bestValuation && (
            <span className="highlight-chip">Best Valuation (P/E): {highlights.bestValuation}</span>
          )}
          {highlights.lowestDebt && (
            <span className="highlight-chip">Lowest Debt: {highlights.lowestDebt}</span>
          )}
          {highlights.strongestTechnical && (
            <span className="highlight-chip">Strongest Technical: {highlights.strongestTechnical}</span>
          )}
        </div>
      )}

      <div className="table-wrap research-table-scroll">
        <table className="data-table research-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.symbol} className={p._subject || p.isSubject ? "subject-row" : undefined}>
                {columns.map((c) => {
                  if (c.key === "name") {
                    return (
                      <td key={c.key}>
                        <strong>
                          {p.name}
                          {(p._subject || p.isSubject) && " (Subject)"}
                        </strong>
                      </td>
                    );
                  }
                  if (c.type === "text") {
                    return <td key={c.key}>{p[c.key] ?? DATA_UNAVAILABLE}</td>;
                  }
                  return <td key={c.key}>{fmt(p[c.key], c.type)}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="panel-sub">
        ROCE omitted (not provided by Yahoo). Shareholding not shown for peers (requires exchange feed).
      </p>
    </section>
  );
}
