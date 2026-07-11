const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  classifyIntent,
  extractSymbols,
  answerCopilotQuery,
  SUGGESTED_QUERIES,
} = require("../lib/copilot-engine");
const { requiresMutationAuth } = require("../lib/api-auth");

describe("copilot auth posture", () => {
  it("does not require mutation auth for POST /api/copilot", () => {
    assert.equal(requiresMutationAuth("POST", "/api/copilot"), false);
  });

  it("still protects strategy writes", () => {
    assert.equal(requiresMutationAuth("POST", "/api/strategies"), true);
  });
});

describe("copilot intent + symbol extraction", () => {
  it("classifies common research intents", () => {
    assert.equal(classifyIntent("What is the NIFTY outlook?"), "nifty_outlook");
    assert.equal(classifyIntent("Show FII DII flows"), "fiidii");
    assert.equal(classifyIntent("Explain RSI"), "definition_technical");
    assert.equal(classifyIntent("banking sector performance"), "sector");
    assert.equal(classifyIntent("Compare TCS with peers"), "competitors");
    assert.equal(classifyIntent("Analyze RELIANCE valuation"), "valuation");
  });

  it("extracts tickers and aliases without inventing peers", () => {
    assert.ok(extractSymbols("Analyze reliance").includes("RELIANCE.NS"));
    assert.ok(extractSymbols("TCS technicals").includes("TCS.NS"));
    assert.ok(extractSymbols("infosys pe ratio").includes("INFY.NS"));
    assert.equal(extractSymbols("what is rsi").length, 0);
  });
});

describe("copilot help path", () => {
  it("returns structured help without external data", async () => {
    const res = await answerCopilotQuery("help me");
    assert.equal(res.ok, true);
    assert.equal(res.status, 200);
    assert.ok(res.body.answer.includes("Copilot") || res.body.answer.includes("verified"));
    assert.ok(Array.isArray(res.body.suggestions));
    assert.ok(res.body.suggestions.length >= 3);
  });

  it("rejects empty query with friendly body", async () => {
    const res = await answerCopilotQuery("   ");
    assert.equal(res.ok, false);
    assert.equal(res.status, 400);
    assert.ok(res.body.message);
    assert.deepEqual(res.body.suggestions, SUGGESTED_QUERIES);
  });

  it("answers RSI definition without fabricating live values", async () => {
    const res = await answerCopilotQuery("What is RSI?");
    assert.equal(res.ok, true);
    assert.match(res.body.answer, /RSI|Relative Strength/i);
    assert.ok(!/\bRSI at \d+\.\d+\b/.test(res.body.answer) || res.body.answer.includes("Educational"));
  });
});
