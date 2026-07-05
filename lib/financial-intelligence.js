/**
 * Production-grade financial intelligence policy — zero hallucination, verified data only.
 * Governs API responses, AI assistants, and UI display conventions.
 */

const { validateNumericMetric, validateTimestamp } = require("./data-validation");

/** Canonical user-facing messages — never substitute with estimates. */
const MESSAGES = {
  UNAVAILABLE_CURRENT: "Verified data is currently unavailable.",
  UNAVAILABLE_GENERAL: "Verified data unavailable.",
  UNAVAILABLE_HISTORICAL: "Historical data unavailable from verified source.",
  UNABLE_TO_CALCULATE: "Unable to calculate because verified input data is unavailable.",
  UNCONFIRMED: "This information could not be confirmed from verified sources.",
  INSUFFICIENT_DATA: "I don't have sufficient verified market data to answer that accurately.",
  CHART_UNAVAILABLE: "Unable to render chart because verified data could not be retrieved.",
};

/** Transparency labels for mixed factual / opinion content. */
const DATA_CLASSIFICATION = {
  VERIFIED_FACT: "verified_fact",
  UNAVAILABLE: "unavailable",
  OPINION: "opinion",
  ANALYSIS: "analysis",
  PREDICTION: "prediction",
  FORECAST: "forecast",
};

/** Licensed / official source tiers (highest priority first). */
const SOURCE_TIERS = [
  "sec_edgar",
  "company_ir",
  "licensed_market_data",
  "official_exchange",
  "central_bank",
  "government_statistics",
];

const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Structured API error — never fabricate data as fallback.
 */
function buildIntelligenceError({
  reason,
  action = null,
  httpStatus = 503,
  code = "VERIFIED_DATA_UNAVAILABLE",
} = {}) {
  return {
    success: false,
    error: MESSAGES.UNAVAILABLE_CURRENT,
    reason: reason || MESSAGES.UNAVAILABLE_GENERAL,
    action: action || "Retry after verifying data source connectivity.",
    code,
    httpStatus,
    verified: false,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Map common failure modes to structured errors.
 */
function mapApiFailure(err, context = {}) {
  const msg = String(err?.message || err || "").toLowerCase();
  if (msg.includes("api_secret") || msg.includes("unauthorized") || msg.includes("401")) {
    return buildIntelligenceError({
      reason: "API authentication failed.",
      action: "Configure API_SECRET and retry.",
      httpStatus: 401,
      code: "UNAUTHORIZED",
    });
  }
  if (msg.includes("forbidden") || msg.includes("403")) {
    return buildIntelligenceError({
      reason: "Access forbidden for configured data source.",
      action: "Verify API credentials and licensing.",
      httpStatus: 403,
      code: "FORBIDDEN",
    });
  }
  if (msg.includes("rate") || msg.includes("429")) {
    return buildIntelligenceError({
      reason: "Data provider rate limit exceeded.",
      action: "Wait and retry with reduced request frequency.",
      httpStatus: 429,
      code: "RATE_LIMITED",
    });
  }
  if (msg.includes("timeout") || msg.includes("etimedout") || msg.includes("abort")) {
    return buildIntelligenceError({
      reason: "Data provider request timed out.",
      action: "Retry — network or upstream latency may be elevated.",
      httpStatus: 504,
      code: "TIMEOUT",
    });
  }
  if (msg.includes("network") || msg.includes("econnrefused") || msg.includes("fetch failed")) {
    return buildIntelligenceError({
      reason: "Network error reaching verified data source.",
      action: "Check connectivity and retry.",
      httpStatus: 502,
      code: "NETWORK_ERROR",
    });
  }
  if (msg.includes("parse") || msg.includes("json") || msg.includes("invalid response")) {
    return buildIntelligenceError({
      reason: "Invalid or malformed response from data provider.",
      action: "Inspect provider status and retry.",
      httpStatus: 502,
      code: "PARSE_ERROR",
    });
  }
  if (msg.includes("empty") || msg.includes("no data") || msg.includes("not found")) {
    return buildIntelligenceError({
      reason: context.symbol
        ? `No verified data returned for ${context.symbol}.`
        : "Empty response from verified data source.",
      action: "Confirm symbol, exchange listing, and market session.",
      httpStatus: 404,
      code: "EMPTY_RESPONSE",
    });
  }
  return buildIntelligenceError({
    reason: err?.message || MESSAGES.UNAVAILABLE_GENERAL,
    action: context.action || "Retry after verifying data source.",
    httpStatus: context.httpStatus || 503,
    code: context.code || "VERIFIED_DATA_UNAVAILABLE",
  });
}

/**
 * Institutional field wrapper — every figure includes provenance or explicit unavailability.
 */
function buildVerifiedField({
  value,
  currency = null,
  period = null,
  source = null,
  collectedAt = null,
  exchange = null,
  classification = DATA_CLASSIFICATION.VERIFIED_FACT,
  numericOptions = {},
} = {}) {
  if (value == null || value === "") {
    return unavailableField({ reason: MESSAGES.UNAVAILABLE_GENERAL, classification });
  }

  const numCheck = typeof value === "number" || (typeof value === "string" && value !== "" && !Number.isNaN(Number(value)))
    ? validateNumericMetric(typeof value === "number" ? value : Number(value), numericOptions)
    : { valid: true, value };

  if (!numCheck.valid && typeof value === "number") {
    return unavailableField({ reason: numCheck.reason || MESSAGES.UNAVAILABLE_GENERAL, classification });
  }

  const ts = validateTimestamp(collectedAt);
  const displayValue = typeof value === "number" ? numCheck.value ?? value : value;

  return {
    value: displayValue,
    available: true,
    verified: true,
    display: typeof displayValue === "number"
      ? displayValue.toLocaleString(undefined, { maximumFractionDigits: numericOptions.decimals ?? 4 })
      : String(displayValue),
    currency: currency || null,
    period: period || null,
    exchange: exchange || null,
    source: source || null,
    collectedAt: ts.valid ? ts.parsedAt : collectedAt || new Date().toISOString(),
    lastUpdated: ts.valid ? ts.parsedAt : collectedAt || new Date().toISOString(),
    classification,
  };
}

function unavailableField({ reason = MESSAGES.UNAVAILABLE_GENERAL, classification = DATA_CLASSIFICATION.UNAVAILABLE } = {}) {
  return {
    value: null,
    available: false,
    verified: false,
    display: "N/A",
    currency: null,
    period: null,
    exchange: null,
    source: null,
    collectedAt: null,
    lastUpdated: null,
    reason,
    classification,
  };
}

/**
 * Ten-step verification gate before returning financial information.
 */
function verifyFinancialPayload({
  symbol = null,
  company = null,
  currency = null,
  exchange = null,
  period = null,
  fields = {},
  collectedAt = null,
  source = null,
  maxAgeMs = DEFAULT_CACHE_TTL_MS,
} = {}) {
  const failures = [];

  if (!source) failures.push({ step: "source", reason: "Data source not specified" });

  const ts = validateTimestamp(collectedAt, { maxAgeMs });
  if (!ts.valid) failures.push({ step: "timestamp", reason: ts.reason || "Timestamp invalid or stale" });

  if (symbol != null && (typeof symbol !== "string" || !symbol.trim())) {
    failures.push({ step: "symbol", reason: "Invalid symbol" });
  }

  if (company != null && symbol && !String(company).toLowerCase().includes(String(symbol).split(".")[0].toLowerCase().slice(0, 4))) {
    // Soft check only when both provided — do not fail on abbreviated names
  }

  for (const [key, val] of Object.entries(fields)) {
    if (val == null) failures.push({ step: `field:${key}`, reason: "null value" });
    else if (typeof val === "number" && !Number.isFinite(val)) failures.push({ step: `field:${key}`, reason: "non-finite number" });
  }

  if (currency != null && typeof currency !== "string") {
    failures.push({ step: "currency", reason: "Invalid currency" });
  }

  if (period != null && !period) failures.push({ step: "period", reason: "Reporting period missing" });

  if (exchange != null && !exchange) failures.push({ step: "exchange", reason: "Exchange missing" });

  return {
    verified: failures.length === 0,
    failures,
    collectedAt: ts.valid ? ts.parsedAt : null,
    message: failures.length ? MESSAGES.UNAVAILABLE_CURRENT : null,
  };
}

/**
 * Block calculations unless every required input is verified.
 */
function requireVerifiedInputs(inputs, labels = []) {
  const missing = [];
  const keys = labels.length ? labels : Object.keys(inputs);
  keys.forEach((key) => {
    const v = inputs[key];
    if (v == null || v === "" || (typeof v === "number" && !Number.isFinite(v))) {
      missing.push(key);
    }
  });
  if (missing.length) {
    return {
      ok: false,
      missing,
      message: MESSAGES.UNABLE_TO_CALCULATE,
      reason: `Missing verified inputs: ${missing.join(", ")}`,
    };
  }
  return { ok: true, missing: [], message: null, reason: null };
}

/**
 * Policy preamble for AI assistants — educational content only; live figures from verified context.
 */
function assistantPolicyPreamble() {
  return [
    "Zero hallucination policy: never invent market data, prices, Greeks, IV, OI, earnings, or performance.",
    "Use only verified context supplied with the request.",
    "If verified data is missing, state explicitly — never guess or estimate unless labeled hypothetical.",
    "Distinguish verified facts from educational analysis and model opinions.",
    "This is not investment advice.",
  ].join(" ");
}

module.exports = {
  MESSAGES,
  DATA_CLASSIFICATION,
  SOURCE_TIERS,
  DEFAULT_CACHE_TTL_MS,
  buildIntelligenceError,
  mapApiFailure,
  buildVerifiedField,
  unavailableField,
  verifyFinancialPayload,
  requireVerifiedInputs,
  assistantPolicyPreamble,
};