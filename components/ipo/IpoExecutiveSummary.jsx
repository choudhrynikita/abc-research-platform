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
      <div className="exec-head">
        <div>
          <p className="terminal-eyebrow">Executive Summary</p>
          <h2>{companyName || "IPO Analysis"}</h2>
        </div>
        <span className={`ipo-rec-badge ${recCls}`}>{summary.recommendation || "Neutral / Watch"}</span>
      </div>

      <div className="ipo-exec-metrics">
        <div>
          <small>IPO Score</small>
          <strong className="score-val">{summary.ipoScore ?? "—"}</strong>
          <span className="score-of">/ 100</span>
        </div>
        <div><small>Confidence</small><strong>{summary.confidence != null ? `${summary.confidence}%` : "—"}</strong></div>
        <div><small>Risk</small><strong>{summary.riskLevel ?? "—"}</strong></div>
        <div><small>Horizon</small><strong>{summary.horizon ?? "—"}</strong></div>
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