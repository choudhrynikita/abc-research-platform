"use client";

/** Canonical labels — never show 0/null/NaN as a real metric. */
export const DATA_UNAVAILABLE = "Data Unavailable";
export const SOURCE_DOES_NOT_PROVIDE = "Source does not provide this information";
export const AWAITING_MARKET_DATA = "Awaiting latest market data";

export function extractValue(field) {
  if (field == null || field === "") return null;
  if (typeof field === "number") {
    return Number.isFinite(field) ? field : null;
  }
  if (typeof field === "object") {
    if (field.available === false) return null;
    const v = field.value ?? field.raw ?? null;
    if (v == null) return null;
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    // Yahoo-style nested raw (defensive)
    if (typeof v === "object" && v != null && typeof v.raw === "number") {
      return Number.isFinite(v.raw) ? v.raw : null;
    }
    return v;
  }
  if (typeof field === "string") {
    const n = Number(field);
    if (field.trim() !== "" && Number.isFinite(n) && String(n) === field.trim()) return n;
    return field;
  }
  return field;
}

export function extractReason(field) {
  if (field != null && typeof field === "object") {
    return field.reason || field.message || null;
  }
  return null;
}

export function formatMetric(value, type = "number", decimals = 2) {
  if (value == null || (typeof value === "number" && Number.isNaN(value))) return null;
  if (typeof value === "string") return value;

  const n = Number(value);
  if (!Number.isFinite(n)) return null;

  if (type === "pct") {
    // Values in [-1, 1] (excluding 0) treated as fractions; larger magnitudes already percent.
    const scaled = Math.abs(n) <= 1 && n !== 0 ? n * 100 : n;
    return `${scaled.toFixed(decimals)}%`;
  }
  if (type === "ratio") {
    // Standard ratio fields (ROE, margins) from Yahoo are fractions (0.091 → 9.1%).
    return `${(n * 100).toFixed(decimals)}%`;
  }
  if (type === "yield") {
    // Dividend yield may arrive as fraction (0.0046) or already percent.
    const scaled = Math.abs(n) <= 1 ? n * 100 : n;
    return `${scaled.toFixed(decimals)}%`;
  }
  if (type === "cr") {
    const cr = n / 1e7;
    if (!Number.isFinite(cr)) return null;
    return `₹${cr.toLocaleString(undefined, { maximumFractionDigits: Math.abs(cr) >= 100 ? 0 : 2 })} Cr`;
  }
  if (type === "price") {
    return `₹${n.toLocaleString(undefined, { maximumFractionDigits: decimals })}`;
  }
  if (type === "x") {
    return `${n.toFixed(decimals)}x`;
  }
  if (type === "eps") {
    return `₹${n.toLocaleString(undefined, { maximumFractionDigits: decimals })}`;
  }
  return n.toLocaleString(undefined, { maximumFractionDigits: decimals });
}

/**
 * Institutional metric cell with tooltip definition + source reason when unavailable.
 */
export default function MetricValue({
  value,
  type = "number",
  decimals = 2,
  className = "",
  label = null,
  definition = null,
  showZeroAsUnavailable = true,
}) {
  const raw = extractValue(value);
  const reason = extractReason(value);

  if (raw == null || (showZeroAsUnavailable === false && raw === 0 && type !== "number")) {
    // fall through to unavailable only when null
  }

  const isMissing =
    raw == null ||
    (typeof raw === "number" && !Number.isFinite(raw)) ||
    (showZeroAsUnavailable && type === "cr" && raw === 0 && reason);

  if (isMissing || (raw == null)) {
    const title = [reason || SOURCE_DOES_NOT_PROVIDE, definition].filter(Boolean).join(" — ");
    return (
      <span
        className={`metric-na ${className}`}
        title={title}
        aria-label={`${label || "Metric"}: ${DATA_UNAVAILABLE}`}
      >
        {DATA_UNAVAILABLE}
      </span>
    );
  }

  const formatted = formatMetric(raw, type, decimals);
  if (formatted == null) {
    return (
      <span className={`metric-na ${className}`} title={reason || SOURCE_DOES_NOT_PROVIDE}>
        {DATA_UNAVAILABLE}
      </span>
    );
  }

  const title = [definition, reason].filter(Boolean).join(" — ") || undefined;
  return (
    <span className={`metric-value ${className}`} title={title}>
      {formatted}
    </span>
  );
}

/**
 * Grouped metric tile for terminal-style layouts.
 */
export function MetricTile({
  label,
  value,
  type = "number",
  decimals = 2,
  definition = null,
  hideIfUnavailable = false,
}) {
  const raw = extractValue(value);
  if (hideIfUnavailable && raw == null) return null;

  return (
    <div className="metric-tile" title={definition || undefined}>
      <div className="metric-tile-label">
        <small>{label}</small>
        {definition && (
          <span className="metric-info" aria-label={definition} title={definition}>
            i
          </span>
        )}
      </div>
      <strong className="metric-tile-value">
        <MetricValue value={value} type={type} decimals={decimals} label={label} definition={definition} />
      </strong>
    </div>
  );
}
