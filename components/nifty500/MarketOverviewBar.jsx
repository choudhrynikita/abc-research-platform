"use client";

import MetricValue from "./MetricValue";

function IndexTile({ item }) {
  if (!item) return null;
  const chg = item.changePercent;
  const cls = chg == null ? "" : chg >= 0 ? "up" : "down";

  return (
    <div className="idx-tile glass-card">
      <span className="idx-label">{item.label}</span>
      <strong className="idx-price">
        <MetricValue value={item.price} type="price" />
      </strong>
      <span className={`idx-chg ${cls}`}>
        {chg != null ? `${chg >= 0 ? "+" : ""}${chg.toFixed(2)}%` : "—"}
      </span>
    </div>
  );
}

export default function MarketOverviewBar({ data }) {
  const indices = data?.marketOverview?.indices || {};
  const breadth = data?.marketOverview?.breadth;

  return (
    <section className="terminal-overview">
      <div className="idx-grid">
        <IndexTile item={indices.nifty50} />
        <IndexTile item={indices.banknifty} />
        <IndexTile item={indices.finnifty} />
        <IndexTile item={indices.vix} />
      </div>
      {breadth && (
        <div className="breadth-strip glass-card">
          <div>
            <span className="breadth-label">Advances</span>
            <strong className="up">{breadth.advances ?? "—"}</strong>
          </div>
          <div>
            <span className="breadth-label">Declines</span>
            <strong className="down">{breadth.declines ?? "—"}</strong>
          </div>
          <div>
            <span className="breadth-label">A/D Ratio</span>
            <strong>{breadth.advanceDeclineRatio ?? "—"}</strong>
          </div>
          <div>
            <span className="breadth-label">Universe</span>
            <strong>{breadth.sampleSize}/{breadth.totalTracked}</strong>
          </div>
        </div>
      )}
    </section>
  );
}