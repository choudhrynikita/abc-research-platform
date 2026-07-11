"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ProChart from "../charts/ProChart";
import MetricValue, { extractValue } from "./MetricValue";
import FundamentalsPanel from "./FundamentalsPanel";

function IndicatorRow({ label, value, interpretation, definition }) {
  const v = extractValue(value) ?? (typeof value === "string" ? value : null);
  const display =
    v != null && typeof v === "number"
      ? v.toFixed(2)
      : v != null
        ? String(v)
        : "Data Unavailable";
  return (
    <div className="indicator-row" title={definition || undefined}>
      <span className="ind-label">{label}</span>
      <strong className={v == null ? "metric-na" : undefined}>{display}</strong>
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
    setError(null);

    const load = async (attempt = 0) => {
      try {
        const [researchRes, top50Res] = await Promise.all([
          fetch(`/api/research/${encodeURIComponent(symbol)}`).then(async (r) => {
            const j = await r.json();
            if (!r.ok && j.available === false) return j;
            if (!r.ok) throw new Error(j.message || j.error || "Research request failed");
            return j;
          }),
          fetch("/api/nifty500/top50")
            .then((r) => r.json())
            .catch(() => null),
        ]);
        if (cancelled) return;
        if (researchRes.error && researchRes.available === false) {
          setReport(researchRes);
        } else if (researchRes.error) {
          throw new Error(researchRes.message || researchRes.error);
        } else {
          setReport(researchRes);
        }
        const match = top50Res?.top50?.find(
          (s) => s.symbol === symbol || s.symbol === `${symbol}.NS` || s.symbol?.replace(".NS", "") === symbol?.replace(".NS", "")
        );
        setTop50Stock(match || null);
      } catch (e) {
        if (cancelled) return;
        if (attempt < 2) {
          const delay = 800 * 2 ** attempt;
          await new Promise((r) => setTimeout(r, delay));
          return load(attempt + 1);
        }
        setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  if (loading) {
    return (
      <div className="terminal-loading">
        <div className="terminal-spinner" />
        <p>Loading verified research for {symbol}…</p>
        <small>Fetching latest market data from approved sources. Values are never estimated.</small>
        <div className="skeleton-stack" aria-hidden>
          <div className="skeleton-line" />
          <div className="skeleton-line short" />
          <div className="skeleton-block" />
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="error-panel terminal-error">
        <p>Verified market data is currently unavailable.</p>
        <p className="error-detail">{error || "Awaiting latest market data"}</p>
        <Link href="/nifty500" className="btn btn-secondary">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const tech = report.technicalAnalysis || {};
  const fund = report.fundamentalAnalysis || {};
  const valn = report.valuationAnalysis || report.fundamentals?.valuation || {};
  const ai = report.aiConclusion || {};
  const rec = top50Stock?.recommendation;
  const fundAvailable =
    report.fundamentals?.available === true ||
    report.fundamentalsAvailable === true ||
    top50Stock?.fundamentalsAvailable === true;

  return (
    <div className="stock-detail">
      <nav className="detail-breadcrumb">
        <Link href="/nifty500">Top 50</Link>
        <span>/</span>
        <span>{report.companyName || symbol}</span>
      </nav>

      <header className="detail-hero glass-card">
        <div>
          <p className="terminal-eyebrow">{report.sector || "Equity Research"}</p>
          <h2>{report.companyName || symbol}</h2>
          <span className="stock-ticker">{report.symbol}</span>
          {report.price != null && (
            <div className="detail-spot-price">
              <MetricValue value={report.price} type="price" label="Last price" />
              <small className="panel-sub">Last verified spot · Yahoo Finance Chart API</small>
            </div>
          )}
        </div>
        <div className="detail-hero-right">
          <div className={`rec-badge large ${rec?.action === "BUY" ? "buy" : "watch"}`}>
            {rec?.action ?? tech.trend ?? "—"}
          </div>
          {top50Stock?.buyScore != null && (
            <span className="buy-score large">
              Buy Score <strong>{top50Stock.buyScore.toFixed(0)}</strong>
            </span>
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
                {rec.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="glass-card detail-section">
            <h3>Technical Analysis</h3>
            <p className="panel-sub">Computed from verified Yahoo Finance OHLCV — not estimated</p>
            <div className="indicator-grid">
              <IndicatorRow label="Trend" value={tech.trend} definition="Model trend from moving averages and momentum" />
              <IndicatorRow
                label="RSI (14)"
                value={tech.rsi}
                interpretation={interpretRsi(tech.rsi)?.text}
                definition="14-period Relative Strength Index"
              />
              <IndicatorRow label="MACD Histogram" value={tech.macdHistogram} />
              <IndicatorRow label="ADX" value={tech.adx} definition="Average Directional Index (trend strength)" />
              <IndicatorRow label="20 DMA" value={tech.sma20} />
              <IndicatorRow label="50 DMA" value={tech.sma50} />
              <IndicatorRow label="Support" value={tech.support} />
              <IndicatorRow label="Resistance" value={tech.resistance} />
              <IndicatorRow label="ATR" value={tech.atr} definition="Average True Range (volatility)" />
              <IndicatorRow label="Volume Trend" value={tech.volumeTrend} />
            </div>
            <p className="tech-rating">
              Overall Technical Rating:{" "}
              <strong>{tech.trend ?? "Data Unavailable"}</strong>
            </p>
          </div>

          <FundamentalsPanel
            title="Top 50 Fundamental Data"
            stock={top50Stock}
            fundamentals={report.fundamentals || fund}
            valuation={valn}
            available={fundAvailable}
            source={
              report.fundamentals?.source ||
              top50Stock?.fundamentalsSource ||
              "Yahoo Finance quoteSummary API"
            }
          />

          {report.competitorComparison?.available && (
            <div className="glass-card detail-section">
              <h3>Peer Comparison</h3>
              <p className="panel-sub">{report.competitorComparison.message}</p>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      {report.competitorComparison.table?.headers?.map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.competitorComparison.table?.rows?.map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td key={j}>{cell ?? "Data Unavailable"}</td>
                        ))}
                      </tr>
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
            <p className="panel-sub">Model opinion based on verified inputs — not investment advice</p>
            <div className="ai-insight-block">
              <span>Conviction</span>
              <strong>{rec?.conviction ?? ai.confidenceLabel ?? "Data Unavailable"}</strong>
            </div>
            <div className="ai-insight-block">
              <span>Horizon</span>
              <strong>{rec?.horizon ?? "Data Unavailable"}</strong>
            </div>
            <div className="ai-insight-block">
              <span>Entry Zone</span>
              <MetricValue value={rec?.entryZone} type="price" label="Entry" />
            </div>
            <div className="ai-insight-block">
              <span>Stop Loss</span>
              <MetricValue value={rec?.stopLoss} type="price" label="Stop" />
            </div>
            <div className="ai-insight-block">
              <span>Target 1</span>
              <MetricValue value={rec?.targets?.t1} type="price" label="T1" />
            </div>
            <div className="ai-insight-block">
              <span>Target 2</span>
              <MetricValue value={rec?.targets?.t2} type="price" label="T2" />
            </div>
            <div className="ai-insight-block">
              <span>Target 3</span>
              <MetricValue value={rec?.targets?.t3} type="price" label="T3" />
            </div>
          </div>

          {rec?.risks?.length > 0 && (
            <div className="glass-card detail-section risks-panel">
              <h3>Risks</h3>
              <ul>
                {rec.risks.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="glass-card detail-section">
            <h3>Key Price Metrics</h3>
            <p className="panel-sub">From verified OHLCV / chart meta</p>
            <div className="metric-grid-2">
              <div>
                <small>52W High</small>
                <MetricValue value={top50Stock?.fiftyTwoWeekHigh} type="price" />
              </div>
              <div>
                <small>52W Low</small>
                <MetricValue value={top50Stock?.fiftyTwoWeekLow} type="price" />
              </div>
              <div>
                <small>1Y Return</small>
                <MetricValue value={top50Stock?.oneYearReturn} type="pct" />
              </div>
              <div>
                <small>3Y CAGR</small>
                <MetricValue value={top50Stock?.threeYearCagr} type="pct" />
              </div>
              <div>
                <small>Market Cap</small>
                <MetricValue value={top50Stock?.marketCap ?? valn.marketCap} type="cr" />
              </div>
              <div>
                <small>Volume</small>
                <MetricValue value={top50Stock?.volume} />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
