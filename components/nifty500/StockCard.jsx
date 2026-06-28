"use client";

import Link from "next/link";
import MetricValue from "./MetricValue";

function ScorePill({ label, value }) {
  return (
    <div className="score-pill">
      <span>{label}</span>
      <strong>{value != null ? Math.round(value) : "—"}</strong>
    </div>
  );
}

export default function StockCard({ stock, rank }) {
  const chg = stock.changePercent;
  const chgCls = chg == null ? "" : chg >= 0 ? "up" : "down";
  const rec = stock.recommendation;
  const actionCls = rec?.action === "BUY" ? "buy" : rec?.action === "WATCH" ? "watch" : "na";

  return (
    <article className="stock-card glass-card">
      <header className="stock-card-head">
        <div className="stock-rank">#{rank}</div>
        <div className="stock-identity">
          <Link href={`/nifty500/stock/${encodeURIComponent(stock.symbol)}`} className="stock-name-link">
            <h4>{stock.name}</h4>
          </Link>
          <span className="stock-ticker">{stock.symbol.replace(".NS", "")}</span>
        </div>
        <div className={`rec-badge ${actionCls}`}>{rec?.action ?? "—"}</div>
      </header>

      <div className="stock-price-row">
        <strong className="stock-price">
          <MetricValue value={stock.price} type="price" />
        </strong>
        <span className={`stock-chg ${chgCls}`}>
          {chg != null ? `${chg >= 0 ? "+" : ""}${chg.toFixed(2)}%` : "—"}
        </span>
        <span className="buy-score">
          Score <strong>{stock.buyScore != null ? stock.buyScore.toFixed(0) : "—"}</strong>
        </span>
      </div>

      <div className="stock-meta-row">
        <span>{stock.sector}</span>
        <MetricValue value={stock.marketCap} type="cr" className="stock-mcap" />
      </div>

      <div className="score-grid">
        <ScorePill label="Technical" value={stock.scores?.technical} />
        <ScorePill label="Fundamental" value={stock.scores?.fundamental} />
        <ScorePill label="Momentum" value={stock.scores?.momentum} />
        <ScorePill label="Risk" value={stock.scores?.risk} />
      </div>

      <div className="metric-strip">
        <div><small>ROE</small><MetricValue value={stock.roe} type="ratio" decimals={1} /></div>
        <div><small>P/E</small><MetricValue value={stock.peRatio} decimals={1} /></div>
        <div><small>1M</small><MetricValue value={stock.monthlyChangePercent} type="pct" /></div>
        <div><small>YTD</small><MetricValue value={stock.ytdReturn} type="pct" /></div>
      </div>

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

      {rec?.conviction && (
        <footer className="stock-card-foot">
          <span>Conviction: <strong>{rec.conviction}</strong></span>
          <span>Horizon: {rec.horizon ?? "—"}</span>
        </footer>
      )}
    </article>
  );
}