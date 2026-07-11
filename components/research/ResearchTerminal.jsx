"use client";

import { useCallback, useState } from "react";
import ExecutiveSummaryCard from "./ExecutiveSummaryCard";
import ResearchCharts from "./ResearchCharts";
import InsightCards from "./InsightCards";
import PeerComparisonPanel from "./PeerComparisonPanel";
import SectorIndustryPanel from "./SectorIndustryPanel";
import ValuationPanel from "./ValuationPanel";
import RiskAnalysisPanel from "./RiskAnalysisPanel";
import InvestmentDecisionPanel from "./InvestmentDecisionPanel";
import TerminalExport from "../TerminalExport";
import TechnicalAnalysisPanel from "../nifty500/TechnicalAnalysisPanel";
import FundamentalsPanel from "../nifty500/FundamentalsPanel";
import { extractValue, formatMetric, DATA_UNAVAILABLE } from "../nifty500/MetricValue";

const QUICK_SYMBOLS = ["RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "MARUTI", "WIPRO", "SBIN"];

const NAV = [
  { id: "section-exec", label: "Summary" },
  { id: "section-charts", label: "Charts" },
  { id: "section-valuation", label: "Valuation" },
  { id: "section-technical", label: "Technical" },
  { id: "section-fundamental", label: "Fundamental" },
  { id: "section-competitors", label: "Competitors" },
  { id: "section-sector", label: "Sector" },
  { id: "section-outlook", label: "Outlook" },
  { id: "section-risk", label: "Risk" },
  { id: "section-insights", label: "AI Insights" },
  { id: "section-decision", label: "Decision" },
];

function scrollTo(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function ShareholdingBlock({ shareholding }) {
  const sh = shareholding || {};
  const rows = [
    ["Promoter Holdings", sh.promoter],
    ["FII Holdings", sh.fii],
    ["DII Holdings", sh.dii],
    ["Institutional Holdings", sh.institutional],
    ["Mutual Fund Holdings", sh.mutualFunds],
  ];
  return (
    <div className="research-subcard">
      <h4>Shareholding Pattern</h4>
      <p className="panel-sub">
        {sh.message || "Requires NSE/BSE shareholding feed — never estimated."}
      </p>
      <div className="research-metric-grid compact">
        {rows.map(([label]) => (
          <div key={label} className="research-metric-tile">
            <small>{label}</small>
            <strong className="metric-na">{DATA_UNAVAILABLE}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatementsBlock({ statements, historical }) {
  const annual = statements?.annualResults || historical?.income3y || [];
  const quarterly = statements?.quarterlyResults || [];
  const fmtCell = (v) => {
    if (v == null || !Number.isFinite(Number(v))) return DATA_UNAVAILABLE;
    return formatMetric(Number(v), "cr") ?? DATA_UNAVAILABLE;
  };

  return (
    <div className="research-subcard">
      <h4>Quarterly &amp; Annual Results</h4>
      {annual.length > 0 ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Revenue</th>
                <th>Net Income / PAT</th>
              </tr>
            </thead>
            <tbody>
              {annual.slice(0, 5).map((row, i) => (
                <tr key={i}>
                  <td>{row.period || row.year || DATA_UNAVAILABLE}</td>
                  <td>{fmtCell(row.revenue)}</td>
                  <td>{fmtCell(row.netIncome ?? row.pat)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="metric-na">{DATA_UNAVAILABLE} — annual history not returned by source.</p>
      )}
      {quarterly.length > 0 && (
        <>
          <h4 className="stmt-subhead">Quarterly</h4>
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
        </>
      )}
    </div>
  );
}

export default function ResearchTerminal() {
  const [symbol, setSymbol] = useState("RELIANCE");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const generate = useCallback(
    async (sym) => {
      const s = (sym || symbol).trim();
      if (!s) return;
      setLoading(true);
      setError(null);
      let lastErr = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const res = await fetch(`/api/research/terminal/${encodeURIComponent(s)}`);
          const json = await res.json();
          if (!res.ok && json.available === false) {
            setData(json);
            setError(json.message);
            setLoading(false);
            return;
          }
          if (!res.ok) throw new Error(json.message || json.error || "Failed to generate research");
          setData(json);
          setLoading(false);
          return;
        } catch (e) {
          lastErr = e;
          if (attempt < 2) await new Promise((r) => setTimeout(r, 700 * 2 ** attempt));
        }
      }
      setError(lastErr?.message || "Live Data Currently Unavailable");
      setData(null);
      setLoading(false);
    },
    [symbol]
  );

  return (
    <div className="research-terminal">
      <header className="research-search-bar glass-card">
        <div>
          <p className="terminal-eyebrow">AI Research Engine</p>
          <h2>Institutional Equity Research</h2>
          <p className="panel-sub">
            Verified Yahoo Finance data only · analytical insights labeled · never fabricated
          </p>
        </div>
        <div className="research-search-row">
          <input
            type="search"
            className="terminal-search"
            placeholder="Enter symbol: RELIANCE, TCS, INFY…"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generate()}
            aria-label="Stock symbol"
          />
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => generate()}
            disabled={loading}
          >
            {loading ? "Analyzing…" : "Generate Research"}
          </button>
          <TerminalExport module="research" symbol={data?.symbol || symbol} />
        </div>
        <div className="quick-symbols">
          {QUICK_SYMBOLS.map((s) => (
            <button
              key={s}
              type="button"
              className="chip sm"
              onClick={() => {
                setSymbol(s);
                generate(s);
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </header>

      {loading && (
        <div className="terminal-loading">
          <div className="terminal-spinner" />
          <p>Fetching verified market data &amp; building institutional research report…</p>
          <small>Prices, fundamentals, peers, and sector benchmarks — values are never estimated.</small>
          <div className="skeleton-stack" aria-hidden>
            <div className="skeleton-line" />
            <div className="skeleton-line short" />
            <div className="skeleton-block" />
          </div>
        </div>
      )}

      {error && !data?.available && !loading && (
        <div className="fiidii-error glass-card">
          <p>Verified market data is currently unavailable.</p>
          <p className="error-detail">{error}</p>
          <button className="btn btn-primary" type="button" onClick={() => generate()}>
            Retry
          </button>
        </div>
      )}

      {data?.available && !loading && (
        <div className="research-layout">
          <nav className="research-nav glass-card" aria-label="Report sections">
            <p className="terminal-eyebrow">Navigate</p>
            {NAV.map((n) => (
              <button key={n.id} type="button" className="research-nav-item" onClick={() => scrollTo(n.id)}>
                {n.label}
              </button>
            ))}
          </nav>

          <div className="research-main">
            {data.unavailableNote && (
              <p className="research-unavail-note">{data.unavailableNote}</p>
            )}
            <p className="fiidii-meta">
              Source: {data.source}
              {data.peerSource ? ` · Peers: ${data.peerSource}` : ""} · Updated{" "}
              {new Date(data.refreshedAt).toLocaleString()}
            </p>

            <ExecutiveSummaryCard
              summary={data.executiveSummary}
              companyName={data.companyName}
              price={data.price}
              currency={data.currency}
              exchange={data.exchange}
              symbol={data.symbol}
              sector={data.sector}
              industry={data.industry}
              refreshedAt={data.refreshedAt}
              dataSources={data.dataSources}
            />

            <div id="section-charts">
              <ResearchCharts symbol={data.chartSymbol} technicals={data.technicalAnalysis} />
            </div>

            <ValuationPanel
              valuation={data.valuationAnalysis}
              summary={data.valuationSummary || data.valuationAnalysis?.summary}
              fundamentals={data.fundamentalAnalysis}
            />

            <div id="section-technical">
              <TechnicalAnalysisPanel
                technical={data.technicalAnalysis}
                priceMetrics={data.priceMetrics}
              />
            </div>

            <section id="section-fundamental" className="research-fund-wrap">
              <FundamentalsPanel
                title="Fundamental Analysis"
                fundamentals={data.fundamentals || data.fundamentalAnalysis}
                valuation={data.valuationAnalysis}
                available={data.fundamentalsAvailable}
                source={data.fundamentals?.source || data.source}
              />
              {data.businessOverview && (
                <div className="glass-card research-section">
                  <h3>Business Overview</h3>
                  <p className="company-profile-text">
                    {extractValue(data.businessOverview.companyProfile) ||
                      (typeof data.businessOverview.companyProfile === "string"
                        ? data.businessOverview.companyProfile
                        : null) ||
                      "Company profile: Source does not provide this information."}
                  </p>
                </div>
              )}
              <ShareholdingBlock shareholding={data.shareholding} />
              <StatementsBlock
                statements={data.financialStatements}
                historical={data.historicalFinancialTrends}
              />
            </section>

            <PeerComparisonPanel data={data.competitorComparison} />

            <SectorIndustryPanel
              sector={data.sectorComparison}
              industry={data.industryComparison}
              relativeStrength={data.relativeStrength}
              benchmark={data.sectorBenchmark}
              outlook={data.sectorOutlook}
            />

            <RiskAnalysisPanel risk={data.riskAssessment} />

            <InsightCards insights={data.insights} />

            <div id="section-decision">
              <InvestmentDecisionPanel decision={data.investmentDecision} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
