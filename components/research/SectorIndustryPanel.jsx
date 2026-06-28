"use client";

export default function SectorIndustryPanel({ sector, industry, relativeStrength }) {
  return (
    <section className="research-sector-grid">
      <div className="glass-card sector-panel">
        <h3>Sector Comparison</h3>
        {!sector?.available ? (
          <p className="panel-sub">{sector?.message || "Sector peer data unavailable."}</p>
        ) : (
          <>
            <div className={`sector-outlook outlook-${(sector.sectorOutlook || "neutral").toLowerCase()}`}>
              {sector.sectorOutlook || "Neutral"}
            </div>
            <div className="sector-metrics">
              <div><small>Sector</small><strong>{sector.sector}</strong></div>
              <div><small>Avg 1D Change</small><strong className={sector.sectorAvgChange1d >= 0 ? "up" : "down"}>{sector.sectorAvgChange1d != null ? `${sector.sectorAvgChange1d}%` : "—"}</strong></div>
              <div><small>Avg 1M Change</small><strong className={sector.sectorAvgChange1m >= 0 ? "up" : "down"}>{sector.sectorAvgChange1m != null ? `${sector.sectorAvgChange1m}%` : "—"}</strong></div>
              <div><small>Peers Tracked</small><strong>{sector.peerCount}</strong></div>
            </div>
            {sector.leaders?.length > 0 && (
              <div className="sector-leaders">
                <small>Top performers</small>
                <ul>{sector.leaders.map((l) => <li key={l.symbol}>{l.name} ({l.changePercent}%)</li>)}</ul>
              </div>
            )}
            {sector.sectorAvgChange1m != null && (
              <p className="sector-verdict">
                {sector.sectorAvgChange1m > 1
                  ? "Company sector is outperforming — bullish sector momentum."
                  : sector.sectorAvgChange1m < -1
                    ? "Company sector is lagging — bearish sector backdrop."
                    : "Sector performance is neutral relative to recent sessions."}
              </p>
            )}
          </>
        )}
      </div>

      <div className="glass-card industry-panel">
        <h3>Industry &amp; Relative Strength</h3>
        {industry?.available ? (
          <div className="industry-metrics">
            {industry.avgPe != null && <div><small>Avg P/E</small><strong>{industry.avgPe.toFixed(1)}</strong></div>}
            {industry.avgRoe != null && <div><small>Avg ROE</small><strong>{(industry.avgRoe * 100).toFixed(1)}%</strong></div>}
            {industry.avgRevenueGrowth != null && <div><small>Avg Rev Growth</small><strong>{(industry.avgRevenueGrowth * 100).toFixed(1)}%</strong></div>}
            {industry.avgProfitGrowth != null && <div><small>Avg Profit Growth</small><strong>{(industry.avgProfitGrowth * 100).toFixed(1)}%</strong></div>}
          </div>
        ) : (
          <p className="panel-sub">Industry averages require peer fundamentals from Yahoo Finance.</p>
        )}
        {relativeStrength && (
          <div className="rs-block">
            <h4>vs NIFTY 50 (1M)</h4>
            <strong className={relativeStrength.vsNifty >= 0 ? "up" : "down"}>
              {relativeStrength.vsNifty >= 0 ? "+" : ""}{relativeStrength.vsNifty}%
            </strong>
            <small>Stock {relativeStrength.stockReturn1m}% · NIFTY {relativeStrength.niftyReturn1m}%</small>
          </div>
        )}
      </div>
    </section>
  );
}