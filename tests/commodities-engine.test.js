const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { UNIVERSE, SPECS, buildPlans, toMcx } = require("../lib/commodities-engine");

describe("commodities engine", () => {
  it("covers gold, silver, crude, gas, copper and USDINR with Indian lots", () => {
    const ids = UNIVERSE.map((u) => u.id);
    for (const need of ["gold", "silver", "crude", "natgas", "copper", "usdinr"]) {
      assert.ok(ids.includes(need), need);
      assert.ok(SPECS[need], need);
    }
    assert.equal(SPECS.gold.code, "GOLDMINI");
    assert.equal(SPECS.gold.lot, "100 g");
    assert.equal(UNIVERSE.find((u) => u.id === "gold").proxy, "GOLDBEES.NS");
  });

  it("builds a BUY 1 lot GOLDMINI ticket with an ATR stop", () => {
    const row = UNIVERSE.find((u) => u.id === "gold");
    const plans = buildPlans(
      row,
      { atr: 20, support: 3300, resistance: 3500, sma20: 3380, sma50: 3320, rsi: 58, adx: 24 },
      "BULLISH",
      3400,
      { usdinr: 83, proxy: { price: 72.5, name: "Gold BeES" } }
    );
    const futures = plans.find((p) => p.contract === "GOLDMINI");
    assert.ok(futures);
    assert.equal(futures.action, "BUY");
    assert.match(futures.name, /BUY 1 lot GOLDMINI/);
    assert.ok(futures.tradeTicket.steps.some((s) => s.includes("GOLDMINI")));
    assert.ok(futures.tradeTicket.steps.some((s) => s.includes("100 g")));
    assert.equal(typeof futures.stopLoss, "number");
    assert.ok(futures.heat > 0);
    assert.equal(futures.fillSheet.product, "GOLDMINI");
    assert.equal(futures.fillSheet.side, "BUY");
    assert.match(futures.fillSheet.qty, /100 g/);
    assert.match(futures.fillSheet.path, /MCX/);
    const overlay = plans.find((p) => p.contract === "GOLDBEES");
    assert.ok(overlay);
    assert.equal(overlay.action, "BUY");
    assert.match(overlay.tradeLine, /GOLDBEES/);
  });

  it("defaults natural gas to no trade", () => {
    const row = UNIVERSE.find((u) => u.id === "natgas");
    const plans = buildPlans(row, { atr: 0.4, support: 2, resistance: 4 }, "BULLISH", 3.1, { usdinr: 83 });
    assert.equal(plans[0].action, "NO TRADE");
    assert.match(plans[0].tradeLine, /NO TRADE/);
  });

  it("names USDINR as an importer hedge when the rupee is weakening", () => {
    const row = UNIVERSE.find((u) => u.id === "usdinr");
    const plans = buildPlans(row, { atr: 0.2, support: 82, resistance: 84, sma20: 83.2, sma50: 82.5, adx: 22 }, "BULLISH", 83.4, { usdinr: 83.4 });
    assert.equal(plans[0].action, "BUY");
    assert.equal(plans[0].structure, "Importer hedge");
    assert.match(plans[0].tradeTicket.steps[0], /NSE/);
    assert.equal(plans[0].fillSheet.product, "USDINR");
  });

  it("converts COMEX gold into an MCX rupee / 10g estimate", () => {
    const px = toMcx("gold", 3400, 83);
    assert.ok(px > 70000 && px < 120000, String(px));
  });
});
