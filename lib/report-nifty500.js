const { buildNifty500Dashboard } = require("./nifty500");
const { fmt, fmtPct, noNullRows } = require("./format");
const { computeConfidence, field } = require("./confidence");
const { buildAuditTrail, dataSourcesSection, assumptionsSection } = require("./traceability");

async function buildNifty500Report() {
  const data = await buildNifty500Dashboard();
  const valid = data.constituents.filter((c) => c.changePercent != null);
  const gainers = [...valid].sort((a, b) => b.changePercent - a.changePercent).slice(0, 5);
  const losers = [...valid].sort((a, b) => a.changePercent - b.changePercent).slice(0, 5);
  const o = data.marketOverview;
  const t = data.technicals;
  const breadth = data.marketBreadth;

  const confidence = computeConfidence({
    fields: [
      field("indexPrice", o.price, "Yahoo Finance"),
      field("constituents", breadth.sampleSize, "Yahoo Finance"),
      field("rsi", t.rsi, "Computed"),
      field("sectorData", data.sectorAnalysis.all.length, "Computed"),
    ],
    alignment: breadth.sampleSize >= 20 ? 80 : 50,
  });

  const executiveSummary = `NIFTY 500 proxy at ${fmt(o.price)} (${fmtPct(o.dailyChangePercent)} daily). Trend: ${t.trend}. Breadth: ${breadth.advances} advances vs ${breadth.declines} declines across ${breadth.sampleSize} verified quotes.`;

  const techMatches = data.technicalScreen.matches.slice(0, 8);
  const fundScreen = data.fundamentalScreen;

  const sections = [
    {
      title: "Executive Summary",
      dataType: "verified",
      content: executiveSummary,
      bullets: [
        `Weekly change: ${fmtPct(o.weeklyChangePercent)}`,
        `Monthly change: ${fmtPct(o.monthlyChangePercent)}`,
        `YTD change: ${fmtPct(o.ytdChangePercent)}`,
        `Data freshness: ${data.dataFreshness.fetchedAt}`,
      ],
    },
    {
      title: "Market Overview",
      dataType: "verified",
      table: {
        headers: ["Metric", "Value"],
        rows: noNullRows([
          ["Index", o.price],
          ["Nifty 50 Reference", o.nifty50Price],
          ["Daily %", o.dailyChangePercent],
          ["Weekly %", o.weeklyChangePercent],
          ["Monthly %", o.monthlyChangePercent],
          ["Advances", breadth.advances],
          ["Declines", breadth.declines],
          ["A/D Ratio", breadth.advanceDeclineRatio],
        ]),
      },
    },
    {
      title: "Market Commentary",
      dataType: "model-opinion",
      bullets: [
        `Trend signal: ${t.trend} (RSI ${fmt(t.rsi, 1)}, MACD hist ${fmt(t.macdHistogram, 2)})`,
        `CMO: ${fmt(t.cmo, 1)} — ${t.cmo > 50 ? "positive momentum" : t.cmo < -50 ? "negative momentum" : "neutral"}`,
        `ADX: ${fmt(t.adx, 1)} — ${t.adx > 25 ? "trending market" : "range-bound"}`,
        `Volume trend: ${t.volumeTrend || "Unavailable"} (${fmt(t.volumeRatio)}x avg)`,
      ],
    },
    {
      title: "Top Gainers",
      dataType: "verified",
      table: {
        headers: ["Symbol", "Name", "Change%", "Price"],
        rows: noNullRows(gainers.map((g) => [g.symbol, g.name, g.changePercent, g.price])),
      },
    },
    {
      title: "Top Losers",
      dataType: "verified",
      table: {
        headers: ["Symbol", "Name", "Change%", "Price"],
        rows: noNullRows(losers.map((l) => [l.symbol, l.name, l.changePercent, l.price])),
      },
    },
    {
      title: "Sector Leadership Analysis",
      dataType: "verified",
      table: {
        headers: ["Sector", "Avg Change%", "Stocks"],
        rows: noNullRows(data.sectorAnalysis.all.map((s) => [s.sector, s.avgChange, s.count])),
      },
    },
    {
      title: "Technical Screening Engine",
      dataType: "verified",
      content: `Screened ${data.technicalScreen.screened} stocks with verified OHLCV. ${techMatches.length} matches with 2+ criteria.`,
      table: techMatches.length
        ? {
            headers: ["Symbol", "Name", "Price", "Change%", "Signals"],
            rows: noNullRows(
              techMatches.map((m) => [m.symbol, m.name, m.price, m.changePercent, m.reasons.join("; ")])
            ),
          }
        : undefined,
      bullets: data.technicalScreen.criteria,
    },
    {
      title: "Fundamental Screening Engine",
      dataType: "verified",
      content: fundScreen.available
        ? `Screened ${fundScreen.screened} stocks with verified fundamentals.`
        : fundScreen.message,
      table: fundScreen.matches?.length
        ? {
            headers: ["Symbol", "Name", "PE", "ROE", "Rev Growth"],
            rows: noNullRows(
              fundScreen.matches.map((m) => [m.symbol, m.name, m.pe, m.roe, m.revenueGrowth])
            ),
          }
        : undefined,
    },
    {
      title: "Opportunities Identified",
      dataType: "model-opinion",
      bullets: [
        ...data.sectorAnalysis.best.map((s) => `${s.sector} leading at ${fmtPct(s.avgChange)} avg`),
        ...techMatches.slice(0, 3).map((m) => `Technical: ${m.symbol} — ${m.reasons[0]}`),
      ],
    },
    {
      title: "Risk Factors",
      dataType: "model-opinion",
      bullets: [
        `Declines exceed advances: ${breadth.declines > breadth.advances}`,
        `RSI zone: ${t.rsi > 70 ? "Overbought" : t.rsi < 30 ? "Oversold" : "Neutral"}`,
        `ATR (volatility): ${fmt(t.atr, 2)}`,
        fundScreen.available ? "Fundamental screen active" : "Fundamental data feed unavailable — screening paused",
      ],
    },
    {
      title: "Supporting Evidence",
      dataType: "verified",
      bullets: [
        `Index proxy: ${o.indexName}`,
        `Constituents tracked: ${breadth.sampleSize}/${breadth.totalTracked}`,
        `Sector sample: ${data.sectorAnalysis.all.length} sectors`,
        `Source timestamp: ${data.dataFreshness.fetchedAt}`,
      ],
    },
    dataSourcesSection([
      { name: "Yahoo Finance Chart API", provider: "query1.finance.yahoo.com", fetchedAt: data.dataFreshness.fetchedAt },
      { name: "NIFTY 500 Constituents", provider: "Local reference list", fetchedAt: data.dataFreshness.fetchedAt },
    ]),
    assumptionsSection([
      "NIFTY 500 index via Yahoo Finance ^CRSLDX",
      "Fundamental metrics not estimated when feed unavailable",
      "Technical screening requires minimum 30 days OHLCV per stock",
    ]),
    buildAuditTrail([
      { metric: "Index Price", value: o.price, source: "Yahoo Finance", collectedAt: data.dataFreshness.fetchedAt, derivation: "Latest daily close" },
      { metric: "RSI(14)", value: fmt(t.rsi, 1), source: "Computed", collectedAt: data.dataFreshness.fetchedAt, derivation: "OHLCV rolling calculation" },
      { metric: "Market Breadth", value: `${breadth.advances}/${breadth.declines}`, source: "Computed", collectedAt: data.dataFreshness.fetchedAt, derivation: "Constituent change% count" },
    ]),
    { title: "Disclaimer", content: "Not investment advice. Verify all data with original sources before trading." },
  ];

  return {
    type: "nifty500",
    title: `NIFTY 500 Market Intelligence — ${new Date().toISOString().slice(0, 10)}`,
    source: "Yahoo Finance Chart API + NSE reference constituents",
    generatedAt: new Date().toISOString(),
    dataFreshness: data.dataFreshness,
    confidence,
    disclaimer: "Index uses NIFTY500.NS ETF proxy. Fundamentals marked unavailable where feed unavailable — never estimated.",
    sections,
    dashboard: data,
  };
}

module.exports = { buildNifty500Report };