"use client";

import { useState } from "react";

function fmt(v, digits = 2) {
  if (v == null || Number.isNaN(v)) return "—";
  return typeof v === "number" ? v.toFixed(digits) : String(v);
}

function StatusBadge({ status }) {
  const cls = status === "Active"
    ? "active"
    : status === "Pre-Market"
      ? "pre-market"
      : status === "Wait"
        ? "wait"
        : "avoid";
  return <span className={`strategy-status ${cls}`}>{status ?? "—"}</span>;
}

function ConfidenceGauge({ score, factors }) {
  const pct = score ?? 0;
  const color = pct >= 70 ? "var(--green)" : pct >= 50 ? "var(--yellow)" : "var(--red)";
  return (
    <div className="confidence-gauge">
      <div className="gauge-head">
        <span>Confidence</span>
        <strong style={{ color }}>{score != null ? score : "—"}</strong>
      </div>
      <div className="gauge-bar">
        <div className="gauge-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      {factors?.length > 0 && (
        <ul className="confidence-factors">
          {factors.slice(0, 4).map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LegsTable({ strikes }) {
  if (!strikes?.length) return <p className="na-text">Strike data unavailable</p>;
  return (
    <table className="legs-table">
      <thead>
        <tr>
          <th>Action</th>
          <th>Type</th>
          <th>Strike</th>
          <th>Premium</th>
        </tr>
      </thead>
      <tbody>
        {strikes.map((leg, i) => (
          <tr key={`${leg.strike}-${leg.type}-${i}`}>
            <td className={leg.action === "BUY" ? "buy" : "sell"}>{leg.action}</td>
            <td>{leg.type}</td>
            <td>{leg.strike?.toLocaleString()}</td>
            <td>₹{fmt(leg.premium)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ExpandSection({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="strategy-expand">
      <button type="button" className="expand-head" onClick={() => setOpen((v) => !v)}>
        <h5>{title}</h5>
        <span>{open ? "▾" : "▸"}</span>
      </button>
      {open && <div className="expand-body">{children}</div>}
    </div>
  );
}

export default function StrategyCard({ strategy, marketContext, selected, onSelect }) {
  const netPrem = strategy.premiums?.net;
  const isCredit = netPrem != null && netPrem < 0;

  return (
    <article
      className={`strategy-card glass-card${selected ? " selected" : ""}`}
      onClick={() => onSelect?.(strategy)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect?.(strategy)}
    >
      <header className="strategy-card-head">
        <div className="strategy-rank">#{strategy.rank}</div>
        <div className="strategy-identity">
          <h4>{strategy.name}</h4>
          <span className="strategy-type-pill">{strategy.type}</span>
          <span className="strategy-expiry">{strategy.expiryType} · {strategy.expiry ?? "—"}</span>
          {strategy.modeLabel && strategy.mode === "pre-market" && (
            <span className="strategy-mode-label">{strategy.modeLabel}</span>
          )}
        </div>
        <StatusBadge status={strategy.status} />
      </header>

      <div className="strategy-metrics-row">
        <div>
          <small>Net Premium</small>
          <strong>
            {netPrem != null
              ? `${isCredit ? "Credit " : ""}₹${fmt(Math.abs(netPrem))}${strategy.mode === "pre-market" ? " ref." : ""}`
              : "Trigger at open"}
          </strong>
        </div>
        <div>
          <small>Max Risk</small>
          <strong className="risk">{strategy.maxRisk != null ? `₹${fmt(strategy.maxRisk)}` : "—"}</strong>
        </div>
        <div>
          <small>Max Reward</small>
          <strong className="reward">{strategy.maxReward != null ? `₹${fmt(strategy.maxReward)}` : "Unlimited"}</strong>
        </div>
        <div>
          <small>R:R</small>
          <strong>{strategy.riskRewardRatio != null ? `${strategy.riskRewardRatio}:1` : "—"}</strong>
        </div>
      </div>

      <ConfidenceGauge score={strategy.confidenceScore} factors={strategy.confidenceFactors} />

      <div className="strategy-targets">
        <div>
          <small>Entry Zone</small>
          <strong>
            {strategy.entryZone
              ? `₹${fmt(strategy.entryZone.low)} – ₹${fmt(strategy.entryZone.high)}`
              : "Waiting for verified entry confirmation."}
          </strong>
        </div>
        <div>
          <small>Stop Loss</small>
          <strong>{typeof strategy.stopLoss === "string" ? strategy.stopLoss : strategy.stopLoss != null ? `₹${fmt(strategy.stopLoss)}` : "—"}</strong>
        </div>
        <div>
          <small>Target 1</small>
          <strong>{typeof strategy.targets?.t1 === "string" ? strategy.targets.t1 : strategy.targets?.t1 != null ? `₹${fmt(strategy.targets.t1)}` : "—"}</strong>
        </div>
        <div>
          <small>Target 2</small>
          <strong>{typeof strategy.targets?.t2 === "string" ? strategy.targets.t2 : strategy.targets?.t2 != null ? `₹${fmt(strategy.targets.t2)}` : "—"}</strong>
        </div>
      </div>

      <LegsTable strikes={strategy.strikes} />

      {strategy.premiumNote && (
        <p className="strategy-premium-note">{strategy.premiumNote}</p>
      )}

      {selected && (
        <div className="strategy-detail" onClick={(e) => e.stopPropagation()}>
          <ExpandSection title="Why This Strategy?" defaultOpen>
            {strategy.why?.length ? (
              <ul>
                {strategy.why.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            ) : (
              <p className="na-text">Rationale pending verified data.</p>
            )}
          </ExpandSection>

          <ExpandSection title="Entry & Exit Plan">
            <div className="plan-grid">
              <div>
                <h6>Entry</h6>
                <p>{strategy.entryTrigger || "Waiting for verified entry confirmation."}</p>
                {strategy.entryZone && (
                  <p className="plan-detail">Premium range: ₹{fmt(strategy.entryZone.low)} – ₹{fmt(strategy.entryZone.high)}</p>
                )}
              </div>
              <div>
                <h6>Exit</h6>
                {strategy.exitConditions?.length ? (
                  <ul>
                    {strategy.exitConditions.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="na-text">Exit rules pending.</p>
                )}
                <p className="plan-detail">Holding: {strategy.holdingPeriod ?? "—"}</p>
              </div>
            </div>
          </ExpandSection>

          <ExpandSection title="Risk Analysis">
            <ul className="risk-list">
              <li>Maximum defined risk: {strategy.maxRisk != null ? `₹${fmt(strategy.maxRisk)}` : "Data Not Available"}</li>
              <li>Bias: {strategy.bias ?? "—"}</li>
              {marketContext?.indiaVix?.value > 20 && (
                <li>Elevated India VIX ({fmt(marketContext.indiaVix.value)}) — wider stops advised</li>
              )}
              {strategy.status === "Wait" && (
                <li>Status Wait — entry conditions not yet met</li>
              )}
            </ul>
          </ExpandSection>
        </div>
      )}

      <footer className="strategy-card-foot">
        <span>Updated {strategy.lastUpdated ? new Date(strategy.lastUpdated).toLocaleString() : "—"}</span>
        <span className="bias-pill">{strategy.bias}</span>
      </footer>
    </article>
  );
}