"use client";

function Metric({ label, value, sub }) {
  return (
    <div className="ctx-metric">
      <small>{label}</small>
      <strong>{value ?? "—"}</strong>
      {sub && <span className="ctx-sub">{sub}</span>}
    </div>
  );
}

export default function MarketContextPanel({ context, chainStatus }) {
  if (!context) return null;

  const trendCls = context.niftyTrend === "BULLISH" ? "up" : context.niftyTrend === "BEARISH" ? "down" : "";

  return (
    <section className="strategy-context glass-card">
      <div className="context-head">
        <h3>Market Context</h3>
        <span className={`data-pill${chainStatus?.verified ? "" : " cached"}`}>
          {chainStatus?.verified ? "NSE Chain Verified" : "Chain Unavailable"}
        </span>
      </div>

      <div className="context-grid">
        <Metric
          label="NIFTY Spot"
          value={context.spotPrice != null ? context.spotPrice.toLocaleString(undefined, { maximumFractionDigits: 2 }) : null}
        />
        <Metric label="Trend" value={context.niftyTrend} sub={trendCls ? undefined : "Neutral / mixed"} />
        <Metric
          label="India VIX"
          value={context.indiaVix?.value != null ? context.indiaVix.value.toFixed(2) : null}
          sub={context.indiaVix?.trend}
        />
        <Metric label="Put–Call Ratio" value={context.putCallRatio} />
        <Metric label="Max Pain" value={context.maxPain?.toLocaleString()} />
        <Metric label="Highest Call OI" value={context.highestCallOi?.toLocaleString()} />
        <Metric label="Highest Put OI" value={context.highestPutOi?.toLocaleString()} />
        <Metric
          label="Call OI Δ"
          value={context.oiChange?.call != null ? context.oiChange.call.toLocaleString() : null}
        />
        <Metric
          label="Put OI Δ"
          value={context.oiChange?.put != null ? context.oiChange.put.toLocaleString() : null}
        />
        <Metric label="Support" value={context.support?.toLocaleString()} />
        <Metric label="Resistance" value={context.resistance?.toLocaleString()} />
        <Metric label="RSI (14)" value={context.technicals?.rsi != null ? context.technicals.rsi.toFixed(1) : null} />
        <Metric label="ADX" value={context.technicals?.adx != null ? context.technicals.adx.toFixed(1) : null} />
        <Metric
          label="FII Net"
          value={context.fiiDii?.fiiNet != null ? `${context.fiiDii.fiiNet.toLocaleString()} Cr` : null}
          sub={context.fiiDii?.date}
        />
        <Metric
          label="DII Net"
          value={context.fiiDii?.diiNet != null ? `${context.fiiDii.diiNet.toLocaleString()} Cr` : null}
        />
        <Metric
          label="Breadth"
          value={
            (context.breadth?.advancers ?? context.breadth?.advances) != null
              ? `${context.breadth.advancers ?? context.breadth.advances}↑ / ${context.breadth.decliners ?? context.breadth.declines}↓`
              : null
          }
          sub={context.breadth?.advanceDeclineRatio != null ? `A/D ${context.breadth.advanceDeclineRatio}` : undefined}
        />
      </div>

      {!chainStatus?.verified && (
        <p className="context-note">
          {chainStatus?.message || "NSE NIFTY option chain unavailable. Strategies requiring verified premiums are suppressed."}
        </p>
      )}
    </section>
  );
}