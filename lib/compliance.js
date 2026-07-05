const { MESSAGES, DATA_CLASSIFICATION, getPolicyMeta } = require("./financial-intelligence");

const DISCLAIMER =
  "Market data is sourced from approved providers and may be delayed. AI/model outputs are probabilistic opinions, not investment advice. Past performance does not guarantee future results.";

function wrapResponse(payload, meta = {}) {
  const now = new Date().toISOString();
  const policyMeta = getPolicyMeta();
  return {
    ...payload,
    _meta: {
      source: meta.source || "Unknown",
      dataType: meta.dataType || DATA_CLASSIFICATION.VERIFIED_FACT,
      asOfDate: meta.asOfDate || now.slice(0, 10),
      fetchedAt: now,
      lastUpdated: meta.lastUpdated || now,
      confidence: meta.confidence ?? null,
      disclaimer: DISCLAIMER,
      unavailableMessage: MESSAGES.UNAVAILABLE_CURRENT,
      ...policyMeta,
      ...meta.extra,
    },
  };
}

/**
 * Attach structured intelligence error to API body (no fabricated fallback data).
 */
function wrapIntelligenceError(intelError, extra = {}) {
  const policyMeta = getPolicyMeta();
  return {
    ...intelError,
    message: intelError.error,
    ...extra,
    _meta: {
      dataType: DATA_CLASSIFICATION.UNAVAILABLE,
      fetchedAt: intelError.timestamp,
      disclaimer: DISCLAIMER,
      ...policyMeta,
    },
  };
}

function unavailable(field, reason) {
  return {
    value: null,
    available: false,
    verified: false,
    display: "N/A",
    reason: reason || MESSAGES.UNAVAILABLE_GENERAL,
  };
}

module.exports = {
  wrapResponse,
  wrapIntelligenceError,
  unavailable,
  DISCLAIMER,
  MESSAGES,
};