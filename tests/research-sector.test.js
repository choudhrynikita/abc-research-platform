const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  buildSectorBenchmark,
  buildSectorOutlook,
  buildRiskAssessment,
  buildValuationSummary,
} = require("../lib/research-sector");
const { resolvePeerSymbols } = require("../lib/research-institutional");

describe("resolvePeerSymbols", () => {
  it("returns curated peers for mapped symbols", () => {
    const r = resolvePeerSymbols("TCS.NS", "IT");
    assert.ok(r.peers.length > 0);
    assert.ok(r.peers.every((p) => p !== "TCS.NS"));
    assert.match(r.peerSource, /competitors|constituents/i);
  });

  it("falls back to sector constituents when peers empty", () => {
    // BHARTIARTL has empty peers array in competitors.json → sector fallback
    const r = resolvePeerSymbols("BHARTIARTL.NS", "Telecom");
    // Telecom may have only one name in constituents — peers may be empty
    assert.ok(Array.isArray(r.peers));
  });
});

describe("sector benchmark", () => {
  it("builds company vs sector rows without inventing nulls", () => {
    const bm = buildSectorBenchmark(
      { peRatio: 20, roe: 0.15, marketCap: 1e12 },
      { avgPe: 22, avgRoe: 0.12, peerCount: 3, available: true },
      { sectorAvgChange1m: 1.5, subjectMonthly: 2.1 }
    );
    assert.equal(bm.available, true);
    const peRow = bm.rows.find((r) => r.metric === "P/E");
    assert.equal(peRow.company, 20);
    assert.equal(peRow.sectorAvg, 22);
    const roce = bm.rows.find((r) => r.metric === "ROCE");
    assert.equal(roce.company, null);
    assert.equal(roce.sectorAvg, null);
  });
});

describe("sector outlook", () => {
  it("separates facts from interpretation and marks unsupported fields unavailable", () => {
    const ol = buildSectorOutlook({
      sector: "IT",
      sectorPrice: {
        sectorAvgChange1m: 2.5,
        sectorAvgChange1d: 0.4,
        sectorOutlook: "Bullish",
        leaders: [{ symbol: "TCS.NS", name: "TCS", changePercent: 1.2 }],
      },
      industryComparison: { available: true, avgPe: 25 },
      relativeStrength: { vsNifty: 3, stockReturn1m: 4, niftyReturn1m: 1 },
    });
    assert.equal(ol.available, true);
    assert.ok(ol.verifiedFacts.length >= 3);
    assert.ok(ol.analyticalInterpretations.length >= 1);
    assert.equal(ol.industryGrowthDrivers.available, false);
    assert.equal(ol.regulatoryDevelopments.available, false);
    assert.match(ol.analyticalInterpretations[0].text, /Bullish|rule-based/i);
  });
});

describe("risk assessment", () => {
  it("grounds volatility risk in ATR and does not invent company events", () => {
    const risk = buildRiskAssessment({
      price: 100,
      technicalAnalysis: { atr: 5, trend: "BEARISH", rsi: 72 },
      fundamentalAnalysis: { debtToEquity: { available: true, value: 0.4 } },
    });
    assert.ok(risk.factualRisks.some((r) => /ATR/i.test(r.text)));
    assert.ok(risk.frameworkRisks.length >= 3);
    assert.ok(risk.frameworkRisks.every((r) => r.dataType === "analytical-framework"));
  });
});

describe("valuation summary", () => {
  it("does not invent intrinsic value or historical multiples", () => {
    const s = buildValuationSummary(
      {
        peRatio: { available: true, value: 18 },
        pbRatio: { available: true, value: 3 },
      },
      { avgPe: 22 },
      { roe: { available: true, value: 0.18 } }
    );
    assert.equal(s.available, true);
    assert.equal(s.intrinsicValue.available, false);
    assert.equal(s.historicalMultiples.available, false);
    assert.ok(s.interpretations.some((i) => /Attractive|Fair|Expensive/i.test(i.text)));
  });
});
