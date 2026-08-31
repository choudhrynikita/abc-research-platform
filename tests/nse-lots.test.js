const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { parseFoMarketLots, expiryMonthKey, lotFromRow } = require("../lib/nse-lots");
const { enrichStrategyWithPayoff } = require("../lib/options-payoff");

const SAMPLE = `UNDERLYING,SYMBOL,SEP-26,OCT-26,NOV-26,DEC-26
NIFTY 50,NIFTY,65,65,65,65
NIFTY BANK,BANKNIFTY,30,30,30,
RELIANCE INDUSTRIES,RELIANCE,250,250,,
`;

describe("NSE fo_mktlots parsing", () => {
  it("reads expiry-month lots without inventing missing columns", () => {
    const map = parseFoMarketLots(SAMPLE);
    assert.equal(map.NIFTY.lot, 65);
    assert.equal(map.NIFTY.months["SEP-26"], 65);
    assert.equal(map.BANKNIFTY.months["SEP-26"], 30);
    assert.equal(map.RELIANCE.months["SEP-26"], 250);
    assert.equal(map.RELIANCE.months["NOV-26"], undefined);
  });

  it("maps 01-Sep-2026 and 01-09-2026 onto SEP-26", () => {
    assert.equal(expiryMonthKey("01-Sep-2026"), "SEP-26");
    assert.equal(expiryMonthKey("01-09-2026"), "SEP-26");
    assert.equal(expiryMonthKey("29-Oct-2026"), "OCT-26");
  });

  it("uses the matching month, else the front-month lot", () => {
    const map = parseFoMarketLots(SAMPLE);
    assert.equal(lotFromRow(map.NIFTY, "SEP-26"), 65);
    assert.equal(lotFromRow(map.RELIANCE, "NOV-26"), 250);
    assert.equal(lotFromRow(map.BANKNIFTY, "DEC-26"), 30);
  });
});

describe("NIFTY rupee P/L uses official lot", () => {
  it("turns a 62.10 ATM debit into 4,036.50 per 65-lot", () => {
    const strategy = enrichStrategyWithPayoff(
      {
        type: "Long PE",
        strikes: [{ strike: 24100, type: "PE", action: "BUY", premium: 62.1 }],
        premiums: { net: 62.1 },
      },
      { spot: 24080.4, lotSize: 65 }
    );
    assert.equal(strategy.payoff.lotSize, 65);
    assert.equal(strategy.maxRisk, 62.1);
    assert.equal(strategy.payoff.maxLossLot, 4036.5);
    assert.equal(strategy.positionSizing.premiumPerLot, 4036.5);
  });
});
