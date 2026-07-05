const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const {
  answerStrategyQuestion,
  buildVerifiedSnapshot,
  classifyIntent,
  getSuggestedQuestions,
  getEducationalInsights,
  NA_INSUFFICIENT,
  NA_MSG,
} = require("../lib/strategy-assistant");

const sampleStrategy = {
  rank: 1,
  name: "Bull Call Spread",
  type: "Bull Call Spread",
  bias: "Bullish",
  status: "Active",
  expiry: "27-Mar-2026",
  expiryType: "Weekly",
  confidenceScore: 72,
  maxRisk: 1200,
  maxReward: 2800,
  riskRewardRatio: 2.33,
  premiums: { net: 45 },
  strikes: [
    { strike: 24500, type: "CE", action: "BUY", premium: 120 },
    { strike: 24600, type: "CE", action: "SELL", premium: 75 },
  ],
  why: [
    { category: "Technical", text: "NIFTY trend is BULLISH" },
    "PCR supports bullish bias",
  ],
  exitConditions: ["Exit at 80% max profit", "Stop at 50% debit"],
  positionSizing: {
    available: true,
    lotSize: 75,
    breakEven: "24545",
    capitalRequired: 3375,
  },
  analytics: {
    delta: 0.42,
    gamma: 0.03,
    theta: -12.5,
    vega: 8.2,
    impliedVolatility: 14.5,
    greeksSource: "NSE ATM option chain",
  },
  lastUpdated: "2026-07-05T09:30:00.000Z",
};

const marketContext = {
  price: 24520,
  trend: "BULLISH",
  support: 24400,
  resistance: 24650,
  chain: { putCallRatio: 1.12, maxPain: 24500, available: true },
  vix: 13.2,
};

const derivativesIntel = {
  verified: true,
  fetchedAt: "2026-07-05T09:30:00.000Z",
  risk: { maxLoss: 1200, maxProfit: 2800, breakeven: "24545", riskRewardRatio: 2.33 },
  volatility: {
    impliedVolatility: 14.5,
    ivRankNumeric: 42,
    ivPercentileNumeric: 55,
    indiaVix: 13.2,
    greeks: { delta: 0.42, gamma: 0.03, theta: -12.5, vega: 8.2, source: "NSE ATM option chain" },
  },
  marketFlow: { putCallRatio: 1.12 },
};

describe("classifyIntent", () => {
  it("maps professional derivatives questions to intents", () => {
    assert.equal(classifyIntent("Why does this strategy work?"), "why_strategy");
    assert.equal(classifyIntent("What happens if IV rises?"), "iv_rise");
    assert.equal(classifyIntent("Why is Vega positive?"), "vega");
    assert.equal(classifyIntent("What is the maximum possible loss?"), "max_loss");
    assert.equal(classifyIntent("How is break-even calculated?"), "breakeven");
    assert.equal(classifyIntent("current IV for this strategy"), "live_iv");
    assert.equal(classifyIntent("What happens if the market gaps?"), "gap");
  });
});

describe("buildVerifiedSnapshot", () => {
  it("extracts only verified fields without fabrication", () => {
    const snap = buildVerifiedSnapshot(sampleStrategy, marketContext, derivativesIntel, "nifty-strategy", "2026-07-05T09:30:00.000Z");
    assert.equal(snap.maxRisk, 1200);
    assert.equal(snap.greeks.iv, 14.5);
    assert.equal(snap.ivRank, 42);
    assert.equal(snap.putCallRatio, 1.12);
    assert.equal(snap.strikes.length, 2);
    assert.equal(snap.strikes[0].verified, true);
  });

  it("marks missing premiums as unverified", () => {
    const preMarket = {
      ...sampleStrategy,
      mode: "pre-market",
      premiums: { net: null },
      strikes: [{ strike: 24500, type: "CE", action: "BUY", premium: null }],
      analytics: {},
    };
    const snap = buildVerifiedSnapshot(preMarket, {}, { verified: false }, "nifty-strategy");
    assert.equal(snap.netPremium, null);
    assert.equal(snap.strikes[0].verified, false);
  });
});

describe("answerStrategyQuestion", () => {
  it("returns prefetch bundle with suggestions and insights", () => {
    const res = answerStrategyQuestion({
      strategy: sampleStrategy,
      marketContext,
      derivativesIntel,
      module: "nifty-strategy",
      prefetch: true,
    });
    assert.equal(res.prefetch, true);
    assert.ok(res.suggestedQuestions.length >= 5);
    assert.ok(res.educationalInsights.riskDiscussion.length > 0);
    assert.ok(res.transparency.sources.length > 0);
  });

  it("answers why strategy with verified rationale", () => {
    const res = answerStrategyQuestion({
      query: "Why does this strategy work?",
      strategy: sampleStrategy,
      marketContext,
      derivativesIntel,
    });
    assert.match(res.answer, /BULLISH/);
    assert.match(res.answer, /Bull Call Spread/);
    assert.ok(res.confidence >= 70);
  });

  it("uses verified Greeks for Vega explanation", () => {
    const res = answerStrategyQuestion({
      query: "Why is Vega positive?",
      strategy: sampleStrategy,
      marketContext,
      derivativesIntel,
    });
    assert.match(res.answer, /8\.2/);
    assert.match(res.answer, /Vega/);
  });

  it("never fabricates live IV when unavailable", () => {
    const bare = { ...sampleStrategy, analytics: {} };
    const res = answerStrategyQuestion({
      query: "What is the current IV?",
      strategy: bare,
      marketContext: {},
      derivativesIntel: { verified: false, volatility: {} },
    });
    assert.match(res.answer, new RegExp(NA_MSG.replace(/\./g, "\\.")));
    assert.equal(res.dataType, "factual");
    assert.ok(res.confidence < 50);
  });

  it("states insufficient data for max loss when unverified", () => {
    const res = answerStrategyQuestion({
      query: "What is the maximum possible loss?",
      strategy: { ...sampleStrategy, maxRisk: null },
      marketContext,
      derivativesIntel: { verified: false, risk: {} },
    });
    assert.match(res.answer, new RegExp(NA_INSUFFICIENT.replace(/\./g, "\\.")));
  });

  it("handles follow-up context via history", () => {
    const res = answerStrategyQuestion({
      query: "tell me more",
      strategy: sampleStrategy,
      marketContext,
      derivativesIntel,
      history: [{ role: "user", content: "What happens if IV rises?" }],
    });
    assert.match(res.answer, /Bull Call Spread|Derivatives Strategist/);
    assert.ok(res.suggestedFollowUps.length > 0);
  });

  it("rejects missing strategy", () => {
    const res = answerStrategyQuestion({ query: "Why?", strategy: null });
    assert.equal(res.unavailable, true);
  });

  it("labels hypothetical scenarios clearly", () => {
    const res = answerStrategyQuestion({
      query: "What happens if spot moves sharply?",
      strategy: sampleStrategy,
      marketContext,
      derivativesIntel,
    });
    assert.match(res.answer, /Hypothetical/i);
    assert.match(res.answer, /not a forecast/i);
  });
});

describe("getSuggestedQuestions", () => {
  it("returns strategy-type-aware suggestions", () => {
    const nifty = getSuggestedQuestions(sampleStrategy);
    const condor = getSuggestedQuestions({ type: "Iron Condor" });
    assert.ok(nifty.some((q) => q.includes("IV")));
    assert.ok(condor.some((q) => q.includes("Theta") || q.includes("expiry")));
  });
});

describe("getEducationalInsights", () => {
  it("includes limitations about verified data", () => {
    const insights = getEducationalInsights({ type: "Iron Condor", mode: "pre-market" });
    assert.ok(insights.limitations.some((l) => l.includes("verified")));
    assert.ok(insights.limitations.some((l) => l.includes("Pre-market")));
  });
});