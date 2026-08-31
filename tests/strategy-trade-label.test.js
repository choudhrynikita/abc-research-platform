const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  formatTradeBadge,
  formatTradeLine,
  formatStructureName,
  optionTypes,
} = require("../lib/strategy-trade-label");
const { applyHorizon } = require("../lib/nifty-strategy-engine");

const putSpread = {
  name: "Monthly Bear Put Spread",
  type: "Bear Put Spread",
  status: "Week-Ahead",
  expiry: "29-Sep-2026",
  daysToExpiry: 29,
  strikes: [
    { action: "BUY", type: "PE", strike: 24100, premium: 200.15 },
    { action: "SELL", type: "PE", strike: 23900, premium: 134.95 },
  ],
};

const longPut = {
  name: "15-Day Long OTM Put",
  type: "Long PE",
  status: "Next Session",
  expiry: "15-Sep-2026",
  daysToExpiry: 15,
  strikes: [{ action: "BUY", type: "PE", strike: 23900, premium: 82.5 }],
};

const butterfly = {
  name: "7-Day Iron Butterfly",
  type: "Iron Butterfly",
  expiry: "01-Sep-2026",
  daysToExpiry: 1,
  strikes: [
    { action: "BUY", type: "PE", strike: 23900 },
    { action: "SELL", type: "PE", strike: 24100 },
    { action: "SELL", type: "CE", strike: 24100 },
    { action: "BUY", type: "CE", strike: 24300 },
  ],
};

describe("strategy trade labels", () => {
  it("puts the structure name on the badge, not expiry + CE/PE", () => {
    assert.equal(formatTradeBadge(putSpread), "Bear Put");
    assert.equal(formatTradeBadge(longPut), "Long OTM Put");
    assert.equal(formatTradeBadge(butterfly), "Iron Butterfly");
    assert.equal(formatTradeBadge(putSpread).includes("PE"), false);
    assert.equal(formatTradeBadge(butterfly).includes("CE"), false);
    assert.equal(formatTradeBadge(longPut).includes("01-Sep"), false);
  });

  it("keeps CE/PE and strikes on the trade line", () => {
    assert.equal(
      formatTradeLine(putSpread),
      "Trade PE 24,100 / 23,900 · expiry 29 Sep 2026 · 29d"
    );
    assert.equal(
      formatTradeLine(longPut),
      "Trade PE 23,900 · expiry 15 Sep 2026 · 15d"
    );
    assert.match(formatTradeLine(butterfly), /Trade CE \+ PE/);
  });

  it("names common multi-leg structures from type or title", () => {
    assert.equal(formatStructureName({ type: "Bull Call Spread", name: "7-Day Bull Call Spread" }), "Bull Call");
    assert.equal(formatStructureName({ type: "Iron Condor", name: "Monthly Iron Condor" }), "Iron Condor");
    assert.equal(formatStructureName({ type: "Long Straddle", name: "15-Day Long Straddle" }), "Straddle");
    assert.equal(formatStructureName({ type: "Credit Spread", strikes: [{ type: "PE" }] }), "Bull Put");
    assert.equal(optionTypes(butterfly.strikes), "CE + PE");
  });

  it("stamps horizon expiry onto the trade line, not the badge", () => {
    const monthly = applyHorizon([butterfly], {
      id: "monthly",
      label: "MONTHLY",
      expiry: "29-Sep-2026",
      daysAway: 29,
      expiryType: "Monthly",
    })[0];
    assert.equal(monthly.tradeLabel, "Iron Butterfly");
    assert.match(monthly.tradeLine, /expiry 29 Sep 2026/);
    assert.equal(monthly.tradeLabel.includes("PE"), false);
  });
});
