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
  const bookRows = (subscription?.bookRows || []).filter((row) => row.reservedLakhs != null && row.reservedLakhs > 0);
  if (!subscription?.overall?.available && !subscription?.qib?.available && !subscription?.retail?.available && !bookRows.length) {
    return null;
  }

  return (
    <section className="ipo-subscription glass-card">
      <h3>Subscription Status</h3>
      <p className="panel-sub">Live NSE bid book — official times subscribed. Grey-market premium is not used.</p>
      <div className="sub-gauge-grid">
        <SubGauge label="Overall" metric={subscription.overall} />
        <SubGauge label="QIB" metric={subscription.qib} />
        <SubGauge label="NII" metric={subscription.nii} />
        <SubGauge label="HNI (big NII)" metric={subscription.hni} />
        <SubGauge label="Retail" metric={subscription.retail} />
        <SubGauge label="Employee" metric={subscription.employee} />
      </div>
      {bookRows.length > 0 && (
        <div className="ipo-table-wrap ipo-objects-table">
          <table className="ipo-demand-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Reserved (lakhs)</th>
                <th>Applied (lakhs)</th>
                <th>Subscription</th>
              </tr>
            </thead>
            <tbody>
              {bookRows.map((row) => (
                <tr key={row.label}>
                  <td>{row.label}</td>
                  <td>{row.reservedLakhs != null ? row.reservedLakhs.toLocaleString("en-IN") : "—"}</td>
                  <td>{row.appliedLakhs != null ? row.appliedLakhs.toLocaleString("en-IN") : "—"}</td>
                  <td>{row.times != null ? `${Number(row.times).toFixed(row.times < 0.01 ? 4 : 2)}x` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
