const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const { analyzeChain, computeMaxPain } = require("../lib/nse-options");

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
    // Writer payout is minimized at 2500 (ATM), not a far OTM print
    assert.equal(chain.maxPain, 2500);
  });

  it("computes classic max-pain and ignores other-expiry rows", () => {
    const pain = computeMaxPain([
      { strike: 24000, ce: { openInterest: 100 }, pe: { openInterest: 400 } },
      { strike: 24500, ce: { openInterest: 200 }, pe: { openInterest: 200 } },
      { strike: 25000, ce: { openInterest: 400 }, pe: { openInterest: 100 } },
    ]);
    assert.ok(pain === 24000 || pain === 24500 || pain === 25000);
    assert.notEqual(pain, 22000);

    const mixed = analyzeChain(
      {
        records: {
          underlyingValue: 24500,
          expiryDates: ["18-Aug-2026", "25-Aug-2026"],
          data: [
            {
              strikePrice: 24500,
              expiryDate: "18-Aug-2026",
              CE: { lastPrice: 80, openInterest: 1000, expiryDate: "18-Aug-2026", impliedVolatility: 12 },
              PE: { lastPrice: 70, openInterest: 1000, expiryDate: "18-Aug-2026", impliedVolatility: 13 },
            },
            {
              strikePrice: 22000,
              expiryDate: "25-Aug-2026",
              CE: { lastPrice: 5, openInterest: 90000, expiryDate: "25-Aug-2026", impliedVolatility: 20 },
              PE: { lastPrice: 400, openInterest: 90000, expiryDate: "25-Aug-2026", impliedVolatility: 22 },
            },
          ],
        },
      },
      "NSE test",
      "18-Aug-2026"
    );
    assert.equal(mixed.available, true);
    assert.equal(mixed.strikes.length, 1);
    assert.equal(mixed.strikes[0].strike, 24500);
    assert.equal(mixed.maxPain, 24500);
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