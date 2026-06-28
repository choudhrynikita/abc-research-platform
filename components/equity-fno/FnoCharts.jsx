"use client";

import StrategyCharts from "../nifty-strategy/StrategyCharts";

export default function FnoCharts({ symbol, technicals, chainHeatmap, marketContext, chartContext, marketStatus, derivativesIntel }) {
  if (!symbol) return null;
  return (
    <StrategyCharts
      symbol={symbol}
      technicals={technicals}
      chainHeatmap={chainHeatmap}
      marketContext={marketContext}
      chartContext={chartContext}
      marketStatus={marketStatus}
      derivativesIntel={derivativesIntel}
    />
  );
}