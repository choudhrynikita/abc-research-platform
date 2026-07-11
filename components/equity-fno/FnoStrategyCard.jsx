"use client";

import { useState } from "react";
import PayoffChart from "../nifty-strategy/PayoffChart";

const DATA_UNAVAILABLE = "Data Unavailable";

function fmt(v, d = 2) {
  if (v == null || Number.isNaN(Number(v))) return DATA_UNAVAILABLE;
  return typeof v === "number"
    ? v.toLocaleString("en-IN", { maximumFractionDigits: d })
    : String(v);
}

function fmtRs(v, d = 2) {
  if (v == null || Number.isNaN(Number(v))) return DATA_UNAVAILABLE;
  return `₹${fmt(v, d)}`;
}

function formatMaxProfit(s, preferLot = true) {
  if (s.payoff?.maxProfitUnlimited || s.positionSizing?.maxProfitUnlimited) return "Unlimited";
  if (preferLot && s.maxRewardLot != null) return fmtRs(s.maxRewardLot);
  if (preferLot && s.positionSizing?.maxProfitLot != null) return fmtRs(s.positionSizing.maxProfitLot);
  if (s.maxReward != null) return `${fmtRs(s.maxReward)} / unit`;
  if (s.payoff?.maxProfit != null) return `${fmtRs(s.payoff.maxProfit)} / unit`;
  return DATA_UNAVAILABLE;
}

function formatMaxLoss(s, preferLot = true) {
  if (s.payoff?.maxLossUnlimited || s.positionSizing?.maxLossUnlimited) return "Unlimited";
  if (preferLot && s.maxRiskLot != null) return fmtRs(s.maxRiskLot);
  if (preferLot && s.positionSizing?.maxLossLot != null) return fmtRs(s.positionSizing.maxLossLot);
  if (s.maxRisk != null) return `${fmtRs(s.maxRisk)} / unit`;
  if (s.payoff?.maxLoss != null) return `${fmtRs(s.payoff.maxLoss)} / unit`;
  return DATA_UNAVAILABLE;
}

function Gauge({ label, value, max = 100, color }) {
  const pct = value != null ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="fno-mini-gauge">
      <small>{label}</small>
      <div className="gauge-bar">
        <div className="gauge-fill" style={{ width: `${pct}%`, background: color || "var(--accent)" }} />
      </div>
      <strong>
        {value != null ? (typeof value === "number" && max === 100 ? value : value) : DATA_UNAVAILABLE}
      </strong>
    </div>
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

function Metric({ label, value, className = "", title }) {
  return (
    <div className="equity-metric" title={title}>
      <small>{label}</small>
      <strong className={className}>{value}</strong>
    </div>
  );
}

export default function FnoStrategyCard({ strategy, selected, onSelect }) {
  const net = strategy.premiums?.net ?? strategy.payoff?.netPremium;
  const isCredit = net != null && net < 0;
  const statusCls =
    strategy.status === "Active"
      ? "active"
      : strategy.status === "Pre-Market"
        ? "pre-market"
        : strategy.status === "Wait"
          ? "wait"
          : "avoid";
  const a = strategy.analytics || {};
  const ps = strategy.positionSizing || {};
  const rr = strategy.riskRewardRatio ?? ps.riskRewardRatio;

  return (
    <article
      className={`fno-card glass-card${selected ? " selected" : ""}`}
      onClick={() => onSelect?.(strategy)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect?.(strategy)}
    >
      <header className="fno-card-head">
        <div className="strategy-rank">#{strategy.rank}</div>
        <div className="fno-identity">
          <h4>{strategy.companyName || strategy.name}</h4>
          <span className="fno-symbol">{strategy.nseSymbol}</span>
          <span className="fno-sector">{strategy.sector || DATA_UNAVAILABLE}</span>
        </div>
        <span className={`strategy-status ${statusCls}`}>{strategy.status}</span>
      </header>

      <div className="fno-type-row">
        <span className="strategy-type-pill">{strategy.type}</span>
        <span className="strategy-expiry">
          Monthly · {strategy.expiry ?? DATA_UNAVAILABLE}
        </span>
        {strategy.modeLabel && strategy.mode === "pre-market" && (
          <span className="strategy-mode-label">{strategy.modeLabel}</span>
        )}
      </div>

      <div className="strategy-metrics-row strategy-metrics-risk equity-risk-grid">
        <Metric
          label="Net Premium"
          title="Verified NSE debit paid or credit received (per unit)"
          value={
            net != null
              ? `${isCredit ? "Credit " : "Debit "}${fmtRs(Math.abs(net))}${
                  strategy.mode === "pre-market" ? " ref." : ""
                } /u`
              : strategy.mode === "pre-market"
                ? "Trigger at open"
                : DATA_UNAVAILABLE
          }
        />
        <Metric
          label="Max Loss / Lot"
          className="risk"
          title="Worst-case expiry P/L × lot size (standard payoff model)"
          value={formatMaxLoss(strategy, true)}
        />
        <Metric
          label="Max Profit / Lot"
          className="reward"
          title="Best-case expiry P/L × lot size — Unlimited when theoretically unbounded"
          value={formatMaxProfit(strategy, true)}
        />
        <Metric
          label="Break-even"
          title="Underlying level(s) where expiry P/L = 0"
          value={strategy.payoff?.breakEvenDisplay || ps.breakEven || DATA_UNAVAILABLE}
        />
        <Metric
          label="R:R"
          title="Max profit ÷ max loss when both finite"
          value={rr != null ? `${rr}:1` : DATA_UNAVAILABLE}
        />
      </div>

      <div className="confidence-gauge">
        <div className="gauge-head">
          <span>Strategy Confidence</span>
          <strong>
            {strategy.confidenceScore != null
              ? `${strategy.confidenceScore}%`
              : DATA_UNAVAILABLE}
          </strong>
        </div>
        <div className="gauge-bar">
          <div
            className="gauge-fill"
            style={{ width: `${strategy.confidenceScore ?? 0}%` }}
          />
        </div>
        <p className="confidence-disclaimer">
          Composite signal strength — not a guaranteed success rate
        </p>
      </div>

      <div className="strategy-targets">
        <div>
          <small>Entry (premium)</small>
          <strong>
            {strategy.entryZone
              ? `${fmtRs(strategy.entryZone.low)}–${fmtRs(strategy.entryZone.high)}`
              : strategy.entryTrigger || "Awaiting verified market confirmation."}
          </strong>
        </div>
        <div>
          <small>Stop (mgmt)</small>
          <strong>
            {typeof strategy.stopLoss === "string"
              ? strategy.stopLoss
              : strategy.stopLoss != null
                ? fmtRs(strategy.stopLoss)
                : DATA_UNAVAILABLE}
          </strong>
        </div>
        <div>
          <small>T1 (mgmt)</small>
          <strong title="Trade management target — not mathematical max profit">
            {typeof strategy.targets?.t1 === "string"
              ? strategy.targets.t1
              : strategy.targets?.t1 != null
                ? fmtRs(strategy.targets.t1)
                : DATA_UNAVAILABLE}
          </strong>
        </div>
        <div>
          <small>T2 (mgmt)</small>
          <strong title="Trade management target — not mathematical max profit">
            {typeof strategy.targets?.t2 === "string"
              ? strategy.targets.t2
              : strategy.targets?.t2 != null
                ? fmtRs(strategy.targets.t2)
                : DATA_UNAVAILABLE}
          </strong>
        </div>
      </div>

      {strategy.premiumNote && (
        <p className="strategy-premium-note">{strategy.premiumNote}</p>
      )}

      {strategy.strikes?.length > 0 && (
        <div className="legs-table-wrap">
          <table className="legs-table">
            <thead>
              <tr>
                <th>Leg</th>
                <th>Strike</th>
                <th>Premium</th>
              </tr>
            </thead>
            <tbody>
              {strategy.strikes.map((leg, i) => (
                <tr key={i}>
                  <td className={leg.action === "BUY" ? "buy" : "sell"}>
                    {leg.action} {leg.type}
                  </td>
                  <td>
                    {leg.strike != null
                      ? Number(leg.strike).toLocaleString("en-IN")
                      : DATA_UNAVAILABLE}
                  </td>
                  <td>{leg.premium != null ? fmtRs(leg.premium) : DATA_UNAVAILABLE}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="fno-detail" onClick={(e) => e.stopPropagation()}>
          <PayoffChart strategy={strategy} height={280} />

          <ExpandSection title="Capital, Risk & Returns" defaultOpen>
            <div className="sizing-grid equity-sizing-grid">
              <Metric label="Lot Size" value={ps.lotSize != null ? ps.lotSize : DATA_UNAVAILABLE} title="Official NSE F&O lot size" />
              <Metric
                label="Premium / Lot"
                value={ps.premiumPerLot != null ? fmtRs(ps.premiumPerLot) : DATA_UNAVAILABLE}
                title="|Net premium| × lot size"
              />
              <Metric
                label="Capital Required"
                value={
                  ps.capitalRequired != null
                    ? fmtRs(ps.capitalRequired)
                    : ps.marginNote || DATA_UNAVAILABLE
                }
                title="Debit premium capital; credit structures need broker margin"
              />
              <Metric
                label="Investment Amount"
                value={
                  ps.investmentAmount != null ? fmtRs(ps.investmentAmount) : DATA_UNAVAILABLE
                }
              />
              <Metric
                label="Risk / Unit"
                value={
                  ps.riskPerShare != null ? fmtRs(ps.riskPerShare) : DATA_UNAVAILABLE
                }
                className="risk"
              />
              <Metric
                label="% Return (max)"
                value={
                  ps.percentageReturn != null
                    ? `${ps.percentageReturn}%`
                    : DATA_UNAVAILABLE
                }
                title="Max profit / capital when both finite"
              />
              <Metric
                label="Portfolio Exposure"
                value={
                  ps.portfolioExposure != null
                    ? fmtRs(ps.portfolioExposure)
                    : DATA_UNAVAILABLE
                }
                title="Spot × lot (notional)"
              />
              <Metric
                label="Break-even"
                value={ps.breakEven || strategy.payoff?.breakEvenDisplay || DATA_UNAVAILABLE}
              />
            </div>
            {ps.note && <p className="na-text">{ps.note}</p>}
            {ps.marginNote && <p className="na-text">{ps.marginNote}</p>}
            {ps.source && <p className="panel-sub">{ps.source}</p>}
          </ExpandSection>

          <ExpandSection title="Transaction Charges (Open)">
            {ps.openCharges?.available ? (
              <>
                <div className="sizing-grid">
                  <Metric label="Open Charges (total)" value={fmtRs(ps.openCharges.total)} />
                  <Metric
                    label="Max Profit Net"
                    className="reward"
                    value={
                      ps.netOfCharges?.maxProfitNet != null
                        ? fmtRs(ps.netOfCharges.maxProfitNet)
                        : strategy.payoff?.maxProfitUnlimited
                          ? "Unlimited"
                          : DATA_UNAVAILABLE
                    }
                  />
                  <Metric
                    label="Max Loss Net"
                    className="risk"
                    value={
                      ps.netOfCharges?.maxLossNet != null
                        ? fmtRs(ps.netOfCharges.maxLossNet)
                        : strategy.payoff?.maxLossUnlimited
                          ? "Unlimited"
                          : DATA_UNAVAILABLE
                    }
                  />
                </div>
                <p className="panel-sub">
                  {ps.openCharges.note} · Source: {ps.openCharges.source} (as of{" "}
                  {ps.openCharges.asOf}). Brokerage = ₹0 unless configured — never assumed.
                  Exit charges are not estimated.
                </p>
              </>
            ) : (
              <p className="na-text">
                {ps.openCharges?.reason ||
                  "Charges unavailable — verified premium × lot required. Brokerage is never invented."}
              </p>
            )}
          </ExpandSection>

          <ExpandSection title="Options Analytics">
            <div className="analytics-grid">
              <Gauge
                label="OI"
                value={a.openInterest}
                max={a.openInterest > 100000 ? a.openInterest : 100000}
              />
              <div className="fno-stat">
                <small>OI Δ</small>
                <strong>
                  {a.oiChange != null ? a.oiChange.toLocaleString("en-IN") : DATA_UNAVAILABLE}
                </strong>
              </div>
              <div className="fno-stat">
                <small>Volume</small>
                <strong>
                  {a.volume != null ? a.volume.toLocaleString("en-IN") : DATA_UNAVAILABLE}
                </strong>
              </div>
              <div className="fno-stat">
                <small>IV</small>
                <strong>
                  {a.impliedVolatility != null
                    ? `${fmt(a.impliedVolatility)}%`
                    : DATA_UNAVAILABLE}
                </strong>
              </div>
              <div className="fno-stat">
                <small>Delta</small>
                <strong>{a.delta ?? DATA_UNAVAILABLE}</strong>
              </div>
              <div className="fno-stat">
                <small>Gamma</small>
                <strong>{a.gamma ?? DATA_UNAVAILABLE}</strong>
              </div>
              <div className="fno-stat">
                <small>Theta</small>
                <strong>{a.theta ?? DATA_UNAVAILABLE}</strong>
              </div>
              <div className="fno-stat">
                <small>Vega</small>
                <strong>{a.vega ?? DATA_UNAVAILABLE}</strong>
              </div>
              <div className="fno-stat">
                <small>Liquidity</small>
                <strong>{a.liquidityRating ?? DATA_UNAVAILABLE}</strong>
              </div>
              <div className="fno-stat">
                <small>PCR</small>
                <strong>{a.putCallRatio ?? DATA_UNAVAILABLE}</strong>
              </div>
            </div>
            {a.ivNote && <p className="na-text">{a.ivNote}</p>}
            {a.greeksSource && <p className="na-text">{a.greeksSource}</p>}
          </ExpandSection>

          <ExpandSection title="Why This Strategy?">
            <ul>
              {strategy.why?.length ? (
                strategy.why.map((w) => <li key={w}>{w}</li>)
              ) : (
                <li className="na-text">Pending verified data</li>
              )}
            </ul>
          </ExpandSection>

          <ExpandSection title="Trade Execution Plan">
            <div className="plan-grid">
              <div>
                <h6>Entry</h6>
                <p>{strategy.entryTrigger || "Awaiting verified market confirmation."}</p>
              </div>
              <div>
                <h6>Exit</h6>
                <ul>
                  {strategy.exitConditions?.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
                <p className="plan-detail">Time: {strategy.timeExit ?? DATA_UNAVAILABLE}</p>
                <p className="plan-detail">
                  Indicator: {strategy.indicatorExit ?? DATA_UNAVAILABLE}
                </p>
              </div>
            </div>
          </ExpandSection>
        </div>
      )}

      <footer className="strategy-card-foot">
        <span>
          {strategy.lastUpdated
            ? new Date(strategy.lastUpdated).toLocaleString()
            : DATA_UNAVAILABLE}
        </span>
        <span className="bias-pill">{strategy.bias}</span>
      </footer>
    </article>
  );
}
