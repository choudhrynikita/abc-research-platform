"use client";

function KpiCard({ label, value, change, unit = "Cr", positiveIsGood = true }) {
  const hasValue = value != null && !Number.isNaN(value);
  const valCls = !hasValue ? "" : value >= 0 ? "up" : "down";
  const chgCls =
    change == null ? "" : (positiveIsGood ? change >= 0 : change <= 0) ? "up" : "down";

  return (
    <div className="fiidii-kpi glass-card">
      <span className="kpi-label">{label}</span>
      <strong className={`kpi-value ${hasValue ? valCls : ""}`}>
        {hasValue ? `${value >= 0 ? "+" : ""}${value.toLocaleString()} ${unit}` : "—"}
      </strong>
      {change != null && (
        <span className={`kpi-change ${chgCls}`}>
          vs prev {change >= 0 ? "+" : ""}{change.toLocaleString()} {unit}
        </span>
      )}
    </div>
  );
}

export default function FlowKpiCards({ kpis, overview }) {
  if (!kpis) return null;

  return (
    <section className="fiidii-kpi-grid">
      <KpiCard label="Net FII" value={kpis.netFii?.value} change={kpis.netFii?.change} />
      <KpiCard label="Net DII" value={kpis.netDii?.value} change={kpis.netDii?.change} />
      <KpiCard label="Gross Buy" value={kpis.grossBuy?.value} positiveIsGood />
      <KpiCard label="Gross Sell" value={kpis.grossSell?.value} positiveIsGood={false} />
      <KpiCard label="Net Institutional" value={kpis.combinedNet?.value} />
      <div className="fiidii-kpi glass-card trend-card">
        <span className="kpi-label">Trend</span>
        <strong className="kpi-value">{kpis.trend}</strong>
        {overview?.sentiment?.mood && (
          <span className="kpi-sub">{overview.sentiment.mood}</span>
        )}
      </div>
    </section>
  );
}