"use client";

function SubGauge({ label, metric }) {
  if (!metric?.available) return null;
  const val = metric.value;
  const pct = val != null ? Math.min(100, val * 8) : 0;
  return (
    <div className="sub-gauge">
      <small>{label}</small>
      <strong>{metric.display}</strong>
      <div className="gauge-bar"><div className="gauge-fill" style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

export default function IpoSubscriptionPanel({ subscription }) {
  if (!subscription?.overall?.available && !subscription?.qib?.available && !subscription?.retail?.available) {
    return null;
  }

  return (
    <section className="ipo-subscription glass-card">
      <h3>Subscription Status</h3>
      <p className="panel-sub">Live NSE bid book — official times subscribed</p>
      <div className="sub-gauge-grid">
        <SubGauge label="Overall" metric={subscription.overall} />
        <SubGauge label="QIB" metric={subscription.qib} />
        <SubGauge label="NII" metric={subscription.nii} />
        <SubGauge label="HNI (big NII)" metric={subscription.hni} />
        <SubGauge label="Retail" metric={subscription.retail} />
        <SubGauge label="Employee" metric={subscription.employee} />
      </div>
    </section>
  );
}
