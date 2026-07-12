const { MESSAGES } = require("./financial-intelligence");

const UNAVAILABLE_MSG =
  `${MESSAGES.UNAVAILABLE_GENERAL} Analysis cannot be generated until fresh data is received from approved sources.`;

const UNAVAILABLE_FIELD = MESSAGES.UNAVAILABLE_GENERAL;

const IPO_UNAVAILABLE_MSG =
  "Verified IPO data unavailable. Analysis cannot be generated until fresh source data is received.";

function isAvailable(value) {
  if (value == null || value === "" || Number.isNaN(value)) return false;
  if (typeof value === "object" && value.available === false) return false;
  return true;
}

function fmt(value, decimals = 2) {
  if (!isAvailable(value)) return "—";
  if (typeof value === "number") {
    return Number(value).toLocaleString(undefined, { maximumFractionDigits: decimals });
  }
  return String(value);
}

function fmtPct(value) {
  if (!isAvailable(value)) return "—";
  return `${fmt(value)}%`;
}

function fmtCr(value) {
  if (!isAvailable(value)) return "—";
  return `${fmt(value)} Cr`;
}

/**
 * Indian institutional crore formatting for UI (₹ 2,345.67 Cr).
 * Returns null when value is missing — callers must show "Data Unavailable".
 * Zero is only returned when the source reported zero.
 */
function formatInrCr(value, { signed = false } = {}) {
  if (value == null || value === "" || Number.isNaN(Number(value))) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const abs = Math.abs(n);
  const body = abs.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
  });
  if (n < 0) return `₹ -${body} Cr`;
  if (signed && n > 0) return `₹ +${body} Cr`;
  return `₹ ${body} Cr`;
}

function tableCell(value) {
  if (!isAvailable(value)) return "Unavailable";
  if (typeof value === "object" && value.reason) return value.reason;
  return fmt(value);
}

function noNullRows(rows) {
  return rows.map((row) => row.map((cell) => tableCell(cell)));
}

function assertFreshData(checks) {
  const failed = checks.filter((c) => !c.ok);
  if (failed.length) {
    const reasons = failed.map((c) => c.reason).join("; ");
    throw new Error(`${UNAVAILABLE_MSG} (${reasons})`);
  }
}

function dataFreshness(timestamp, maxAgeMs = 30 * 60 * 1000) {
  if (!timestamp) return { status: "unknown", label: "Timestamp unavailable" };
  const age = Date.now() - new Date(timestamp).getTime();
  if (age > maxAgeMs) {
    return { status: "stale", label: `Stale (${Math.round(age / 60000)} min old)`, ageMs: age };
  }
  return { status: "fresh", label: "Fresh", ageMs: age };
}

function metricMeta(source, collectedAt, freshness) {
  // Never invent a timestamp or "Fresh" label when provenance is missing
  const ts = collectedAt || null;
  let freshnessLabel = "Unknown";
  if (freshness?.label) freshnessLabel = freshness.label;
  else if (typeof freshness === "string") freshnessLabel = freshness;
  else if (!ts) freshnessLabel = "Timestamp unavailable";
  return {
    source: source || "Unknown",
    collectedAt: ts,
    lastUpdated: ts,
    freshness: freshnessLabel,
  };
}

function unavailableField(reason) {
  return {
    available: false,
    value: null,
    display: UNAVAILABLE_FIELD,
    reason: reason || UNAVAILABLE_FIELD,
  };
}

module.exports = {
  UNAVAILABLE_MSG,
  UNAVAILABLE_FIELD,
  IPO_UNAVAILABLE_MSG,
  metricMeta,
  unavailableField,
  isAvailable,
  fmt,
  fmtPct,
  fmtCr,
  formatInrCr,
  tableCell,
  noNullRows,
  assertFreshData,
  dataFreshness,
};