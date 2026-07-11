const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  computeIndicators,
  stochastic,
  classicPivotPoints,
  vwapSeries,
  technicalSignal,
} = require("../lib/indicators");

function makeCandles(n = 80) {
  const candles = [];
  let price = 100;
  for (let i = 0; i < n; i += 1) {
    const open = price;
    const close = price + (i % 5 === 0 ? -1.2 : 0.8);
    const high = Math.max(open, close) + 0.5;
    const low = Math.min(open, close) - 0.5;
    candles.push({
      date: `2025-01-${String((i % 28) + 1).padStart(2, "0")}`,
      open,
      high,
      low,
      close,
      volume: 1000 + i * 10,
    });
    price = close;
  }
  return candles;
}

describe("extended technical indicators", () => {
  it("computes stochastic %K/%D from verified OHLC", () => {
    const candles = makeCandles(40);
    const { k, d } = stochastic(candles, 14, 3);
    const lastK = [...k].reverse().find((v) => v != null);
    const lastD = [...d].reverse().find((v) => v != null);
    assert.ok(lastK != null && lastK >= 0 && lastK <= 100);
    assert.ok(lastD != null && lastD >= 0 && lastD <= 100);
  });

  it("computes classic pivots from prior bar only", () => {
    const candles = [
      { open: 10, high: 12, low: 9, close: 11, volume: 100 },
      { open: 11, high: 13, low: 10, close: 12, volume: 120 },
    ];
    const p = classicPivotPoints(candles);
    // Prior bar H12 L9 C11 → pivot = (12+9+11)/3 ≈ 10.6667 (rounded to 4 dp)
    assert.ok(p.pivot != null);
    assert.ok(Math.abs(p.pivot - Number(((12 + 9 + 11) / 3).toFixed(4))) < 1e-9);
    assert.ok(p.r1 != null && p.s1 != null);
  });

  it("vwap uses volume when present and does not invent it", () => {
    const withVol = makeCandles(10);
    const series = vwapSeries(withVol);
    assert.ok(series.at(-1) != null);

    const noVol = withVol.map((c) => ({ ...c, volume: null }));
    const empty = vwapSeries(noVol);
    // Without volume, cumulative VWAP stays null
    assert.equal(empty.every((v) => v == null), true);
  });

  it("computeIndicators exposes full latest technical suite", () => {
    const ind = computeIndicators(makeCandles(120));
    const l = ind.latest;
    assert.ok(l.rsi != null);
    assert.ok(l.macdLine != null);
    assert.ok(l.macdSignal != null);
    assert.ok(l.stochasticK != null);
    assert.ok(l.pivot != null);
    assert.ok(l.sma20 != null);
    assert.ok(l.bollingerUpper != null);
    assert.ok(["BULLISH", "BEARISH", "NEUTRAL"].includes(technicalSignal(ind)));
    assert.equal(l.supertrend, null);
    assert.equal(l.ichimoku, null);
    assert.ok(ind.methodology);
  });
});
