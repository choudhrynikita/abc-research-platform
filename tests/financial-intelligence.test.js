const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const {
  MESSAGES,
  POLICY_ID,
  POLICY_VERSION,
  buildIntelligenceError,
  mapApiFailure,
  buildVerifiedField,
  unavailableField,
  verifyFinancialPayload,
  requireVerifiedInputs,
  assistantPolicyPreamble,
  getSystemPrompt,
  getPolicyMeta,
  enforceFreshDataPolicy,
  buildInstitutionalFigure,
  classifyDataType,
  DATA_CLASSIFICATION,
} = require("../lib/financial-intelligence");

const { SYSTEM_PROMPT, ASSISTANT_PREAMBLE } = require("../lib/financial-intelligence-prompt");

describe("financial-intelligence policy", () => {
  it("uses canonical unavailable messages", () => {
    assert.equal(MESSAGES.UNAVAILABLE_CURRENT, "Live Data Currently Unavailable");
    assert.equal(MESSAGES.UNAVAILABLE_GENERAL, "Data Unavailable");
    assert.match(assistantPolicyPreamble(), /hallucination/i);
  });

  it("exposes full production system prompt", () => {
    assert.equal(getSystemPrompt(), SYSTEM_PROMPT);
    assert.match(SYSTEM_PROMPT, /Zero Hallucination Policy/);
    assert.match(SYSTEM_PROMPT, /Hallucination is prohibited/);
    assert.equal(assistantPolicyPreamble(), ASSISTANT_PREAMBLE);
  });

  it("returns policy metadata for API envelopes", () => {
    const meta = getPolicyMeta();
    assert.equal(meta.policyId, POLICY_ID);
    assert.equal(meta.policyVersion, POLICY_VERSION);
    assert.equal(meta.policy, "zero_hallucination");
    assert.ok(meta.preamble);
  });

  it("builds structured errors without fabricated data", () => {
    const err = buildIntelligenceError({
      reason: "API_SECRET environment variable is missing.",
      action: "Configure API_SECRET and retry.",
    });
    assert.equal(err.success, false);
    assert.equal(err.error, MESSAGES.UNAVAILABLE_CURRENT);
    assert.equal(err.reason, "API_SECRET environment variable is missing.");
    assert.equal(err.verified, false);
    assert.ok(err.timestamp);
  });

  it("maps API failures to structured errors", () => {
    const rate = mapApiFailure(new Error("rate limit 429"));
    assert.equal(rate.code, "RATE_LIMITED");
    assert.equal(rate.success, false);

    const timeout = mapApiFailure(new Error("request timeout"));
    assert.equal(timeout.code, "TIMEOUT");
  });

  it("wraps verified fields with provenance metadata", () => {
    const field = buildVerifiedField({
      value: 2450.5,
      currency: "INR",
      period: "FY2026",
      source: "Yahoo Finance",
      collectedAt: "2026-07-05T10:00:00Z",
      exchange: "NSE",
    });
    assert.equal(field.verified, true);
    assert.equal(field.currency, "INR");
    assert.equal(field.exchange, "NSE");
    assert.ok(field.lastUpdated);
  });

  it("returns N/A for unverified fields — never estimates", () => {
    const field = unavailableField();
    assert.equal(field.value, null);
    assert.equal(field.display, "N/A");
    assert.equal(field.verified, false);
  });

  it("blocks calculations when inputs are missing", () => {
    const result = requireVerifiedInputs({ price: 100, iv: null }, ["price", "iv"]);
    assert.equal(result.ok, false);
    assert.match(result.message, /Unable to calculate/);
    assert.deepEqual(result.missing, ["iv"]);
  });

  it("verifies financial payload with timestamp and fields", () => {
    const pass = verifyFinancialPayload({
      symbol: "RELIANCE",
      source: "Yahoo Finance",
      collectedAt: new Date().toISOString(),
      currency: "INR",
      fields: { price: 2500 },
    });
    assert.equal(pass.verified, true);

    const fail = verifyFinancialPayload({
      source: null,
      collectedAt: null,
      fields: { price: null },
    });
    assert.equal(fail.verified, false);
    assert.ok(fail.failures.length > 0);
  });

  it("rejects stale cache per freshness policy", () => {
    const stale = enforceFreshDataPolicy(new Date(Date.now() - 10 * 60 * 1000).toISOString(), 5 * 60 * 1000);
    assert.equal(stale.fresh, false);
    assert.equal(stale.stale, true);

    const fresh = enforceFreshDataPolicy(new Date().toISOString(), 5 * 60 * 1000);
    assert.equal(fresh.fresh, true);
  });

  it("builds institutional figures with reproducibility flag", () => {
    const fig = buildInstitutionalFigure({
      value: 100,
      currency: "INR",
      period: "Q1 FY2026",
      source: "NSE",
      collectedAt: new Date().toISOString(),
    });
    assert.equal(fig.verified, true);
    assert.equal(fig.reproducible, true);
    assert.equal(fig.dataSource, "NSE");
  });

  it("classifies data transparency types", () => {
    assert.equal(classifyDataType({ verified: true }), DATA_CLASSIFICATION.VERIFIED_FACT);
    assert.equal(classifyDataType({ verified: false }), DATA_CLASSIFICATION.UNAVAILABLE);
    assert.equal(classifyDataType({ verified: true, isForecast: true }), DATA_CLASSIFICATION.FORECAST);
    assert.equal(classifyDataType({ verified: true, isModel: true }), DATA_CLASSIFICATION.ANALYSIS);
  });
});