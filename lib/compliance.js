const DISCLAIMER =
  "Market data is sourced from approved providers and may be delayed. AI/model outputs are probabilistic opinions, not investment advice. Past performance does not guarantee future results.";

function wrapResponse(payload, meta = {}) {
  const now = new Date().toISOString();
  return {
    ...payload,
    _meta: {
      source: meta.source || "Unknown",
      dataType: meta.dataType || "factual",
      asOfDate: meta.asOfDate || now.slice(0, 10),
      fetchedAt: now,
      lastUpdated: meta.lastUpdated || now,
      confidence: meta.confidence ?? null,
      disclaimer: DISCLAIMER,
      ...meta.extra,
    },
  };
}

function unavailable(field, reason) {
  return { value: null, available: false, reason };
}

module.exports = { wrapResponse, unavailable, DISCLAIMER };