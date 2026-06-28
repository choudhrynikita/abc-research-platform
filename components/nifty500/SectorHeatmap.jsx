"use client";

export default function SectorHeatmap({ sectors = [] }) {
  if (!sectors.length) return null;

  const max = Math.max(...sectors.map((s) => Math.abs(s.avgChange ?? 0)), 1);

  function heatColor(chg) {
    if (chg == null) return "var(--bg-elevated)";
    const intensity = Math.min(Math.abs(chg) / max, 1);
    if (chg > 0) return `rgba(34, 197, 94, ${0.12 + intensity * 0.35})`;
    if (chg < 0) return `rgba(239, 68, 68, ${0.12 + intensity * 0.35})`;
    return "var(--bg-elevated)";
  }

  return (
    <section className="sector-heatmap-panel glass-card">
      <div className="panel-head">
        <h3>Sector Heatmap</h3>
        <span className="panel-sub">1-day average change by sector</span>
      </div>
      <div className="sector-heatmap-grid">
        {sectors.map((s) => (
          <div
            key={s.sector}
            className="sector-heat-cell"
            style={{ background: heatColor(s.avgChange) }}
          >
            <span className="sector-name">{s.sector}</span>
            <strong className={s.avgChange >= 0 ? "up" : "down"}>
              {s.avgChange != null ? `${s.avgChange >= 0 ? "+" : ""}${s.avgChange}%` : "—"}
            </strong>
            <small>{s.count} stocks</small>
          </div>
        ))}
      </div>
    </section>
  );
}