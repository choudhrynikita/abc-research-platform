"use client";

import { useCallback, useState } from "react";
import ExecutiveSummaryCard from "./ExecutiveSummaryCard";
import ResearchCharts from "./ResearchCharts";
import InsightCards from "./InsightCards";
import PeerComparisonPanel from "./PeerComparisonPanel";
import SectorIndustryPanel from "./SectorIndustryPanel";
import InvestmentDecisionPanel from "./InvestmentDecisionPanel";
import TerminalExport from "../TerminalExport";
import { extractValue, formatMetric } from "../nifty500/MetricValue";

const QUICK_SYMBOLS = ["RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "MARUTI"];

function ResearchFundamentalsPanel({ fundamentals, valuation, available, source }) {
  const [open, setOpen] = useState(true);
  const rows = [
    ["Revenue Growth", fundamentals?.revenueGrowth, "ratio", "YoY revenue growth from Yahoo"],
    ["Earnings Growth", fundamentals?.profitGrowth, "ratio", "YoY earnings growth from Yahoo"],
    ["ROE", fundamentals?.roe, "ratio", "Return on equity"],
    ["ROA", fundamentals?.roa, "ratio", "Return on assets"],
    ["Gross Margin", fundamentals?.grossMargin, "ratio", "Gross profit margin"],
    ["Operating Margin", fundamentals?.operatingMargin, "ratio", "Operating profit margin"],
    ["Net Margin", fundamentals?.netMargin, "ratio", "Net profit margin"],
    ["Debt/Equity", fundamentals?.debtToEquity, "number", "As reported by Yahoo (not estimated)"],
    ["Free Cash Flow", fundamentals?.freeCashFlow, "cr", "Free cash flow"],
    ["P/E (TTM)", valuation?.peRatio, "x", "Trailing P/E"],
    ["Forward P/E", valuation?.forwardPe, "x", "Forward P/E"],
    ["P/B", valuation?.pbRatio, "x", "Price-to-book"],
    ["EV/EBITDA", valuation?.evEbitda, "x", "Enterprise value / EBITDA when provided"],
    ["Dividend Yield", valuation?.dividendYield, "yield", "Dividend yield when provided"],
    ["Market Cap", valuation?.marketCap, "cr", "Market capitalization"],
  ];

  return (
    <section className="research-fundamentals glass-card">
      <button type="button" className="expand-head" onClick={() => setOpen((v) => !v)}>
        <h3>Fundamental Analysis</h3>
        <span>{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <>
          {!available && (
            <p className="panel-sub fund-empty-msg">
              Data Unavailable — Source does not provide verified fundamentals at this time. Values are never estimated.
            </p>
          )}
          <div className="fund-grid">
            {rows.map(([label, val, type, def]) => (
              <div key={label} title={def}>
                <small>{label}</small>
                <strong>
                  {formatMetric(extractValue(val), type) ?? "Data Unavailable"}
                </strong>
              </div>
            ))}
          </div>
          <p className="fund-source panel-sub">
            Source: {source || "Yahoo Finance quoteSummary API"} · ROCE omitted (not provided by feed)
          </p>
        </>
      )}
    </section>
  );
}

export default function ResearchTerminal() {
  const [symbol, setSymbol] = useState("RELIANCE");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const generate = useCallback(async (sym) => {
    const s = (sym || symbol).trim();
    if (!s) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/research/terminal/${encodeURIComponent(s)}`);
      const json = await res.json();
      if (!res.ok && json.available === false) {
        setData(json);
        setError(json.message);
        return;
      }
      if (!res.ok) throw new Error(json.message || json.error || "Failed to generate research");
      setData(json);
    } catch (e) {
      setError(e.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  return (
    <div className="research-terminal">
      <header className="research-search-bar glass-card">
        <div>
          <p className="terminal-eyebrow">AI Research Mode</p>
          <h2>Institutional Equity Research</h2>
        </div>
        <div className="research-search-row">
          <input
            type="search"
            className="terminal-search"
            placeholder="Enter symbol: RELIANCE, TCS, INFY…"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generate()}
          />
          <button className="btn btn-primary" type="button" onClick={() => generate()} disabled={loading}>
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
              onClick={() => { setSymbol(s); generate(s); }}
            >
              {s}
            </button>
          ))}
        </div>
      </header>

      {loading && (
        <div className="terminal-loading">
          <div className="terminal-spinner" />
          <p>Fetching verified market data &amp; running institutional analysis…</p>
        </div>
      )}

      {error && !data?.available && !loading && (
        <div className="fiidii-error glass-card">
          <p>{error}</p>
          <button className="btn btn-primary" type="button" onClick={() => generate()}>Retry</button>
        </div>
      )}

      {data?.available && !loading && (
        <>
          {data.unavailableNote && (
            <p className="research-unavail-note">{data.unavailableNote}</p>
          )}
          <p className="fiidii-meta">
            Source: {data.source} · Updated {new Date(data.refreshedAt).toLocaleString()}
          </p>

          <ExecutiveSummaryCard
            summary={data.executiveSummary}
            companyName={data.companyName}
            price={data.price}
            currency={data.currency}
          />

          <ResearchCharts symbol={data.chartSymbol} technicals={data.technicalAnalysis} />

          <InsightCards insights={data.insights} />

          <PeerComparisonPanel data={data.competitorComparison} />

          <SectorIndustryPanel
            sector={data.sectorComparison}
            industry={data.industryComparison}
            relativeStrength={data.relativeStrength}
          />

          <ResearchFundamentalsPanel
            fundamentals={data.fundamentalAnalysis}
            valuation={data.valuationAnalysis || data.fundamentals?.valuation}
            available={data.fundamentalsAvailable}
            source={data.fundamentals?.source || data.source}
          />

          <InvestmentDecisionPanel decision={data.investmentDecision} />
        </>
      )}
    </div>
  );
}