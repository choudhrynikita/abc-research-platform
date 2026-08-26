const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const { resolveMarketStatus } = require("../lib/market-hours");
const {
  summarizeFinancialContext,
  applyStrategyEligibility,
  isExpiredExpiry,
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
});
