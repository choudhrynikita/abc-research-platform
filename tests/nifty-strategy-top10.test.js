const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const { generateCandidates, rankTop10 } = require("../lib/nifty-strategy-engine");
const { supplementCandidates, generateTechnicalSetups } = require("../lib/pre-market-strategy");

function mockChain(spot = 24500) {
  const atm = 24500;
  const step = 50;
  const strikes = [];
  for (let s = spot - 600; s <= spot + 600; s += step) {
    strikes.push({
      strike: s,
      ce: { premium: 120 + Math.abs(s - atm) * 0.1, openInterest: 1000, iv: 14 },
      pe: { premium: 110 + Math.abs(s - atm) * 0.1, openInterest: 900, iv: 14 },
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
    assert.ok(candidates.length >= 6, `expected multiple chain candidates, got ${candidates.length}`);
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
});