"use client";

export default function FnoMarketPanel({ context, stockContext }) {
  if (!context) return null;

  return (
    <section className="fno-context glass-card">
      <h3>Market Context</h3>
      <div className="context-grid">
        <div className="ctx-metric"><small>Market Trend</small><strong>{context.marketTrend ?? "—"}</strong></div>
        <div className="ctx-metric"><small>NIFTY Spot</small><strong>{context.niftySpot?.toLocaleString() ?? "—"}</strong></div>
        <div className="ctx-metric"><small>India VIX</small><strong>{context.indiaVix?.value?.toFixed(2) ?? "—"}</strong></div>
        <div className="ctx-metric"><small>FII Net</small><strong>{context.fiiDii?.fiiNet != null ? `${context.fiiDii.fiiNet.toLocaleString()} Cr` : "—"}</strong></div>
        <div className="ctx-metric"><small>Breadth</small><strong>{context.breadth?.advancers != null ? `${context.breadth.advancers}↑/${context.breadth.decliners}↓` : "—"}</strong></div>
        <div className="ctx-metric"><small>RSI (NIFTY)</small><strong>{context.technicals?.rsi?.toFixed(1) ?? "—"}</strong></div>
      </div>

      {stockContext && (
        <div className="stock-context-strip">
          <h4>Selected Stock Context</h4>
          <div className="context-grid">
            <div className="ctx-metric"><small>Stock Trend</small><strong>{stockContext.stockTrend ?? "—"}</strong></div>
            <div className="ctx-metric"><small>Sector</small><strong>{stockContext.sectorTrend ?? "—"}</strong></div>
            <div className="ctx-metric"><small>RS vs NIFTY</small><strong>{stockContext.relativeStrength?.vsNifty != null ? `${stockContext.relativeStrength.vsNifty}%` : "—"}</strong></div>
            <div className="ctx-metric"><small>Support</small><strong>{stockContext.support?.toLocaleString() ?? "—"}</strong></div>
            <div className="ctx-metric"><small>Resistance</small><strong>{stockContext.resistance?.toLocaleString() ?? "—"}</strong></div>
            <div className="ctx-metric"><small>Hist Vol</small><strong>{stockContext.histVol != null ? `${stockContext.histVol}%` : "—"}</strong></div>
            <div className="ctx-metric"><small>Earnings</small><strong>{stockContext.earnings ?? "Data Not Available"}</strong></div>
            <div className="ctx-metric"><small>Corp Actions</small><strong>{stockContext.corporateActions ?? "Data Not Available"}</strong></div>
          </div>
        </div>
      )}
    </section>
  );
}