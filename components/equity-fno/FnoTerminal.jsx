"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import FnoStrategyCard from "./FnoStrategyCard";
import FnoInsightPanel from "./FnoInsightPanel";
import FnoMarketPanel from "./FnoMarketPanel";
import FnoCharts from "./FnoCharts";
import TerminalExport from "../TerminalExport";
import MarketStatusBanner from "../MarketStatusBanner";
import TerminalRefreshBar from "../TerminalRefreshBar";
import DerivativesIntelligencePanel from "../DerivativesIntelligencePanel";
import StrategyAssistant from "../strategy/StrategyAssistant";
import { fetchDashboardJson } from "../terminal-fetch";
import ChartErrorBoundary from "../ChartErrorBoundary";

function ExecutiveSummary({ summary, refreshedAt, marketStatus }) {
  if (!summary) return null;
  const trendCls = summary.marketTrend === "BULLISH" ? "up" : summary.marketTrend === "BEARISH" ? "down" : "";
  const isLive = marketStatus?.mode === "live";

  return (
    <section className="fno-exec glass-card">
      <div className="exec-head">
        <div>
          <p className="terminal-eyebrow">Executive Summary</p>
          <h2>Equity F&O Strategy Center</h2>
          <p className="panel-sub">
            {isLive ? "Top 10 equity options · live NSE verified data" : `Equity plans for ${marketStatus?.planningDateLabel || "the next trading session"} · latest verified close`}
          </p>
        </div>
        <div className="exec-badges">
          <span className={`market-pill ${isLive ? "market-open" : "market-closed"}`}>
            {isLive ? "Live Session" : marketStatus?.strategyStateLabel || "Planning"}
          </span>
          <span className={`data-pill${summary.chainsStale > 0 ? " cached" : ""}`}>
            {summary.chainsVerified}/{summary.universeSize} Chains
          </span>
          <span className="data-pill">
            {summary.strategiesTotal ?? 0} Ranked
            {summary.strategiesActive != null ? ` · ${summary.strategiesActive} Ready to review` : ""}
          </span>
          <TerminalExport module="fno" />
        </div>
      </div>
      <div className="strategy-exec-grid">
        <div><small>NIFTY</small><strong>{summary.niftySpot?.toLocaleString() ?? "—"}</strong></div>
        <div><small>Market Trend</small><strong className={trendCls}>{summary.marketTrend ?? "—"}</strong></div>
        <div><small>India VIX</small><strong>{summary.indiaVix?.toFixed(2) ?? "—"}</strong></div>
        <div><small>FII Net</small><strong>{summary.fiiNet != null ? `${summary.fiiNet.toLocaleString()} Cr` : "—"}</strong></div>
        <div><small>Leading Sector</small><strong>{summary.topSector ?? "—"}</strong></div>
        <div><small>Universe</small><strong>{summary.universeSize ?? "—"} stocks</strong></div>
      </div>
      <p className="strategy-meta">Updated {refreshedAt ? new Date(refreshedAt).toLocaleString() : "—"}</p>
    </section>
  );
}

function mergeDerivativesIntel(base, strategy) {
  if (!base) return null;
  if (!strategy) return base;
  const a = strategy.analytics || {};
  const ps = strategy.positionSizing || {};
  return {
    ...base,
    risk: {
      ...base.risk,
      riskRewardRatio: strategy.riskRewardRatio ?? ps.riskRewardRatio ?? base.risk?.riskRewardRatio,
      maxLoss: strategy.payoff?.maxLossUnlimited
        ? null
        : strategy.maxRiskLot ?? strategy.maxRisk ?? base.risk?.maxLoss,
      maxProfit: strategy.payoff?.maxProfitUnlimited
        ? null
        : strategy.maxRewardLot ?? strategy.maxReward ?? base.risk?.maxProfit,
      maxLossUnlimited: strategy.payoff?.maxLossUnlimited === true,
      maxProfitUnlimited: strategy.payoff?.maxProfitUnlimited === true,
      breakeven:
        strategy.payoff?.breakEvenDisplay ||
        ps.breakEven ||
        base.risk?.breakeven,
      note: "Expiry payoff from verified NSE premiums — never estimated from targets",
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
      volumeTrend: base.marketFlow?.volumeTrend,
    },
  };
}

export default function FnoTerminal() {
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

    fetchDashboardJson(isRefresh ? "/api/equity-fno/dashboard?refresh=1" : "/api/equity-fno/dashboard")
      .then((j) => {
        setData(j);
        setSelected((prev) => {
          const first = j.top10?.[0] || null;
          if (!prev) return first;
          const match = j.top10?.find((s) => s.rank === prev.rank && s.symbol === prev.symbol);
          return match || first;
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

  const chartProps = useMemo(() => {
    const sym = selected?.chartSymbol || selected?.symbol || data?.selectedChart?.symbol;
    const ctx = selected?.stockMarketContext || data?.selectedChart?.stockContext;
    return {
      symbol: sym,
      technicals: ctx ? { support: ctx.support, resistance: ctx.resistance } : data?.selectedChart?.technicals,
      chainHeatmap: selected?.chainHeatmap ?? data?.selectedChart?.chainHeatmap,
      marketContext: ctx || data?.marketContext,
    };
  }, [selected, data]);

  const derivativesIntel = useMemo(
    () => mergeDerivativesIntel(data?.derivativesIntelligence, selected),
    [data?.derivativesIntelligence, selected]
  );

  if (loading) {
    return (
      <div className="terminal-loading">
        <div className="terminal-spinner" />
        <p>Scanning F&O universe &amp; fetching NSE option chains…</p>
        <small>
          Analyzing liquid equities with verified premiums only — values are never estimated.
          This may take 60–90 seconds.
        </small>
        <div className="skeleton-stack" aria-hidden>
          <div className="skeleton-line" />
          <div className="skeleton-line short" />
          <div className="skeleton-block" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="strategy-error glass-card">
        <p className="metric-na">Live Data Currently Unavailable</p>
        <p className="error-detail">{error}</p>
        <button className="btn btn-primary" type="button" onClick={() => load(false)}>
          Retry
        </button>
      </div>
    );
  }

  const top10 = data?.top10 || [];
  const weekly = top10.filter((s) => String(s.expiryType || "").toLowerCase() !== "monthly");
  const monthly = top10.filter((s) => String(s.expiryType || "").toLowerCase() === "monthly");
  const visibleStrategies = top10.filter((strategy) => {
    if (horizonFilter === "all") return true;
    if (horizonFilter === "defer") return strategy.eligibility?.decision === "DEFER" || strategy.eligibility?.decision === "WATCH";
    if (horizonFilter === "live") return strategy.eligibility?.decision === "LIVE";
    if (horizonFilter === "weekly") return String(strategy.expiryType || "").toLowerCase() !== "monthly";
    if (horizonFilter === "monthly") return String(strategy.expiryType || "").toLowerCase() === "monthly";
    return true;
  });
  const filterOptions = [
    ["all", "All"],
    ["weekly", "Weekly"],
    ["monthly", "Monthly"],
    ["live", "Live"],
    ["defer", "Watch / Defer"],
  ];
  const groupedView = horizonFilter === "all" && (weekly.length || monthly.length);

  return (
    <div className={`fno-terminal terminal-vertical${refreshing ? " is-refreshing" : ""}`}>
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
      />

      <ExecutiveSummary
        summary={data?.executiveSummary}
        refreshedAt={data?.refreshedAt}
        marketStatus={data?.marketStatus}
      />

      <FnoInsightPanel insights={data?.insights} backtest={data?.backtest} />

      <ChartErrorBoundary fallback="Price charts could not render. Ranked strategies below are still valid.">
        <FnoCharts
          key={chartKey}
          {...chartProps}
          chartContext={data?.chartContext}
          marketStatus={data?.marketStatus}
          derivativesIntel={derivativesIntel}
        />
      </ChartErrorBoundary>

      <section className="strategy-list-section">
        <div className="section-head">
          <h3>Weekly and monthly equity F&O plans</h3>
          <p className="panel-sub">
            {top10.length > 0
              ? `${top10.length} ranked plans · ${weekly.length} weekly · ${monthly.length} monthly · `
              : ""}
            {data?.marketMode === "live"
              ? "Verified NSE premiums, lot P/L, OI walls and a one-lot ticket on every card"
              : `Planning for ${data?.marketStatus?.planningDateLabel || "the next session"} — last-close premiums, OI snapshot, and explicit expiry`}
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
            <p>Building equity strategy plans from verified data…</p>
            <p className="panel-sub">Technical &amp; market context loads from verified price feeds even when NSE chains are offline.</p>
            <button className="btn btn-primary" type="button" onClick={() => load(true)}>Refresh Data</button>
          </div>
        ) : visibleStrategies.length === 0 ? (
          <div className="strategy-empty glass-card">
            <p>No strategies match this planning filter.</p>
            <button className="btn btn-secondary" type="button" onClick={() => setHorizonFilter("all")}>Show All Strategies</button>
          </div>
        ) : groupedView ? (
          [
            ["Weekly expiry", weekly],
            ["Monthly expiry", monthly],
          ].filter(([, list]) => list.length).map(([label, list]) => (
            <div key={label} className="strategy-horizon-group">
              <div className="strategy-horizon-group-head">
                <h4>{label}</h4>
                <p>{list.length} plans · named structure, lot rupees, OI walls</p>
              </div>
              <div className="strategy-grid">
                {list.map((s) => (
                  <FnoStrategyCard
                    key={`${s.rank}-${s.symbol}-${s.type}-${s.expiry}`}
                    strategy={s}
                    selected={selected?.rank === s.rank && selected?.symbol === s.symbol}
                    onSelect={setSelected}
                  />
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="strategy-grid">
            {visibleStrategies.map((s) => (
              <FnoStrategyCard
                key={`${s.rank}-${s.symbol}-${s.type}-${s.expiry}`}
                strategy={s}
                selected={selected?.rank === s.rank && selected?.symbol === s.symbol}
                onSelect={setSelected}
              />
            ))}
          </div>
        )}
      </section>

      <ChartErrorBoundary fallback="Strategy assistant could not load. Use the cards above for verified payoffs.">
        <StrategyAssistant
          strategy={selected}
          marketContext={{
            ...data?.marketContext,
            price: selected?.stockMarketContext?.price ?? data?.marketContext?.price,
            trend: selected?.stockMarketContext?.trend ?? data?.marketContext?.marketTrend,
            support: selected?.stockMarketContext?.support,
            resistance: selected?.stockMarketContext?.resistance,
          }}
          derivativesIntel={derivativesIntel}
          module="equity-fno"
          refreshedAt={data?.refreshedAt}
        />
      </ChartErrorBoundary>

      <DerivativesIntelligencePanel intelligence={derivativesIntel} title="Equity Derivatives Intelligence" />

      <FnoMarketPanel
        context={data?.marketContext}
        stockContext={selected?.stockMarketContext || data?.selectedChart?.stockContext}
      />
    </div>
  );
}
