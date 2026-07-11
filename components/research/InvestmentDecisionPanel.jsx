"use client";

export default function InvestmentDecisionPanel({ decision }) {
  if (!decision) return null;

  return (
    <section className="research-decision glass-card research-section">
      <h3>Investment Decision / Execution Plan</h3>
      <p className="panel-sub">
        Analytical model levels from verified support/resistance — not a broker order ticket. Recommendation shown in executive summary.
      </p>
      {decision.methodology && <p className="panel-sub">{decision.methodology}</p>}

      <div className="decision-targets">
        <div><small>Entry Zone</small><strong>{decision.entryZone != null ? `₹${decision.entryZone}` : "—"}</strong></div>
        <div><small>Stop Loss</small><strong>{decision.stopLoss != null ? `₹${decision.stopLoss}` : "—"}</strong></div>
        <div><small>Target 1</small><strong>{decision.targets?.t1 != null ? `₹${decision.targets.t1}` : "—"}</strong></div>
        <div><small>Target 2</small><strong>{decision.targets?.t2 != null ? `₹${decision.targets.t2}` : "—"}</strong></div>
        <div><small>Target 3</small><strong>{decision.targets?.t3 != null ? `₹${decision.targets.t3}` : "—"}</strong></div>
      </div>

      <div className="decision-columns">
        <div>
          <h4>Key Opportunities</h4>
          <ul>{decision.opportunities?.map((o) => <li key={o}>{o}</li>)}</ul>
        </div>
        <div>
          <h4>Key Risks</h4>
          <ul className="risk-list">{decision.risks?.map((r) => <li key={r}>{r}</li>)}</ul>
        </div>
        <div>
          <h4>Events to Monitor</h4>
          <ul>{decision.eventsToMonitor?.map((e) => <li key={e}>{e}</li>)}</ul>
        </div>
      </div>

    </section>
  );
}