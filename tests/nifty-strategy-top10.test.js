const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const { generateCandidates, rankTop10, scoreStrategy, shouldOfferBias } = require("../lib/nifty-strategy-engine");
const {
  supplementCandidates,
  generateTechnicalSetups,
  assignSequentialRanks,
  annotateForPlanning,
  sessionLevelsFromCandles,
} = require("../lib/pre-market-strategy");

function mockChain(spot = 24500) {
  const atm = 24500;
  const step = 50;
  const strikes = [];
  for (let s = spot - 600; s <= spot + 600; s += step) {
    const otmCall = Math.max(0, s - atm);
    const otmPut = Math.max(0, atm - s);
    strikes.push({
      strike: s,
      ce: { premium: Math.max(8, 90 - otmCall * 0.28 + otmPut * 0.32), openInterest: 1000, iv: 14 },
      pe: { premium: Math.max(8, 85 - otmPut * 0.28 + otmCall * 0.32), openInterest: 900, iv: 14 },
    });
  }
  return {
    available: true,
    underlying: spot,
    atmStrike: atm,
    expiry: "2026-07-10",
    putCallRatio: 1.05,
    maxPain: atm,
    strikes,
  };
}

const baseContext = {
  price: 24500,
  trend: "NEUTRAL",
  support: 24200,
  resistance: 24800,
  rsi: 52,
  adx: 22,
  sma20: 24400,
  sma50: 24300,
  macdHistogram: 0.5,
  volumeTrend: "Rising",
  vix: 15,
  prediction: { predictions: { monthly: { signal: "BULLISH", target: 25000, confidence: 60 } } },
};

describe("NIFTY strategy top 10 pipeline", () => {
  it("ranks up to 10 chain-verified candidates", () => {
    const chain = mockChain();
    const candidates = generateCandidates(chain, baseContext);
    assert.ok(candidates.length >= 3, `expected multiple chain candidates, got ${candidates.length}`);
    const top10 = rankTop10(candidates, { ...baseContext, chain, vix: 15 });
    assert.ok(top10.length <= 10);
    assert.equal(top10[0].rank, 1);
    if (candidates.length >= 10) {
      assert.equal(top10.length, 10);
    }
  });

  it("supplements sparse chain output to 10 unique strategies", () => {
    const sparse = [
      { name: "Long ATM Call", type: "Long CE", bias: "Bullish", status: "Active" },
      { name: "Bull Call Spread", type: "Bull Call Spread", bias: "Bullish", status: "Active" },
    ];
    const filled = supplementCandidates(sparse, baseContext, "NIFTY", 10);
    assert.equal(filled.length, 10);
    const names = filled.map((s) => s.name);
    assert.equal(new Set(names).size, 10);
  });

  it("generateTechnicalSetups produces up to 10 pre-market strategies", () => {
    const setups = generateTechnicalSetups(baseContext, "NIFTY");
    assert.ok(setups.length >= 5);
    assert.ok(setups.length <= 10);
    setups.forEach((s) => assert.ok(s.name));
  });

  it("assignSequentialRanks renumbers after finalize without gaps", () => {
    const ranked = assignSequentialRanks([
      { name: "A", rank: 3 },
      { name: "B", rank: 7 },
    ]);
    assert.deepEqual(ranked.map((s) => s.rank), [1, 2]);
  });

  it("assigns contiguous ranks 1 through 10 with no skipped even numbers", () => {
    const sparse = [{ name: "A", type: "Long CE", bias: "Bullish", status: "Active" }];
    const filled = supplementCandidates(sparse, baseContext, "NIFTY", 10);
    const ranked = rankTop10(filled, { ...baseContext, chain: mockChain(), vix: 15 });
    assert.equal(ranked.length, 10);
    assert.deepEqual(
      ranked.map((s) => s.rank),
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    );
  });

  it("does not treat theoretical-to-zero put RR as a reason to rank Long PE first", () => {
    assert.equal(shouldOfferBias({ trend: "NEUTRAL", rsi: 52 }, "Neutral"), true);
    assert.equal(shouldOfferBias({ trend: "BULLISH", rsi: 60 }, "Bearish"), false);

    const longPut = {
      type: "Long PE",
      bias: "Bearish",
      status: "Active",
      riskRewardRatio: 400,
      payoff: { maxProfitUnlimited: false, riskRewardRatio: 400 },
    };
    const condor = {
      type: "Iron Condor",
      bias: "Neutral",
      status: "Active",
      riskRewardRatio: 0.8,
      payoff: { maxProfitUnlimited: false, riskRewardRatio: 0.8 },
    };
    const putScore = scoreStrategy(longPut, { trend: "NEUTRAL", rsi: 52 });
    const condorScore = scoreStrategy(condor, { trend: "NEUTRAL", rsi: 52 });
    assert.ok(
      condorScore.confidenceScore > putScore.confidenceScore,
      `condor ${condorScore.confidenceScore} should beat long put ${putScore.confidenceScore}`
    );
  });

  it("does not generate Long OTM Put or protective hedge on a NEUTRAL tape", () => {
    const candidates = generateCandidates(mockChain(), { ...baseContext, trend: "NEUTRAL", rsi: 52 });
    const names = candidates.map((c) => c.name);
    assert.ok(!names.includes("Long OTM Put"));
    assert.ok(!names.includes("Protective Put Hedge"));
    assert.ok(!names.includes("Long ATM Put"));
    assert.ok(names.some((n) => /Straddle|Strangle|Condor|Butterfly/i.test(n)));
  });

  it("weekend technical plans use a rounded last-close map, not placeholders or raw floats", () => {
    const setups = generateTechnicalSetups({
      ...baseContext,
      price: 24612.30078125,
      support: 24447.400390625,
      resistance: 24774.30078125,
      sessionHigh: 24774.30078125,
      sessionLow: 24447.400390625,
      sessionClose: 24612.30078125,
      trend: "NEUTRAL",
    }, "NIFTY");

    assert.ok(setups.length >= 5);
    const blob = JSON.stringify(setups);
    assert.equal(blob.includes("30078125"), false);
    assert.equal(blob.includes("400390625"), false);
    assert.equal(blob.includes("Awaiting verified"), false);
    assert.equal(blob.includes("Check when traded"), false);
    assert.equal(blob.includes("Waiting for verified"), false);

    const straddle = setups.find((s) => /Straddle/i.test(s.name));
    assert.ok(straddle, "expected a range-straddle plan on a NEUTRAL last close");
    assert.ok(straddle.entryZone);
    assert.equal(straddle.entryZone.low, 24447.4);
    assert.equal(straddle.entryZone.high, 24774.3);
    assert.equal(straddle.entryZoneKind, "spot");
    assert.match(straddle.entryTrigger, /24,447\.4/);
    assert.match(straddle.entryTrigger, /24,774\.3/);
    assert.ok(straddle.strikes.every((leg) => leg.action === "BUY"));
    assert.equal(straddle.structuralRiskNote != null || straddle.maxRisk === 326.9, true);

    const annotated = annotateForPlanning(straddle, {
      mode: "week-ahead",
      nextSessionDate: "2026-09-01",
    }, { stale: true });
    assert.deepEqual(annotated.entryZone, { low: 24447.4, high: 24774.3 });
    assert.equal(annotated.mode, "planning");
    assert.match(annotated.entryTrigger, /last close/i);
  });

  it("sessionLevelsFromCandles rounds last-bar OHLC to 2 decimals", () => {
    const levels = sessionLevelsFromCandles([
      { high: 24774.30078125, low: 24447.400390625, close: 24612.30078125, date: "2026-08-28" },
    ]);
    assert.equal(levels.sessionHigh, 24774.3);
    assert.equal(levels.sessionLow, 24447.4);
    assert.equal(levels.sessionClose, 24612.3);
    assert.equal(levels.sessionDate, "2026-08-28");
  });

  it("attaches last-close premiums as reference without wiping the spot zone", () => {
    const chain = mockChain(24500);
    const setups = generateTechnicalSetups({ ...baseContext, chain, trend: "NEUTRAL" }, "NIFTY");
    const withPremium = setups.find((s) => s.premiums?.net != null && s.entryZoneKind === "spot");
    assert.ok(withPremium, "expected a last-close plan that kept its spot zone after premium attach");
    assert.ok(withPremium.entryZone);
    assert.equal(withPremium.entryZoneKind, "spot");
    assert.ok(withPremium.premiumZone);
    assert.ok(withPremium.payoff?.available);
  });
});
