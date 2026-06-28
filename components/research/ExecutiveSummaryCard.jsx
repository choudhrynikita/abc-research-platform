"use client";

function ScoreGauge({ label, value }) {
  const pct = value != null ? Math.min(100, Math.max(0, value)) : null;
  return (
    <div className="score-gauge">
      <span className="gauge-label">{label}</span>
      <div className="gauge-bar">
        <div className="gauge-fill" style={{ width: pct != null ? `${pct}%` : "0%" }} />
      </div>
      <strong>{pct != null ? pct : "—"}</strong>
    </div>
  );
}

export default function ExecutiveSummaryCard({ summary, companyName, price, currency }) {
  if (!summary) return null;

  const recCls =
    summary.recommendation === "Buy" ? "buy" : summary.recommendation === "Avoid" ? "avoid" : "hold";

  return (
    <section className="research-exec glass-card">
      <div className="exec-head">
        <div>
          <p className="terminal-eyebrow">Executive Summary</p>
          <h2>{companyName}</h2>
          {price != null && (
            <span className="exec-price">₹{Number(price).toLocaleString()} {currency}</span>
          )}
        </div>
        <div className="exec-badges">
          <span className={`rec-badge large ${recCls}`}>{summary.recommendation}</span>
          <span className="rating-pill">Rating <strong>{summary.overallRating}</strong>/100</span>
        </div>
      </div>

      <div className="exec-meta-grid">
        <div><small>Confidence</small><strong>{summary.confidenceLevel}</strong></div>
        <div><small>Horizon</small><strong>{summary.investmentHorizon}</strong></div>
        <div><small>Risk</small><strong>{summary.riskLevel}</strong></div>
        <div><small>Valuation</small><strong>{summary.valuationStatus ?? "—"}</strong></div>
        <div><small>Sector Outlook</small><strong>{summary.sectorOutlook ?? "—"}</strong></div>
        <div><small>AI Conviction</small><strong>{summary.aiConviction}%</strong></div>
      </div>

      <div className="exec-gauges">
        <ScoreGauge label="Technical" value={summary.technicalRating} />
        <ScoreGauge label="Fundamental" value={summary.fundamentalRating} />
        <ScoreGauge label="Industry" value={summary.industryRating} />
      </div>

      {summary.thesis?.length > 0 && (
        <div className="exec-thesis">
          <h4>Key Investment Thesis</h4>
          <ul>
            {summary.thesis.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </div>
      )}
    </section>
  );
}