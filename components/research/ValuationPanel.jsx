"use client";

import { extractValue, formatMetric, DATA_UNAVAILABLE } from "../nifty500/MetricValue";

function Cell({ label, value, type = "number", decimals, definition }) {
  const raw = extractValue(value);
  const display = formatMetric(raw, type, decimals) ?? DATA_UNAVAILABLE;
  return (
    <div className="research-metric-tile" title={definition || undefined}>
      <small>{label}</small>
      <strong className={raw == null ? "metric-na" : undefined}>{display}</strong>
    </div>
  );
}

export default function ValuationPanel({ valuation, summary, fundamentals }) {
  const v = valuation || {};
  const fund = fundamentals || {};

  return (
    <section id="section-valuation" className="research-section glass-card">
      <header className="research-section-head">
        <div>
          <h3>Valuation Analysis</h3>
          <p className="panel-sub">Verified Yahoo Finance multiples only — never estimated</p>
        </div>
        <span className="fund-status fund-status-ok">Verified Source</span>
      </header>

      <div className="research-metric-grid">
        <Cell label="Current Price" value={v.currentPrice} type="price" />
        <Cell label="Market Cap" value={v.marketCap} type="cr" />
        <Cell label="Enterprise Value" value={v.enterpriseValue} type="cr" />
        <Cell label="P/E (TTM)" value={v.peRatio} type="x" decimals={1} />
        <Cell label="Forward P/E" value={v.forwardPe} type="x" decimals={1} />
        <Cell label="PEG Ratio" value={v.pegRatio} type="x" decimals={2} />
        <Cell label="Price / Book" value={v.pbRatio} type="x" decimals={2} />
        <Cell label="EV / EBITDA" value={v.evEbitda} type="x" decimals={2} />
        <Cell label="EV / Sales" value={v.enterpriseToRevenue} type="x" decimals={2} />
        <Cell label="Price / Sales" value={v.priceToSales} type="x" decimals={2} />
        <Cell label="Dividend Yield" value={v.dividendYield} type="yield" />
        <Cell
          label="FCF Yield"
          value={v.freeCashFlowYield}
          type="ratio"
          definition="Free Cash Flow ÷ Market Cap when both verified"
        />
        <Cell label="ROE" value={v.roe ?? fund.roe} type="ratio" />
        <Cell label="ROA" value={v.roa ?? fund.roa} type="ratio" />
        <Cell label="ROCE" value={v.roce ?? fund.roce} type="ratio" definition="Not provided by Yahoo — never estimated" />
        <Cell label="Book Value / Share" value={v.bookValue} type="price" />
        <Cell label="Intrinsic Value" value={v.intrinsicValue} type="price" definition="Requires documented DCF" />
        <Cell label="52W High" value={v.fiftyTwoWeekHigh} type="price" />
        <Cell label="52W Low" value={v.fiftyTwoWeekLow} type="price" />
      </div>

      <div className="valuation-summary-block">
        <h4>Valuation Summary</h4>
        {summary?.available ? (
          <>
            <ul className="verified-point-list">
              {(summary.verifiedPoints || []).map((p) => (
                <li key={p}>
                  <span className="tag-fact">Fact</span> {p}
                </li>
              ))}
            </ul>
            {(summary.interpretations || []).map((interp, i) => (
              <p key={i} className="interp-line">
                <span className="tag-interp">Interpretation</span> {interp.text}
                {interp.inputs?.length > 0 && (
                  <small className="panel-sub"> Inputs: {interp.inputs.join(", ")}</small>
                )}
              </p>
            ))}
            <p className="panel-sub">
              Historical valuation multiples:{" "}
              <strong className="metric-na">
                {summary.historicalMultiples?.display || DATA_UNAVAILABLE}
              </strong>
              {summary.historicalMultiples?.reason && ` — ${summary.historicalMultiples.reason}`}
            </p>
          </>
        ) : (
          <p className="metric-na">
            {summary?.message || "Awaiting Latest Verified Data for valuation summary."}
          </p>
        )}
      </div>
    </section>
  );
}
