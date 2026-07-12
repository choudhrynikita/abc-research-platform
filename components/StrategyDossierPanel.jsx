"use client";

import { useState } from "react";

const DATA_UNAVAILABLE = "Data Unavailable";

function fmt(v, digits = 2) {
  if (v == null || Number.isNaN(Number(v))) return DATA_UNAVAILABLE;
  return typeof v === "number"
    ? v.toLocaleString("en-IN", { maximumFractionDigits: digits })
    : String(v);
}

function ExpandSection({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="strategy-expand dossier-expand">
      <button type="button" className="expand-head" onClick={() => setOpen((v) => !v)}>
        <h5>{title}</h5>
        <span aria-hidden>{open ? "▾" : "▸"}</span>
      </button>
      {open && <div className="expand-body">{children}</div>}
    </div>
  );
}

function FactorList({ items, empty = DATA_UNAVAILABLE, className = "" }) {
  if (!items?.length) return <p className="na-text">{empty}</p>;
  return (
    <ul className={`dossier-factor-list ${className}`.trim()}>
      {items.map((item) => (
        <li key={typeof item === "string" ? item : JSON.stringify(item)}>{item}</li>
      ))}
    </ul>
  );
}

/**
 * Institutional investment dossier — facts vs model opinion clearly labeled.
 * Never displays fabricated success rates; backtest section is honest about availability.
 */
export default function StrategyDossierPanel({
  dossier,
  confidence,
  backtest,
  compact = false,
}) {
  if (!dossier && !confidence && !backtest) return null;

  const conf = confidence || dossier?.confidence || dossier?.tradeConviction;
  const bt = backtest || dossier?.backtest;
  const score = conf?.score;

  if (compact) {
    return (
      <div className="dossier-compact">
        {score != null && (
          <div className="dossier-compact-row">
            <span>Conviction score</span>
            <strong title={conf?.methodology || conf?.disclaimer}>
              {score}/100
            </strong>
          </div>
        )}
        {bt?.available === true && bt.winRate != null ? (
          <div className="dossier-compact-row">
            <span>Rule backtest hit rate</span>
            <strong title="Historical mechanical rule only — not a guarantee">
              {bt.winRate}% ({bt.samples} trades)
            </strong>
          </div>
        ) : (
          <p className="dossier-bt-na">
            {bt?.reason || "Backtest: Awaiting Latest Verified Data"}
          </p>
        )}
        {conf?.disclaimer && (
          <p className="dossier-disclaimer">{conf.disclaimer}</p>
        )}
      </div>
    );
  }

  return (
    <div className="strategy-dossier glass-card">
      <header className="dossier-head">
        <div>
          <p className="terminal-eyebrow">Institutional dossier</p>
          <h4>{dossier?.name || dossier?.symbol || "Strategy package"}</h4>
        </div>
        {dossier?.action && (
          <span className={`rec-badge ${String(dossier.action).toLowerCase()}`}>
            {dossier.action}
          </span>
        )}
      </header>

      {score != null && (
        <div className="dossier-confidence">
          <div className="gauge-head">
            <span>Trade conviction (analytical)</span>
            <strong
              style={{
                color:
                  score >= 70
                    ? "var(--green)"
                    : score >= 50
                      ? "var(--yellow)"
                      : "var(--red)",
              }}
            >
              {score}/100
            </strong>
          </div>
          <div className="gauge-bar">
            <div
              className="gauge-fill"
              style={{
                width: `${Math.min(100, Math.max(0, score))}%`,
                background:
                  score >= 70
                    ? "var(--green)"
                    : score >= 50
                      ? "var(--yellow)"
                      : "var(--red)",
              }}
            />
          </div>
          <p className="confidence-disclaimer">
            {conf?.methodology ||
              "Derived from verified data completeness and signal agreement — not a guaranteed success rate."}
          </p>
          {conf?.components?.length > 0 && (
            <ul className="confidence-factors">
              {conf.components.map((c) => (
                <li key={c.component}>
                  <strong>{c.component}</strong>
                  {c.value != null ? `: ${c.value}` : ": N/A"} — {c.detail}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {(dossier?.investmentThesis || dossier?.whyRecommended) && (
        <section className="dossier-section">
          <h5>Investment thesis</h5>
          <p>{dossier.investmentThesis || dossier.whyRecommended}</p>
          <p className="dossier-meta">
            Analytical opinion on verified inputs · classification:{" "}
            {dossier.dataClassification || "mixed"}
          </p>
        </section>
      )}

      <div className="dossier-grid">
        <div>
          <h5 className="bullish-label">Bullish factors</h5>
          <FactorList items={dossier?.bullishFactors} empty="None listed from verified signals" />
        </div>
        <div>
          <h5 className="bearish-label">Bearish factors</h5>
          <FactorList items={dossier?.bearishFactors} empty="None listed from verified signals" />
        </div>
        <div>
          <h5>Risk factors</h5>
          <FactorList items={dossier?.riskFactors} />
        </div>
      </div>

      <ExpandSection title="Supporting signals" defaultOpen>
        <div className="dossier-grid">
          <div>
            <h6>Technical</h6>
            <FactorList items={dossier?.supportingTechnicalSignals} />
          </div>
          <div>
            <h6>Fundamental / flow</h6>
            <FactorList items={dossier?.supportingFundamentalSignals} />
          </div>
        </div>
      </ExpandSection>

      <ExpandSection title="Trade plan" defaultOpen>
        <div className="plan-grid dossier-plan">
          <div>
            <small>Entry</small>
            <strong>
              {dossier?.entryPrice != null
                ? typeof dossier.entryPrice === "object"
                  ? `₹${fmt(dossier.entryPrice.low)} – ₹${fmt(dossier.entryPrice.high)}`
                  : `₹${fmt(dossier.entryPrice)}`
                : DATA_UNAVAILABLE}
            </strong>
          </div>
          <div>
            <small>Stop loss</small>
            <strong>
              {dossier?.stopLoss != null
                ? typeof dossier.stopLoss === "string"
                  ? dossier.stopLoss
                  : `₹${fmt(dossier.stopLoss)}`
                : DATA_UNAVAILABLE}
            </strong>
          </div>
          <div>
            <small>Target 1</small>
            <strong>
              {dossier?.targetLevels?.t1 != null
                ? typeof dossier.targetLevels.t1 === "string"
                  ? dossier.targetLevels.t1
                  : `₹${fmt(dossier.targetLevels.t1)}`
                : DATA_UNAVAILABLE}
            </strong>
          </div>
          <div>
            <small>R:R</small>
            <strong>
              {dossier?.riskRewardRatio != null
                ? `${dossier.riskRewardRatio}:1`
                : DATA_UNAVAILABLE}
            </strong>
          </div>
          <div>
            <small>Horizon</small>
            <strong>{dossier?.holdingPeriod || DATA_UNAVAILABLE}</strong>
          </div>
          <div>
            <small>Investor profile</small>
            <strong>{dossier?.suitableInvestorProfile || DATA_UNAVAILABLE}</strong>
          </div>
        </div>
        {dossier?.positionSizingGuidance && (
          <p className="dossier-note">
            <strong>Position sizing:</strong> {dossier.positionSizingGuidance}
          </p>
        )}
        {dossier?.capitalAllocationSuggestion && (
          <p className="dossier-note">
            <strong>Capital allocation:</strong> {dossier.capitalAllocationSuggestion}
          </p>
        )}
        {dossier?.invalidationConditions?.length > 0 && (
          <>
            <h6>Invalidation</h6>
            <FactorList items={dossier.invalidationConditions} />
          </>
        )}
      </ExpandSection>

      <ExpandSection title="Valuation & sector">
        <p>
          <strong>Valuation:</strong>{" "}
          {dossier?.valuationSummary || DATA_UNAVAILABLE}
        </p>
        <p>
          <strong>Sector outlook:</strong>{" "}
          {dossier?.sectorOutlook || DATA_UNAVAILABLE}
        </p>
        <p>
          <strong>Competitor / relative:</strong>{" "}
          {dossier?.competitorComparison || DATA_UNAVAILABLE}
        </p>
      </ExpandSection>

      <ExpandSection title="Rule-based backtest" defaultOpen>
        {bt?.available === true ? (
          <div className="backtest-stats">
            <div className="dossier-grid stats-grid">
              <div>
                <small>Trades</small>
                <strong>{bt.numberOfTrades ?? bt.samples}</strong>
              </div>
              <div>
                <small>Win rate</small>
                <strong>{bt.winRate != null ? `${bt.winRate}%` : DATA_UNAVAILABLE}</strong>
              </div>
              <div>
                <small>Loss rate</small>
                <strong>{bt.lossRate != null ? `${bt.lossRate}%` : DATA_UNAVAILABLE}</strong>
              </div>
              <div>
                <small>Avg return</small>
                <strong>
                  {bt.averageReturnPct != null
                    ? `${bt.averageReturnPct}%`
                    : DATA_UNAVAILABLE}
                </strong>
              </div>
              <div>
                <small>Max DD (pts)</small>
                <strong>
                  {bt.maxDrawdownPctPoints != null
                    ? bt.maxDrawdownPctPoints
                    : DATA_UNAVAILABLE}
                </strong>
              </div>
              <div>
                <small>Profit factor</small>
                <strong>
                  {bt.profitFactor != null ? bt.profitFactor : DATA_UNAVAILABLE}
                </strong>
              </div>
              <div>
                <small>Sharpe</small>
                <strong>
                  {bt.sharpeRatio != null ? bt.sharpeRatio : "Source Does Not Provide This Information"}
                </strong>
              </div>
              <div>
                <small>Period</small>
                <strong>
                  {bt.period?.from || bt.period?.to
                    ? `${bt.period.from || "—"} → ${bt.period.to || "—"}`
                    : DATA_UNAVAILABLE}
                </strong>
              </div>
            </div>
            {bt.rules?.length > 0 && (
              <>
                <h6>Documented rules</h6>
                <FactorList items={bt.rules} />
              </>
            )}
            {bt.assumptions?.length > 0 && (
              <>
                <h6>Assumptions</h6>
                <FactorList items={bt.assumptions} />
              </>
            )}
            <p className="dossier-disclaimer">
              {bt.disclaimer ||
                "Past mechanical rule performance is not predictive of future results and is not a guaranteed success rate."}
            </p>
          </div>
        ) : (
          <div className="backtest-unavailable">
            <p className="na-text">
              <strong>Backtest not available.</strong>{" "}
              {bt?.reason ||
                "Awaiting Latest Verified Data — insufficient history or rules not evaluable."}
            </p>
            {bt?.assumptions?.length > 0 && <FactorList items={bt.assumptions} />}
            <p className="dossier-disclaimer">
              ABC never fabricates win rates, Sharpe ratios, or success percentages.
            </p>
          </div>
        )}
      </ExpandSection>

      {dossier?.policy?.factVsOpinion && (
        <p className="dossier-policy">{dossier.policy.factVsOpinion}</p>
      )}
    </div>
  );
}
