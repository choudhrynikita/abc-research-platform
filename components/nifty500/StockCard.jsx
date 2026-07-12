"use client";

import Link from "next/link";
import MetricValue from "./MetricValue";
import { FundamentalsStrip } from "./FundamentalsPanel";

function ScorePill({ label, value }) {
  const missing = value == null || Number.isNaN(value);
  return (
    <div className={`score-pill${missing ? " score-pill-na" : ""}`}>
      <span>{label}</span>
      <strong>{missing ? "—" : Math.round(value)}</strong>
    </div>
  );
}

export default function StockCard({ stock, rank }) {
  const chg = stock.changePercent;
  const chgCls = chg == null ? "" : chg >= 0 ? "up" : "down";
  const rec = stock.recommendation;
  const actionCls =
    rec?.action === "BUY" ? "buy" : rec?.action === "WATCH" ? "watch" : "na";

  return (
    <article className="stock-card glass-card">
      <header className="stock-card-head">
        <div className="stock-rank">#{rank}</div>
        <div className="stock-identity">
          <Link
            href={`/nifty500/stock/${encodeURIComponent(stock.symbol)}`}
            className="stock-name-link"
          >
            <h4>{stock.name}</h4>
          </Link>
          <span className="stock-ticker">{stock.symbol.replace(".NS", "")}</span>
        </div>
        <div className={`rec-badge ${actionCls}`}>{rec?.action ?? "—"}</div>
      </header>

      <div className="stock-price-row">
        <strong className="stock-price">
          <MetricValue value={stock.price} type="price" label="Price" />
        </strong>
        <span className={`stock-chg ${chgCls}`}>
          {chg != null && Number.isFinite(chg)
            ? `${chg >= 0 ? "+" : ""}${chg.toFixed(2)}%`
            : "Data Unavailable"}
        </span>
        <span className="buy-score">
          Score{" "}
          <strong>
            {stock.buyScore != null && Number.isFinite(stock.buyScore)
              ? stock.buyScore.toFixed(0)
              : "—"}
          </strong>
        </span>
      </div>

      <div className="stock-meta-row">
        <span>{stock.sector || "Sector Unavailable"}</span>
        <MetricValue value={stock.marketCap} type="cr" className="stock-mcap" label="Market Cap" />
      </div>

      {!stock.fundamentalsAvailable && (
        <p className="fund-card-note" title={stock.fundamentalsMessage || undefined}>
          Fundamentals: Awaiting latest market data
        </p>
      )}

      <div className="score-grid">
        <ScorePill label="Technical" value={stock.scores?.technical} />
        <ScorePill label="Fundamental" value={stock.scores?.fundamental} />
        <ScorePill label="Momentum" value={stock.scores?.momentum} />
        <ScorePill label="Risk" value={stock.scores?.risk} />
      </div>

      <FundamentalsStrip stock={stock} />

      {rec?.reasons?.length > 0 && (
        <div className="why-buy">
          <h5>Why recommended</h5>
          <ul>
            {rec.reasons.slice(0, 4).map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {(stock.confidence?.score != null || stock.backtest) && (
        <div className="stock-card-evidence">
          {stock.confidence?.score != null && (
            <span title={stock.confidence.methodology || stock.confidence.disclaimer}>
              Conviction{" "}
              <strong>{stock.confidence.score}</strong>
              <small>/100</small>
            </span>
          )}
          {stock.backtest?.available === true && stock.backtest.winRate != null ? (
            <span title="Mechanical SMA/RSI rule on verified OHLCV — not a guarantee">
              Rule hit rate <strong>{stock.backtest.winRate}%</strong>
              <small> · {stock.backtest.samples} trades</small>
            </span>
          ) : (
            <span className="evidence-na" title={stock.backtest?.reason || undefined}>
              Backtest: Data Unavailable
            </span>
          )}
        </div>
      )}

      {rec?.conviction && (
        <footer className="stock-card-foot">
          <span>
            Conviction: <strong>{rec.conviction}</strong>
          </span>
          <span>Horizon: {rec.horizon ?? "—"}</span>
          {rec.riskRewardRatio != null && (
            <span>
              R:R <strong>{rec.riskRewardRatio}:1</strong>
            </span>
          )}
        </footer>
      )}
    </article>
  );
}
