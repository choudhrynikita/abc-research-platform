const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const { pickHorizonExpiries, pickMonthlyExpiry } = require("../lib/nse-options");
const { generateCandidates, applyHorizon, rankTop10 } = require("../lib/nifty-strategy-engine");

function mockChain(spot = 24500, expiry = "01-Sep-2026") {
  const atm = 24500;
  const strikes = [];
  for (let s = spot - 600; s <= spot + 600; s += 50) {
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
    expiry,
    putCallRatio: 1.05,
    maxPain: atm,
    strikes,
  };
}

describe("NIFTY 7-day / 15-day / monthly horizons", () => {
  const expiries = [
    "01-Sep-2026",
    "08-Sep-2026",
    "15-Sep-2026",
    "22-Sep-2026",
    "29-Sep-2026",
    "27-Oct-2026",
  ];
  const sunday = new Date(2026, 7, 30);

  it("picks nearest weekly, ~15-day weekly, and monthly from the NSE list", () => {
    const pack = pickHorizonExpiries(expiries, sunday);
    assert.equal(pack.sevenDay.expiry, "01-Sep-2026");
    assert.equal(pack.sevenDay.id, "7-day");
    assert.equal(pack.fifteenDay.expiry, "15-Sep-2026");
    assert.equal(pack.fifteenDay.id, "15-day");
    assert.equal(pack.monthly.expiry, "29-Sep-2026");
    assert.equal(pack.monthly.id, "monthly");
    assert.equal(pack.monthly.expiryType, "Monthly");
  });

  it("does not reuse the 7-day or monthly expiry for the 15-day slot", () => {
    const pack = pickHorizonExpiries(expiries, sunday);
    assert.notEqual(pack.fifteenDay.expiry, pack.sevenDay.expiry);
    assert.notEqual(pack.fifteenDay.expiry, pack.monthly.expiry);
  });

  it("keeps September monthly as last Tuesday when asked from late August", () => {
    assert.equal(pickMonthlyExpiry(expiries, sunday), "29-Sep-2026");
  });

  it("stamps 7-day, 15-day and monthly labels onto the same structure", () => {
    const chain = mockChain();
    const context = {
      price: 24500,
      trend: "NEUTRAL",
      support: 24200,
      resistance: 24800,
      rsi: 52,
      vix: 12,
    };
    const raw = generateCandidates(chain, context, { includeMonthly: false });
    assert.ok(raw.length >= 3);
    const seven = applyHorizon(raw, { id: "7-day", label: "7-day", expiry: "01-Sep-2026", expiryType: "Weekly", daysAway: 2, holdingPeriod: "Until 7-day expiry" });
    const fifteen = applyHorizon(raw, { id: "15-day", label: "15-day", expiry: "15-Sep-2026", expiryType: "Weekly", daysAway: 16, holdingPeriod: "Until 15-day expiry" });
    const monthly = applyHorizon(raw, { id: "monthly", label: "Monthly", expiry: "29-Sep-2026", expiryType: "Monthly", daysAway: 30, holdingPeriod: "Until monthly expiry" });
    assert.equal(seven[0].horizon, "7-day");
    assert.match(seven[0].name, /^7-Day /);
    assert.equal(fifteen[0].horizon, "15-day");
    assert.match(fifteen[0].name, /^15-Day /);
    assert.equal(monthly[0].expiryType, "Monthly");
    assert.match(monthly[0].name, /^Monthly /);
    assert.equal(seven[0].expiry, "01-Sep-2026");
    assert.equal(fifteen[0].expiry, "15-Sep-2026");
    assert.equal(monthly[0].expiry, "29-Sep-2026");
  });

  it("ranks each horizon independently without dropping the others", () => {
    const chain = mockChain();
    const context = { price: 24500, trend: "NEUTRAL", support: 24200, resistance: 24800, rsi: 52, vix: 12 };
    const raw = generateCandidates(chain, context, { includeMonthly: false });
    const seven = rankTop10(applyHorizon(raw, { id: "7-day", label: "7-day", expiry: "01-Sep-2026" }), context, 5);
    const fifteen = rankTop10(applyHorizon(raw, { id: "15-day", label: "15-day", expiry: "15-Sep-2026" }), context, 5);
    assert.ok(seven.length >= 3 && seven.length <= 5);
    assert.ok(fifteen.length >= 3 && fifteen.length <= 5);
    assert.equal(seven[0].rank, 1);
    assert.equal(fifteen[0].rank, 1);
    assert.equal(seven[0].horizon, "7-day");
    assert.equal(fifteen[0].horizon, "15-day");
  });
});
