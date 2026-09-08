const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  parseAmfiNavText,
  classifyScheme,
  premiumToNav,
  searchFunds,
  matchAmfi,
  pickFeatured,
  pickNavDate,
  ETF_UNIVERSE,
} = require("../lib/funds-etf");
const { attachPositioning, tradeTicket, wallsFromChain } = require("../lib/strategy-positioning");
const { NAV_HREFS } = require("../lib/nav-config");
const { buildFundDeskPlans, premiumLabel, unitsFor } = require("../lib/funds-strategies");

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
    assert.ok(NAV_HREFS.includes("/commodities"));
    const fundsIdx = NAV_HREFS.indexOf("/funds");
    const cmdIdx = NAV_HREFS.indexOf("/commodities");
    assert.equal(cmdIdx, fundsIdx + 1);
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

  it("reads AMFI's 8-column Plan/Option file and does not treat the option as the NAV date", () => {
    const text = `
Scheme Code;ISIN Div Payout/ ISIN Growth;ISIN Div Reinvestment;Scheme Name;Plan;Option;Net Asset Value;Date
Open Ended Schemes (Other Scheme - Other ETFs)
Nippon India Mutual Fund
140084;INF204KB14I2;-;Nippon India ETF Nifty 50 BeES;Direct Plan;;272.5784;04-Sep-2026
140088;INF204KB17I5;-;Nippon India ETF Gold BeES;Direct Plan;;126.9779;04-Sep-2026
148408;INF204KB15V2;-;Nippon India ETF Nifty IT;Direct Plan;;34.1230;04-Sep-2026
146271;INF204KB1V68;-;Nippon India ETF Nifty Midcap 150;Direct Plan;;239.7020;04-Sep-2026
140102;INF732E01128;-;Nippon India ETF Nifty Infrastructure BeES;Direct Plan;;952.0838;04-Sep-2026
113076;INF109KC1NT3;-;ICICI Prudential Gold ETF;;;131.5245;04-Sep-2026
120685;INF109K01U92;-;ICICI Prudential Gold ETF FOF;Direct Plan;Growth;49.1878;04-Sep-2026
Open Ended Schemes (Equity Scheme - Flexi Cap Fund)
PPFAS Mutual Fund
122639;INF179K01YV8;-;Parag Parikh Flexi Cap Fund;Direct Plan;Growth;90.5289;04-Sep-2026
122640;INF179K01YW6;-;Parag Parikh Flexi Cap Fund;Direct Plan;Annual IDCW Option;80.11;04-Sep-2026
Open Ended Schemes (Debt Scheme - Liquid Fund)
HDFC Mutual Fund
101206;INF179KB1B90;-;HDFC Liquid Fund;Direct Plan;Growth Option;5574.6258;06-Sep-2026
`;
    const schemes = parseAmfiNavText(text);
    assert.equal(pickNavDate(schemes), "04-Sep-2026");
    assert.ok(!schemes.some((s) => /annual idcw option/i.test(s.date || "")));
    const bees = matchAmfi(schemes, ETF_UNIVERSE.find((r) => r.nse === "NIFTYBEES"));
    assert.ok(bees);
    assert.equal(bees.nav, 272.5784);
    assert.equal(bees.date, "04-Sep-2026");
    const it = matchAmfi(schemes, ETF_UNIVERSE.find((r) => r.nse === "ITBEES"));
    assert.equal(it.nav, 34.123);
    const mid = matchAmfi(schemes, ETF_UNIVERSE.find((r) => r.nse === "MID150BEES"));
    assert.equal(mid.nav, 239.702);
    const infra = matchAmfi(schemes, ETF_UNIVERSE.find((r) => r.nse === "INFRABEES"));
    assert.equal(infra.nav, 952.0838);
    const goldEtf = matchAmfi(schemes, ETF_UNIVERSE.find((r) => r.nse === "GOLDIETF"));
    assert.equal(goldEtf.nav, 131.5245);
    assert.doesNotMatch(goldEtf.name, /FOF/i);
    const featured = pickFeatured(schemes, {});
    const flexi = featured.find((s) => /parag parikh/i.test(s.name));
    assert.ok(flexi);
    assert.equal(flexi.nav, 90.5289);
    assert.match(flexi.name, /Direct Plan/);
    assert.match(flexi.name, /Growth/);
    assert.doesNotMatch(flexi.name, /IDCW/i);
    const liquid = featured.find((s) => /hdfc liquid/i.test(s.name));
    assert.ok(liquid);
    assert.equal(liquid.nav, 5574.6258);
  });

  it("quotes Nifty 50 ETFs on the live NSE tickers, not retired Yahoo aliases", () => {
    const byNse = Object.fromEntries(ETF_UNIVERSE.map((r) => [r.nse, r.symbol]));
    assert.equal(byNse.NIFTYIETF, "NIFTYIETF.NS");
    assert.equal(byNse.NIFTY1, "NIFTY1.NS");
    assert.equal(byNse.NIFTYBETA, "NIFTYBETA.NS");
    assert.equal(byNse.NIFTYBEES, "NIFTYBEES.NS");
    const symbols = ETF_UNIVERSE.map((r) => r.symbol);
    const nses = ETF_UNIVERSE.map((r) => r.nse);
    for (const dead of ["ICICINIFTY.NS", "KOTAKNIFTY.NS", "UTINIFTETF.NS"]) {
      assert.equal(symbols.includes(dead), false, dead);
    }
    assert.equal(new Set(nses).size, nses.length);
    assert.equal(nses.filter((n) => n === "NIFTYIETF").length, 1);
  });
});

describe("fund desk playbooks", () => {
  const etfs = [
    { nse: "NIFTYBEES", name: "Nippon India ETF Nifty BeES", price: 268.4, nav: 268.32, premiumPct: 0.03, ret1m: -1.2, trend: "BULLISH" },
    { nse: "GOLDBEES", name: "Nippon India ETF Gold BeES", price: 72.1, nav: 71.9, premiumPct: 0.28, trend: "NEUTRAL" },
    { nse: "ITBEES", name: "Nippon India ETF IT BeES", price: 42, nav: 41.9, premiumPct: 0.2, ret1m: 14, rsi: 74, trend: "BULLISH" },
  ];
  const featured = [
    { code: "100349", name: "UTI Nifty 50 Index Fund - Direct Plan - Growth", nav: 165.44, date: "29-Aug-2026", kind: "index", blurb: "Plain Nifty 50 index fund" },
    { code: "119598", name: "Parag Parikh Flexi Cap Fund - Direct Plan - Growth", nav: 92.12, date: "29-Aug-2026", kind: "flexicap", blurb: "Flexi-cap" },
  ];

  it("names a Nifty BeES SIP with a rupee size", () => {
    const plans = buildFundDeskPlans({ etfs, featured, navDate: "29-Aug-2026" });
    const sip = plans.find((p) => p.id === "niftybees-sip");
    assert.ok(sip);
    assert.equal(sip.action, "BUY");
    assert.match(sip.tradeLine, /NIFTYBEES/);
    assert.match(sip.tradeTicket.steps[0], /CNC/);
    assert.equal(sip.fillSheet.product, "NIFTYBEES");
    assert.match(sip.fillSheet.qty, /37/);
    assert.equal(unitsFor(10000, 268.4), 37);
  });

  it("skips IT BeES when the 1-month run is extended", () => {
    const plans = buildFundDeskPlans({ etfs, featured });
    const it = plans.find((p) => p.id === "itbees-satellite");
    assert.equal(it.action, "WAIT");
    assert.equal(it.status, "Pass");
    assert.match(it.fillSheet.qty, /0 units/);
  });

  it("prints a Gold BeES unit count on the fill sheet", () => {
    const plans = buildFundDeskPlans({ etfs, featured });
    const gold = plans.find((p) => p.id === "goldbees-overlay");
    assert.equal(gold.action, "BUY");
    assert.match(gold.fillSheet.qty, /units/);
    assert.notEqual(gold.fillSheet.qty, null);
  });

  it("writes Direct–Growth SIP tickets for featured funds", () => {
    const plans = buildFundDeskPlans({ etfs, featured });
    const flexi = plans.find((p) => p.id === "fund-sip-119598");
    assert.ok(flexi);
    assert.equal(flexi.action, "SIP");
    assert.match(flexi.tradeLine, /5,000/);
    assert.match(flexi.tradeTicket.steps[0], /Direct/);
    assert.equal(flexi.fillSheet.side, "SIP");
    assert.match(flexi.fillSheet.path, /Direct/);
  });

  it("labels a fat ETF premium as skip", () => {
    assert.match(premiumLabel(1.2), /SKIP/i);
    assert.match(premiumLabel(-0.5), /Discount/);
    assert.match(premiumLabel(25.81), /iNAV/i);
    assert.match(premiumLabel(25.81), /disagree/i);
  });

  it("does not send Nasdaq 100 ETF when last and NAV disagree", () => {
    const plans = buildFundDeskPlans({
      etfs: [...etfs, { nse: "MON100", name: "Motilal Oswal Nasdaq 100 ETF", price: 343.9, nav: 272.9, premiumPct: 25.81 }],
      featured,
    });
    const nasdaq = plans.find((p) => p.id === "nasdaq-cap");
    assert.equal(nasdaq.action, "WAIT");
    assert.equal(nasdaq.status, "Pass");
    assert.equal(nasdaq.lots, 0);
    assert.match(nasdaq.fillSheet.qty, /0 units/);
    assert.match(nasdaq.tradeLine, /WAIT/);
    assert.match(nasdaq.tradeTicket.steps.join(" "), /iNAV/i);
  });

  it("keeps a Nasdaq satellite when the premium is tight", () => {
    const plans = buildFundDeskPlans({
      etfs: [...etfs, { nse: "MON100", name: "Motilal Oswal Nasdaq 100 ETF", price: 273.2, nav: 272.9, premiumPct: 0.11 }],
      featured,
    });
    const nasdaq = plans.find((p) => p.id === "nasdaq-cap");
    assert.equal(nasdaq.action, "BUY");
    assert.equal(nasdaq.status, "Plan");
    assert.ok(nasdaq.lots > 0);
    assert.match(nasdaq.fillSheet.qty, /units/);
    assert.doesNotMatch(nasdaq.fillSheet.qty, /0 units/);
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
