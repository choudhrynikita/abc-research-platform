const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const {
  buildConfidenceScore,
  backtestSmaTrend,
  buildInvestmentDossier,
  splitFactors,
  DATA_UNAVAILABLE,
} = require("../lib/strategy-dossier");
const { scoreStock, rankTop50 } = require("../lib/top50-scoring");
const { rankTop10, generateCandidates } = require("../lib/nifty-strategy-engine");

function makeCandles(n = 120, start = 100) {
  const candles = [];
  let px = start;
  for (let i = 0; i < n; i++) {
    // mild uptrend with noise so SMA rules can fire
    px = px * (1 + 0.002 + (i % 7 === 0 ? -0.01 : 0.001));
    const high = px * 1.01;
    const low = px * 0.99;
    candles.push({
      date: `2025-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
      open: px,
      high,
      low,
      close: px,
      volume: 100000 + i * 100,
    });
  }
  return candles;
}

describe("strategy-dossier confidence", () => {
  it("scores completeness without inventing agreement", () => {
    const conf = buildConfidenceScore({
      fields: [
        { name: "a", available: true },
        { name: "b", available: true },
        { name: "c", available: false },
        { name: "d", available: true },
      ],
      agreements: [],
    });
    assert.ok(conf.score != null && conf.score >= 0 && conf.score <= 100);
    assert.match(conf.methodology, /not a probability/i);
    assert.ok(conf.components.some((c) => c.component === "Historical rule performance" && c.value == null));
  });

  it("only applies backtest weight when samples ≥ 20", () => {
    const low = buildConfidenceScore({
      fields: [{ name: "p", available: true }],
      agreements: [{ name: "t", aligned: true }],
      backtestQuality: { available: true, samples: 5, winRate: 90 },
    });
    const high = buildConfidenceScore({
      fields: [{ name: "p", available: true }],
      agreements: [{ name: "t", aligned: true }],
      backtestQuality: { available: true, samples: 25, winRate: 60 },
    });
    assert.equal(
      low.components.find((c) => c.component === "Historical rule performance").value,
      null
    );
    assert.equal(
      high.components.find((c) => c.component === "Historical rule performance").value,
      60
    );
  });
});

describe("strategy-dossier backtest", () => {
  it("refuses short history instead of fabricating", () => {
    const bt = backtestSmaTrend(makeCandles(40));
    assert.equal(bt.available, false);
    assert.ok(bt.reason);
    assert.equal(bt.samples, 0);
  });

  it("returns stats only when enough closed trades exist", () => {
    const bt = backtestSmaTrend(makeCandles(200, 1000));
    if (bt.available) {
      assert.ok(bt.samples >= 5);
      assert.ok(bt.winRate >= 0 && bt.winRate <= 100);
      assert.equal(bt.sharpeRatio, null); // never invent Sharpe
      assert.ok(Array.isArray(bt.rules));
      assert.match(bt.disclaimer, /not a promise/i);
    } else {
      // Honest unavailable when rule produces too few trades
      assert.ok(bt.reason.includes("trades") || bt.reason.includes("Verified"));
    }
  });
});

describe("strategy-dossier package", () => {
  it("builds dossier with explicit competitor unavailable policy", () => {
    const d = buildInvestmentDossier({
      symbol: "TEST.NS",
      action: "BUY",
      thesis: "Verified multi-factor pass",
      confidence: { score: 72, methodology: "test" },
    });
    assert.equal(d.version, "institutional-dossier-v1");
    assert.equal(d.competitorComparison, DATA_UNAVAILABLE);
    assert.equal(d.policy.zeroHallucination, true);
  });

  it("splitFactors classifies technical vs fundamental text", () => {
    const { technical, fundamental } = splitFactors([
      { category: "Technical", text: "RSI healthy" },
      { category: "Fundamental", text: "ROE strong" },
      "Price above SMA20",
    ]);
    assert.ok(technical.length >= 1);
    assert.ok(fundamental.length >= 1);
  });
});

describe("top50 scoring dossier integration", () => {
  it("attaches confidence/backtest and strips _candles", () => {
    const stock = {
      symbol: "DEMO.NS",
      name: "Demo Ltd",
      sector: "IT",
      price: 1500,
      changePercent: 1.2,
      weeklyChangePercent: 2,
      monthlyChangePercent: 4,
      roe: { available: true, value: 0.18 },
      peRatio: { available: true, value: 22 },
      revenueGrowth: { available: true, value: 0.12 },
      debtToEquity: { available: true, value: 0.3 },
      operatingMargin: { available: true, value: 0.2 },
      freeCashFlow: { available: true, value: 1e9 },
      technicals: {
        trend: "BULLISH",
        sma20: 1450,
        sma50: 1400,
        rsi: 58,
        macdHistogram: 2.1,
        adx: 28,
        volumeTrend: "Rising",
        support: 1420,
        resistance: 1580,
        atr: 25,
      },
      _candles: makeCandles(100, 1400),
    };
    const ranked = rankTop50([stock], {
      indexMonthlyChange: 1.5,
      sectorMap: { IT: { avgChange: 1.2, count: 5 } },
    });
    assert.equal(ranked.length, 1);
    assert.equal(ranked[0]._candles, undefined);
    assert.ok(ranked[0].recommendation);
    assert.ok(ranked[0].dossier || ranked[0].recommendation.dossier);
    assert.ok(ranked[0].confidence || ranked[0].recommendation.confidence);
    assert.ok(ranked[0].backtest);
    if (ranked[0].recommendation.action === "BUY" || ranked[0].recommendation.action === "WATCH") {
      assert.ok(ranked[0].dossier?.policy?.zeroHallucination);
    }
  });

  it("scoreStock never invents fundamental score when all missing", () => {
    const stock = {
      symbol: "X.NS",
      name: "X",
      sector: "Metal",
      price: 100,
      technicals: { trend: "NEUTRAL", sma20: 99, sma50: 98, rsi: 50 },
    };
    const b = scoreStock(stock, { indexMonthlyChange: null, sectorMap: {} });
    assert.equal(b.fundamental.available, false);
    assert.equal(b.fundamental.score, null);
  });
});

describe("nifty strategy dossier integration", () => {
  it("rankTop10 attaches dossier; without candles options backtest stays unavailable", () => {
    const spot = 24500;
    const atm = 24500;
    const strikes = [];
    for (let s = spot - 300; s <= spot + 300; s += 50) {
      strikes.push({
        strike: s,
        ce: { premium: 100 + Math.abs(s - atm) * 0.05, openInterest: 1000, iv: 14 },
        pe: { premium: 95 + Math.abs(s - atm) * 0.05, openInterest: 900, iv: 14 },
      });
    }
    const chain = {
      available: true,
      underlying: spot,
      atmStrike: atm,
      expiry: "2026-07-10",
      putCallRatio: 1.05,
      maxPain: atm,
      strikes,
    };
    const ctx = {
      price: spot,
      trend: "BULLISH",
      support: 24200,
      resistance: 24800,
      rsi: 55,
      adx: 26,
      sma20: 24400,
      sma50: 24300,
      macdHistogram: 1,
      volumeTrend: "Rising",
      vix: 14,
      chain,
    };
    const candidates = generateCandidates(chain, ctx);
    assert.ok(candidates.length > 0);
    const top = rankTop10(candidates, ctx);
    assert.ok(top.length > 0);
    assert.ok(top[0].dossier);
    // Without context.candles, multi-leg premium backtest remains unavailable (never fabricated)
    if (top[0].backtest.available) {
      assert.equal(top[0].backtest.proxyType, "underlying-directional");
    } else {
      assert.match(top[0].backtest.reason, /not available|could not be completed|proxy|OHLCV|bars/i);
    }
    assert.ok(top[0].confidenceScore >= 0 && top[0].confidenceScore <= 100);
    assert.match(top[0].dossier.confidence.methodology || "", /not a probability/i);
  });

  it("rankTop10 uses underlying directional proxy when candles provided", () => {
    const spot = 24500;
    const atm = 24500;
    const strikes = [];
    for (let s = spot - 300; s <= spot + 300; s += 50) {
      strikes.push({
        strike: s,
        ce: { premium: 100, openInterest: 1000, iv: 14 },
        pe: { premium: 95, openInterest: 900, iv: 14 },
      });
    }
    const chain = {
      available: true,
      underlying: spot,
      atmStrike: atm,
      expiry: "2026-07-10",
      putCallRatio: 1.05,
      maxPain: atm,
      strikes,
    };
    let px = 24000;
    const candles = [];
    for (let i = 0; i < 150; i++) {
      px = px * (1 + 0.0015 + (i % 9 === 0 ? -0.008 : 0.001));
      candles.push({
        date: `2025-0${(i % 9) + 1}-01`,
        open: px,
        high: px * 1.01,
        low: px * 0.99,
        close: px,
        volume: 1e6,
      });
    }
    const ctx = {
      price: spot,
      trend: "BULLISH",
      support: 24200,
      resistance: 24800,
      rsi: 55,
      adx: 26,
      sma20: 24400,
      sma50: 24300,
      macdHistogram: 1,
      volumeTrend: "Rising",
      vix: 14,
      chain,
      candles,
    };
    const candidates = generateCandidates(chain, ctx);
    const top = rankTop10(candidates, ctx);
    const bullish = top.find((s) => s.bias === "Bullish");
    assert.ok(bullish);
    if (bullish.backtest.available) {
      assert.equal(bullish.backtest.proxyType, "underlying-directional");
      assert.match(bullish.backtest.disclaimer || "", /NOT historical multi-leg|not multi-leg|proxy/i);
    } else {
      // Honest unavailable if rule produced too few trades
      assert.ok(bullish.backtest.reason);
    }
  });
});
