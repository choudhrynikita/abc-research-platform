const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { makeStrategy, buildInstitutionalSizing } = require("../lib/equity-fno-engine");
const { estimateStrategyOpenCharges, computeOptionLegCharges } = require("../lib/equity-charges");
const { analyzeStrategyPayoff } = require("../lib/options-payoff");

describe("equity charges — never invent brokerage", () => {
  it("defaults brokerage to 0", () => {
    const c = computeOptionLegCharges({
      premiumPerUnit: 100,
      quantity: 25,
      side: "SELL",
    });
    assert.equal(c.available, true);
    assert.equal(c.brokerage, 0);
    assert.equal(c.brokerageAssumed, true);
    assert.ok(c.stt > 0); // sell-side STT
  });

  it("rejects missing premium", () => {
    const c = computeOptionLegCharges({ premiumPerUnit: null, quantity: 25, side: "BUY" });
    assert.equal(c.available, false);
  });
});

describe("equity strategy max profit/loss", () => {
  const ctx = {
    price: 2500,
    lotSize: 25,
    chain: { putCallRatio: 1.1, impliedVolatility: 18 },
    trend: "BULLISH",
    name: "Test Co",
    nseSymbol: "TEST",
    symbol: "TEST.NS",
  };

  it("long call: max loss = premium×lot, max profit unlimited", () => {
    const s = makeStrategy(
      {
        name: "TEST Long Call",
        type: "Long CE",
        bias: "Bullish",
        strikes: [{ action: "BUY", type: "CE", strike: 2500, premium: 40 }],
        premiums: { net: 40 },
        targets: { t1: 60, t2: 80 }, // management only — must not become max profit
        status: "Active",
      },
      ctx
    );
    assert.equal(s.payoff.available, true);
    assert.equal(s.payoff.maxProfitUnlimited, true);
    assert.equal(s.maxReward, null);
    assert.equal(s.maxRisk, 40);
    assert.equal(s.maxRiskLot, 1000); // 40 * 25
    assert.equal(s.maxRewardLot, null);
    // Must NOT equal bogus target-derived 80-40=40 as "max profit"
    assert.notEqual(s.maxReward, 40);
    assert.ok(s.positionSizing.capitalRequired === 1000);
    assert.equal(s.positionSizing.breakEven, "2540");
  });

  it("bull call spread: max loss = debit×lot, max profit = (width−debit)×lot", () => {
    const s = makeStrategy(
      {
        name: "TEST BCS",
        type: "Bull Call Spread",
        bias: "Bullish",
        strikes: [
          { action: "BUY", type: "CE", strike: 2500, premium: 50 },
          { action: "SELL", type: "CE", strike: 2600, premium: 20 },
        ],
        premiums: { net: 30 },
        targets: { t1: 60, t2: 90 },
        status: "Active",
      },
      ctx
    );
    // width 100, debit 30 → max profit 70, max loss 30
    assert.equal(s.maxRisk, 30);
    assert.equal(s.maxReward, 70);
    assert.equal(s.maxRiskLot, 750);
    assert.equal(s.maxRewardLot, 1750);
    assert.equal(s.riskRewardRatio, roundish(70 / 30));
    assert.ok(s.payoff.breakEvens.length >= 1);
  });

  it("credit put spread: max profit = credit, defined max loss", () => {
    const s = makeStrategy(
      {
        name: "TEST BPS",
        type: "Bull Put Spread",
        bias: "Bullish",
        strikes: [
          { action: "SELL", type: "PE", strike: 2500, premium: 35 },
          { action: "BUY", type: "PE", strike: 2400, premium: 15 },
        ],
        premiums: { net: -20 },
        status: "Active",
      },
      ctx
    );
    assert.equal(s.maxReward, 20);
    assert.equal(s.maxRisk, 80); // width 100 - credit 20
    assert.equal(s.positionSizing.capitalRequired, null); // credit → margin not invented
    assert.ok(s.positionSizing.marginNote);
  });
});

function roundish(n) {
  return Number(n.toFixed(2));
}

describe("buildInstitutionalSizing", () => {
  it("marks unavailable without lot size for per-lot figures", () => {
    const payoff = analyzeStrategyPayoff({
      strikes: [{ action: "BUY", type: "CE", strike: 100, premium: 5 }],
      spot: 100,
      lotSize: null,
    });
    const sizing = buildInstitutionalSizing({
      netPremium: 5,
      lotSize: null,
      payoff,
      strategyType: "Long CE",
      spot: 100,
    });
    assert.equal(sizing.maxProfitLot, null);
    assert.equal(sizing.capitalRequired, null);
    assert.ok(sizing.note);
  });
});

describe("open charges estimate", () => {
  it("sums leg charges without inventing exit costs", () => {
    const ch = estimateStrategyOpenCharges(
      [
        { action: "BUY", type: "CE", strike: 100, premium: 10 },
        { action: "SELL", type: "CE", strike: 110, premium: 4 },
      ],
      50,
      { brokeragePerLeg: 0 }
    );
    assert.equal(ch.available, true);
    assert.ok(ch.total >= 0);
    assert.ok(ch.note.includes("Exit"));
  });
});
