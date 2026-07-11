"use client";

import { extractValue, formatMetric, DATA_UNAVAILABLE } from "../nifty500/MetricValue";

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

export default function ExecutiveSummaryCard({
  summary,
  companyName,
  price,
  currency,
  exchange,
  symbol,
  sector,
  industry,
  refreshedAt,
  dataSources,
}) {
  if (!summary) return null;

  const recCls =
    summary.recommendation === "Buy"
      ? "buy"
      : summary.recommendation === "Avoid"
        ? "avoid"
        : "hold";

  const mcap = formatMetric(extractValue(summary.marketCap), "cr");

  return (
    <section id="section-exec" className="research-exec glass-card">
      <div className="exec-head">
        <div>
          <p className="terminal-eyebrow">Executive Summary</p>
          <h2>{summary.companyName || companyName}</h2>
          <div className="exec-id-row">
            <span className="stock-ticker">{summary.symbol || symbol}</span>
            <span className="exec-chip">{exchange || summary.exchange || DATA_UNAVAILABLE}</span>
            <span className="exec-chip">{sector || summary.sector || DATA_UNAVAILABLE}</span>
            {(industry || summary.industry) && (
              <span className="exec-chip">{industry || summary.industry}</span>
            )}
          </div>
          {price != null && (
            <span className="exec-price">
              ₹{Number(price).toLocaleString("en-IN")} {currency || "INR"}
            </span>
          )}
        </div>
        <div className="exec-badges">
          <span className={`rec-badge large ${recCls}`}>{summary.recommendation}</span>
          <span className="rating-pill">
            Rating <strong>{summary.overallRating}</strong>/100
          </span>
          <span className="panel-sub tag-interp" style={{ fontSize: "0.72rem" }}>
            Analytical model — not a broker rating feed
          </span>
        </div>
      </div>

      <div className="exec-meta-grid">
        <div>
          <small>Market Cap</small>
          <strong>{mcap || DATA_UNAVAILABLE}</strong>
        </div>
        <div>
          <small>Last Updated</small>
          <strong>
            {refreshedAt || summary.lastUpdated
              ? new Date(refreshedAt || summary.lastUpdated).toLocaleString()
              : DATA_UNAVAILABLE}
          </strong>
        </div>
        <div>
          <small>Confidence</small>
          <strong>{summary.confidenceLevel}</strong>
        </div>
        <div>
          <small>Horizon</small>
          <strong>{summary.investmentHorizon}</strong>
        </div>
        <div>
          <small>Risk</small>
          <strong>{summary.riskLevel}</strong>
        </div>
        <div>
          <small>Valuation</small>
          <strong>{summary.valuationStatus ?? DATA_UNAVAILABLE}</strong>
        </div>
        <div>
          <small>Sector Outlook</small>
          <strong>{summary.sectorOutlook ?? DATA_UNAVAILABLE}</strong>
        </div>
        <div>
          <small>AI Conviction</small>
          <strong>{summary.aiConviction != null ? `${summary.aiConviction}%` : DATA_UNAVAILABLE}</strong>
        </div>
      </div>

      <div className="exec-gauges">
        <ScoreGauge label="Technical" value={summary.technicalRating} />
        <ScoreGauge label="Fundamental" value={summary.fundamentalRating} />
        <ScoreGauge label="Industry" value={summary.industryRating} />
      </div>

      <div className="exec-strength-risk">
        <div>
          <h4>Key Strengths</h4>
          <ul>
            {(summary.keyStrengths || []).map((s, i) => (
              <li key={i}>
                <span className={s.dataType === "factual" ? "tag-fact" : "tag-interp"}>
                  {s.dataType === "factual" ? "Fact" : "Interp"}
                </span>{" "}
                {s.text}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4>Key Risks</h4>
          <ul className="risk-list">
            {(summary.keyRisks || []).map((s, i) => (
              <li key={i}>
                <span className={s.dataType === "factual" ? "tag-fact" : "tag-interp"}>
                  {s.dataType === "factual" ? "Fact" : "Interp"}
                </span>{" "}
                {s.text}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {summary.thesis?.length > 0 && (
        <div className="exec-thesis">
          <h4>Investment Snapshot / Thesis</h4>
          <ul>
            {summary.thesis.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      )}

      {(dataSources || summary.dataSources)?.length > 0 && (
        <div className="exec-sources">
          <h4>Data Sources</h4>
          <ul className="policy-list">
            {(dataSources || summary.dataSources).map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
