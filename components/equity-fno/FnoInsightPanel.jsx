"use client";

export default function FnoInsightPanel({ insights, backtest }) {
  if (!insights && !backtest) return null;

  const blocks = [
    { key: "technical", title: "Technical Insight", icon: "▲" },
    { key: "options", title: "Options Insight", icon: "◎" },
    { key: "fundamental", title: "Fundamental Insight", icon: "◆" },
    { key: "risks", title: "Risk Factors", icon: "!", risk: true },
  ];

  return (
    <section className="fno-insights glass-card">
      <h3>AI Insights</h3>
      <p className="panel-sub">Evidence-based signals from verified market data</p>
      <div className="fno-insight-grid">
        {blocks.map(({ key, title, icon, risk }) => {
          const items = insights[key];
          if (!items?.length) return null;
          return (
            <div key={key} className={`insight-block${risk ? " risk-block" : ""}`}>
              <h4>{title}</h4>
              <ul className="insight-list">
                {items.map((text, i) => (
                  <li key={i} className={`insight-item${risk ? " insight-risk" : ""}`}>
                    <span className="insight-icon">{icon}</span>
                    <p>{text}</p>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="backtest-strip">
        <h4>Historical Backtest</h4>
        {backtest?.available ? (
          <div className="backtest-metrics">
            <div>
              <small>Backtested Win Rate</small>
              <strong>{backtest.winRate != null ? `${backtest.winRate}%` : "—"}</strong>
            </div>
            <div>
              <small>Sample Size</small>
              <strong>{backtest.samples ?? "—"}</strong>
            </div>
            <div>
              <small>Period Tested</small>
              <strong>{backtest.period ?? "—"}</strong>
            </div>
          </div>
        ) : (
          <p className="backtest-unavailable">
            {backtest?.note || "No verified historical backtest available for this strategy."}
          </p>
        )}
      </div>
    </section>
  );
}