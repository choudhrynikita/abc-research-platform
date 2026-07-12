"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import ProChart from "../charts/ProChart";
import MetricValue, { extractValue, DATA_UNAVAILABLE } from "./MetricValue";
import FundamentalsPanel from "./FundamentalsPanel";
import TechnicalAnalysisPanel from "./TechnicalAnalysisPanel";

function fieldText(field) {
  if (field == null) return null;
  if (typeof field === "string") return field;
  if (typeof field === "object") {
    if (field.available === false) return null;
    const v = field.value ?? field.display;
    return v != null ? String(v) : null;
  }
  return String(field);
}

function OverviewBlock({ report }) {
  const biz = report.businessOverview || {};
  const profile = fieldText(biz.companyProfile);
  const sector = fieldText(biz.sector) || report.sector;
  const industry = fieldText(biz.industry);
  const country = fieldText(biz.country);
  const website = fieldText(biz.website);
  const price = report.price ?? extractValue(report.valuationAnalysis?.currentPrice);

  return (
    <section className="glass-card detail-section company-overview">
      <h3>Company Overview</h3>
      <div className="overview-meta-grid">
        <div>
          <small>Sector</small>
          <strong>{sector || DATA_UNAVAILABLE}</strong>
        </div>
        <div>
          <small>Industry</small>
          <strong>{industry || DATA_UNAVAILABLE}</strong>
        </div>
        <div>
          <small>Exchange</small>
          <strong>{report.exchange || report.priceMetrics?.exchange || DATA_UNAVAILABLE}</strong>
        </div>
        <div>
          <small>Country</small>
          <strong>{country || DATA_UNAVAILABLE}</strong>
        </div>
        <div>
          <small>Last Price</small>
          <strong>
            <MetricValue value={price} type="price" label="Last price" />
          </strong>
        </div>
        <div>
          <small>Website</small>
          <strong>
            {website ? (
              <a href={website.startsWith("http") ? website : `https://${website}`} target="_blank" rel="noreferrer">
                {website.replace(/^https?:\/\//, "")}
              </a>
            ) : (
              DATA_UNAVAILABLE
            )}
          </strong>
        </div>
      </div>
      <p className="company-profile-text">
        {profile || "Company profile: Source does not provide this information."}
      </p>
    </section>
  );
}

function ShareholdingPanel({ shareholding }) {
  const sh = shareholding || {};
  const rows = [
    { label: "Promoter Holdings", key: "promoter" },
    { label: "FII Holdings", key: "fii" },
    { label: "DII Holdings", key: "dii" },
    { label: "Institutional Holdings", key: "institutional" },
    { label: "Mutual Fund Holdings", key: "mutualFunds" },
    { label: "Public", key: "public" },
  ];
  return (
    <section className="glass-card detail-section">
      <h3>Shareholding Pattern</h3>
      <p className="panel-sub">
        {sh.message ||
          "Requires NSE/BSE shareholding feed. Values are never estimated."}
      </p>
      <div className="tech-grid">
        {rows.map((r) => (
          <div key={r.key} className="tech-tile">
            <small>{r.label}</small>
            <strong className="metric-na">{DATA_UNAVAILABLE}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function FinancialStatementsPanel({ statements, historical }) {
  const annual = statements?.annualResults || historical?.income3y || [];
  const quarterly = statements?.quarterlyResults || [];
  const cashTrends = historical?.cashFlowTrends || [];

  const fmtCell = (v) => {
    if (v == null || !Number.isFinite(Number(v))) return DATA_UNAVAILABLE;
    const cr = Number(v) / 1e7;
    return `₹${cr.toLocaleString("en-IN", { maximumFractionDigits: 1 })} Cr`;
  };

  return (
    <section className="glass-card detail-section">
      <h3>Financial Statements</h3>
      <p className="panel-sub">Latest verified figures from Yahoo Finance statement history</p>

      <h4 className="stmt-subhead">Annual Results</h4>
      {annual.length > 0 ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Revenue</th>
                <th>EBITDA / PAT</th>
                <th>Net Income</th>
              </tr>
            </thead>
            <tbody>
              {annual.slice(0, 5).map((row, i) => (
                <tr key={i}>
                  <td>{row.period || row.year || DATA_UNAVAILABLE}</td>
                  <td>{fmtCell(row.revenue)}</td>
                  <td>{fmtCell(row.ebitda ?? row.pat)}</td>
                  <td>{fmtCell(row.netIncome ?? row.pat)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="metric-na">{DATA_UNAVAILABLE} — annual statement history not returned by source.</p>
      )}

      <h4 className="stmt-subhead">Quarterly Results</h4>
      {quarterly.length > 0 ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Revenue</th>
                <th>Net Income</th>
              </tr>
            </thead>
            <tbody>
              {quarterly.slice(0, 6).map((row, i) => (
                <tr key={i}>
                  <td>{row.period || DATA_UNAVAILABLE}</td>
                  <td>{fmtCell(row.revenue)}</td>
                  <td>{fmtCell(row.netIncome)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="metric-na">{DATA_UNAVAILABLE} — quarterly history not provided by source.</p>
      )}

      <h4 className="stmt-subhead">Cash Flow Trends</h4>
      {cashTrends.length > 0 ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Operating CF</th>
                <th>Free Cash Flow</th>
              </tr>
            </thead>
            <tbody>
              {cashTrends.map((row, i) => (
                <tr key={i}>
                  <td>{row.period || DATA_UNAVAILABLE}</td>
                  <td>{fmtCell(row.operating)}</td>
                  <td>{fmtCell(row.freeCashFlow)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="metric-na">{DATA_UNAVAILABLE} — cash-flow history not provided by source.</p>
      )}
    </section>
  );
}

function DividendPanel({ dividend, valuation }) {
  const d = dividend || {};
  return (
    <section className="glass-card detail-section">
      <h3>Dividend &amp; Corporate Actions</h3>
      <div className="tech-grid">
        <div className="tech-tile">
          <small>Dividend Yield</small>
          <strong>
            <MetricValue value={d.yield ?? valuation?.dividendYield} type="yield" />
          </strong>
        </div>
        <div className="tech-tile">
          <small>Trailing Annual Rate</small>
          <strong>
            <MetricValue value={d.trailingAnnualRate} type="eps" />
          </strong>
        </div>
        <div className="tech-tile">
          <small>Ex-Dividend Date</small>
          <strong>
            {fieldText(d.exDividendDate) || DATA_UNAVAILABLE}
          </strong>
        </div>
        <div className="tech-tile">
          <small>Dividend History</small>
          <strong className="metric-na">{DATA_UNAVAILABLE}</strong>
        </div>
        <div className="tech-tile">
          <small>Recent Corporate Actions</small>
          <strong className="metric-na">{DATA_UNAVAILABLE}</strong>
        </div>
      </div>
      <p className="panel-sub">
        Multi-year dividend history and corporate actions require dedicated exchange feeds — never invented.
      </p>
    </section>
  );
}

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "charts", label: "Charts" },
  { id: "technical", label: "Technical" },
  { id: "fundamental", label: "Fundamental" },
  { id: "statements", label: "Statements" },
];

export default function StockDetail({ symbol }) {
  const [report, setReport] = useState(null);
  const [top50Stock, setTop50Stock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("overview");

  const loadResearch = useCallback(async () => {
    setLoading(true);
    setError(null);
    let lastErr = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const r = await fetch(`/api/research/${encodeURIComponent(symbol)}`);
        const j = await r.json();
        if (!r.ok && j.available === false) {
          setReport(j);
          setLoading(false);
          return;
        }
        if (!r.ok) throw new Error(j.message || j.error || "Research request failed");
        if (j.error && j.available === false) {
          setReport(j);
        } else if (j.error) {
          throw new Error(j.message || j.error);
        } else {
          setReport(j);
        }
        setLoading(false);
        return;
      } catch (e) {
        lastErr = e;
        if (attempt < 2) await new Promise((res) => setTimeout(res, 800 * 2 ** attempt));
      }
    }
    setError(lastErr?.message || "Verified market data is currently unavailable.");
    setLoading(false);
  }, [symbol]);

  useEffect(() => {
    loadResearch();
  }, [loadResearch]);

  // Optional overlay: recommendation context from Top 50 (non-blocking, never blocks primary research)
  useEffect(() => {
    let cancelled = false;
    fetch("/api/nifty500/top50")
      .then((r) => r.json())
      .then((top50Res) => {
        if (cancelled) return;
        const match = top50Res?.top50?.find(
          (s) =>
            s.symbol === symbol ||
            s.symbol === `${symbol}.NS` ||
            s.symbol?.replace(".NS", "") === symbol?.replace(".NS", "")
        );
        setTop50Stock(match || null);
      })
      .catch(() => {
        if (!cancelled) setTop50Stock(null);
      });
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
        <div className="error-actions">
          <button type="button" className="btn btn-primary" onClick={loadResearch}>
            Retry
          </button>
          <Link href="/nifty500" className="btn btn-secondary">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Treat available:false payloads as explicit unavailable (never render empty metric shells as success)
  if (report.available === false) {
    return (
      <div className="error-panel terminal-error" role="alert">
        <p>Live Data Currently Unavailable</p>
        <p className="error-detail">
          {report.message || report.error || report.reason || "Source does not provide complete research for this symbol."}
        </p>
        <div className="error-actions">
          <button type="button" className="btn btn-primary" onClick={loadResearch}>
            Retry
          </button>
          <Link href="/nifty500" className="btn btn-secondary">
            Back to Dashboard
          </Link>
        </div>
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
  const chg = top50Stock?.changePercent;

  return (
    <div className="stock-detail">
      <nav className="detail-breadcrumb">
        <Link href="/nifty500">NIFTY 500</Link>
        <span>/</span>
        <Link href="/nifty500">Market Movers</Link>
        <span>/</span>
        <span>{report.companyName || symbol}</span>
      </nav>

      <header className="detail-hero glass-card">
        <div>
          <p className="terminal-eyebrow">
            {fieldText(report.businessOverview?.sector) || report.sector || "Equity Research"}
          </p>
          <h2>{report.companyName || symbol}</h2>
          <span className="stock-ticker">{report.symbol}</span>
          <div className="detail-spot-row">
            {report.price != null && (
              <div className="detail-spot-price">
                <MetricValue value={report.price} type="price" label="Last price" />
                {chg != null && Number.isFinite(chg) && (
                  <span className={`stock-chg ${chg >= 0 ? "up" : "down"}`}>
                    {chg >= 0 ? "+" : ""}
                    {chg.toFixed(2)}%
                  </span>
                )}
                <small className="panel-sub">Last verified spot · Yahoo Finance</small>
              </div>
            )}
          </div>
        </div>
        <div className="detail-hero-right">
          <div className={`rec-badge large ${rec?.action === "BUY" ? "buy" : rec?.action === "WATCH" ? "watch" : "na"}`}>
            {rec?.action ?? tech.trend ?? "—"}
          </div>
          {top50Stock?.buyScore != null && (
            <span className="buy-score large">
              Buy Score <strong>{top50Stock.buyScore.toFixed(0)}</strong>
            </span>
          )}
          <button type="button" className="btn btn-secondary btn-sm" onClick={loadResearch}>
            Refresh
          </button>
        </div>
      </header>

      <div className="detail-tabs" role="tablist" aria-label="Stock analysis sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`detail-tab${tab === t.id ? " active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="detail-grid">
        <section className="detail-main">
          {(tab === "overview" || tab === "charts") && (
            <ProChart
              symbol={report.symbol}
              defaultRange="1y"
              support={tech.support}
              resistance={tech.resistance}
              title={`${report.companyName || report.symbol} — Interactive Chart`}
            />
          )}

          {tab === "overview" && (
            <>
              <OverviewBlock report={report} />
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
              <TechnicalAnalysisPanel technical={tech} priceMetrics={report.priceMetrics} />
              <FundamentalsPanel
                title="Fundamental Snapshot"
                stock={top50Stock}
                fundamentals={report.fundamentals || fund}
                valuation={valn}
                available={fundAvailable}
                source={
                  report.fundamentals?.source ||
                  top50Stock?.fundamentalsSource ||
                  "Yahoo Finance quoteSummary API"
                }
                compact
              />
            </>
          )}

          {tab === "charts" && (
            <div className="glass-card detail-section">
              <h3>Chart Controls</h3>
              <p className="panel-sub">
                Use timeframe chips (1D–Max), Candle/Line toggle, SMA/BB/RSI/MACD overlays, PNG export, and fullscreen.
                All series use verified Yahoo Finance OHLCV only — blank panels mean data is unavailable, never fabricated.
              </p>
            </div>
          )}

          {tab === "technical" && (
            <TechnicalAnalysisPanel technical={tech} priceMetrics={report.priceMetrics} />
          )}

          {tab === "fundamental" && (
            <>
              <FundamentalsPanel
                title="Detailed Fundamental Analysis"
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
              <DividendPanel dividend={report.fundamentals?.dividend} valuation={valn} />
              <ShareholdingPanel shareholding={report.fundamentals?.shareholding} />
            </>
          )}

          {tab === "statements" && (
            <FinancialStatementsPanel
              statements={report.financialStatements || report.fundamentals?.financialStatements}
              historical={report.historicalFinancialTrends || report.fundamentals?.historicalTrends}
            />
          )}

          {report.competitorComparison?.available && tab === "overview" && (
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
                          <td key={j}>{cell ?? DATA_UNAVAILABLE}</td>
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
            <h3>Key Price Metrics</h3>
            <p className="panel-sub">From verified OHLCV / quoteSummary</p>
            <div className="metric-grid-2">
              <div>
                <small>52W High</small>
                <MetricValue
                  value={
                    tech.fiftyTwoWeekHigh ??
                    top50Stock?.fiftyTwoWeekHigh ??
                    valn.fiftyTwoWeekHigh ??
                    report.priceMetrics?.fiftyTwoWeekHigh
                  }
                  type="price"
                />
              </div>
              <div>
                <small>52W Low</small>
                <MetricValue
                  value={
                    tech.fiftyTwoWeekLow ??
                    top50Stock?.fiftyTwoWeekLow ??
                    valn.fiftyTwoWeekLow ??
                    report.priceMetrics?.fiftyTwoWeekLow
                  }
                  type="price"
                />
              </div>
              <div>
                <small>Book Value</small>
                <MetricValue value={valn.bookValue ?? fund.bookValue} type="price" />
              </div>
              <div>
                <small>Face Value</small>
                <MetricValue value={valn.faceValue ?? fund.faceValue} />
              </div>
              <div>
                <small>Market Cap</small>
                <MetricValue value={top50Stock?.marketCap ?? valn.marketCap} type="cr" />
              </div>
              <div>
                <small>Enterprise Value</small>
                <MetricValue value={valn.enterpriseValue} type="cr" />
              </div>
              <div>
                <small>1Y Return</small>
                <MetricValue value={top50Stock?.oneYearReturn} type="pct" />
              </div>
              <div>
                <small>Intrinsic Value</small>
                <MetricValue value={valn.intrinsicValue} />
              </div>
            </div>
          </div>

          <div className="glass-card detail-section">
            <h3>AI Insights</h3>
            <p className="panel-sub">Model opinion based on verified inputs — not investment advice</p>
            <div className="ai-insight-block">
              <span>Conviction</span>
              <strong>{rec?.conviction ?? ai.confidenceLabel ?? DATA_UNAVAILABLE}</strong>
            </div>
            <div className="ai-insight-block">
              <span>Horizon</span>
              <strong>{rec?.horizon ?? DATA_UNAVAILABLE}</strong>
            </div>
            <div className="ai-insight-block">
              <span>Entry Zone</span>
              <MetricValue value={rec?.entryZone ?? tech.support} type="price" label="Entry" />
            </div>
            <div className="ai-insight-block">
              <span>Stop Loss</span>
              <MetricValue value={rec?.stopLoss} type="price" label="Stop" />
            </div>
            <div className="ai-insight-block">
              <span>Target 1</span>
              <MetricValue value={rec?.targets?.t1 ?? tech.resistance} type="price" label="T1" />
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

          <div className="glass-card detail-section data-policy-card">
            <h3>Data Integrity</h3>
            <ul className="policy-list">
              <li>Prices &amp; charts: Yahoo Finance Chart API</li>
              <li>Fundamentals: Yahoo quoteSummary (when available)</li>
              <li>Technicals: computed from verified OHLCV</li>
              <li>Missing metrics show &quot;{DATA_UNAVAILABLE}&quot;</li>
              <li>Never estimated, never fabricated</li>
            </ul>
            {report.fetchedAt && (
              <p className="panel-sub">Fetched {new Date(report.fetchedAt).toLocaleString()}</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
