const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const { computeIvRank, computeIvPercentile, sliceLookback, MIN_HISTORY_POINTS } = require("../lib/iv-metrics");
const { validateIv, validateNumericMetric, validateTimestamp } = require("../lib/data-validation");
const { extractAtmIvFromStrikes, analyzeChain } = require("../lib/nse-options");

function buildHistory(ivs, startDate = "2025-01-01") {
  return ivs.map((iv, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    return { date: d.toISOString().slice(0, 10), iv, source: "test" };
  });
}

describe("data-validation", () => {
  it("rejects null, NaN, zero, and out-of-range IV", () => {
    assert.equal(validateIv(null).valid, false);
    assert.equal(validateIv(0).valid, false);
    assert.equal(validateIv(NaN).valid, false);
    assert.equal(validateIv(Infinity).valid, false);
    assert.equal(validateIv(600).valid, false);
    assert.equal(validateIv(25.5).valid, true);
    assert.equal(validateIv(25.5).value, 25.5);
  });

  it("validates timestamps and numeric metrics", () => {
    assert.equal(validateTimestamp("2026-07-05T10:00:00Z").valid, true);
    assert.equal(validateTimestamp("not-a-date").valid, false);
    assert.equal(validateNumericMetric(100, { min: 0, max: 200 }).valid, true);
    assert.equal(validateNumericMetric(-1, { min: 0 }).valid, false);
  });
});

describe("extractAtmIv", () => {
  it("uses ATM strike CE/PE average and ignores zero IV", () => {
    const strikes = [
      { strike: 100, ce: { iv: 0 }, pe: { iv: 20 } },
      { strike: 105, ce: { iv: 18 }, pe: { iv: 22 } },
    ];
    assert.equal(extractAtmIvFromStrikes(strikes, 105), 20);
  });

  it("analyzeChain uses ATM IV not chain-wide average", () => {
    const data = {
      records: {
        underlyingValue: 100,
        expiryDates: ["07-Jul-2026"],
        data: [
          { strikePrice: 100, CE: { lastPrice: 5, openInterest: 100, impliedVolatility: 20 }, PE: { lastPrice: 4, openInterest: 200, impliedVolatility: 22 } },
          { strikePrice: 80, CE: { lastPrice: 1, openInterest: 10, impliedVolatility: 80 }, PE: { lastPrice: 0.5, openInterest: 10, impliedVolatility: 90 } },
        ],
      },
    };
    const chain = analyzeChain(data, "test");
    assert.equal(chain.impliedVolatility, 21);
    assert.equal(chain.atmIv, 21);
  });
});

describe("IV Rank", () => {
  it("computes institutional formula from verified history", () => {
    const history = buildHistory(Array(30).fill(10).map((v, i) => 10 + i * 0.5));
    const rank = computeIvRank(20, history, 252);
    assert.equal(rank.available, true);
    assert.equal(rank.value, 68.97);
  });

  it("returns unavailable with insufficient history", () => {
    const history = buildHistory([12, 14, 16, 18, 20]);
    const rank = computeIvRank(18, history, 252);
    assert.equal(rank.available, false);
    assert.match(rank.display, /Verified data unavailable/);
    assert.ok(rank.reason.includes(String(MIN_HISTORY_POINTS)));
  });

  it("returns unavailable when IV range is zero", () => {
    const history = buildHistory(Array(25).fill(15));
    const rank = computeIvRank(15, history, 252);
    assert.equal(rank.available, false);
    assert.match(rank.reason, /range/i);
  });

  it("returns unavailable for invalid current IV", () => {
    const history = buildHistory(Array(25).fill(15));
    const rank = computeIvRank(null, history, 252);
    assert.equal(rank.available, false);
  });
});

describe("IV Percentile", () => {
  it("counts days below current IV correctly", () => {
    const ivs = [
      10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
      19.5, 19.8, 19.9, 19.95, 22, 23, 24, 25, 26, 27,
    ];
    const history = buildHistory(ivs);
    const pct = computeIvPercentile(20, history, 252);
    assert.equal(pct.available, true);
    assert.equal(pct.daysBelow, 14);
    assert.equal(pct.value, 70);
  });

  it("returns unavailable with insufficient history", () => {
    const history = buildHistory([10, 12, 14]);
    const pct = computeIvPercentile(13, history, 252);
    assert.equal(pct.available, false);
  });
});

describe("sliceLookback", () => {
  it("limits to lookback window by date", () => {
    const history = buildHistory(Array(300).fill(15), "2024-01-01");
    const sliced = sliceLookback(history, 252);
    assert.ok(sliced.length <= 252);
    assert.equal(sliced.length, 252);
  });
});