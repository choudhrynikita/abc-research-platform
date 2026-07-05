const { logValidationFailure } = require("./data-logger");

const IV_MIN = 0.01;
const IV_MAX = 500;

/**
 * Validate a numeric financial metric before display or calculation.
 * @returns {{ valid: boolean, value: number|null, reason: string|null }}
 */
function validateNumericMetric(value, {
  name = "metric",
  min = -Infinity,
  max = Infinity,
  allowZero = false,
} = {}) {
  if (value == null || value === "") {
    return { valid: false, value: null, reason: "null or empty" };
  }
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) {
    logValidationFailure(name, "not a finite number", { raw: value });
    return { valid: false, value: null, reason: "not finite" };
  }
  if (Number.isNaN(num)) {
    logValidationFailure(name, "NaN", { raw: value });
    return { valid: false, value: null, reason: "NaN" };
  }
  if (!allowZero && num === 0) {
    logValidationFailure(name, "zero treated as missing", { raw: value });
    return { valid: false, value: null, reason: "zero" };
  }
  if (num < min || num > max) {
    logValidationFailure(name, `out of range [${min}, ${max}]`, { raw: value });
    return { valid: false, value: null, reason: "out of range" };
  }
  return { valid: true, value: num, reason: null };
}

function validateIv(value, name = "impliedVolatility") {
  return validateNumericMetric(value, { name, min: IV_MIN, max: IV_MAX, allowZero: false });
}

function validateTimestamp(ts, { maxAgeMs = null } = {}) {
  if (!ts) return { valid: false, reason: "timestamp missing" };
  const parsed = new Date(ts);
  if (Number.isNaN(parsed.getTime())) {
    logValidationFailure("timestamp", "invalid date", { raw: ts });
    return { valid: false, reason: "invalid date" };
  }
  if (maxAgeMs != null) {
    const age = Date.now() - parsed.getTime();
    if (age > maxAgeMs) {
      return { valid: false, reason: `stale (${Math.round(age / 60000)} min old)`, ageMs: age };
    }
  }
  return { valid: true, reason: null, parsedAt: parsed.toISOString() };
}

function validateMarketDate(dateKey) {
  if (!dateKey || typeof dateKey !== "string") {
    return { valid: false, reason: "market date missing" };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    logValidationFailure("marketDate", "invalid format", { raw: dateKey });
    return { valid: false, reason: "invalid format" };
  }
  return { valid: true, reason: null };
}

/**
 * Wrap a validated metric for API/UI consumption.
 */
function verifiedMetric(value, { source, collectedAt, verified = true, reason = null } = {}) {
  const tsCheck = validateTimestamp(collectedAt);
  return {
    value: value ?? null,
    available: value != null && verified,
    verified,
    source: source || null,
    collectedAt: tsCheck.valid ? tsCheck.parsedAt : collectedAt || null,
    reason,
  };
}

function rejectUnverified(reason) {
  return verifiedMetric(null, { verified: false, reason });
}

module.exports = {
  IV_MIN,
  IV_MAX,
  validateNumericMetric,
  validateIv,
  validateTimestamp,
  validateMarketDate,
  verifiedMetric,
  rejectUnverified,
};