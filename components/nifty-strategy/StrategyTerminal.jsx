"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import StrategyCard from "./StrategyCard";
import MarketContextPanel from "./MarketContextPanel";
import StrategyInsightPanel from "./StrategyInsightPanel";
import StrategyCharts from "./StrategyCharts";
import TerminalExport from "../TerminalExport";
import MarketStatusBanner from "../MarketStatusBanner";
import TerminalRefreshBar from "../TerminalRefreshBar";
import DerivativesIntelligencePanel from "../DerivativesIntelligencePanel";
import StrategyAssistant from "../strategy/StrategyAssistant";
import { fetchDashboardJson } from "../terminal-fetch";
import ChartErrorBoundary from "../ChartErrorBoundary";

function ExecutiveSummary({ summary, refreshedAt, chainStatus, marketStatus }) {
  if (!summary) return null;
  const trendCls = summary.niftyTrend === "BULLISH" ? "up" : summary.niftyTrend === "BEARISH" ? "down" : "";
  const isLive = marketStatus?.mode === "live";
  const chainLabel = chainStatus?.live
    ? "Chain Live"
    : chainStatus?.stale
      ? "Chain (Last Close)"
      : chainStatus?.verified
        ? "Chain Verified"
        : "Technical Mode";

  return (
    <section className="strategy-exec glass-card">
      <div className="exec-head">
        <div>
          <p className="terminal-eyebrow">Executive Summary</p>
          <h2>NIFTY Options Strategy Center</h2>
        </div>
        <div className="exec-badges">
          <span className={`market-pill ${isLive ? "market-open" : "market-closed"}`}>
            {isLive ? "Live Session" : marketStatus?.strategyStateLabel || "Planning"}
          </span>
          <span className={`data-pill${chainStatus?.stale ? " cached" : ""}`}>{chainLabel}</span>
          <span className="data-pill">
            {summary.strategiesTotal ?? 0} Ranked
            {summary.strategiesActive != null ? ` · ${summary.strategiesActive} Ready to review` : ""}
          </span>
          <TerminalExport module="nifty-strategy" />
        </div>
      </div>

      <div className="strategy-exec-grid">
        <div>
          <small>NIFTY Spot</small>
          <strong>{summary.spotPrice != null ? summary.spotPrice.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}</strong>
        </div>
        <div>
          <small>Trend</small>
          <strong className={trendCls}>{summary.niftyTrend ?? "—"}</strong>
        </div>
        <div>
          <small>India VIX</small>
          <strong>{summary.vix != null ? summary.vix.toFixed(2) : "—"}</strong>
        </div>
        <div>
          <small>Put–Call Ratio</small>
          <strong>{summary.putCallRatio ?? "—"}</strong>
        </div>
        <div>
          <small>Max Pain</small>
          <strong>{summary.maxPain?.toLocaleString() ?? "—"}</strong>
        </div>
        <div>
          <small>Ensemble Signal</small>
          <strong>{summary.ensembleSignal ?? "—"}</strong>
        </div>
      </div>

      <p className="strategy-meta">
        Last updated {refreshedAt ? new Date(refreshedAt).toLocaleString() : "—"}
        {chainStatus?.fetchedAt && ` · Chain ${new Date(chainStatus.fetchedAt).toLocaleString()}`}
      </p>
    </section>
  );
}

function mergeDerivativesIntel(base, strategy) {
  if (!base) return null;
  if (!strategy) return base;
  const a = strategy.analytics || {};
  return {
    ...base,
    risk: {
      ...base.risk,
      riskRewardRatio: strategy.riskRewardRatio ?? base.risk?.riskRewardRatio,
      maxLoss: strategy.maxRisk ?? base.risk?.maxLoss,
      maxProfit: strategy.maxReward ?? base.risk?.maxProfit,
      breakeven: strategy.positionSizing?.breakEven ?? base.risk?.breakeven,
      note: "Calculated from verified strategy entry/exit levels",
    },
    volatility: {
      ...base.volatility,
      impliedVolatility: a.impliedVolatility ?? base.volatility?.impliedVolatility,
      greeks: a.delta != null
        ? { delta: a.delta, gamma: a.gamma, theta: a.theta, vega: a.vega, iv: a.impliedVolatility, source: a.greeksSource }
        : base.volatility?.greeks,
    },
    marketFlow: {
      ...base.marketFlow,
      putCallRatio: a.putCallRatio ?? base.marketFlow?.putCallRatio,
    },
  };
}

export default function StrategyTerminal() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState(null);
  const [chartKey, setChartKey] = useState(0);
  const [horizonFilter, setHorizonFilter] = useState("all");

  const load = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    fetchDashboardJson(isRefresh ? "/api/nifty-strategy/dashboard?refresh=1" : "/api/nifty-strategy/dashboard")
      .then((j) => {
        setData(j);
        const first = j.top10?.[0];
        setSelected((prev) => {
          if (!prev) return first || null;
          const match = j.top10?.find((s) => s.rank === prev.rank && s.name === prev.name);
          return match || first || null;
        });
        if (isRefresh) setChartKey((k) => k + 1);
      })
      .catch((e) => setError(e.message))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const derivativesIntel = useMemo(
    () => mergeDerivativesIntel(data?.derivativesIntelligence, selected),
    [data?.derivativesIntelligence, selected]
  );

  if (loading) {
    return (
      <div className="terminal-loading">
        <div className="terminal-spinner" />
        <p>Fetching NSE option chain &amp; building top 10 strategies…</p>
        <small>This may take 30–60 seconds while live data loads.</small>
      </div>
    );
  }

  if (error) {
    return (
      <div className="strategy-error glass-card">
        <p>Strategy dashboard unavailable.</p>
        <p className="error-detail">{error}</p>
        <button className="btn btn-primary" type="button" onClick={() => load(false)}>Refresh Data</button>
      </div>
    );
  }

  const top10 = data?.top10 || [];
  const visibleStrategies = top10.filter((strategy) => {
    if (horizonFilter === "all") return true;
    if (horizonFilter === "defer") return strategy.eligibility?.decision === "DEFER" || strategy.eligibility?.decision === "WATCH";
    if (horizonFilter === "live") return strategy.eligibility?.decision === "LIVE";
    return strategy.status === horizonFilter;
  });
  const filterOptions = [
    ["all", "All"],
    ["live", "Live"],
    ["Next Session", "Next Session"],
    ["This Week", "This Week"],
    ["Week-Ahead", "Week Ahead"],
    ["defer", "Watch / Defer"],
  ];

  return (
    <div className={`strategy-terminal terminal-vertical${refreshing ? " is-refreshing" : ""}`}>
      <TerminalRefreshBar
        onRefresh={() => load(true)}
        refreshing={refreshing}
        refreshedAt={data?.refreshedAt}
        marketStatus={data?.marketStatus}
        disabled={loading}
      />

      {refreshing && (
        <div className="terminal-refresh-overlay" aria-live="polite">
          <div className="terminal-spinner" />
          <span>Refreshing verified market data…</span>
        </div>
      )}

      <MarketStatusBanner
        marketStatus={data?.marketStatus}
        refreshedAt={data?.refreshedAt}
        source={data?.source}
        chainStatus={data?.chainStatus}
      />

      <ExecutiveSummary
        summary={data?.executiveSummary}
        refreshedAt={data?.refreshedAt}
        chainStatus={data?.chainStatus}
        marketStatus={data?.marketStatus}
      />

      <StrategyInsightPanel insights={data?.insights} backtest={data?.backtest} />

      <ChartErrorBoundary fallback="Price charts could not render. Ranked strategies below are still valid.">
        <StrategyCharts
          key={chartKey}
          symbol={data?.chartSymbol || "^NSEI"}
          technicals={data?.indicators}
          chainHeatmap={data?.chainHeatmap}
          marketContext={data?.marketContext}
          chartContext={data?.chartContext}
          marketStatus={data?.marketStatus}
          derivativesIntel={derivativesIntel}
        />
      </ChartErrorBoundary>

      <section className="strategy-list-section">
        <div className="section-head">
          <h3>Top 10 Strategies</h3>
          <p className="panel-sub">
            {top10.length > 0
              ? `${top10.length} strategies ranked #1–#${top10.length} · `
              : ""}
            {data?.marketMode === "live"
              ? "Sorted by confidence score — live trend, volatility, OI, PCR, volume & risk-reward"
              : `Planning for ${data?.marketStatus?.planningDateLabel || "the next session"} — technical fit, option structure, expiry risk and verified close data`}
          </p>
        </div>

        <div className="strategy-horizon-filters" role="group" aria-label="Filter strategies by planning horizon">
          {filterOptions.map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`chip sm${horizonFilter === value ? " active" : ""}`}
              onClick={() => setHorizonFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>

        {top10.length === 0 ? (
          <div className="strategy-empty glass-card">
            <p>Building strategy plans from verified price data…</p>
            <p className="panel-sub">
              {data?.chainStatus?.message || "Retry refresh — technical setups generate from verified close data."}
            </p>
            <button className="btn btn-primary" type="button" onClick={() => load(true)}>Refresh Data</button>
          </div>
        ) : visibleStrategies.length === 0 ? (
          <div className="strategy-empty glass-card">
            <p>No strategies match this planning filter.</p>
            <button className="btn btn-secondary" type="button" onClick={() => setHorizonFilter("all")}>Show All Strategies</button>
          </div>
        ) : (
          <div className="strategy-grid">
            {visibleStrategies.map((s) => (
              <StrategyCard
                key={`${s.rank}-${s.name}`}
                strategy={s}
                marketContext={data?.marketContext}
                selected={selected?.rank === s.rank}
                onSelect={setSelected}
              />
            ))}
          </div>
        )}
      </section>

      <ChartErrorBoundary fallback="Strategy assistant could not load. Use the cards above for verified payoffs.">
        <StrategyAssistant
          strategy={selected}
          marketContext={data?.marketContext}
          derivativesIntel={derivativesIntel}
          module="nifty-strategy"
          refreshedAt={data?.refreshedAt}
        />
      </ChartErrorBoundary>

      <DerivativesIntelligencePanel intelligence={derivativesIntel} />

      <MarketContextPanel context={data?.marketContext} chainStatus={data?.chainStatus} />
    </div>
  );
}
