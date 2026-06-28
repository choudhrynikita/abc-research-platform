"use client";

function SubGauge({ label, metric }) {
  const val = metric?.available ? metric.value : null;
  const pct = val != null ? Math.min(100, val * 20) : 0;
  return (
    <div className="sub-gauge">
      <small>{label}</small>
      <strong>{metric?.available ? metric.display : "Awaiting official verified data."}</strong>
      {metric?.available && (
        <div className="gauge-bar"><div className="gauge-fill" style={{ width: `${pct}%` }} /></div>
      )}
    </div>
  );
}

export default function IpoSubscriptionPanel({ subscription }) {
  if (!subscription) return null;

  return (
    <section className="ipo-subscription glass-card">
      <h3>Subscription Status</h3>
      <p className="panel-sub">Verified NSE bidDetails — updates when officially published</p>
      <div className="sub-gauge-grid">
        <SubGauge label="Overall" metric={subscription.overall} />
        <SubGauge label="QIB" metric={subscription.qib} />
        <SubGauge label="NII (HNI)" metric={subscription.hni} />
        <SubGauge label="Retail" metric={subscription.retail} />
        <SubGauge label="Employee" metric={subscription.employee} />
      </div>
    </section>
  );
}