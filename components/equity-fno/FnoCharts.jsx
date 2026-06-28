"use client";

import StrategyCharts from "../nifty-strategy/StrategyCharts";

export default function FnoCharts({ symbol, technicals, chainHeatmap, marketContext }) {
  if (!symbol) return null;
  return (
    <StrategyCharts
      symbol={symbol}
      technicals={technicals}
      chainHeatmap={chainHeatmap}
      marketContext={marketContext}
    />
  );
}