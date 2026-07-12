const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const { parseShpXbrl } = require("../lib/shareholding");
const { backtestSyntheticMultiLeg, bsPremium } = require("../lib/options-synthetic-backtest");
const { mergeShareholding } = require("../lib/fundamentals");

describe("parseShpXbrl", () => {
  it("extracts category totals from SHP-like XML", () => {
    const xml = `
      <in-bse-shp:ShareholdingAsAPercentageOfTotalNumberOfShares contextRef="ShareholdingOfPromoterAndPromoterGroup_ContextI">0.5</in-bse-shp:ShareholdingAsAPercentageOfTotalNumberOfShares>
      <in-bse-shp:ShareholdingAsAPercentageOfTotalNumberOfShares contextRef="InstitutionsForeign_ContextI">0.18</in-bse-shp:ShareholdingAsAPercentageOfTotalNumberOfShares>
      <in-bse-shp:ShareholdingAsAPercentageOfTotalNumberOfShares contextRef="InstitutionsDomestic_ContextI">0.22</in-bse-shp:ShareholdingAsAPercentageOfTotalNumberOfShares>
      <in-bse-shp:ShareholdingAsAPercentageOfTotalNumberOfShares contextRef="PublicShareholding_ContextI">0.5</in-bse-shp:ShareholdingAsAPercentageOfTotalNumberOfShares>
    `;
    const cats = parseShpXbrl(xml);
    assert.equal(cats.promoter, 0.5);
    assert.equal(cats.fiiForeign, 0.18);
    assert.equal(cats.diiDomestic, 0.22);
    assert.equal(cats.public, 0.5);
  });
});

describe("Black-Scholes synthetic premium", () => {
  it("call premium positive ITM/ATM with positive vol", () => {
    const prem = bsPremium("CE", 100, 100, 0.2, 30 / 252);
    assert.ok(prem != null && prem > 0);
  });

  it("put premium positive", () => {
    const prem = bsPremium("PE", 100, 100, 0.2, 30 / 252);
    assert.ok(prem != null && prem > 0);
  });
});

describe("synthetic multi-leg backtest", () => {
  it("refuses short history without fabricating", () => {
    const bt = backtestSyntheticMultiLeg(
      [{ close: 100, high: 101, low: 99, date: "2025-01-01" }],
      { strikes: [{ action: "BUY", type: "CE", strike: 100, premium: 5 }] }
    );
    assert.equal(bt.available, false);
    assert.match(bt.disclaimer, /NOT a historical multi-leg/i);
  });

  it("runs simulation on long history with clear synthetic label", () => {
    let px = 1000;
    const candles = [];
    for (let i = 0; i < 150; i++) {
      px *= 1 + 0.001 + (i % 11 === 0 ? -0.01 : 0.002);
      candles.push({
        date: `2025-01-${String((i % 28) + 1).padStart(2, "0")}`,
        open: px,
        high: px * 1.01,
        low: px * 0.99,
        close: px,
        volume: 1e6,
      });
    }
    const bt = backtestSyntheticMultiLeg(candles, {
      strikes: [
        { action: "BUY", type: "CE", strike: 1000, premium: 40 },
        { action: "SELL", type: "CE", strike: 1050, premium: 20 },
      ],
      expiryType: "Weekly",
    });
    if (bt.available) {
      assert.equal(bt.simulationType, "synthetic-bs-hv");
      assert.match(bt.disclaimer, /SYNTHETIC/i);
      assert.ok(bt.samples >= 5);
      assert.equal(bt.sharpeRatio, null);
    } else {
      assert.ok(bt.reason);
    }
  });
});

describe("mergeShareholding", () => {
  it("prefers NSE SHP over Yahoo placeholders", () => {
    const merged = mergeShareholding(
      {
        promoter: { available: false },
        institutional: { available: true, value: 0.3, display: "Yahoo" },
      },
      {
        available: true,
        asOf: "31-MAR-2026",
        promoter: { available: true, value: 0.5, source: "NSE" },
        fii: { available: true, value: 0.18, source: "NSE" },
        dii: { available: true, value: 0.2, source: "NSE" },
        public: { available: true, value: 0.5, source: "NSE" },
        mutualFunds: { available: false },
        institutional: { available: true, value: 0.38, source: "NSE" },
      }
    );
    assert.equal(merged.promoter.source, "NSE");
    assert.equal(merged.fii.value, 0.18);
    assert.ok(merged.message.includes("NSE"));
  });
});
