"use client";

import InteractivePriceChart from "./InteractivePriceChart";

const RANGE_OPTIONS = [
  { value: "3mo", label: "3 Months" },
  { value: "6mo", label: "6 Months" },
  { value: "1y", label: "1 Year" },
  { value: "2y", label: "2 Years" },
  { value: "5y", label: "5 Years" },
];

export default function ProChart({ symbol, defaultRange = "1y" }) {
  return (
    <InteractivePriceChart
      symbol={symbol}
      defaultRange={defaultRange}
      ranges={RANGE_OPTIONS}
      showVolume={false}
      showSma20
      title="Price Chart"
      subtitle="Verified OHLCV from Yahoo Finance"
      className="chart-pro-panel"
      height={360}
    />
  );
}