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
  const constituents = loadConstituents();
  const sectorPeers = constituents.filter((c) => c.sector === sector && c.symbol !== symbol).slice(0, 6);

  if (!sectorPeers.length) {
    return { available: false, message: "No sector peers in reference list", averages: null };
  }

  const snapshots = await Promise.all(sectorPeers.map((p) => fetchPeerSnapshot(p.symbol)));
  const valid = snapshots.filter((s) => s.changePercent != null);

  const avgChange = valid.length
    ? Number((valid.reduce((a, s) => a + s.changePercent, 0) / valid.length).toFixed(2))
    : null;
  const avgMonth = valid.filter((s) => s.monthlyChangePercent != null);
  const avgMonthly = avgMonth.length
    ? Number((avgMonth.reduce((a, s) => a + s.monthlyChangePercent, 0) / avgMonth.length).toFixed(2))
    : null;

  const leaders = [...valid].sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0)).slice(0, 3);

  return {
    available: valid.length > 0,
    sector,
    peerCount: valid.length,
    sectorAvgChange1d: avgChange,
    sectorAvgChange1m: avgMonthly,
    leaders,
    relativeStrengths: valid.length
      ? [`Sector avg 1D: ${fmtPct(avgChange)}`, `Leaders: ${leaders.map((l) => l.name).join(", ")}`]
      : [],
    relativeWeaknesses: ["Fundamental sector averages unavailable without licensed feed"],
    valuationPositioning: "Unavailable — PE/PB sector averages require fundamentals feed",
    growthPositioning: avgMonthly != null ? `Sector 1M avg: ${fmtPct(avgMonthly)}` : "Unavailable",
    table: {
      headers: ["Peer", "Price", "1D%", "1M%", "Trend"],
      rows: noNullRows(valid.map((p) => [p.name, p.price, p.changePercent, p.monthlyChangePercent, p.trend])),
    },
  };
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
  const sector = sectorEntry?.sector || "Unknown";

  const [competitors, sectorComp, fundamentals] = await Promise.all([
    buildCompetitorComparison(symbol, meta.shortName || symbol),
    buildSectorComparison(symbol, sector),
    fetchFundamentals(symbol),
  ]);

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

  return {
    symbol,
    companyName: meta.shortName || meta.longName || symbol,
    sector,
    price,
    currency: meta.currency || "INR",
    exchange: meta.fullExchangeName || "NSE",
    fetchedAt: new Date().toISOString(),
    fundamentals,
    fundamentalAnalysis: fundamentals.fundamentalAnalysis,
    businessOverview: fundamentals.businessOverview,
    financialStatements: fundamentals.financialStatements,
    historicalFinancialTrends: fundamentals.historicalTrends,
    valuationAnalysis: {
      peRatio: fundamentals.valuation.peRatio,
      forwardPe: fundamentals.valuation.forwardPe,
      pbRatio: fundamentals.valuation.pbRatio,
      marketCap: fundamentals.valuation.marketCap,
      dividendYield: fundamentals.valuation.dividendYield,
      enterpriseValue: fundamentals.valuation.enterpriseValue,
      evEbitda: fundamentals.valuation.evEbitda,
      pegRatio: fundamentals.valuation.pegRatio,
      industryComparison: sectorComp.available
        ? { available: true, value: sectorComp.valuationPositioning }
        : unavailable("industryComparison", "Sector valuation feed unavailable"),
      intrinsicValueEstimate: unavailable("intrinsicValueEstimate", "DCF inputs unavailable — never estimated"),
    },
    technicalAnalysis: {
      trend: signal,
      support: latest.support,
      resistance: latest.resistance,
      rsi: latest.rsi,
      macdHistogram: latest.macdHistogram,
      cmo: latest.cmo,
      adx: latest.adx,
      atr: latest.atr,
      sma20: latest.sma20,
      sma50: latest.sma50,
      modelTarget20d: target,
      volume: meta.regularMarketVolume ?? null,
      volumeTrend: latest.volumeTrend,
    },
    competitorComparison: competitors,
    sectorComparison: sectorComp,
    riskAssessment: {
      businessRisks: ["Earnings volatility", "Competitive pressure"],
      financialRisks: ["Leverage data unavailable from current feed"],
      industryRisks: ["Sector cycle risk"],
      regulatoryRisks: ["Policy and compliance changes"],
      note: "Company-specific risks require licensed filings data.",
    },
    aiConclusion: {
      dataType: "model-opinion",
      bullCase,
      bearCase,
      keyCatalysts: ["Volume breakout above resistance", "Sector rotation tailwinds"],
      riskFactors: ["Support breakdown", "Macro risk-off sentiment"],
      confidenceScore: confidence,
      assumptions: [
        "Analysis uses Yahoo Finance OHLCV price data only",
        "Fundamental fields unavailable are explicitly marked, not estimated",
        "Technical model uses RSI, MACD, SMA, CMO ensemble",
        "Competitor/sector comparison uses verified price data only",
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