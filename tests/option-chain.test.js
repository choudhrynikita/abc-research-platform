const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const { analyzeChain } = require("../lib/nse-options");

describe("option chain parsing", () => {
  it("handles empty chain gracefully", () => {
    const result = analyzeChain({ records: { data: [] } });
    assert.equal(result.available, false);
  });

  it("parses PCR, max pain, and OI from verified NSE shape", () => {
    const data = {
      records: {
        underlyingValue: 2500,
        expiryDates: ["07-Jul-2026"],
        data: [
          {
            strikePrice: 2500,
            CE: { lastPrice: 50, openInterest: 1000, changeinOpenInterest: 10, impliedVolatility: 14 },
            PE: { lastPrice: 45, openInterest: 2000, changeinOpenInterest: 20, impliedVolatility: 15 },
          },
          {
            strikePrice: 2550,
            CE: { lastPrice: 30, openInterest: 500, changeinOpenInterest: 5, impliedVolatility: 13 },
            PE: { lastPrice: 70, openInterest: 800, changeinOpenInterest: 8, impliedVolatility: 16 },
          },
        ],
      },
    };
    const chain = analyzeChain(data, "NSE test");
    assert.equal(chain.available, true);
    assert.equal(chain.putCallRatio, 1.87);
    assert.equal(chain.callOi, 1500);
    assert.equal(chain.putOi, 2800);
    assert.equal(chain.impliedVolatility, 14.5);
    assert.equal(chain.source, "NSE test");
    assert.ok(chain.fetchedAt);
  });

  it("rejects zero IV in leg parsing", () => {
    const data = {
      records: {
        underlyingValue: 100,
        data: [
          { strikePrice: 100, CE: { lastPrice: 1, openInterest: 1, impliedVolatility: 0 }, PE: { lastPrice: 1, openInterest: 1, impliedVolatility: 18 } },
        ],
      },
    };
    const chain = analyzeChain(data);
    assert.equal(chain.impliedVolatility, 18);
  });
});