const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  formatTradeBadge,
  formatTradeLine,
  optionTypes,
} = require("../lib/strategy-trade-label");
const { applyHorizon } = require("../lib/nifty-strategy-engine");

const putSpread = {
  name: "Bear Put Spread",
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
  name: "Long OTM Put",
  type: "Long PE",
  status: "Next Session",
  expiry: "15-Sep-2026",
  daysToExpiry: 15,
  strikes: [{ action: "BUY", type: "PE", strike: 23900, premium: 82.5 }],
};

describe("strategy trade labels", () => {
  it("states expiry and PE/CE instead of Week-Ahead or Next Session", () => {
    assert.equal(formatTradeBadge(putSpread), "29-Sep-2026 PE");
    assert.equal(formatTradeBadge(longPut), "15-Sep-2026 PE");
    assert.equal(formatTradeBadge(putSpread).includes("Week-Ahead"), false);
    assert.equal(formatTradeBadge(longPut).includes("Next Session"), false);
    assert.equal(optionTypes(putSpread.strikes), "PE");
  });

  it("names the strikes to trade on the instruction line", () => {
    assert.equal(
      formatTradeLine(putSpread),
      "Trade PE 24,100 / 23,900 · expiry 29-Sep-2026 · 29d"
    );
    assert.equal(
      formatTradeLine(longPut),
      "Trade PE 23,900 · expiry 15-Sep-2026 · 15d"
    );
  });

  it("labels mixed CE/PE structures and stamps horizon expiry", () => {
    const iron = {
      name: "Iron Condor",
      type: "Iron Condor",
      strikes: [
        { action: "SELL", type: "PE", strike: 24000 },
        { action: "SELL", type: "CE", strike: 25000 },
      ],
    };
    assert.equal(formatTradeBadge(iron), "CE + PE");
    const monthly = applyHorizon([iron], {
      id: "monthly",
      label: "MONTHLY",
      expiry: "29-Sep-2026",
      daysAway: 29,
      expiryType: "Monthly",
    })[0];
    assert.equal(monthly.tradeLabel, "29-Sep-2026 CE + PE");
    assert.match(monthly.tradeLine, /expiry 29-Sep-2026/);
    assert.equal(monthly.modeLabel.includes("Week-ahead"), false);
  });
});
