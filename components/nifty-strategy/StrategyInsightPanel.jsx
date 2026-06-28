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
  if (!insights && !backtest?.available) return null;

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

      {backtest?.available && (
        <div className="backtest-strip">
          <h4>Historical Backtest (Ensemble)</h4>
          <div className="backtest-metrics">
            <div>
              <small>Win Rate</small>
              <strong>{backtest.winRate != null ? `${(backtest.winRate * 100).toFixed(1)}%` : "—"}</strong>
            </div>
            <div>
              <small>Trades</small>
              <strong>{backtest.samples ?? "—"}</strong>
            </div>
            <div>
              <small>Period</small>
              <strong>{backtest.period ?? "—"}</strong>
            </div>
            <div>
              <small>Max Drawdown</small>
              <strong>{backtest.maxDrawdown != null ? `${(backtest.maxDrawdown * 100).toFixed(1)}%` : "—"}</strong>
            </div>
          </div>
          {backtest.note && <p className="backtest-note">{backtest.note}</p>}
        </div>
      )}
    </section>
  );
}