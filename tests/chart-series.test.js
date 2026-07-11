const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  sanitizeCandles,
  validateOhlcCandle,
  normalizeChartRange,
  MIN_CANDLES,
} = require("../lib/chart-series");
const { buildCandlestickChartData, parseChartApiPayload } = require("../lib/chart-builders");

describe("chart range normalization", () => {
  it("accepts valid ranges and defaults invalid", () => {
    assert.equal(normalizeChartRange("3mo"), "3mo");
    assert.equal(normalizeChartRange("BAD"), "1y");
    assert.equal(normalizeChartRange(null), "1y");
    assert.equal(normalizeChartRange("1d"), "1d");
    assert.equal(normalizeChartRange("max"), "max");
  });
});

describe("OHLCV validation", () => {
  it("rejects incomplete or inconsistent candles", () => {
    assert.equal(validateOhlcCandle({ date: "2026-01-01", open: 10, high: 9, low: 8, close: 9 }).valid, false);
    assert.equal(validateOhlcCandle({ date: "2026-01-01", open: null, high: 11, low: 9, close: 10 }).valid, false);
    assert.equal(validateOhlcCandle({ date: "bad", open: 10, high: 11, low: 9, close: 10 }).valid, false);
  });

  it("accepts verified complete OHLC rows", () => {
    const r = validateOhlcCandle({ date: "2026-01-02", open: 100, high: 105, low: 98, close: 103, volume: 1000 });
    assert.equal(r.valid, true);
    assert.equal(r.candle.close, 103);
  });
});

describe("sanitizeCandles", () => {
  it("sorts, dedupes, and rejects insufficient history", () => {
    const rows = [
      { date: "2026-01-03", open: 10, high: 11, low: 9, close: 10.5 },
      { date: "2026-01-01", open: 9, high: 10, low: 8, close: 9.5 },
      { date: "2026-01-01", open: 9, high: 10, low: 8, close: 9.5 },
      { date: "2026-01-02", open: 9.5, high: 10.5, low: 9, close: 10 },
    ];
    const result = sanitizeCandles(rows);
    assert.equal(result.available, true);
    assert.equal(result.candles.length, 3);
    assert.equal(result.candles[0].date, "2026-01-01");
    assert.equal(result.candles[2].date, "2026-01-03");
  });

  it("returns unavailable when fewer than minimum candles", () => {
    const result = sanitizeCandles([
      { date: "2026-01-01", open: 1, high: 2, low: 0.5, close: 1.5 },
    ]);
    assert.equal(result.available, false);
    assert.ok(result.reason);
    assert.equal(MIN_CANDLES, 2);
  });
});

describe("chart builders", () => {
  it("builds candlestick data with x-coordinates for financial chart controller", () => {
    const candles = [
      { date: "2026-01-01", open: 100, high: 105, low: 99, close: 104 },
      { date: "2026-01-02", open: 104, high: 106, low: 103, close: 105 },
    ];
    const chart = buildCandlestickChartData(candles, { label: "TEST" });
    assert.equal(chart.datasets[0].type, "candlestick");
    // Time-scale x is UTC timestamp (never fabricate string category labels)
    assert.equal(typeof chart.datasets[0].data[0].x, "number");
    assert.ok(Number.isFinite(chart.datasets[0].data[0].x));
    assert.equal(chart.datasets[0].data[0].o, 100);
    assert.equal(chart.datasets[0].data[1].c, 105);
    assert.equal(chart.labels, undefined);
  });

  it("aligns indicator overlays as {x,y} timestamp points without interpolation", () => {
    const { alignSeriesToLabels, dateToTimestamp } = require("../lib/chart-builders");
    const labels = ["2026-01-01", "2026-01-02", "2026-01-03"];
    const series = [null, 50, 55];
    const points = alignSeriesToLabels(labels, series);
    assert.equal(points.length, 2);
    assert.equal(points[0].x, dateToTimestamp("2026-01-02"));
    assert.equal(points[0].y, 50);
    assert.equal(points[1].x, dateToTimestamp("2026-01-03"));
    assert.equal(points[1].y, 55);
  });

  it("parses API success and error payloads", () => {
    // Need ≥2 verified candles for chart payload
    const ok = parseChartApiPayload({
      candles: [
        { date: "2026-01-01", open: 1, high: 2, low: 0.5, close: 1.5 },
        { date: "2026-01-02", open: 1.5, high: 2.1, low: 1.4, close: 2 },
      ],
    });
    assert.equal(ok.ok, true);
    assert.equal(ok.candles.length, 2);

    const single = parseChartApiPayload({
      candles: [{ date: "2026-01-01", open: 1, high: 2, low: 0.5, close: 1.5 }],
    });
    assert.equal(single.ok, false);

    const fail = parseChartApiPayload({
      error: "Chart data unavailable",
      message: "Verified market data unavailable.",
    });
    assert.equal(fail.ok, false);
    assert.match(fail.error, /unavailable/i);
  });

  it("omits missing volume rather than fabricating zero", () => {
    const { buildVolumeChartData, buildBarChartData } = require("../lib/chart-builders");
    const candles = [
      { date: "2026-01-01", open: 100, high: 105, low: 99, close: 104, volume: 1000 },
      { date: "2026-01-02", open: 104, high: 106, low: 103, close: 105, volume: null },
    ];
    const vol = buildVolumeChartData(candles);
    assert.ok(vol);
    assert.equal(vol.datasets[0].data.length, 1);

    const bar = buildBarChartData(
      ["2026-01-01", "2026-01-02"],
      [1000, null]
    );
    assert.ok(bar);
    assert.equal(bar.datasets[0].data.length, 1);
  });
});