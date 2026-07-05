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

function FundamentalsPanel({ fundamentals, available }) {
  const [open, setOpen] = useState(false);
  if (!available) return null;

  return (
    <section className="research-fundamentals glass-card">
      <button type="button" className="expand-head" onClick={() => setOpen((v) => !v)}>
        <h3>Fundamental Analysis</h3>
        <span>{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="fund-grid">
          {[
            ["Revenue Growth", fundamentals.revenueGrowth, "ratio"],
            ["Profit Growth", fundamentals.profitGrowth, "ratio"],
            ["ROE", fundamentals.roe, "ratio"],
            ["ROCE", fundamentals.roce, "ratio"],
            ["Debt/Equity", fundamentals.debtToEquity, "number"],
            ["Operating Margin", fundamentals.operatingMargin, "ratio"],
            ["Net Margin", fundamentals.netMargin, "ratio"],
            ["Free Cash Flow", fundamentals.freeCashFlow, "cr"],
          ].map(([label, val, type]) => (
            <div key={label}>
              <small>{label}</small>
              <strong>{formatMetric(extractValue(val), type) ?? "—"}</strong>
            </div>
          ))}
        </div>
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

          <FundamentalsPanel
            fundamentals={data.fundamentalAnalysis}
            available={data.fundamentalsAvailable}
          />

          <InvestmentDecisionPanel decision={data.investmentDecision} />
        </>
      )}
    </div>
  );
}