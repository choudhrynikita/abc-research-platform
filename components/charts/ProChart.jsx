"use client";

import InteractivePriceChart from "./InteractivePriceChart";

const RANGE_OPTIONS = [
  { value: "1d", label: "1D" },
  { value: "5d", label: "1W" },
  { value: "1mo", label: "1M" },
  { value: "3mo", label: "3M" },
  { value: "6mo", label: "6M" },
  { value: "1y", label: "1Y" },
  { value: "2y", label: "2Y" },
  { value: "5y", label: "5Y" },
  { value: "max", label: "Max" },
];

/**
 * Full-featured institutional price chart for stock research pages.
 * All series derived from verified Yahoo Finance OHLCV — never fabricated.
 */
export default function ProChart({
  symbol,
  defaultRange = "1y",
  support,
  resistance,
  title = "Interactive Price Chart",
}) {
  return (
    <InteractivePriceChart
      symbol={symbol}
      defaultRange={defaultRange}
      ranges={RANGE_OPTIONS}
      showVolume
      showSma20
      showSma50
      showBollinger={false}
      showRsiPanel
      showMacdPanel
      support={support}
      resistance={resistance}
      title={title}
      subtitle="Verified OHLCV from Yahoo Finance · indicators computed client-side from the same series"
      className="chart-pro-panel"
      height={380}
      allowChartTypeToggle
    />
  );
}
