const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const { resolveMarketStatus } = require("../lib/market-hours");
const {
  summarizeFinancialContext,
  applyStrategyEligibility,
  isExpiredExpiry,
  rateLiquidityFromLegs,
  isDefinedRisk,
  daysToExpiry,
  parseExpiry,
} = require("../lib/strategy-eligibility");

function liveStatus() {
  return resolveMarketStatus(new Date("2026-08-27T04:45:00.000Z")); // 10:15 IST, Thursday
}

function afterCloseStatus() {
  return resolveMarketStatus(new Date("2026-08-27T18:14:00.000Z")); // 23:44 IST, Thursday
}

function strategy(overrides = {}) {
  return {
    name: "Test Bull Call Spread",
    type: "Bull Call Spread",
    bias: "Bullish",
    status: "Live",
    mode: "live",
    expiry: "2026-09-29",
    strikes: [{ action: "BUY", premium: 120 }],
    analytics: { liquidityRating: "High" },
    payoff: { available: true },
    dossier: { riskFactors: [], fundamentalSignals: [] },
    ...overrides,
  };
}

function reviewedFinancials(overrides = {}) {
  return summarizeFinancialContext({
    available: true,
    source: "Yahoo Finance quoteSummary API",
    fetchedAt: "2026-08-26T04:45:00.000Z",
    fundamentalAnalysis: {
      revenueGrowth: { available: true, value: 0.11 },
      profitGrowth: { available: true, value: 0.08 },
      roe: { available: true, value: 0.17 },
      debtToEquity: { available: true, value: 0.6 },
      freeCashFlow: { available: true, value: 500 },
    },
    valuation: { peRatio: { available: true, value: 24 } },
    ...overrides,
  });
}

describe("market planning and strategy eligibility", () => {
  it("distinguishes a live session from after-close next-session planning", () => {
    const live = liveStatus();
    const afterClose = afterCloseStatus();
    assert.equal(live.mode, "live");
    assert.equal(live.strategyStateLabel, "Live Session");
    assert.equal(afterClose.mode, "next-session");
    assert.equal(afterClose.strategyStateLabel, "Next Session");
    assert.equal(afterClose.nextSessionDate, "2026-08-28");
  });

  it("labels a weekend as week-ahead planning instead of pre-market", () => {
    const weekend = resolveMarketStatus(new Date("2026-08-29T12:00:00.000Z")); // 17:30 IST, Saturday
    assert.equal(weekend.mode, "week-ahead");
    assert.equal(weekend.strategyStateLabel, "Week-Ahead Plan");
    assert.notEqual(weekend.mode, "pre-market");
  });

  it("rejects an expired contract instead of presenting it as a current plan", () => {
    assert.equal(isExpiredExpiry("25-Aug-2026", "2026-08-27"), true);
    assert.equal(isExpiredExpiry("25-08-2026", "2026-08-27"), true);
    assert.equal(isExpiredExpiry("29-Sep-2026", "2026-08-27"), false);
  });

  it("permits a live strategy only when technical, contract, payoff, and financial evidence are ready", () => {
    const reviewed = applyStrategyEligibility(strategy(), {
      marketStatus: liveStatus(),
      technical: { trend: "BULLISH" },
      financial: reviewedFinancials(),
      assetClass: "equity",
    });
    assert.equal(reviewed.eligibility.decision, "LIVE");
    assert.equal(reviewed.status, "Live");
    assert.equal(reviewed.eligibility.blockers.length, 0);
  });

  it("defers a live equity strategy when verified fundamentals or contract liquidity are missing", () => {
    const deferred = applyStrategyEligibility(strategy({ analytics: { liquidityRating: "Low" } }), {
      marketStatus: liveStatus(),
      technical: { trend: "BULLISH" },
      financial: summarizeFinancialContext(null),
      assetClass: "equity",
    });
    assert.equal(deferred.eligibility.decision, "DEFER");
    assert.equal(deferred.status, "Defer");
    assert.ok(deferred.eligibility.blockers.some((item) => /liquidity/i.test(item)));
    assert.ok(deferred.eligibility.blockers.some((item) => /financial/i.test(item)));
  });

  it("keeps after-close setups as plans while disclosing reference pricing and incomplete financial context", () => {
    const planned = applyStrategyEligibility(strategy({ mode: "planning", status: "Next Session" }), {
      marketStatus: afterCloseStatus(),
      technical: { trend: "BULLISH" },
      financial: summarizeFinancialContext(null),
      assetClass: "equity",
    });
    assert.equal(planned.eligibility.decision, "PLAN");
    assert.equal(planned.status, "Next Session");
    assert.ok(planned.eligibility.warnings.some((item) => /latest verified close/i.test(item)));
    assert.ok(planned.eligibility.warnings.some((item) => /technical planning setup/i.test(item)));
  });

  it("rates 50k+ OI as High even when volume is missing", () => {
    assert.equal(rateLiquidityFromLegs([{ openInterest: 213515 }]), "High");
    assert.equal(rateLiquidityFromLegs([{ openInterest: 50000, volume: null }]), "High");
    assert.equal(rateLiquidityFromLegs([{ openInterest: 12000 }]), "Medium");
    assert.equal(rateLiquidityFromLegs([{ openInterest: 4000, volume: 80 }]), "Medium");
    assert.equal(rateLiquidityFromLegs([{ openInterest: 487, volume: 1334 }]), "Medium");
    assert.equal(rateLiquidityFromLegs([{ openInterest: 3197, volume: 7027 }]), "Medium");
    assert.equal(rateLiquidityFromLegs([{ openInterest: 80, volume: 20 }]), "Low");
    assert.equal(rateLiquidityFromLegs([{ premium: 40 }]), null);
  });

  it("parses NSE named expiries and counts calendar days, not UTC-shift hours", () => {
    assert.equal(daysToExpiry("08-Sep-2026", new Date("2026-09-07T00:00:00")), 1);
    assert.equal(daysToExpiry("08-09-2026", new Date("2026-09-07T00:00:00")), 1);
    assert.equal(daysToExpiry("2026-09-08", new Date("2026-09-07T00:00:00")), 1);
    assert.equal(daysToExpiry("2026-09-07", new Date("2026-09-07T00:00:00")), 0);
    assert.ok(parseExpiry("08-Sep-2026"));
  });

  it("lets a live Nifty 7-day defined-risk spread through on Monday 1 DTE when OI is 2.1 lakh and unrated", () => {
    const monday = resolveMarketStatus(new Date("2026-09-07T04:45:00.000Z"));
    assert.equal(monday.sessionDate, "2026-09-07");
    assert.equal(monday.isLive, true);
    const livePut = applyStrategyEligibility(strategy({
      name: "7-Day Bear Put Spread",
      type: "Bear Put Spread",
      bias: "Bearish",
      expiry: "08-Sep-2026",
      analytics: null,
      strikes: [
        { strike: 23750, type: "PE", action: "BUY", premium: 47.6, openInterest: 213515 },
        { strike: 23550, type: "PE", action: "SELL", premium: 8.6, openInterest: 80000 },
      ],
      premiums: { net: 39 },
      payoff: { available: true, maxLoss: 161, maxLossUnlimited: false },
    }), {
      marketStatus: monday,
      technical: { trend: "BEARISH" },
      assetClass: "index",
    });
    assert.equal(livePut.eligibility.expiryDays, 1);
    assert.equal(livePut.eligibility.definedRisk, true);
    assert.equal(livePut.analytics.liquidityRating, "High");
    assert.equal(livePut.eligibility.decision, "LIVE");
    assert.equal(livePut.status, "Live");
    assert.equal(livePut.eligibility.blockers.length, 0);
    assert.ok(livePut.eligibility.warnings.some((item) => /1 session remains/i.test(item)));
    assert.ok(livePut.eligibility.gates.some((gate) => gate.label === "Timing" && gate.state === "partial"));
    assert.ok(livePut.eligibility.gates.some((gate) => gate.label === "Option contract" && gate.detail === "High liquidity"));
  });

  it("still defers undefined-risk 1 DTE and blocks expiry-day new risk", () => {
    const monday = resolveMarketStatus(new Date("2026-09-07T04:45:00.000Z"));
    const naked = applyStrategyEligibility(strategy({
      name: "7-Day Short Call",
      type: "Short CE",
      bias: "Bearish",
      expiry: "08-Sep-2026",
      analytics: null,
      strikes: [{ strike: 23750, type: "CE", action: "SELL", premium: 40, openInterest: 200000 }],
      payoff: { available: true, maxLoss: null, maxLossUnlimited: true },
    }), {
      marketStatus: monday,
      technical: { trend: "BEARISH" },
      assetClass: "index",
    });
    assert.equal(isDefinedRisk(naked), false);
    assert.equal(naked.eligibility.decision, "DEFER");
    assert.ok(naked.eligibility.blockers.some((item) => /undefined-risk/i.test(item)));

    const expiryDay = applyStrategyEligibility(strategy({
      name: "7-Day Bear Put Spread",
      type: "Bear Put Spread",
      bias: "Bearish",
      expiry: "07-Sep-2026",
      analytics: { liquidityRating: "High" },
      payoff: { available: true, maxLoss: 161, maxLossUnlimited: false },
    }), {
      marketStatus: monday,
      technical: { trend: "BEARISH" },
      assetClass: "index",
    });
    assert.equal(expiryDay.eligibility.expiryDays, 0);
    assert.equal(expiryDay.eligibility.decision, "DEFER");
    assert.ok(expiryDay.eligibility.blockers.some((item) => /expiry is today/i.test(item)));
  });

  it("does not defer a 15-day index spread just because analytics never set liquidityRating", () => {
    const monday = resolveMarketStatus(new Date("2026-09-07T04:45:00.000Z"));
    const mid = applyStrategyEligibility(strategy({
      name: "15-Day Bear Put Spread",
      type: "Bear Put Spread",
      bias: "Bearish",
      expiry: "22-Sep-2026",
      analytics: undefined,
      strikes: [
        { strike: 23750, type: "PE", action: "BUY", premium: 80, openInterest: 213515 },
        { strike: 23550, type: "PE", action: "SELL", premium: 30, openInterest: 90000 },
      ],
      payoff: { available: true, maxLoss: 50, maxLossUnlimited: false },
    }), {
      marketStatus: monday,
      technical: { trend: "BEARISH" },
      assetClass: "index",
    });
    assert.ok(mid.eligibility.expiryDays > 1);
    assert.equal(mid.eligibility.decision, "LIVE");
    assert.equal(mid.analytics.liquidityRating, "High");
    assert.ok(!mid.eligibility.blockers.some((item) => /liquidity/i.test(item)));
  });

  it("lets a 15-day Nifty spread live when OI is thin but session volume fills 1 lot", () => {
    const monday = resolveMarketStatus(new Date("2026-09-07T04:45:00.000Z"));
    const farWeek = applyStrategyEligibility(strategy({
      name: "15-Day Bear Put Spread",
      type: "Bear Put Spread",
      bias: "Bearish",
      expiry: "22-Sep-2026",
      analytics: null,
      strikes: [
        { strike: 23750, type: "PE", action: "BUY", premium: 145, openInterest: 487, volume: 1334 },
        { strike: 23550, type: "PE", action: "SELL", premium: 88.35, openInterest: 398, volume: 736 },
      ],
      payoff: { available: true, maxLoss: 56.65, maxLossUnlimited: false },
    }), {
      marketStatus: monday,
      technical: { trend: "BEARISH" },
      assetClass: "index",
    });
    assert.equal(farWeek.analytics.liquidityRating, "Medium");
    assert.equal(farWeek.eligibility.decision, "LIVE");
    assert.ok(!farWeek.eligibility.blockers.some((item) => /liquidity/i.test(item)));
  });
});
