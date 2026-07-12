const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  analyzeStrategyPayoff,
  enrichStrategyWithPayoff,
  payoffAt,
  netPremiumFromLegs,
} = require("../lib/options-payoff");

describe("options payoff primitives", () => {
  it("long call payoff is intrinsic − premium", () => {
    const legs = [{ action: "BUY", type: "CE", strike: 100, premium: 5 }];
    assert.equal(payoffAt(legs, 100), -5);
    assert.equal(payoffAt(legs, 110), 5);
    assert.equal(payoffAt(legs, 90), -5);
  });

  it("net premium debit vs credit", () => {
    assert.equal(
      netPremiumFromLegs([
        { action: "BUY", type: "CE", strike: 100, premium: 10 },
        { action: "SELL", type: "CE", strike: 110, premium: 4 },
      ]),
      6
    );
    assert.equal(
      netPremiumFromLegs([
        { action: "SELL", type: "PE", strike: 100, premium: 8 },
        { action: "BUY", type: "PE", strike: 90, premium: 3 },
      ]),
      -5
    );
  });
});

describe("Long Call", () => {
  it("max loss = premium, max profit unlimited, BE = K + prem", () => {
    const r = analyzeStrategyPayoff({
      strikes: [{ action: "BUY", type: "CE", strike: 24500, premium: 150 }],
      spot: 24500,
    });
    assert.equal(r.available, true);
    assert.equal(r.maxLoss, 150);
    assert.equal(r.maxProfitUnlimited, true);
    assert.equal(r.maxProfit, null);
    assert.equal(r.breakEvens.length, 1);
    assert.ok(Math.abs(r.breakEvens[0] - 24650) < 1);
  });
});

describe("Long Put", () => {
  it("max loss = premium, max profit finite, BE = K − prem", () => {
    const r = analyzeStrategyPayoff({
      strikes: [{ action: "BUY", type: "PE", strike: 24500, premium: 120 }],
      spot: 24500,
    });
    assert.equal(r.maxLoss, 120);
    assert.equal(r.maxProfitUnlimited, false);
    assert.ok(r.maxProfit > 0);
    // Max profit ≈ K − premium at S=0
    assert.ok(Math.abs(r.maxProfit - (24500 - 120)) < 1);
    assert.ok(Math.abs(r.breakEvens[0] - 24380) < 1);
  });
});

describe("Bull Call Spread", () => {
  it("max loss = debit, max profit = width − debit", () => {
    // Buy 100 CE @ 6, Sell 110 CE @ 2 → debit 4, width 10, max profit 6
    const r = analyzeStrategyPayoff({
      strikes: [
        { action: "BUY", type: "CE", strike: 100, premium: 6 },
        { action: "SELL", type: "CE", strike: 110, premium: 2 },
      ],
      spot: 100,
    });
    assert.equal(r.netPremium, 4);
    assert.equal(r.maxLoss, 4);
    assert.equal(r.maxProfit, 6);
    assert.equal(r.maxProfitUnlimited, false);
    assert.equal(r.maxLossUnlimited, false);
    assert.ok(r.breakEvens.length >= 1);
    assert.ok(Math.abs(r.breakEvens[0] - 104) < 0.5);
    assert.equal(r.riskRewardRatio, 1.5);
  });
});

describe("Bear Put Spread", () => {
  it("max loss = debit, max profit = width − debit", () => {
    // Buy 110 PE @ 8, Sell 100 PE @ 3 → debit 5, width 10, max profit 5
    const r = analyzeStrategyPayoff({
      strikes: [
        { action: "BUY", type: "PE", strike: 110, premium: 8 },
        { action: "SELL", type: "PE", strike: 100, premium: 3 },
      ],
      spot: 105,
    });
    assert.equal(r.netPremium, 5);
    assert.equal(r.maxLoss, 5);
    assert.equal(r.maxProfit, 5);
  });
});

describe("Bull Put Credit Spread", () => {
  it("max profit = credit, max loss = width − credit", () => {
    // Sell 100 PE @ 5, Buy 90 PE @ 2 → credit 3, width 10, max loss 7
    const r = analyzeStrategyPayoff({
      strikes: [
        { action: "SELL", type: "PE", strike: 100, premium: 5 },
        { action: "BUY", type: "PE", strike: 90, premium: 2 },
      ],
      spot: 105,
    });
    assert.equal(r.netPremium, -3);
    assert.equal(r.maxProfit, 3);
    assert.equal(r.maxLoss, 7);
    assert.equal(r.isCredit, true);
  });
});

describe("Bear Call Credit Spread", () => {
  it("max profit = credit, max loss = width − credit", () => {
    // Sell 100 CE @ 4, Buy 110 CE @ 1.5 → credit 2.5, width 10, max loss 7.5
    const r = analyzeStrategyPayoff({
      strikes: [
        { action: "SELL", type: "CE", strike: 100, premium: 4 },
        { action: "BUY", type: "CE", strike: 110, premium: 1.5 },
      ],
      spot: 95,
    });
    assert.equal(r.netPremium, -2.5);
    assert.equal(r.maxProfit, 2.5);
    assert.equal(r.maxLoss, 7.5);
  });
});

describe("Iron Condor", () => {
  it("max profit = credit; max loss = wider wing − credit", () => {
    // Classic IC: buy 90P, sell 95P, sell 105C, buy 110C
    const r = analyzeStrategyPayoff({
      strikes: [
        { action: "BUY", type: "PE", strike: 90, premium: 1 },
        { action: "SELL", type: "PE", strike: 95, premium: 3 },
        { action: "SELL", type: "CE", strike: 105, premium: 3 },
        { action: "BUY", type: "CE", strike: 110, premium: 1 },
      ],
      spot: 100,
    });
    // credit = 3+3-1-1 = 4
    assert.equal(r.netPremium, -4);
    assert.equal(r.maxProfit, 4);
    // wing width 5, max loss = 5 - 4 = 1
    assert.equal(r.maxLoss, 1);
    assert.equal(r.breakEvens.length, 2);
  });
});

describe("Iron Butterfly", () => {
  it("max profit = credit at body; defined risk", () => {
    const r = analyzeStrategyPayoff({
      strikes: [
        { action: "BUY", type: "PE", strike: 90, premium: 1 },
        { action: "SELL", type: "PE", strike: 100, premium: 6 },
        { action: "SELL", type: "CE", strike: 100, premium: 6 },
        { action: "BUY", type: "CE", strike: 110, premium: 1 },
      ],
      spot: 100,
    });
    assert.equal(r.netPremium, -10);
    assert.equal(r.maxProfit, 10);
    assert.equal(r.maxLoss, 0); // width 10 - credit 10 = 0 at wings... wait width=10, credit=10, max loss 0
    // Actually at wing: intrinsic on short straddle 10, long wing 0, net PL = 10 - 10 = 0. Max loss 0 when credit = width.
  });
});

describe("Long Straddle", () => {
  it("max loss = total debit; unlimited upside profit", () => {
    const r = analyzeStrategyPayoff({
      strikes: [
        { action: "BUY", type: "CE", strike: 100, premium: 5 },
        { action: "BUY", type: "PE", strike: 100, premium: 5 },
      ],
      spot: 100,
    });
    assert.equal(r.netPremium, 10);
    assert.equal(r.maxLoss, 10);
    assert.equal(r.maxProfitUnlimited, true);
    assert.equal(r.breakEvens.length, 2);
    assert.ok(Math.abs(r.breakEvens[0] - 90) < 1);
    assert.ok(Math.abs(r.breakEvens[1] - 110) < 1);
  });
});

describe("Short Straddle", () => {
  it("max profit = credit; unlimited loss", () => {
    const r = analyzeStrategyPayoff({
      strikes: [
        { action: "SELL", type: "CE", strike: 100, premium: 5 },
        { action: "SELL", type: "PE", strike: 100, premium: 5 },
      ],
      spot: 100,
    });
    assert.equal(r.netPremium, -10);
    assert.equal(r.maxProfit, 10);
    assert.equal(r.maxLossUnlimited, true);
    assert.equal(r.maxLoss, null);
  });
});

describe("Naked Short Put", () => {
  it("has finite max loss (not unlimited) ≈ strike − premium", () => {
    const r = analyzeStrategyPayoff({
      strikes: [{ action: "SELL", type: "PE", strike: 100, premium: 4 }],
      spot: 100,
    });
    assert.equal(r.available, true);
    assert.equal(r.maxLossUnlimited, false);
    // Max loss as S→0: premium − intrinsic = 4 − 100 = −96 → loss magnitude 96
    assert.equal(r.maxLoss, 96);
    assert.equal(r.maxProfit, 4);
  });
});

describe("Naked Short Call", () => {
  it("has unlimited max loss", () => {
    const r = analyzeStrategyPayoff({
      strikes: [{ action: "SELL", type: "CE", strike: 100, premium: 4 }],
      spot: 100,
    });
    assert.equal(r.maxLossUnlimited, true);
    assert.equal(r.maxLoss, null);
    assert.equal(r.maxProfit, 4);
  });
});

describe("enrichStrategyWithPayoff", () => {
  it("overwrites incorrect target-based maxReward", () => {
    const strategy = {
      name: "Long ATM Call",
      type: "Long CE",
      strikes: [{ action: "BUY", type: "CE", strike: 24500, premium: 100 }],
      premiums: { net: 100 },
      maxRisk: 100,
      maxReward: 50, // bogus target-derived value
      targets: { t1: 150, t2: 200 },
    };
    const e = enrichStrategyWithPayoff(strategy, { spot: 24500, lotSize: 25 });
    assert.equal(e.maxRisk, 100);
    assert.equal(e.maxReward, null); // unlimited
    assert.equal(e.payoff.maxProfitUnlimited, true);
    assert.equal(e.positionSizing.breakEven, "24600");
    assert.equal(e.maxLossLot ?? e.payoff.maxLossLot, 2500);
  });

  it("returns unavailable without premiums", () => {
    const e = enrichStrategyWithPayoff({
      strikes: [{ action: "WATCH", type: "CE", strike: 100, premium: null }],
    });
    assert.equal(e.payoff.available, false);
  });
});

describe("never fabricates missing inputs", () => {
  it("empty legs → unavailable", () => {
    const r = analyzeStrategyPayoff({ strikes: [] });
    assert.equal(r.available, false);
    assert.equal(r.maxProfit, null);
    assert.equal(r.maxLoss, null);
  });
});
