const fs = require("fs");
const path = require("path");
const { fetchChart } = require("./yahoo");
const { computeIndicators, technicalSignal, technicalTarget } = require("./indicators");
const { unavailable } = require("./compliance");
const { loadConstituents } = require("./nifty500");
const { fmt, fmtPct, noNullRows, assertFreshData, UNAVAILABLE_FIELD } = require("./format");
const { fetchFundamentals } = require("./fundamentals");
const { mergeInstitutionalSections } = require("./report-institutional");
const { computeConfidence, field } = require("./confidence");
const {
  buildAuditTrail,
  dataSourcesSection,
  assumptionsSection,
  aiSection,
} = require("./traceability");
const { buildSectorPriceComparison, buildRiskAssessment } = require("./research-sector");

const { dataPath } = require("./data-path");
const COMPETITORS_PATH = dataPath("competitors.json");

function normalizeSymbol(raw) {
  const s = raw.trim().toUpperCase();
  if (s.includes(".")) return s;
  return `${s}.NS`;
}

function loadCompetitorMap() {
  try {
    return JSON.parse(fs.readFileSync(COMPETITORS_PATH, "utf8"));
  } catch {
    return {};
  }
}

async function fetchPeerSnapshot(symbol) {
  const chart = await fetchChart(symbol, "1d", "3mo");
  const candles = chart.candles.filter((c) => c.close != null);
  const meta = chart.meta;
  const price = meta.regularMarketPrice ?? candles.at(-1)?.close ?? null;
  const prev = candles.at(-2);
  const monthAgo = candles.at(-22);
  const indicators = candles.length >= 30 ? computeIndicators(candles) : null;

  return {
    symbol,
    name: meta.shortName || symbol,
    price,
    changePercent:
      price != null && prev?.close ? Number((((price - prev.close) / prev.close) * 100).toFixed(2)) : null,
    monthlyChangePercent:
      price != null && monthAgo?.close
        ? Number((((price - monthAgo.close) / monthAgo.close) * 100).toFixed(2))
        : null,
    trend: indicators ? technicalSignal(indicators) : null,
    rsi: indicators?.latest?.rsi ?? null,
    revenue: unavailable("revenue", "Licensed fundamentals feed unavailable"),
    profitGrowth: unavailable("profitGrowth", "Licensed fundamentals feed unavailable"),
    margins: unavailable("margins", "Licensed fundamentals feed unavailable"),
    roe: unavailable("roe", "Licensed fundamentals feed unavailable"),
    roce: unavailable("roce", "Licensed fundamentals feed unavailable"),
    peRatio: unavailable("peRatio", "Licensed fundamentals feed unavailable"),
    pbRatio: unavailable("pbRatio", "Licensed fundamentals feed unavailable"),
    marketCap: unavailable("marketCap", "Licensed fundamentals feed unavailable"),
    debtMetrics: unavailable("debt", "Licensed fundamentals feed unavailable"),
    earningsGrowth: unavailable("earningsGrowth", "Licensed fundamentals feed unavailable"),
    fetchedAt: new Date().toISOString(),
  };
}

async function buildCompetitorComparison(symbol, companyName) {
  const map = loadCompetitorMap();
  const entry = map[symbol];
  const peers = entry?.peers?.length ? entry.peers.slice(0, 4) : [];

  if (!peers.length) {
    return {
      available: false,
      message: `No verified competitor mapping for ${companyName}. Add peers in competitors.json with licensed data feeds.`,
      peers: [],
    };
  }

  const snapshots = await Promise.all(peers.map(fetchPeerSnapshot));
  const verified = snapshots.filter((p) => p.price != null);

  return {
    available: verified.length > 0,
    message: verified.length
      ? `Compared against ${verified.length} listed peers using verified price/technical data. Fundamental metrics require licensed feed.`
      : "Peer price data unavailable",
    peers: verified,
    table: {
      headers: ["Company", "Price", "1D%", "1M%", "Trend", "RSI", "Revenue", "ROE", "PE"],
      rows: noNullRows(
        [
          [companyName, "—", "—", "—", "—", "—", "Subject", "—", "—"],
          ...verified.map((p) => [
            p.name,
            p.price,
            p.changePercent,
            p.monthlyChangePercent,
            p.trend,
            p.rsi?.toFixed(1),
            p.revenue.reason,
            p.roe.reason,
            p.peRatio.reason,
          ]),
        ]
      ),
    },
  };
}

async function buildSectorComparison(symbol, sector) {
  return buildSectorPriceComparison(symbol, sector);
}

async function buildResearchReport(rawSymbol) {
  const symbol = normalizeSymbol(rawSymbol);
  const [daily, yearly] = await Promise.all([
    fetchChart(symbol, "1d", "6mo"),
    fetchChart(symbol, "1d", "2y"),
  ]);

  const meta = daily.meta;
  const candles = yearly.candles.filter((c) => c.close != null);
  assertFreshData([
    { ok: candles.length >= 30, reason: "Insufficient price history" },
    { ok: meta.regularMarketPrice != null || candles.at(-1)?.close != null, reason: "Price unavailable" },
  ]);

  const indicators = computeIndicators(candles);
  const latest = indicators.latest;
  const signal = technicalSignal(indicators);
  const price = meta.regularMarketPrice ?? candles.at(-1)?.close ?? null;
  const target = technicalTarget(price, indicators, 20);

  const sectorEntry = loadCompetitorMap()[symbol];
  // Prefer competitor map sector; fall back to constituent list sector; never invent.
  let sector = sectorEntry?.sector || null;
  if (!sector) {
    const match = loadConstituents().find((c) => c.symbol === symbol);
    sector = match?.sector || null;
  }
  sector = sector || "Unknown";

  const [competitors, sectorComp, fundamentals] = await Promise.all([
    buildCompetitorComparison(symbol, meta.shortName || symbol),
    buildSectorComparison(symbol, sector),
    fetchFundamentals(symbol),
  ]);

  // Prefer Yahoo profile sector/industry when available
  const profileSector = fundamentals?.businessOverview?.sector;
  const profileIndustry = fundamentals?.businessOverview?.industry;
  const sectorLabel =
    (profileSector && typeof profileSector === "object" && profileSector.available !== false
      ? profileSector.value || profileSector.display
      : typeof profileSector === "string"
        ? profileSector
        : null) || sector;
  const industryLabel =
    profileIndustry && typeof profileIndustry === "object" && profileIndustry.available !== false
      ? profileIndustry.value || profileIndustry.display
      : typeof profileIndustry === "string"
        ? profileIndustry
        : null;

  const hasPrice = price != null;
  const hasTechnicals = latest.rsi != null;
  const hasPeers = competitors.available;
  const hasSector = sectorComp.available;

  const confidence = computeConfidence({
    fields: [
      field("price", price, "Yahoo Finance"),
      field("technicals", latest.rsi, "Computed"),
      field("history", candles.length > 50, "Yahoo Finance"),
      field("competitors", hasPeers, "Reference + Yahoo"),
      field("sector", hasSector, "Reference + Yahoo"),
      field("fundamentals", fundamentals.available, "Yahoo quoteSummary"),
    ],
    alignment: signal === "NEUTRAL" ? 50 : 70,
  });

  const bullCase =
    signal === "BULLISH"
      ? "Technical momentum and moving-average structure support upside bias."
      : "Upside case requires trend reversal above resistance with volume confirmation.";
  const bearCase =
    signal === "BEARISH"
      ? "Technical structure shows weakness; downside risk if support fails."
      : "Downside case emerges on break below support with rising sell volume.";

  const riskAssessment = buildRiskAssessment({
    technicalAnalysis: {
      trend: signal,
      rsi: latest.rsi,
      atr: latest.atr,
    },
    fundamentalAnalysis: fundamentals.fundamentalAnalysis,
    price,
  });

  return {
    symbol,
    companyName: meta.shortName || meta.longName || symbol,
    sector: sectorLabel,
    industry: industryLabel,
    price,
    currency: meta.currency || "INR",
    exchange: meta.fullExchangeName || "NSE",
    fetchedAt: new Date().toISOString(),
    dataSources: [
      "Yahoo Finance Chart API (OHLCV, price meta)",
      "Yahoo Finance quoteSummary (fundamentals/valuation when available)",
      "Static peer map: data/competitors.json",
      "Static sector constituents: data/nifty500-constituents.json",
      "Technical indicators: computed from verified OHLCV (lib/indicators.js)",
    ],
    fundamentals,
    fundamentalAnalysis: fundamentals.fundamentalAnalysis,
    businessOverview: fundamentals.businessOverview,
    financialStatements: fundamentals.financialStatements,
    historicalFinancialTrends: fundamentals.historicalTrends,
    dividend: fundamentals.dividend,
    shareholding: fundamentals.shareholding,
    valuationAnalysis: {
      peRatio: fundamentals.valuation.peRatio,
      forwardPe: fundamentals.valuation.forwardPe,
      pbRatio: fundamentals.valuation.pbRatio,
      marketCap: fundamentals.valuation.marketCap,
      dividendYield: fundamentals.valuation.dividendYield,
      enterpriseValue: fundamentals.valuation.enterpriseValue,
      evEbitda: fundamentals.valuation.evEbitda,
      pegRatio: fundamentals.valuation.pegRatio,
      priceToSales: fundamentals.valuation.priceToSales,
      enterpriseToRevenue: fundamentals.valuation.enterpriseToRevenue,
      freeCashFlowYield: fundamentals.valuation.freeCashFlowYield,
      bookValue: fundamentals.valuation.bookValue,
      currentPrice: fundamentals.valuation.currentPrice ?? { available: true, value: price, source: "Yahoo chart meta" },
      fiftyTwoWeekHigh: fundamentals.valuation.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: fundamentals.valuation.fiftyTwoWeekLow,
      faceValue: fundamentals.valuation.faceValue,
      intrinsicValue: fundamentals.valuation.intrinsicValue,
      roe: fundamentals.fundamentalAnalysis?.roe,
      roa: fundamentals.fundamentalAnalysis?.roa,
      roce: fundamentals.fundamentalAnalysis?.roce,
      industryComparison: sectorComp.available
        ? { available: true, value: sectorComp.valuationPositioning }
        : unavailable("industryComparison", "Sector valuation feed unavailable"),
      intrinsicValueEstimate: unavailable("intrinsicValueEstimate", "DCF inputs unavailable — never estimated"),
    },
    technicalAnalysis: {
      trend: signal,
      technicalRating: signal,
      ratingMethodology:
        "Documented ensemble of RSI, MACD histogram, SMA20 vs SMA50, and EMA12 vs EMA26 from verified OHLCV only",
      support: latest.support,
      resistance: latest.resistance,
      rsi: latest.rsi,
      macdLine: latest.macdLine,
      macdSignal: latest.macdSignal,
      macdHistogram: latest.macdHistogram,
      cmo: latest.cmo,
      adx: latest.adx,
      atr: latest.atr,
      sma20: latest.sma20,
      sma50: latest.sma50,
      sma100: latest.sma100,
      sma200: latest.sma200,
      ema12: latest.ema12,
      ema20: latest.ema20,
      ema26: latest.ema26,
      ema50: latest.ema50,
      bollingerUpper: latest.bollingerUpper,
      bollingerMiddle: latest.bollingerMiddle,
      bollingerLower: latest.bollingerLower,
      stochasticK: latest.stochasticK,
      stochasticD: latest.stochasticD,
      vwap: latest.vwap,
      momentum10: latest.momentum10,
      momentum20: latest.momentum20,
      relativeStrength: latest.relativeStrength,
      pivot: latest.pivot,
      pivotR1: latest.pivotR1,
      pivotR2: latest.pivotR2,
      pivotR3: latest.pivotR3,
      pivotS1: latest.pivotS1,
      pivotS2: latest.pivotS2,
      pivotS3: latest.pivotS3,
      // Explicit unavailable — never invent
      supertrend: null,
      ichimoku: null,
      deliveryPercent: null,
      modelTarget20d: target,
      volume: meta.regularMarketVolume ?? null,
      volumeTrend: latest.volumeTrend,
      volumeRatio: latest.volumeRatio,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? null,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? null,
      previousClose: meta.chartPreviousClose ?? meta.previousClose ?? null,
      methodology: indicators.methodology,
    },
    priceMetrics: {
      lastPrice: price,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? null,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? null,
      previousClose: meta.chartPreviousClose ?? meta.previousClose ?? null,
      regularMarketVolume: meta.regularMarketVolume ?? null,
      currency: meta.currency || "INR",
      exchange: meta.fullExchangeName || "NSE",
      source: "Yahoo Finance Chart API meta",
    },
    competitorComparison: competitors,
    sectorComparison: sectorComp,
    riskAssessment,
    aiConclusion: {
      dataType: "model-opinion",
      bullCase,
      bearCase,
      keyCatalysts: [
        signal === "BULLISH"
          ? "Technical structure supportive (verified OHLCV ensemble)"
          : "Requires confirmation above resistance with volume (analytical)",
      ],
      riskFactors: (riskAssessment.factualRisks || []).slice(0, 3).map((r) => r.text),
      confidenceScore: confidence,
      assumptions: [
        "Price analysis uses Yahoo Finance OHLCV only",
        "Fundamental fields unavailable are explicitly marked, not estimated",
        "Technical model uses RSI, MACD, SMA, EMA ensemble from verified series",
        "Competitor/sector comparison uses verified Yahoo data only — peers never invented",
        "AI narrative is analytical interpretation of verified inputs, not factual claims about unobserved events",
      ],
    },
  };
}

function disp(metric) {
  if (!metric) return UNAVAILABLE_FIELD;
  return metric.available ? metric.display ?? metric.value : metric.display || UNAVAILABLE_FIELD;
}

function toReportDocument(data) {
  const t = data.technicalAnalysis;
  const fund = data.fundamentalAnalysis || {};
  const biz = data.businessOverview || {};
  const fin = data.financialStatements || {};
  const v = data.valuationAnalysis;
  const comp = data.competitorComparison;
  const sect = data.sectorComparison;
  const hist = data.historicalFinancialTrends;

  const baseSections = [
    {
      title: "Executive Summary",
      dataType: "model-opinion",
      content: `${data.companyName} at ${fmt(data.price)} ${data.currency}. Technical bias: ${t.trend}. Confidence ${data.aiConclusion.confidenceScore}% from data completeness and indicator alignment.`,
    },
    {
      title: "Market Overview",
      dataType: "verified",
      bullets: [
        `Exchange: ${data.exchange}`,
        `Sector: ${data.sector}`,
        `Price: ${fmt(data.price)} ${data.currency}`,
        `Volume: ${fmt(t.volume, 0)}`,
      ],
    },
    {
      title: "Company Overview",
      dataType: biz.companyProfile?.available ? "verified" : "unavailable",
      bullets: [
        `Profile: ${disp(biz.companyProfile)}`,
        `Industry: ${disp(biz.marketPosition)}`,
        `Segments: ${disp(biz.businessSegments)}`,
        `Revenue sources: ${disp(biz.revenueSources)}`,
      ],
    },
    {
      title: "Fundamental Analysis",
      dataType: data.fundamentals?.available ? "verified" : "unavailable",
      table: {
        headers: ["Metric", "Value", "Source"],
        rows: noNullRows([
          ["Revenue Growth", disp(fund.revenueGrowth), fund.revenueGrowth?.source || "—"],
          ["Profit Growth", disp(fund.profitGrowth), fund.profitGrowth?.source || "—"],
          ["EBITDA Growth", disp(fund.ebitdaGrowth), "—"],
          ["ROE", disp(fund.roe), fund.roe?.source || "—"],
          ["ROCE", disp(fund.roce), "—"],
          ["Debt/Equity", disp(fund.debtToEquity), fund.debtToEquity?.source || "—"],
          ["Operating Margin", disp(fund.operatingMargin), "—"],
          ["Net Margin", disp(fund.netMargin), "—"],
          ["Free Cash Flow", disp(fund.freeCashFlow), "—"],
          ["Earnings Trend", disp(fund.earningsTrend), "—"],
        ]),
      },
    },
    {
      title: "Financial Statement Analysis",
      dataType: data.fundamentals?.available ? "verified" : "unavailable",
      table: {
        headers: ["Statement", "Line Item", "Value"],
        rows: noNullRows([
          ["Income", "Revenue", disp(fin.incomeStatement?.revenue)],
          ["Income", "EBITDA", disp(fin.incomeStatement?.ebitda)],
          ["Income", "PAT", disp(fin.incomeStatement?.pat)],
          ["Balance Sheet", "Assets", disp(fin.balanceSheet?.assets)],
          ["Balance Sheet", "Liabilities", disp(fin.balanceSheet?.liabilities)],
          ["Balance Sheet", "Debt", disp(fin.balanceSheet?.debt)],
          ["Balance Sheet", "Equity", disp(fin.balanceSheet?.equity)],
          ["Cash Flow", "Operating", disp(fin.cashFlow?.operating)],
          ["Cash Flow", "Investing", disp(fin.cashFlow?.investing)],
          ["Cash Flow", "Financing", disp(fin.cashFlow?.financing)],
        ]),
      },
    },
    {
      title: "Historical Performance Analysis",
      dataType: hist?.available ? "verified" : "unavailable",
      content: hist?.available
        ? `Income statement history: ${hist.income3y?.length || 0} verified years on file.`
        : UNAVAILABLE_FIELD,
      table: hist?.income3y?.length
        ? {
            headers: ["Year", "Revenue", "PAT", "Source"],
            rows: noNullRows(hist.income3y.map((r) => [r.year, r.revenue, r.pat, r.source])),
          }
        : undefined,
    },
    {
      title: "Technical Analysis",
      dataType: "verified",
      table: {
        headers: ["Metric", "Value"],
        rows: noNullRows([
          ["Trend", t.trend],
          ["Price", data.price],
          ["RSI", t.rsi],
          ["CMO", t.cmo],
          ["ADX", t.adx],
          ["ATR", t.atr],
          ["Support", t.support],
          ["Resistance", t.resistance],
          ["20d Model Target", t.modelTarget20d],
          ["Volume", t.volume],
          ["Volume Trend", t.volumeTrend],
        ]),
      },
    },
    {
      title: "Institutional Activity Analysis",
      dataType: "unavailable",
      content: "Institutional holdings feed unavailable from current data provider — connect NSE/BSE filings feed for live data.",
    },
    {
      title: "Competitor Comparison",
      dataType: comp.available ? "verified" : "unavailable",
      content: comp.message,
      table: comp.table,
    },
    {
      title: "Sector Comparison",
      dataType: sect.available ? "verified" : "unavailable",
      content: sect.available
        ? `Sector: ${sect.sector}. Avg 1D: ${fmtPct(sect.sectorAvgChange1d)}. Avg 1M: ${fmtPct(sect.sectorAvgChange1m)}.`
        : sect.message,
      table: sect.table,
      bullets: sect.available
        ? [...(sect.relativeStrengths || []), `Valuation: ${sect.valuationPositioning}`, `Growth: ${sect.growthPositioning}`]
        : [sect.message],
    },
    {
      title: "Valuation Analysis",
      dataType: v.peRatio?.available ? "verified" : "unavailable",
      bullets: [
        `PE Ratio: ${disp(v.peRatio)}`,
        `PB Ratio: ${disp(v.pbRatio)}`,
        `Market Cap: ${disp(v.marketCap)}`,
        `Industry comparison: ${v.industryComparison.available ? v.industryComparison.value : v.industryComparison.reason}`,
        `Intrinsic value: ${v.intrinsicValueEstimate.reason}`,
      ],
    },
    {
      title: "Key Risks",
      dataType: "model-opinion",
      bullets: [
        ...data.riskAssessment.businessRisks,
        ...data.riskAssessment.financialRisks,
        data.riskAssessment.note,
      ],
    },
    aiSection("Scenario Analysis", "Base case follows current technical trend.", [
      `Bull scenario: ${data.aiConclusion.bullCase}`,
      `Bear scenario: ${data.aiConclusion.bearCase}`,
    ]),
    { title: "Bull Case", dataType: "model-opinion", content: data.aiConclusion.bullCase },
    { title: "Bear Case", dataType: "model-opinion", content: data.aiConclusion.bearCase },
    { title: "Key Catalysts", dataType: "model-opinion", bullets: data.aiConclusion.keyCatalysts },
    {
      title: "Investment Thesis",
      dataType: "model-opinion",
      content: `${data.companyName} at ${fmt(data.price)} ${data.currency} shows ${t.trend} technical bias with model target ${fmt(t.modelTarget20d)}.`,
    },
    assumptionsSection(data.aiConclusion.assumptions),
    {
      title: "Supporting Evidence",
      dataType: "verified",
      bullets: [
        `Price source: Yahoo Finance Chart API`,
        `History: ${data.technicalAnalysis ? "2Y OHLCV" : "Unavailable"}`,
        `Competitor data: ${comp.available ? "Verified peer prices" : "Unavailable"}`,
        `Sector data: ${sect.available ? "Verified sector peers" : "Unavailable"}`,
      ],
    },
    dataSourcesSection([
      { name: "Yahoo Finance Chart API", provider: "query1.finance.yahoo.com", fetchedAt: data.fetchedAt },
      { name: "Competitor Reference", provider: "data/competitors.json", fetchedAt: data.fetchedAt },
    ]),
    buildAuditTrail([
      { metric: "Price", value: data.price, source: "Yahoo Finance", collectedAt: data.fetchedAt, derivation: "regularMarketPrice / latest close" },
      { metric: "RSI", value: fmt(t.rsi, 1), source: "Computed", collectedAt: data.fetchedAt, derivation: "14-period RSI on 2Y closes" },
      { metric: "Confidence", value: data.aiConclusion.confidenceScore, source: "ABC confidence model", collectedAt: data.fetchedAt, derivation: "Data completeness + alignment" },
    ]),
    {
      title: "Conclusion",
      dataType: "model-opinion",
      content: `Model signal: ${t.trend}. Not investment advice — verify with licensed research for fundamentals.`,
    },
    { title: "Disclaimer", content: "Fundamental fields unavailable from current feed are not estimated. Technical and model sections use verified price data." },
  ];

  const sections = mergeInstitutionalSections(baseSections, {
    title: `${data.companyName} — Investment Research`,
    symbol: data.symbol,
    generatedAt: data.fetchedAt,
    aiCommentary: `${data.companyName} technical bias ${t.trend} with model target ${fmt(t.modelTarget20d)}.`,
    aiBullets: data.aiConclusion.keyCatalysts,
    macro: `Sector ${data.sector}: ${sect.available ? `avg 1M ${fmtPct(sect.sectorAvgChange1m)}` : UNAVAILABLE_FIELD}`,
  });

  return {
    type: "research",
    title: `${data.companyName} — Investment Research`,
    source: "Yahoo Finance + ABC technical model (fundamentals when quoteSummary available)",
    generatedAt: new Date().toISOString(),
    dataFreshness: { fetchedAt: data.fetchedAt },
    confidence: data.aiConclusion.confidenceScore,
    symbol: data.symbol,
    disclaimer:
      "Fundamental fields unavailable from current feed are not estimated. Technical and model sections use verified price data.",
    sections,
    analysis: data,
  };
}

async function buildResearchReportDocument(rawSymbol) {
  const analysis = await buildResearchReport(rawSymbol);
  return toReportDocument(analysis);
}

module.exports = { buildResearchReport, buildResearchReportDocument, normalizeSymbol, toReportDocument };