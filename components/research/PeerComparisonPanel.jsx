"use client";

import { extractValue, formatMetric } from "../nifty500/MetricValue";

function MetricCell({ value, type }) {
  const raw = extractValue(value) ?? value;
  const fmt = formatMetric(raw, type);
  return <td>{fmt ?? "—"}</td>;
}

export default function PeerComparisonPanel({ data }) {
  if (!data?.available) {
    return (
      <section className="research-peers glass-card muted-section">
        <h3>Competitor Comparison</h3>
        <p className="panel-sub">{data?.message || "Peer data not configured for this symbol."}</p>
      </section>
    );
  }

  const { highlights, peers, subject, table } = data;

  return (
    <section className="research-peers glass-card">
      <h3>Competitor Comparison</h3>
      <p className="panel-sub">{data.message}</p>

      {highlights && Object.keys(highlights).length > 0 && (
        <div className="peer-highlights">
          {highlights.bestGrowth && <span className="highlight-chip">Best Growth: {highlights.bestGrowth}</span>}
          {highlights.highestRoe && <span className="highlight-chip">Highest ROE: {highlights.highestRoe}</span>}
          {highlights.bestValuation && <span className="highlight-chip">Best Valuation: {highlights.bestValuation}</span>}
          {highlights.lowestDebt && <span className="highlight-chip">Lowest Debt: {highlights.lowestDebt}</span>}
          {highlights.strongestTechnical && <span className="highlight-chip">Strongest Technical: {highlights.strongestTechnical}</span>}
        </div>
      )}

      <div className="table-wrap">
        <table className="data-table research-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Price</th>
              <th>P/E</th>
              <th>ROE</th>
              <th>Rev Growth</th>
              <th>Trend</th>
              <th>Rating</th>
            </tr>
          </thead>
          <tbody>
            {subject?.price != null && (
              <tr className="subject-row">
                <td><strong>{subject.name} (Subject)</strong></td>
                <td>₹{subject.price?.toLocaleString()}</td>
                <MetricCell value={subject.peRatio} />
                <MetricCell value={subject.roe} type="ratio" />
                <MetricCell value={subject.revenueGrowth} type="ratio" />
                <td>{subject.trend ?? "—"}</td>
                <td>{subject.technicalRating ?? "—"}</td>
              </tr>
            )}
            {peers.map((p) => (
              <tr key={p.symbol}>
                <td>{p.name}</td>
                <td>{p.price != null ? `₹${p.price.toLocaleString()}` : "—"}</td>
                <MetricCell value={p.peRatio} />
                <MetricCell value={p.roe} type="ratio" />
                <MetricCell value={p.revenueGrowth} type="ratio" />
                <td>{p.trend ?? "—"}</td>
                <td>{p.technicalRating ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}