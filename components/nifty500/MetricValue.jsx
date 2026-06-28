"use client";

export function extractValue(field) {
  if (field == null || field === "") return null;
  if (typeof field === "number") return field;
  if (typeof field === "object") {
    if (field.available === false) return null;
    return field.value ?? null;
  }
  return field;
}

export function formatMetric(value, type = "number", decimals = 2) {
  if (value == null || Number.isNaN(value)) return null;
  if (type === "pct") {
    const n = Number(value);
    const scaled = Math.abs(n) <= 1 && n !== 0 ? n * 100 : n;
    return `${scaled.toFixed(decimals)}%`;
  }
  if (type === "ratio") return `${(Number(value) * 100).toFixed(decimals)}%`;
  if (type === "cr") {
    const cr = value / 1e7;
    return `₹${cr.toLocaleString(undefined, { maximumFractionDigits: 0 })} Cr`;
  }
  if (type === "price") return `₹${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: decimals });
}

export default function MetricValue({ value, type = "number", decimals = 2, className = "" }) {
  const raw = extractValue(value);
  const formatted = formatMetric(raw, type, decimals);
  if (formatted == null) {
    return <span className={`metric-na ${className}`}>Data Not Available</span>;
  }
  return <span className={className}>{formatted}</span>;
}