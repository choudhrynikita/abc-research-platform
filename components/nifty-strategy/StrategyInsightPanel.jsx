"use client";

const ICONS = {
  bullish: "▲",
  bearish: "▼",
  oi: "◎",
  vol: "◇",
  flow: "→",
  maxpain: "⊕",
};

export default function StrategyInsightPanel({ insights, backtest }) {
  if (!insights && !backtest) return null;

  return (
    <section className="strategy-insights glass-card">
      <h3>AI Insights</h3>
      <p className="panel-sub">Concise signals from verified market data — not predictions</p>

      {insights?.bullish?.length > 0 && (
        <div className="insight-block">
          <h4>Market Setup</h4>
          <ul className="insight-list">
            {insights.bullish.map((item, i) => (
              <li key={i} className="insight-item">
                <span className="insight-icon">{ICONS[item.type] || "•"}</span>
                <p>{item.text}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {insights?.risks?.length > 0 && (
        <div className="insight-block">
          <h4>Risk Factors</h4>
          <ul className="insight-list">
            {insights.risks.map((r) => (
              <li key={r} className="insight-item insight-risk">
                <span className="insight-icon">!</span>
                <p>{r}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="backtest-strip">
        <h4>Historical Backtest</h4>
        {backtest?.available ? (
          <>
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
              <div>
                <small>Max Drawdown</small>
                <strong>{backtest.maxDrawdown != null ? `${backtest.maxDrawdown}%` : "—"}</strong>
              </div>
            </div>
            {backtest.note && <p className="backtest-note">{backtest.note}</p>}
          </>
        ) : (
          <p className="backtest-unavailable">
            {backtest?.note || "No verified historical backtest available for this strategy."}
          </p>
        )}
      </div>
    </section>
  );
}