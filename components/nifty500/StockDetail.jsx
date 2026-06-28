"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ProChart from "../charts/ProChart";
import MetricValue, { extractValue } from "./MetricValue";

function IndicatorRow({ label, value, interpretation }) {
  const v = extractValue(value) ?? value;
  return (
    <div className="indicator-row">
      <span className="ind-label">{label}</span>
      <strong>{v != null && typeof v === "number" ? v.toFixed(2) : v ?? "Data Not Available"}</strong>
      {interpretation && <small>{interpretation}</small>}
    </div>
  );
}

function interpretRsi(rsi) {
  if (rsi == null) return null;
  if (rsi > 70) return { text: "Overbought", cls: "bearish" };
  if (rsi < 30) return { text: "Oversold", cls: "bullish" };
  if (rsi >= 50) return { text: "Bullish momentum", cls: "bullish" };
  return { text: "Neutral", cls: "neutral" };
}

export default function StockDetail({ symbol }) {
  const [report, setReport] = useState(null);
  const [top50Stock, setTop50Stock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetch(`/api/research/${encodeURIComponent(symbol)}`).then((r) => r.json()),
      fetch("/api/nifty500/top50").then((r) => r.json()),
    ])
      .then(([researchRes, top50Res]) => {
        if (cancelled) return;
        if (researchRes.error) throw new Error(researchRes.message || researchRes.error);
        setReport(researchRes);
        const match = top50Res?.top50?.find((s) => s.symbol === symbol || s.symbol === `${symbol}.NS`);
        setTop50Stock(match || null);
      })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [symbol]);

  if (loading) {
    return (
      <div className="terminal-loading">
        <div className="terminal-spinner" />
        <p>Loading verified research for {symbol}…</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="error-panel terminal-error">
        <p>Verified market data is currently unavailable.</p>
        <p className="error-detail">{error}</p>
        <Link href="/nifty500" className="btn btn-secondary">Back to Dashboard</Link>
      </div>
    );
  }

  const tech = report.technicalAnalysis || {};
  const fund = report.fundamentalAnalysis || {};
  const ai = report.aiConclusion || {};
  const rec = top50Stock?.recommendation;

  return (
    <div className="stock-detail">
      <nav className="detail-breadcrumb">
        <Link href="/nifty500">Top 50</Link>
        <span>/</span>
        <span>{report.companyName || symbol}</span>
      </nav>

      <header className="detail-hero glass-card">
        <div>
          <p className="terminal-eyebrow">{report.sector || "—"}</p>
          <h2>{report.companyName}</h2>
          <span className="stock-ticker">{report.symbol}</span>
        </div>
        <div className="detail-hero-right">
          <div className={`rec-badge large ${rec?.action === "BUY" ? "buy" : "watch"}`}>
            {rec?.action ?? tech.trend ?? "—"}
          </div>
          {top50Stock?.buyScore != null && (
            <span className="buy-score large">Buy Score <strong>{top50Stock.buyScore.toFixed(0)}</strong></span>
          )}
        </div>
      </header>

      <div className="detail-grid">
        <section className="detail-main">
          <ProChart symbol={report.symbol} defaultRange="1y" />

          {rec?.reasons?.length > 0 && (
            <div className="glass-card detail-section">
              <h3>Why this stock is recommended</h3>
              <ul className="reason-list">
                {rec.reasons.map((r) => <li key={r}>{r}</li>)}
              </ul>
            </div>
          )}

          <div className="glass-card detail-section">
            <h3>Technical Analysis</h3>
            <div className="indicator-grid">
              <IndicatorRow label="Trend" value={tech.trend} />
              <IndicatorRow label="RSI (14)" value={tech.rsi} interpretation={interpretRsi(tech.rsi)?.text} />
              <IndicatorRow label="MACD Histogram" value={tech.macdHistogram} />
              <IndicatorRow label="ADX" value={tech.adx} />
              <IndicatorRow label="20 DMA" value={tech.sma20} />
              <IndicatorRow label="50 DMA" value={tech.sma50} />
              <IndicatorRow label="Support" value={tech.support} />
              <IndicatorRow label="Resistance" value={tech.resistance} />
              <IndicatorRow label="ATR" value={tech.atr} />
              <IndicatorRow label="Volume Trend" value={tech.volumeTrend} />
            </div>
            <p className="tech-rating">
              Overall Technical Rating: <strong>{tech.trend ?? "Data Not Available"}</strong>
            </p>
          </div>

          <div className="glass-card detail-section">
            <h3>Fundamental Analysis</h3>
            <div className="metric-grid-3">
              <div><small>Revenue Growth</small><MetricValue value={fund.revenueGrowth} type="pct" /></div>
              <div><small>Profit Growth</small><MetricValue value={fund.profitGrowth} type="pct" /></div>
              <div><small>ROE</small><MetricValue value={fund.roe} type="ratio" /></div>
              <div><small>ROCE</small><MetricValue value={fund.roce} type="ratio" /></div>
              <div><small>Operating Margin</small><MetricValue value={fund.operatingMargin} type="ratio" /></div>
              <div><small>Net Margin</small><MetricValue value={fund.netMargin} type="ratio" /></div>
              <div><small>Debt/Equity</small><MetricValue value={fund.debtToEquity} decimals={2} /></div>
              <div><small>Free Cash Flow</small><MetricValue value={fund.freeCashFlow} type="cr" /></div>
              <div><small>P/E</small><MetricValue value={fund.peRatio} decimals={1} /></div>
            </div>
          </div>

          {report.competitorComparison?.available && (
            <div className="glass-card detail-section">
              <h3>Peer Comparison</h3>
              <p className="panel-sub">{report.competitorComparison.message}</p>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      {report.competitorComparison.table?.headers?.map((h) => <th key={h}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {report.competitorComparison.table?.rows?.map((row, i) => (
                      <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        <aside className="detail-aside">
          <div className="glass-card detail-section">
            <h3>AI Insights</h3>
            <div className="ai-insight-block">
              <span>Conviction</span>
              <strong>{rec?.conviction ?? ai.confidenceLabel ?? "—"}</strong>
            </div>
            <div className="ai-insight-block">
              <span>Horizon</span>
              <strong>{rec?.horizon ?? "—"}</strong>
            </div>
            <div className="ai-insight-block">
              <span>Entry Zone</span>
              <MetricValue value={rec?.entryZone} type="price" />
            </div>
            <div className="ai-insight-block">
              <span>Stop Loss</span>
              <MetricValue value={rec?.stopLoss} type="price" />
            </div>
            <div className="ai-insight-block">
              <span>Target 1</span>
              <MetricValue value={rec?.targets?.t1} type="price" />
            </div>
            <div className="ai-insight-block">
              <span>Target 2</span>
              <MetricValue value={rec?.targets?.t2} type="price" />
            </div>
            <div className="ai-insight-block">
              <span>Target 3</span>
              <MetricValue value={rec?.targets?.t3} type="price" />
            </div>
          </div>

          {rec?.risks?.length > 0 && (
            <div className="glass-card detail-section risks-panel">
              <h3>Risks</h3>
              <ul>{rec.risks.map((r) => <li key={r}>{r}</li>)}</ul>
            </div>
          )}

          <div className="glass-card detail-section">
            <h3>Key Metrics</h3>
            <div className="metric-grid-2">
              <div><small>52W High</small><MetricValue value={top50Stock?.fiftyTwoWeekHigh} type="price" /></div>
              <div><small>52W Low</small><MetricValue value={top50Stock?.fiftyTwoWeekLow} type="price" /></div>
              <div><small>1Y Return</small><MetricValue value={top50Stock?.oneYearReturn} type="pct" /></div>
              <div><small>3Y CAGR</small><MetricValue value={top50Stock?.threeYearCagr} type="pct" /></div>
              <div><small>Market Cap</small><MetricValue value={top50Stock?.marketCap} type="cr" /></div>
              <div><small>Volume</small><MetricValue value={top50Stock?.volume} /></div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}