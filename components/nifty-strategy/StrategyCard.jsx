"use client";

import { useState } from "react";
import PayoffChart from "./PayoffChart";
import StrategyDossierPanel from "../StrategyDossierPanel";
import {
  formatTradeBadge,
  formatTradeLine,
  statusTone,
} from "../../lib/strategy-trade-label";

const FILL_AT_OPEN = "Last close not on file";
const NO_PREMIUM = "No verified premium";

function fmt(v, digits = 2) {
  if (v == null || Number.isNaN(Number(v))) return "—";
  return typeof v === "number"
    ? v.toLocaleString("en-IN", { maximumFractionDigits: digits })
    : String(v);
}

function isSpotZone(strategy) {
  return strategy?.entryZoneKind === "spot" || Boolean(strategy?.structuralRiskNote);
}

function formatEntryZone(strategy) {
  const zone = strategy?.entryZone;
  if (zone && (zone.low != null || zone.high != null)) {
    const low = fmt(zone.low ?? zone.high);
    const high = fmt(zone.high ?? zone.low);
    if (isSpotZone(strategy)) return `${low} – ${high}`;
    return `₹${low} – ₹${high}`;
  }
  if (strategy?.entryTrigger) return strategy.entryTrigger;
  return strategy?.mode !== "live" ? "Use last-close trigger at the next open" : "No verified entry yet";
}

function formatPremiumValue(value, { planning = false, credit = false } = {}) {
  if (value == null || Number.isNaN(Number(value))) {
    return planning ? FILL_AT_OPEN : NO_PREMIUM;
  }
  const abs = Math.abs(Number(value));
  const side = credit ? "Credit " : Number(value) > 0 && !credit ? "Debit " : "";
  return `${side}₹${fmt(abs)}${planning ? " last close" : ""}`;
}

function formatMaxProfit(strategy) {
  const p = strategy.payoff;
  if (p?.maxProfitUnlimited) return "Unlimited";
  if (strategy.type === "Long PE" && (strategy.maxReward != null || p?.maxProfit != null)) {
    return `₹${fmt(strategy.maxReward ?? p.maxProfit)} if spot→0`;
  }
  if (p?.available && strategy.maxReward != null) return `₹${fmt(strategy.maxReward)}`;
  if (strategy.structuralRiskNote && strategy.maxReward != null) {
    return `${fmt(strategy.maxReward)} pts`;
  }
  if (strategy.maxReward != null) return `${fmt(strategy.maxReward)} pts (width)`;
  if (p?.maxProfit != null) return `₹${fmt(p.maxProfit)}`;
  return strategy.mode !== "live" ? FILL_AT_OPEN : NO_PREMIUM;
}

function formatMaxLoss(strategy) {
  const p = strategy.payoff;
  if (p?.maxLossUnlimited) return "Unlimited";
  if (p?.available && strategy.maxRisk != null) return `₹${fmt(strategy.maxRisk)}`;
  if (strategy.structuralRiskNote && strategy.maxRisk != null) {
    return `${fmt(strategy.maxRisk)} pts`;
  }
  if (strategy.maxRisk != null) return `${fmt(strategy.maxRisk)} pts (width)`;
  if (p?.maxLoss != null) return `₹${fmt(p.maxLoss)}`;
  return strategy.mode !== "live" ? FILL_AT_OPEN : NO_PREMIUM;
}

function formatBreakEven(strategy) {
  const be =
    strategy.payoff?.breakEvenDisplay ||
    strategy.positionSizing?.breakEven ||
    null;
  if (be) return be;
  return strategy.mode !== "live" ? "At trigger / next open" : "—";
}

function formatRr(strategy) {
  const rr = strategy.riskRewardRatio ?? strategy.payoff?.riskRewardRatio;
  if (rr != null) return `${rr}:1`;
  if (strategy.structuralRiskNote && strategy.bias === "Neutral") return "Range plan";
  if (strategy.structuralRiskNote || strategy.mode !== "live") return "At trigger";
  return "—";
}

function TradeBadge({ strategy }) {
  return (
    <span className={`strategy-status ${statusTone(strategy.status)}`}>
      {formatTradeBadge(strategy)}
    </span>
  );
}

function ConfidenceGauge({ score, factors }) {
  const pct = score ?? 0;
  const color = pct >= 70 ? "var(--green)" : pct >= 50 ? "var(--yellow)" : "var(--red)";
  return (
    <div className="confidence-gauge">
      <div className="gauge-head">
        <span>Strategy Confidence</span>
        <strong style={{ color }}>{score != null ? `${score}%` : "—"}</strong>
      </div>
      <p className="confidence-disclaimer">
        Composite signal strength — not a guaranteed success rate
      </p>
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

function LegsTable({ strikes, planning, expiry }) {
  if (!strikes?.length) return <p className="na-text">{planning ? FILL_AT_OPEN : NO_PREMIUM}</p>;
  return (
    <table className="legs-table">
      <thead>
        <tr>
          <th>Action</th>
          <th>Type</th>
          <th>Strike</th>
          <th>Expiry</th>
          <th>Premium</th>
        </tr>
      </thead>
      <tbody>
        {strikes.map((leg, i) => (
          <tr key={`${leg.strike}-${leg.type}-${i}`}>
            <td className={leg.action === "BUY" ? "buy" : leg.action === "SELL" ? "sell" : ""}>
              {leg.action}
            </td>
            <td>{leg.type}</td>
            <td>{leg.strike != null ? Number(leg.strike).toLocaleString("en-IN") : "—"}</td>
            <td>{leg.expiry || expiry || "—"}</td>
            <td>
              {leg.premium != null
                ? `₹${fmt(leg.premium)}${planning ? " last close" : ""}`
                : planning
                  ? FILL_AT_OPEN
                  : NO_PREMIUM}
            </td>
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

function MetricCell({ label, value, className = "", title }) {
  return (
    <div title={title}>
      <small>{label}</small>
      <strong className={className}>{value}</strong>
    </div>
  );
}

export default function StrategyCard({ strategy, marketContext, selected, onSelect }) {
  const netPrem = strategy.premiums?.net ?? strategy.payoff?.netPremium;
  const isCredit = netPrem != null && netPrem < 0;
  const isReferencePlan = strategy.mode !== "live";
  const eligibility = strategy.eligibility;
  const readyGateCount = eligibility?.gates?.filter((gate) => gate.state === "ready").length ?? 0;
  const entryLabel = isSpotZone(strategy) ? "Spot zone" : "Entry Zone";
  const tradeLine = formatTradeLine(strategy);

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
          <div className="strategy-identity-pills">
            {strategy.horizonLabel && (
              <span className="strategy-horizon-pill">{strategy.horizonLabel}</span>
            )}
          </div>
          {tradeLine ? <p className="strategy-trade-line">{tradeLine}</p> : null}
        </div>
        <TradeBadge strategy={strategy} />
      </header>

      <div className="strategy-metrics-row strategy-metrics-risk">
        <MetricCell
          label="Net Premium"
          title="Debit paid or credit received from verified NSE premiums"
          value={formatPremiumValue(netPrem, { planning: isReferencePlan, credit: isCredit })}
        />
        <MetricCell
          label="Max Loss"
          className="risk"
          title={
            isSpotZone(strategy) && !strategy.payoff?.available
              ? "Last-close spot distance in index points — not rupee P/L"
              : "Worst-case expiry P/L from verified legs (standard payoff model)"
          }
          value={formatMaxLoss(strategy)}
        />
        <MetricCell
          label="Max Profit"
          className="reward"
          title="Best-case expiry P/L from verified legs — Unlimited when theoretically unbounded"
          value={formatMaxProfit(strategy)}
        />
        <MetricCell
          label="Break-even"
          title="Underlying level(s) where expiry P/L = 0"
          value={formatBreakEven(strategy)}
        />
        <MetricCell
          label="R:R"
          title="Max profit ÷ max loss when both are defined and finite"
          value={formatRr(strategy)}
        />
      </div>

      <ConfidenceGauge score={strategy.confidenceScore} factors={strategy.confidenceFactors} />

      <div className="strategy-targets">
        <div>
          <small>{entryLabel}</small>
          <strong>{formatEntryZone(strategy)}</strong>
        </div>
        <div>
          <small>Stop Loss</small>
          <strong>
            {typeof strategy.stopLoss === "string"
              ? strategy.stopLoss
              : strategy.stopLoss != null
                ? `₹${fmt(strategy.stopLoss)}`
                : isReferencePlan
                  ? "Per trigger"
                  : "—"}
          </strong>
        </div>
        <div>
          <small>Target 1 (mgmt)</small>
          <strong title="Trade management target — not mathematical max profit">
            {typeof strategy.targets?.t1 === "string"
              ? strategy.targets.t1
              : strategy.targets?.t1 != null
                ? `₹${fmt(strategy.targets.t1)}`
                : "—"}
          </strong>
        </div>
        <div>
          <small>Target 2 (mgmt)</small>
          <strong title="Trade management target — not mathematical max profit">
            {typeof strategy.targets?.t2 === "string"
              ? strategy.targets.t2
              : strategy.targets?.t2 != null
                ? `₹${fmt(strategy.targets.t2)}`
                : "—"}
          </strong>
        </div>
      </div>

      <div className="legs-table-wrap">
        <LegsTable strikes={strategy.strikes} planning={isReferencePlan} expiry={strategy.expiry} />
      </div>

      {strategy.premiumNote && (
        <p className="strategy-premium-note">{strategy.premiumNote}</p>
      )}

      {eligibility && (
        <details className={`strategy-evidence${eligibility.decision === "DEFER" ? " defer" : ""}`} open={eligibility.decision === "DEFER"} onClick={(event) => event.stopPropagation()}>
          <summary>
            <span>Decision checks</span>
            <strong>{eligibility.decision} · {readyGateCount}/{eligibility.gates.length} ready</strong>
          </summary>
          <div className="strategy-evidence-body">
            <ul className="strategy-gate-list">
              {eligibility.gates.map((gate) => (
                <li key={gate.label} className={gate.state}>
                  <strong>{gate.label}</strong><span>{gate.detail}</span>
                </li>
              ))}
            </ul>
            {eligibility.blockers?.length > 0 && <p className="strategy-defer-note">Do not act yet: {eligibility.blockers.join("; ")}</p>}
          </div>
        </details>
      )}

      {selected && (
        <div className="strategy-detail" onClick={(e) => e.stopPropagation()}>
          <PayoffChart strategy={strategy} height={280} />

          <ExpandSection title="Why This Strategy?" defaultOpen>
            {strategy.why?.length ? (
              <ul className="why-rationale">
                {strategy.why.map((w) => {
                  const item = typeof w === "string" ? { category: null, text: w } : w;
                  return (
                    <li key={item.text}>
                      {item.category && (
                        <span className={`why-tag why-${item.category.toLowerCase()}`}>
                          {item.category}
                        </span>
                      )}
                      <span>{item.text}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="na-text">Rationale pending verified data.</p>
            )}
          </ExpandSection>

          <ExpandSection title="Risk & Payoff Analysis" defaultOpen>
            <ul className="risk-list">
              <li>
                Maximum loss: <strong>{formatMaxLoss(strategy)}</strong>
                {strategy.payoff?.maxLossLot != null && (
                  <span> (₹{fmt(strategy.payoff.maxLossLot)} / lot)</span>
                )}
              </li>
              <li>
                Maximum profit: <strong>{formatMaxProfit(strategy)}</strong>
                {strategy.payoff?.maxProfitLot != null && (
                  <span> (₹{fmt(strategy.payoff.maxProfitLot)} / lot)</span>
                )}
              </li>
              <li>Break-even(s): {formatBreakEven(strategy)}</li>
              <li>
                Net premium:{" "}
                {netPrem != null
                  ? `${isCredit ? "Received" : "Paid"} ₹${fmt(Math.abs(netPrem))} per unit${
                      isReferencePlan ? " (last close)" : ""
                    }`
                  : isReferencePlan
                    ? FILL_AT_OPEN
                    : NO_PREMIUM}
              </li>
              <li>
                Risk-reward: {formatRr(strategy)}
                {strategy.payoff?.returnOnRisk != null &&
                  ` · Return on risk ${strategy.payoff.returnOnRisk}%`}
              </li>
              <li>Bias: {strategy.bias ?? "—"}</li>
              {strategy.payoff?.source && (
                <li className="risk-source">{strategy.payoff.source}</li>
              )}
              {strategy.structuralRiskNote && (
                <li>{strategy.structuralRiskNote}</li>
              )}
              {marketContext?.indiaVix?.value > 20 && (
                <li>
                  Elevated India VIX ({fmt(marketContext.indiaVix.value)}) — wider stops advised
                </li>
              )}
              {strategy.status === "Wait" && (
                <li>Status Wait — entry conditions not yet met</li>
              )}
            </ul>
          </ExpandSection>

          <ExpandSection title="Entry & Exit Plan">
            <div className="plan-grid">
              <div>
                <h6>Entry</h6>
                <p>{strategy.entryTrigger || formatEntryZone(strategy)}</p>
                {strategy.entryZone && (
                  <p className="plan-detail">
                    {isSpotZone(strategy) ? "Spot zone" : "Premium range"}:{" "}
                    {isSpotZone(strategy)
                      ? `${fmt(strategy.entryZone.low)} – ${fmt(strategy.entryZone.high)}`
                      : `₹${fmt(strategy.entryZone.low)} – ₹${fmt(strategy.entryZone.high)}`}
                  </p>
                )}
                {strategy.premiumZone && (
                  <p className="plan-detail">
                    Last-close premium band: ₹{fmt(strategy.premiumZone.low)} – ₹{fmt(strategy.premiumZone.high)}
                  </p>
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

          {(strategy.dossier || strategy.backtest || strategy.confidenceDetail) && (
            <ExpandSection title="Institutional Dossier & Backtest" defaultOpen>
              <StrategyDossierPanel
                dossier={strategy.dossier}
                confidence={strategy.confidenceDetail || strategy.dossier?.confidence}
                backtest={strategy.backtest || strategy.dossier?.backtest}
              />
            </ExpandSection>
          )}
        </div>
      )}

      <footer className="strategy-card-foot">
        <span>
          Updated{" "}
          {strategy.lastUpdated
            ? new Date(strategy.lastUpdated).toLocaleString()
            : "—"}
        </span>
        <span className="bias-pill">{strategy.bias}</span>
      </footer>
    </article>
  );
}
