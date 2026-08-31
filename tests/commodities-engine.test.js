const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { UNIVERSE, buildPlans } = require("../lib/commodities-engine");

describe("commodities engine", () => {
  it("covers gold, silver, crude, gas, copper and USDINR", () => {
    const ids = UNIVERSE.map((u) => u.id);
    for (const need of ["gold", "silver", "crude", "natgas", "copper", "usdinr"]) {
      assert.ok(ids.includes(need), need);
    }
    assert.equal(UNIVERSE.find((u) => u.id === "gold").proxy, "GOLDBEES.NS");
  });

  it("builds a bullish gold plan with an ATR stop", () => {
    const row = UNIVERSE.find((u) => u.id === "gold");
    const plans = buildPlans(row, { atr: 20, support: 3300, resistance: 3500 }, "BULLISH", 3400);
    assert.ok(plans.some((p) => p.bias === "Bullish"));
    assert.ok(plans.some((p) => p.type === "ETF proxy"));
    const trend = plans.find((p) => p.type === "Trend follow");
    assert.equal(trend.stopLoss, 3370);
  });
});
