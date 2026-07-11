"use client";

import { formatMetric, DATA_UNAVAILABLE } from "../nifty500/MetricValue";

function fmtVal(value, type) {
  if (value == null || (typeof value === "number" && !Number.isFinite(value))) return DATA_UNAVAILABLE;
  return formatMetric(value, type) ?? DATA_UNAVAILABLE;
}

function UnavailableBlock({ label, item }) {
  if (item?.available === false || !item?.available) {
    return (
      <div className="outlook-item">
        <small>{label}</small>
        <strong className="metric-na">{item?.display || DATA_UNAVAILABLE}</strong>
        {item?.reason && <span className="panel-sub">{item.reason}</span>}
      </div>
    );
  }
  return (
    <div className="outlook-item">
      <small>{label}</small>
      <strong>{item.value}</strong>
      {item.source && <span className="panel-sub">{item.source}</span>}
    </div>
  );
}

export default function SectorIndustryPanel({
  sector,
  industry,
  relativeStrength,
  benchmark,
  outlook,
}) {
  const bm = benchmark || sector?.benchmark;
  const ol = outlook;

  return (
    <>
      <section id="section-sector" className="research-section glass-card">
        <header className="research-section-head">
          <div>
            <h3>Sector Comparison</h3>
            <p className="panel-sub">
              Company vs peer-cohort averages — verified Yahoo data; nulls never interpolated
            </p>
          </div>
          {sector?.sectorOutlook && (
            <div className={`sector-outlook outlook-${String(sector.sectorOutlook).toLowerCase()}`}>
              {sector.sectorOutlook}
            </div>
          )}
        </header>

        {!sector?.available && !bm?.available ? (
          <p className="panel-sub">{sector?.message || "Sector peer data unavailable."}</p>
        ) : (
          <>
            <div className="sector-metrics">
              <div>
                <small>Sector</small>
                <strong>{sector?.sector || DATA_UNAVAILABLE}</strong>
              </div>
              <div>
                <small>Avg 1D Change</small>
                <strong className={sector?.sectorAvgChange1d >= 0 ? "up" : "down"}>
                  {sector?.sectorAvgChange1d != null ? `${sector.sectorAvgChange1d}%` : DATA_UNAVAILABLE}
                </strong>
              </div>
              <div>
                <small>Avg 1M Change</small>
                <strong className={sector?.sectorAvgChange1m >= 0 ? "up" : "down"}>
                  {sector?.sectorAvgChange1m != null ? `${sector.sectorAvgChange1m}%` : DATA_UNAVAILABLE}
                </strong>
              </div>
              <div>
                <small>Peers Tracked</small>
                <strong>{sector?.peerCount ?? bm?.peerCount ?? DATA_UNAVAILABLE}</strong>
              </div>
            </div>

            {bm?.available && (
              <div className="table-wrap">
                <table className="data-table research-table">
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th>Company</th>
                      <th>Sector / Peer Avg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bm.rows.map((row) => (
                      <tr key={row.metric}>
                        <td>
                          {row.metric}
                          {row.note && <small className="panel-sub"> — {row.note}</small>}
                        </td>
                        <td>{fmtVal(row.company, row.type)}</td>
                        <td>{fmtVal(row.sectorAvg, row.type)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {sector?.leaders?.length > 0 && (
              <div className="sector-leaders">
                <small>Top session performers (verified 1D %)</small>
                <ul>
                  {sector.leaders.map((l) => (
                    <li key={l.symbol}>
                      {l.name} ({l.changePercent}%)
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {industry?.available && (
              <div className="industry-metrics" style={{ marginTop: 12 }}>
                <h4>Peer Cohort Fundamental Averages</h4>
                {industry.avgPe != null && (
                  <div>
                    <small>Avg P/E</small>
                    <strong>{industry.avgPe.toFixed(1)}</strong>
                  </div>
                )}
                {industry.avgRoe != null && (
                  <div>
                    <small>Avg ROE</small>
                    <strong>{(industry.avgRoe * 100).toFixed(1)}%</strong>
                  </div>
                )}
                {industry.avgRevenueGrowth != null && (
                  <div>
                    <small>Avg Rev Growth</small>
                    <strong>{(industry.avgRevenueGrowth * 100).toFixed(1)}%</strong>
                  </div>
                )}
                {industry.avgProfitGrowth != null && (
                  <div>
                    <small>Avg Profit Growth</small>
                    <strong>{(industry.avgProfitGrowth * 100).toFixed(1)}%</strong>
                  </div>
                )}
              </div>
            )}

            {relativeStrength && (
              <div className="rs-block">
                <h4>vs NIFTY 50 (1M)</h4>
                <strong className={relativeStrength.vsNifty >= 0 ? "up" : "down"}>
                  {relativeStrength.vsNifty >= 0 ? "+" : ""}
                  {relativeStrength.vsNifty}%
                </strong>
                <small>
                  Stock {relativeStrength.stockReturn1m}% · NIFTY {relativeStrength.niftyReturn1m}% ·{" "}
                  {relativeStrength.source}
                </small>
              </div>
            )}
            <p className="panel-sub">{bm?.message || sector?.source}</p>
          </>
        )}
      </section>

      <section id="section-outlook" className="research-section glass-card">
        <header className="research-section-head">
          <div>
            <h3>Sector Outlook</h3>
            <p className="panel-sub">
              Verified facts separated from rule-based interpretation — no fabricated forecasts
            </p>
          </div>
          {ol?.sectorOutlook && (
            <div className={`sector-outlook outlook-${String(ol.sectorOutlook).toLowerCase()}`}>
              {ol.sectorOutlook}
            </div>
          )}
        </header>

        {!ol?.available ? (
          <p className="metric-na">{ol?.message || "Awaiting Latest Verified Data for sector outlook."}</p>
        ) : (
          <>
            <p className="panel-sub">{ol.outlookMethodology}</p>

            <h4 className="stmt-subhead">Verified Facts</h4>
            <ul className="verified-point-list">
              {(ol.verifiedFacts || []).map((f) => (
                <li key={f.label}>
                  <span className="tag-fact">Fact</span>
                  <strong>{f.label}:</strong> {f.value}
                  <small className="panel-sub"> · {f.source}</small>
                </li>
              ))}
            </ul>

            <h4 className="stmt-subhead">Analytical Interpretations</h4>
            {(ol.analyticalInterpretations || []).map((a, i) => (
              <p key={i} className="interp-line">
                <span className="tag-interp">Interpretation</span> {a.text}
              </p>
            ))}

            <div className="outlook-grid">
              <UnavailableBlock label="Sector Overview" item={ol.sectorOverview} />
              <UnavailableBlock label="Industry Growth Drivers" item={ol.industryGrowthDrivers} />
              <UnavailableBlock label="Industry Headwinds" item={ol.industryHeadwinds} />
              <UnavailableBlock label="Regulatory Developments" item={ol.regulatoryDevelopments} />
              <UnavailableBlock label="Demand Trends" item={ol.demandTrends} />
              <UnavailableBlock label="Supply Trends" item={ol.supplyTrends} />
              <UnavailableBlock label="Capex Trends" item={ol.capitalExpenditureTrends} />
              <UnavailableBlock label="Competitive Landscape" item={ol.competitiveLandscape} />
              <UnavailableBlock label="Cyclical vs Defensive" item={ol.cycleCharacter} />
              <UnavailableBlock label="Macroeconomic Factors" item={ol.macroeconomicFactors} />
            </div>
            <p className="panel-sub">{ol.message}</p>
          </>
        )}
      </section>
    </>
  );
}
