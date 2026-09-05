const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  UNIVERSE,
  SPECS,
  buildPlans,
  toMcx,
  beesToMcx,
  assembleDesk,
  buildCommoditiesFallback,
} = require("../lib/commodities-engine");

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
    assert.match(futures.name, /limit/);
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
    assert.equal(plans[0].fillSheet.product, "NATURALGAS");
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

  it("estimates 10g gold from Gold BeES without treating BeES as USD/oz", () => {
    const fromBees = beesToMcx("gold", 72.5);
    assert.equal(fromBees, 72500);
    const wronglyAsUsd = toMcx("gold", 72.5, 83);
    assert.ok(wronglyAsUsd < 5000);
  });

  it("still writes a GOLDMINI fill sheet when the dollar tape is missing", () => {
    const row = UNIVERSE.find((u) => u.id === "gold");
    const plans = buildPlans(row, {}, null, null, { usdinr: null });
    assert.equal(plans[0].action, "NO TRADE");
    assert.equal(plans[0].fillSheet.product, "GOLDMINI");
    assert.match(plans[0].name, /GOLDMINI/);
    assert.ok(plans[0].tradeTicket.steps.some((s) => /MCX/.test(s) || /GOLDMINI/.test(s)));
  });

  it("never ships an empty desk — even with no quotes", () => {
    const desk = buildCommoditiesFallback("Yahoo Finance returned 403 for INR=X");
    assert.ok(desk.strategies.length >= 6, String(desk.strategies.length));
    const codes = desk.strategies.map((s) => s.contract);
    for (const need of ["GOLDMINI", "SILVERM", "CRUDEOIL", "NATURALGAS", "COPPER", "USDINR"]) {
      assert.ok(codes.includes(need), need);
    }
    const gas = desk.strategies.find((s) => s.contract === "NATURALGAS");
    assert.equal(gas.action, "NO TRADE");
    const roll = desk.strategies.find((s) => s.id === "crude-roll");
    assert.ok(roll);
    assert.equal(roll.fillSheet.product, "CRUDEOIL");
    assert.equal(desk.contracts.length, 6);
    assert.ok(desk.message);
  });

  it("assembleDesk always includes a crude roll card on live gold", () => {
    const gold = {
      ...UNIVERSE.find((u) => u.id === "gold"),
      price: 3400,
      trend: "BULLISH",
      latest: { atr: 20, support: 3300, resistance: 3500, sma20: 3380, sma50: 3320, adx: 24, rsi: 58 },
      proxyQuote: { price: 72.4, name: "Gold BeES", symbol: "GOLDBEES.NS" },
    };
    const others = UNIVERSE.filter((u) => u.id !== "gold").map((row) => ({
      ...row,
      price: row.id === "usdinr" ? 83.4 : row.id === "silver" ? 32 : null,
      trend: row.id === "natgas" ? "BULLISH" : "NEUTRAL",
      latest: {},
      proxyQuote: row.proxy ? { price: 80, name: row.proxyName, symbol: row.proxy } : null,
    }));
    const desk = assembleDesk([gold, ...others], { usdinr: 83.4 });
    assert.ok(desk.strategies.some((s) => s.contract === "GOLDMINI" && s.action === "BUY"));
    assert.ok(desk.strategies.some((s) => s.id === "crude-roll"));
    assert.ok(desk.executiveSummary.gold > 70000);
    assert.ok(desk.strategies.length >= 8);
  });

  it("treats stacked SMA20 above SMA50 with ADX 22 as a GOLDMINI buy even if composite is Neutral", () => {
    const row = UNIVERSE.find((u) => u.id === "gold");
    const price = 4467.15;
    const atr = Number((price * 0.0185).toFixed(2));
    const plans = buildPlans(
      row,
      { atr, support: 4100, resistance: 5010, sma20: 4467.15, sma50: 4238.98, rsi: 52.3, adx: 22 },
      "NEUTRAL",
      price,
      { usdinr: 88, proxy: { price: 126.23, name: "Gold BeES" } }
    );
    const futures = plans.find((p) => p.contract === "GOLDMINI");
    assert.ok(futures);
    assert.equal(futures.action, "BUY");
    assert.equal(futures.status, "Plan");
    assert.match(futures.name, /BUY 1 lot GOLDMINI/);
    assert.match(futures.fillSheet.formula, /31\.1034768/);
    assert.match(futures.fillSheet.nativeLast, /\$/);
    assert.match(futures.fillSheet.path, /BUY 1 lot/);
    assert.equal(typeof futures.entryZone, "object");
    assert.ok(futures.entryZone.low > 120000, String(futures.entryZone.low));
    assert.ok(futures.entryZone.high < 132000, String(futures.entryZone.high));
    assert.ok(futures.entryZone.high - futures.entryZone.low < 8000, "ATR dip, not 20-bar range");
    assert.match(String(futures.why[0].text), /stacked up/);
    assert.ok(futures.tapeMetrics.some((m) => /COMEX/.test(m.label)));
    const overlay = plans.find((p) => p.contract === "GOLDBEES");
    assert.ok(overlay);
    assert.equal(overlay.action, "BUY");
    assert.equal(overlay.bias, "Bullish");
  });

  it("passes when SMA20 and SMA50 have not separated, and SIPs the BeES overlay", () => {
    const row = UNIVERSE.find((u) => u.id === "gold");
    const plans = buildPlans(
      row,
      { atr: 20, support: 3300, resistance: 3500, sma20: 3400, sma50: 3398, rsi: 50, adx: 22 },
      "NEUTRAL",
      3400,
      { usdinr: 83, proxy: { price: 72.5, name: "Gold BeES" } }
    );
    const futures = plans.find((p) => p.contract === "GOLDMINI");
    assert.equal(futures.action, "NO TRADE");
    assert.match(futures.name, /have not separated/);
    assert.equal(futures.entryZone, "Do not send");
    assert.equal(futures.stopLoss, "Do not send");
    assert.equal(futures.fillSheet.limit, "Do not send");
    assert.match(futures.fillSheet.path, /do not send/);
    assert.equal(futures.heat, null);
    const overlay = plans.find((p) => p.contract === "GOLDBEES");
    assert.equal(overlay.action, "SIP");
    assert.match(overlay.name, /SIP GOLDBEES/);
  });

  it("converts live-like COMEX gold and Gold BeES into the same 10g neighbourhood", () => {
    const fromComex = toMcx("gold", 4467.15, 88);
    const fromBees = beesToMcx("gold", 126.23);
    assert.ok(fromComex > 120000 && fromComex < 135000, String(fromComex));
    assert.equal(fromBees, 126230);
    const gap = Math.abs(fromComex - fromBees) / fromComex;
    assert.ok(gap < 0.03, String(gap));
  });
});
