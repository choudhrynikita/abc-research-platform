const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const { rankTop10 } = require("../lib/nifty-strategy-engine");
const { rankTop10: rankEquity } = require("../lib/equity-fno-engine");
const { computeRatings } = require("../lib/research-insights");
const { buildRecommendation } = require("../lib/ipo-institutional");

function directional(bias, extra = {}) {
  return {
    name: bias === "Bearish" ? "Long ATM Put" : "Long ATM Call",
    type: bias === "Bearish" ? "Long PE" : "Long CE",
    bias,
    status: "Active",
    expiryType: "Weekly",
    why: ["Trend fit"],
    ...extra,
  };
}

describe("structure gate across desks", () => {
  it("waits a bullish Nifty structure pinned under the 20-day high", () => {
    const ranked = rankTop10(
      [directional("Bullish"), { name: "Iron Condor", type: "Iron Condor", bias: "Neutral", status: "Active", why: ["Range"] }],
      { price: 24500, resistance: 24800, support: 23000, trend: "BULLISH", rsi: 55 }
    );
    const bull = ranked.find((s) => s.bias === "Bullish");
    const neutral = ranked.find((s) => s.bias === "Neutral");
    assert.equal(bull.status, "Wait");
    assert.match(bull.entryBlockers[0], /20-day high/);
    assert.equal(neutral.status, "Active");
    assert.equal(ranked[0].bias, "Neutral");
  });

  it("waits a bullish structure after a dark cloud even when room is wide", () => {
    const candles = [
      { open: 100, close: 110, high: 112, low: 98 },
      { open: 1860, close: 1890, high: 1900, low: 1850 },
      { open: 1925, close: 1868, high: 1930, low: 1860 },
    ];
    const ranked = rankTop10([directional("Bullish")], {
      price: 100,
      resistance: 120,
      support: 70,
      trend: "BULLISH",
      candles,
    });
    assert.equal(ranked[0].status, "Wait");
    assert.match(ranked[0].entryBlockers[0], /Dark Cloud/);
  });

  it("waits a bearish structure pinned on the 20-day low", () => {
    const ranked = rankTop10([directional("Bearish")], {
      price: 100,
      support: 99,
      resistance: 130,
      trend: "BEARISH",
    });
    assert.equal(ranked[0].status, "Wait");
    assert.match(ranked[0].entryBlockers[0], /20-day low/);
  });

  it("keeps a bullish structure active when the high is more than 8% away and no reversal printed", () => {
    const ranked = rankTop10([directional("Bullish", { expiryType: "Monthly", horizon: "monthly" })], {
      price: 100,
      resistance: 112,
      support: 80,
      trend: "BULLISH",
    });
    assert.equal(ranked[0].status, "Active");
    assert.deepEqual(ranked[0].entryBlockers, []);
  });

  it("does not treat a close already through the high as a stall", () => {
    const ranked = rankTop10([directional("Bullish")], {
      price: 100,
      resistance: 98,
      support: 80,
      trend: "BULLISH",
    });
    assert.equal(ranked[0].status, "Active");
  });

  it("waits an equity monthly long when the stock is 1% under its high", () => {
    const ranked = rankEquity([
      {
        ...directional("Bullish", { expiryType: "Monthly" }),
        _ctx: { price: 1949.8, resistance: 1970, support: 1700, trend: "BULLISH", candles: [] },
      },
    ], { marketTrend: "BULLISH" });
    assert.equal(ranked[0].status, "Wait");
    assert.match(ranked[0].entryBlockers[0], /20-day high/);
  });

  it("does not call an SME with no QIB split a listing-gains buy", () => {
    const rec = buildRecommendation(
      { series: "SME", issueSize: "₹10 Cr" },
      { overall: { available: true, value: 12, display: "12.00x" }, qib: { available: false } },
      null
    );
    assert.equal(rec.recommendation, "Neutral / Watch");
    assert.match(rec.thesis[0], /QIB/);
  });

  it("does not call a book with QIB below 1x a listing-gains buy", () => {
    const rec = buildRecommendation(
      { series: "EQ" },
      {
        overall: { available: true, value: 8, display: "8.00x" },
        qib: { available: true, value: 0.4, display: "0.40x" },
      },
      null
    );
    assert.equal(rec.recommendation, "Neutral / Watch");
    assert.match(rec.thesis[0], /below 1x/);
  });

  it("still allows a listing-gains buy when QIB is confirmed above 1x", () => {
    const rec = buildRecommendation(
      { series: "EQ" },
      {
        overall: { available: true, value: 12, display: "12.00x" },
        qib: { available: true, value: 5.2, display: "5.20x" },
      },
      null
    );
    assert.equal(rec.recommendation, "Buy for Listing Gains");
  });

  it("does not buy a share scored above 70 when it is 1% under the 20-day high", () => {
    const ratings = computeRatings({
      price: 100,
      technicalAnalysis: { trend: "BULLISH", rsi: 55, macdHistogram: 1, resistance: 101, support: 80 },
      fundamentalAnalysis: { roe: 0.2, revenueGrowth: 0.2, debtToEquity: 0.2 },
      sectorComparison: { available: true, sectorAvgChange1m: 2 },
      aiConclusion: { confidenceScore: 80 },
    });
    assert.ok(ratings.overallRating >= 70);
    assert.equal(ratings.recommendation, "Watch");
    assert.match(ratings.buyBlockers[0], /20-day high/);
  });

  it("still buys a share with room above the 20-day high and no reversal", () => {
    const ratings = computeRatings({
      price: 100,
      technicalAnalysis: { trend: "BULLISH", rsi: 55, macdHistogram: 1, resistance: 120, support: 80 },
      fundamentalAnalysis: { roe: 0.2, revenueGrowth: 0.2, debtToEquity: 0.2 },
      sectorComparison: { available: true, sectorAvgChange1m: 2 },
      aiConclusion: { confidenceScore: 80 },
    });
    assert.equal(ratings.recommendation, "Buy");
    assert.deepEqual(ratings.buyBlockers, []);
  });
});
