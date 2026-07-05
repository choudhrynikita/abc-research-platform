"use client";

import { useState } from "react";

const UNAVAILABLE = "Verified data unavailable.";

function Metric({ label, value, sub, meta }) {
  const display = value ?? UNAVAILABLE;
  const isUnavailable = value == null || value === UNAVAILABLE;
  return (
    <div className="deriv-metric">
      <small>{label}</small>
      <strong className={isUnavailable ? "metric-na" : undefined}>{display}</strong>
      {sub && <span className="deriv-sub">{sub}</span>}
      {meta?.source && (
        <span className="deriv-meta">
          {meta.verified ? "Verified" : "Unverified"} · {meta.source}
          {meta.collectedAt && ` · ${new Date(meta.collectedAt).toLocaleString()}`}
        </span>
      )}
    </div>
  );
}

function fmtNum(v) {
  if (v == null || Number.isNaN(v)) return null;
  return typeof v === "number" ? v.toLocaleString() : String(v);
}

function Accordion({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="deriv-accordion">
      <button type="button" className="deriv-accordion-head" onClick={() => setOpen((v) => !v)}>
        <h4>{title}</h4>
        <span aria-hidden="true">{open ? "▾" : "▸"}</span>
      </button>
      {open && <div className="deriv-accordion-body">{children}</div>}
    </div>
  );
}

function RiskMeter({ riskReward, maxLoss }) {
  if (riskReward == null && maxLoss == null) {
    return <p className="na-text">{UNAVAILABLE}</p>;
  }
  const rr = riskReward ?? 0;
  const level = rr >= 2 ? "low" : rr >= 1 ? "moderate" : "elevated";
  const pct = rr >= 2 ? 25 : rr >= 1.5 ? 45 : rr >= 1 ? 65 : 85;
  const colors = { low: "var(--green)", moderate: "var(--yellow)", elevated: "var(--red)" };

  return (
    <div className="risk-meter">
      <div className="risk-meter-head">
        <span>Risk Level</span>
        <strong style={{ color: colors[level] }}>{level.charAt(0).toUpperCase() + level.slice(1)}</strong>
      </div>
      <div className="gauge-bar">
        <div className="gauge-fill" style={{ width: `${pct}%`, background: colors[level] }} />
      </div>
      {maxLoss != null && (
        <p className="deriv-sub">Max defined loss: ₹{fmtNum(maxLoss)}</p>
      )}
    </div>
  );
}

export default function DerivativesIntelligencePanel({ intelligence, title = "Derivatives Intelligence" }) {
  if (!intelligence) return null;

  const mf = intelligence.marketFlow || {};
  const risk = intelligence.risk || {};
  const vol = intelligence.volatility || {};
  const ms = intelligence.marketStrength || {};
  const g = vol.greeks || {};
  const ivMeta = vol.impliedVolatilityMeta || {};

  return (
    <section className="derivatives-panel glass-card">
      <div className="deriv-panel-head">
        <div>
          <h3>{title}</h3>
          <p className="panel-sub">
            Verified NSE option chain &amp; market flow — no estimated values
          </p>
        </div>
        <span className={`data-pill${intelligence.verified ? "" : " cached"}`}>
          {intelligence.verified ? "Chain Verified" : "Awaiting Chain"}
        </span>
      </div>

      <Accordion title="Market Flow Metrics">
        <div className="deriv-grid">
          <Metric label="Put–Call Ratio (PCR)" value={mf.putCallRatio} meta={{ source: intelligence.source, collectedAt: intelligence.fetchedAt, verified: intelligence.verified }} />
          <Metric label="Call OI (Total)" value={fmtNum(mf.callOi)} />
          <Metric label="Call OI Δ" value={fmtNum(mf.callOiChange)} />
          <Metric label="Put OI (Total)" value={fmtNum(mf.putOi)} />
          <Metric label="Put OI Δ" value={fmtNum(mf.putOiChange)} />
          <Metric label="OI Skew" value={mf.oiSkew} />
          <Metric label="Volume Trend" value={mf.volumeTrend} sub={mf.volumeConfirmation} />
        </div>
      </Accordion>

      <Accordion title="Risk Metrics" defaultOpen={false}>
        <div className="deriv-grid">
          <Metric label="Risk-to-Reward" value={risk.riskRewardRatio != null ? `${risk.riskRewardRatio}:1` : null} />
          <Metric label="Max Loss" value={risk.maxLoss != null ? `₹${fmtNum(risk.maxLoss)}` : null} />
          <Metric
            label="Max Profit"
            value={risk.maxProfit != null ? `₹${fmtNum(risk.maxProfit)}` : risk.maxProfit === null ? "Unlimited" : null}
          />
          <Metric label="Breakeven" value={risk.breakeven} />
        </div>
        <RiskMeter riskReward={risk.riskRewardRatio} maxLoss={risk.maxLoss} />
        {risk.note && <p className="deriv-footnote">{risk.note}</p>}
      </Accordion>

      <Accordion title="Volatility Metrics" defaultOpen={false}>
        <div className="deriv-grid">
          <Metric
            label="Implied Volatility (IV)"
            value={vol.impliedVolatility != null ? `${vol.impliedVolatility}%` : null}
            meta={ivMeta}
          />
          <Metric
            label="IV Rank"
            value={vol.ivRank}
            sub={vol.ivRankNote}
            meta={{ source: "NSE ATM IV history", verified: vol.ivMetricsVerified }}
          />
          <Metric
            label="IV Percentile"
            value={vol.ivPercentile}
            sub={vol.ivPercentileNote}
            meta={{ source: "NSE ATM IV history", verified: vol.ivMetricsVerified }}
          />
          <Metric
            label="India VIX"
            value={vol.indiaVix != null ? vol.indiaVix.toFixed(2) : null}
            meta={vol.indiaVixMeta}
          />
          <Metric label="Delta" value={g.delta} sub={g.source} />
          <Metric label="Gamma" value={g.gamma} />
          <Metric label="Theta" value={g.theta} />
          <Metric label="Vega" value={g.vega} />
        </div>
        {vol.ivHistoryPoints != null && vol.ivHistoryPoints < 20 && (
          <p className="deriv-footnote na-text">
            IV rank/percentile require at least 20 verified daily ATM IV observations ({vol.ivHistoryPoints} recorded).
          </p>
        )}
      </Accordion>

      <Accordion title="Market Strength" defaultOpen={false}>
        <div className="deriv-grid">
          <Metric
            label="Market Breadth"
            value={
              ms.breadth?.advancers != null
                ? `${ms.breadth.advancers}↑ / ${ms.breadth.decliners}↓`
                : null
            }
            sub={ms.breadthRatio != null ? `A/D ratio ${ms.breadthRatio}` : undefined}
          />
          <Metric label="Trend Strength" value={ms.trendStrengthScore != null ? `${ms.trendStrengthScore}/100` : null} sub={ms.adx != null ? `ADX ${ms.adx.toFixed(1)}` : undefined} />
          <Metric label="Institutional Flow" value={ms.institutionalFlow} sub={ms.fiiNet != null ? `FII net ${ms.fiiNet.toLocaleString()} Cr` : undefined} />
        </div>
      </Accordion>

      {!intelligence.verified && (
        <p className="deriv-unverified">{intelligence.unverifiedMessage || UNAVAILABLE}</p>
      )}
    </section>
  );
}