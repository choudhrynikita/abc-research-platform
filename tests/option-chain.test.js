const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const { analyzeChain, computeMaxPain, parseNseExpiry } = require("../lib/nse-options");

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

  it("reads official lot size from CE/PE marketLot (not records.lotSize)", () => {
    const chain = analyzeChain({
      records: {
        underlyingValue: 24500,
        expiryDates: ["18-Aug-2026"],
        data: [
          {
            strikePrice: 24500,
            CE: { lastPrice: 80, openInterest: 10, impliedVolatility: 12, marketLot: 65 },
            PE: { lastPrice: 70, openInterest: 10, impliedVolatility: 13, marketLot: 65 },
          },
        ],
      },
    }, "NSE test");
    assert.equal(chain.lotSize, 65);
  });

  it("does not invent a lot when option-chain-v3 omits marketLot", () => {
    const chain = analyzeChain({
      records: {
        underlyingValue: 24100,
        expiryDates: ["01-Sep-2026"],
        data: [
          {
            strikePrice: 24100,
            CE: { lastPrice: 62.1, openInterest: 10, impliedVolatility: 13.6 },
            PE: { lastPrice: 62.5, openInterest: 10, impliedVolatility: 13.6 },
          },
        ],
      },
    }, "NSE test");
    assert.equal(chain.lotSize, null);
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

  it("uses last positive close/prev-close when after-hours lastPrice is 0", () => {
    const chain = analyzeChain({
      records: {
        underlyingValue: 24500,
        expiryDates: ["01-Sep-2026"],
        data: [
          {
            strikePrice: 24500,
            CE: {
              lastPrice: 0,
              previousClose: 82.5,
              openInterest: 1000,
              impliedVolatility: 14,
            },
            PE: {
              lastPrice: 0,
              closePrice: 77.25,
              openInterest: 900,
              impliedVolatility: 15,
            },
          },
        ],
      },
    }, "NSE after-hours");
    assert.equal(chain.available, true);
    assert.equal(chain.strikes[0].ce.premium, 82.5);
    assert.equal(chain.strikes[0].pe.premium, 77.25);
  });

  it("treats NSE v3 dd-MM-yyyy expiry as the same day as dd-Mon-yyyy", () => {
    assert.equal(
      parseNseExpiry("01-09-2026")?.getTime(),
      parseNseExpiry("01-Sep-2026")?.getTime()
    );
    assert.equal(
      parseNseExpiry("29-09-2026")?.getTime(),
      parseNseExpiry("29-Sep-2026")?.getTime()
    );
    assert.equal(parseNseExpiry("01-09-2026")?.getFullYear(), 2026);
    assert.equal(parseNseExpiry("01-09-2026")?.getMonth(), 8);
    assert.equal(parseNseExpiry("01-09-2026")?.getDate(), 1);
  });

  it("keeps weekend v3 legs when URL expiry is 01-Sep-2026 and CE.expiryDate is 01-09-2026", () => {
    const chain = analyzeChain(
      {
        records: {
          underlyingValue: 24175.65,
          expiryDates: ["01-Sep-2026"],
          data: [
            {
              strikePrice: 24200,
              CE: {
                lastPrice: 118.4,
                expiryDate: "01-09-2026",
                buyPrice1: 117,
                sellPrice1: 120,
                openInterest: 5000,
                impliedVolatility: 12,
              },
              PE: {
                lastPrice: 142.2,
                expiryDate: "01-09-2026",
                openInterest: 4100,
                impliedVolatility: 13,
              },
            },
          ],
        },
      },
      "NSE v3 weekend",
      "01-Sep-2026"
    );
    assert.equal(chain.available, true);
    assert.equal(chain.strikes.length, 1);
    assert.equal(chain.strikes[0].ce.premium, 118.4);
    assert.equal(chain.strikes[0].pe.premium, 142.2);
  });
});
