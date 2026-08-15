const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  applyHonestManagementTargets,
  downsampleCurve,
  prepareDashboardStrategy,
} = require("../lib/strategy-payload");

describe("honest management targets", () => {
  it("caps debit-spread T2 so it cannot exceed 80% of mathematical max", () => {
    const next = applyHonestManagementTargets({
      type: "Bull Call Spread",
      premiums: { net: 9.55 },
      targets: { t1: 19.1, t2: 28.65 },
      payoff: { available: true, maxProfit: 20.45, maxProfitUnlimited: false },
    });
    assert.ok(next.targets.t2 <= 9.55 + 0.8 * 20.45 + 0.01);
    assert.ok(next.targets.t2 < 28.65);
    assert.ok(next.targets.t1 <= 9.55 + 0.5 * 20.45 + 0.01);
  });

  it("does not rewrite Long PE theoretical max as a management target", () => {
    const next = applyHonestManagementTargets({
      type: "Long PE",
      premiums: { net: 54.4 },
      targets: { t1: 81.6, t2: 108.8 },
      payoff: { available: true, maxProfit: 24295.6, maxProfitUnlimited: false },
    });
    assert.equal(next.targets.t1, 81.6);
    assert.equal(next.targets.t2, 108.8);
  });
});

describe("dashboard payload slim", () => {
  it("downsamples payoff curves and drops trade arrays", () => {
    const curve = Array.from({ length: 250 }, (_, i) => ({ underlying: i, pl: i }));
    assert.equal(downsampleCurve(curve, 64).length, 64);

    const slim = prepareDashboardStrategy({
      name: "Test",
      payoff: { available: true, payoffCurve: curve },
      backtest: { available: true, samples: 86, trades: [{}, {}] },
      dossier: { backtest: { available: true, trades: [1, 2, 3] } },
    });
    assert.ok(slim.payoff.payoffCurve.length <= 64);
    assert.equal(slim.backtest.trades, undefined);
    assert.equal(slim.dossier.backtest.trades, undefined);
    assert.equal(slim.backtest.numberOfTrades, 86);
  });
});
