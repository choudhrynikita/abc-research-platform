"use client";

const TYPE_ICONS = {
  flow: "↗",
  trend: "📈",
  monthly: "📅",
  accumulation: "⬆",
  distribution: "⬇",
  risk: "⚠",
  info: "ℹ",
};

export default function AiInsightPanel({ insights = [] }) {
  if (!insights.length) return null;

  return (
    <section className="fiidii-insights glass-card">
      <h3>Smart Insights</h3>
      <p className="panel-sub">Generated only from verified NSE institutional flow data</p>
      <ul className="insight-list">
        {insights.map((item, i) => (
          <li key={i} className={`insight-item insight-${item.type}`}>
            <span className="insight-icon">{TYPE_ICONS[item.type] || "•"}</span>
            <div>
              <p>{item.text}</p>
              {item.confidence && (
                <small>Confidence: {item.confidence}</small>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}