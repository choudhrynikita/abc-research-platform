"use client";

const REC_STYLES = {
  "Buy for Listing Gains": "buy-listing",
  "Buy for Long-Term Investment": "buy-long",
  "Neutral / Watch": "neutral",
  Avoid: "avoid",
};

export default function IpoExecutiveSummary({ summary, companyName }) {
  if (!summary) return null;
  const recCls = REC_STYLES[summary.recommendation] || "neutral";

  return (
    <section className="ipo-exec glass-card">
      <div className="ipo-exec-head">
        <div className="ipo-exec-titles">
          <p className="terminal-eyebrow">Executive Summary</p>
          <h2>{companyName || "IPO Analysis"}</h2>
        </div>
        <span className={`ipo-rec-badge ${recCls}`}>{summary.recommendation || "Neutral / Watch"}</span>
      </div>

      <div className="ipo-exec-metrics">
        <div className="ipo-kv">
          <small>IPO Score</small>
          <strong>
            <span className="score-val">{summary.ipoScore ?? "—"}</span>
            <span className="score-of"> / 100</span>
          </strong>
        </div>
        <div className="ipo-kv">
          <small>Confidence</small>
          <strong>{summary.confidence != null ? `${Math.round(Number(summary.confidence))}%` : "—"}</strong>
        </div>
        <div className="ipo-kv">
          <small>Risk</small>
          <strong>{summary.riskLevel ?? "—"}</strong>
        </div>
        <div className="ipo-kv">
          <small>Horizon</small>
          <strong>{summary.horizon ?? "—"}</strong>
        </div>
      </div>

      {summary.thesis?.length > 0 && (
        <ul className="ipo-thesis">
          {summary.thesis.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
