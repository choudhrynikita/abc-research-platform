"use client";

import { useState } from "react";

function fmt(v, d = 2) {
  if (v == null || Number.isNaN(v)) return "—";
  return typeof v === "number" ? v.toFixed(d) : String(v);
}

function Gauge({ label, value, max = 100, color }) {
  const pct = value != null ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="fno-mini-gauge">
      <small>{label}</small>
      <div className="gauge-bar"><div className="gauge-fill" style={{ width: `${pct}%`, background: color || "var(--accent)" }} /></div>
      <strong>{value != null ? (typeof value === "number" && max === 100 ? value : value) : "—"}</strong>
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

export default function FnoStrategyCard({ strategy, selected, onSelect }) {
  const net = strategy.premiums?.net;
  const isCredit = net != null && net < 0;
  const statusCls = strategy.status === "Active"
    ? "active"
    : strategy.status === "Pre-Market"
      ? "pre-market"
      : strategy.status === "Wait"
        ? "wait"
        : "avoid";
  const a = strategy.analytics || {};
  const ps = strategy.positionSizing || {};

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
          <span className="fno-sector">{strategy.sector}</span>
        </div>
        <span className={`strategy-status ${statusCls}`}>{strategy.status}</span>
      </header>

      <div className="fno-type-row">
        <span className="strategy-type-pill">{strategy.type}</span>
        <span className="strategy-expiry">Monthly · {strategy.expiry ?? "—"}</span>
        {strategy.modeLabel && strategy.mode === "pre-market" && (
          <span className="strategy-mode-label">{strategy.modeLabel}</span>
        )}
      </div>

      <div className="strategy-metrics-row">
        <div>
          <small>Net Premium</small>
          <strong>
            {net != null
              ? `${isCredit ? "Credit " : ""}₹${fmt(Math.abs(net))}${strategy.mode === "pre-market" ? " ref." : ""}`
              : "Trigger at open"}
          </strong>
        </div>
        <div><small>Max Risk</small><strong className="risk">{strategy.maxRisk != null ? `₹${fmt(strategy.maxRisk)}` : "—"}</strong></div>
        <div><small>Max Reward</small><strong className="reward">{strategy.maxReward != null ? `₹${fmt(strategy.maxReward)}` : "Unlimited"}</strong></div>
        <div><small>R:R</small><strong>{strategy.riskRewardRatio != null ? `${strategy.riskRewardRatio}:1` : "—"}</strong></div>
      </div>

      <div className="confidence-gauge">
        <div className="gauge-head">
          <span>Strategy Confidence</span>
          <strong>{strategy.confidenceScore != null ? `${strategy.confidenceScore}%` : "—"}</strong>
        </div>
        <div className="gauge-bar"><div className="gauge-fill" style={{ width: `${strategy.confidenceScore ?? 0}%` }} /></div>
        <p className="confidence-disclaimer">Composite signal strength — not a guaranteed success rate</p>
      </div>

      <div className="strategy-targets">
        <div>
          <small>Entry</small>
          <strong>
            {strategy.entryZone
              ? `₹${fmt(strategy.entryZone.low)}–${fmt(strategy.entryZone.high)}`
              : strategy.entryTrigger || "Awaiting verified market confirmation."}
          </strong>
        </div>
        <div>
          <small>Stop</small>
          <strong>{typeof strategy.stopLoss === "string" ? strategy.stopLoss : strategy.stopLoss != null ? `₹${fmt(strategy.stopLoss)}` : "—"}</strong>
        </div>
        <div>
          <small>T1</small>
          <strong>{typeof strategy.targets?.t1 === "string" ? strategy.targets.t1 : strategy.targets?.t1 != null ? `₹${fmt(strategy.targets.t1)}` : "—"}</strong>
        </div>
        <div>
          <small>T2</small>
          <strong>{typeof strategy.targets?.t2 === "string" ? strategy.targets.t2 : strategy.targets?.t2 != null ? `₹${fmt(strategy.targets.t2)}` : "—"}</strong>
        </div>
      </div>

      {strategy.premiumNote && (
        <p className="strategy-premium-note">{strategy.premiumNote}</p>
      )}

      {strategy.strikes?.length > 0 && (
        <table className="legs-table">
          <thead><tr><th>Leg</th><th>Strike</th><th>Premium</th></tr></thead>
          <tbody>
            {strategy.strikes.map((leg, i) => (
              <tr key={i}>
                <td className={leg.action === "BUY" ? "buy" : "sell"}>{leg.action} {leg.type}</td>
                <td>{leg.strike?.toLocaleString()}</td>
                <td>₹{fmt(leg.premium)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selected && (
        <div className="fno-detail" onClick={(e) => e.stopPropagation()}>
          <ExpandSection title="Position Sizing" defaultOpen>
            {ps.available ? (
              <div className="sizing-grid">
                <div><small>Lot Size</small><strong>{ps.lotSize}</strong></div>
                <div><small>Premium/Lot</small><strong>₹{fmt(ps.premiumPerLot)}</strong></div>
                <div><small>Capital</small><strong>{ps.capitalRequired != null ? `₹${fmt(ps.capitalRequired)}` : ps.marginNote || "—"}</strong></div>
                <div><small>Break-even</small><strong>{ps.breakEven ?? "—"}</strong></div>
                <div><small>Profit @ T1</small><strong>{ps.estimatedProfitT1 != null ? `₹${fmt(ps.estimatedProfitT1)}` : "—"}</strong></div>
                <div><small>RoC @ T1</small><strong>{ps.returnOnCapitalT1 != null ? `${ps.returnOnCapitalT1}%` : "—"}</strong></div>
              </div>
            ) : (
              <p className="na-text">{ps.note || "Position sizing unavailable — lot size not verified from NSE."}</p>
            )}
          </ExpandSection>

          <ExpandSection title="Options Analytics">
            <div className="analytics-grid">
              <Gauge label="OI" value={a.openInterest} max={a.openInterest > 100000 ? a.openInterest : 100000} />
              <div className="fno-stat"><small>OI Δ</small><strong>{a.oiChange?.toLocaleString() ?? "—"}</strong></div>
              <div className="fno-stat"><small>Volume</small><strong>{a.volume?.toLocaleString() ?? "—"}</strong></div>
              <div className="fno-stat"><small>IV</small><strong>{a.impliedVolatility != null ? `${fmt(a.impliedVolatility)}%` : "—"}</strong></div>
              <div className="fno-stat"><small>Delta</small><strong>{a.delta ?? "—"}</strong></div>
              <div className="fno-stat"><small>Gamma</small><strong>{a.gamma ?? "—"}</strong></div>
              <div className="fno-stat"><small>Theta</small><strong>{a.theta ?? "—"}</strong></div>
              <div className="fno-stat"><small>Vega</small><strong>{a.vega ?? "—"}</strong></div>
              <div className="fno-stat"><small>Liquidity</small><strong>{a.liquidityRating ?? "—"}</strong></div>
              <div className="fno-stat"><small>PCR</small><strong>{a.putCallRatio ?? "—"}</strong></div>
            </div>
            {a.ivNote && <p className="na-text">{a.ivNote}</p>}
            {a.greeksSource && <p className="na-text">{a.greeksSource}</p>}
          </ExpandSection>

          <ExpandSection title="Why This Strategy?">
            <ul>{strategy.why?.map((w) => <li key={w}>{w}</li>) ?? <li className="na-text">Pending verified data</li>}</ul>
          </ExpandSection>

          <ExpandSection title="Trade Execution Plan">
            <div className="plan-grid">
              <div>
                <h6>Entry</h6>
                <p>{strategy.entryTrigger || "Awaiting verified market confirmation."}</p>
              </div>
              <div>
                <h6>Exit</h6>
                <ul>{strategy.exitConditions?.map((c) => <li key={c}>{c}</li>)}</ul>
                <p className="plan-detail">Time: {strategy.timeExit ?? "—"}</p>
                <p className="plan-detail">Indicator: {strategy.indicatorExit ?? "—"}</p>
              </div>
            </div>
          </ExpandSection>
        </div>
      )}

      <footer className="strategy-card-foot">
        <span>{strategy.lastUpdated ? new Date(strategy.lastUpdated).toLocaleString() : "—"}</span>
        <span className="bias-pill">{strategy.bias}</span>
      </footer>
    </article>
  );
}