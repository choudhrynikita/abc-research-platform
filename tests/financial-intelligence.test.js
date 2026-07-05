const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const {
  MESSAGES,
  buildIntelligenceError,
  mapApiFailure,
  buildVerifiedField,
  unavailableField,
  verifyFinancialPayload,
  requireVerifiedInputs,
  assistantPolicyPreamble,
} = require("../lib/financial-intelligence");

describe("financial-intelligence policy", () => {
  it("uses canonical unavailable messages", () => {
    assert.equal(MESSAGES.UNAVAILABLE_CURRENT, "Verified data is currently unavailable.");
    assert.match(assistantPolicyPreamble(), /hallucination/i);
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
});