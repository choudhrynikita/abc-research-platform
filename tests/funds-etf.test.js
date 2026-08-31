const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  parseAmfiNavText,
  classifyScheme,
  premiumToNav,
  searchFunds,
} = require("../lib/funds-etf");
const { attachPositioning, tradeTicket, wallsFromChain } = require("../lib/strategy-positioning");
const { NAV_HREFS } = require("../lib/nav-config");

const AMFI_FIXTURE = `
Open Ended Schemes (Equity Scheme - Flexi Cap Fund)
Nippon India Mutual Fund
119598;INF204K01XI3;INF204K01XJ1;Parag Parikh Flexi Cap Fund - Direct Plan - Growth;92.1234;29-Aug-2026
Open Ended Schemes (Other Scheme - Index Funds)
UTI Mutual Fund
100349;INF789F01XA1;;UTI Nifty 50 Index Fund - Direct Plan - Growth;165.44;29-Aug-2026
Open Ended Schemes (Other Scheme - Other ETFs)
Nippon India Mutual Fund
106657;INF204KB14I2;;Nippon India ETF Nifty BeES;268.3211;29-Aug-2026
HDFC Mutual Fund
101206;INF179KB1B90;;HDFC Liquid Fund - Direct Plan - Growth;4821.11;29-Aug-2026
`;

describe("Funds & ETFs", () => {
  it("is a primary nav module", () => {
    assert.ok(NAV_HREFS.includes("/funds"));
  });

  it("parses AMFI NAVAll rows and classifies kinds", () => {
    const schemes = parseAmfiNavText(AMFI_FIXTURE);
    assert.ok(schemes.length >= 4);
    const bees = schemes.find((s) => /nifty bees/i.test(s.name));
    assert.equal(bees.kind, "etf");
    assert.equal(bees.nav, 268.3211);
    const flexi = schemes.find((s) => /parag parikh/i.test(s.name));
    assert.equal(flexi.kind, "flexicap");
    assert.equal(classifyScheme("UTI Nifty 50 Index Fund - Growth"), "index");
  });

  it("computes ETF premium to NAV", () => {
    assert.equal(premiumToNav(270, 268.3211), 0.63);
    assert.equal(premiumToNav(null, 100), null);
  });

  it("searches schemes by name", () => {
    const schemes = parseAmfiNavText(AMFI_FIXTURE);
    const hits = searchFunds(schemes, "bees");
    assert.ok(hits.some((h) => /nifty bees/i.test(h.name)));
  });
});

describe("strategy positioning", () => {
  it("builds OI walls and a one-lot ticket", () => {
    const chain = {
      putCallRatio: 1.12,
      maxPain: 24100,
      atmIv: 12.4,
      atmStrike: 24100,
      highestCallOi: 24200,
      highestPutOi: 24000,
      callOi: 1e6,
      putOi: 1.12e6,
      callOiChange: 12000,
      putOiChange: -4000,
      lotSize: 65,
      expiry: "01-Sep-2026",
      strikes: [
        { strike: 24100, ce: { premium: 62.1, openInterest: 80000, impliedVolatility: 12.4 } },
      ],
    };
    const walls = wallsFromChain(chain);
    assert.equal(walls.callWall, 24200);
    assert.equal(walls.quadrant, "Call build-up");
    const plan = attachPositioning({
      name: "Bull Call",
      expiry: "01-Sep-2026",
      lotSize: 65,
      strikes: [{ action: "BUY", type: "CE", strike: 24100, premium: 62.1 }],
    }, chain);
    assert.equal(plan.strikes[0].openInterest, 80000);
    assert.ok(plan.tradeTicket.steps[0].includes("BUY"));
    assert.equal(tradeTicket(plan).lot, 65);
  });
});
