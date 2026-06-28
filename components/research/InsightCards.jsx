"use client";

export default function InsightCards({ insights = [] }) {
  if (!insights.length) return null;

  return (
    <section className="research-insights glass-card">
      <h3>AI Insights</h3>
      <p className="panel-sub">Derived from verified data only — no speculation</p>
      <div className="insight-card-grid">
        {insights.map((item, i) => (
          <div key={i} className={`insight-card insight-cat-${item.category?.toLowerCase()?.replace(/\s/g, "")}`}>
            <span className="insight-cat">{item.category}</span>
            <p>{item.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}