/**
 * Sector comparison & outlook builders.
 * Price momentum from verified charts; fundamental averages from verified peer quoteSummary.
 * Never fabricates regulatory, capex, or demand forecasts.
 */

const { loadConstituents } = require("./nifty500");
const { fetchChart } = require("./yahoo");
const { computeIndicators, technicalSignal } = require("./indicators");
const { fmtPct } = require("./format");
const { val } = require("./research-insights");

async function fetchPriceSnapshot(symbol) {
  try {
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
        price != null && prev?.close
          ? Number((((price - prev.close) / prev.close) * 100).toFixed(2))
          : null,
      monthlyChangePercent:
        price != null && monthAgo?.close
          ? Number((((price - monthAgo.close) / monthAgo.close) * 100).toFixed(2))
          : null,
      trend: indicators ? technicalSignal(indicators) : null,
    };
  } catch {
    return { symbol, name: symbol, price: null };
  }
}

/**
 * Sector price comparison from reference constituents (verified Yahoo prices).
 */
async function buildSectorPriceComparison(symbol, sector) {
  const constituents = loadConstituents();
  const sectorPeers = constituents
    .filter((c) => c.sector === sector && c.symbol !== symbol)
    .slice(0, 8);

  if (!sectorPeers.length) {
    return {
      available: false,
      message: "No sector peers in reference constituent list for this sector.",
      averages: null,
      sector,
    };
  }

  const snapshots = await Promise.all(sectorPeers.map((p) => fetchPriceSnapshot(p.symbol)));
  const valid = snapshots.filter((s) => s.changePercent != null);

  const avgChange = valid.length
    ? Number((valid.reduce((a, s) => a + s.changePercent, 0) / valid.length).toFixed(2))
    : null;
  const avgMonth = valid.filter((s) => s.monthlyChangePercent != null);
  const avgMonthly = avgMonth.length
    ? Number((avgMonth.reduce((a, s) => a + s.monthlyChangePercent, 0) / avgMonth.length).toFixed(2))
    : null;

  const leaders = [...valid]
    .sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0))
    .slice(0, 3);

  let sectorOutlook = "Neutral";
  if (avgMonthly != null) {
    if (avgMonthly > 1) sectorOutlook = "Bullish";
    else if (avgMonthly < -1) sectorOutlook = "Bearish";
  }

  return {
    available: valid.length > 0,
    sector,
    peerCount: valid.length,
    sectorAvgChange1d: avgChange,
    sectorAvgChange1m: avgMonthly,
    leaders,
    sectorOutlook,
    relativeStrengths: valid.length
      ? [`Sector avg 1D: ${fmtPct(avgChange)}`, `Leaders: ${leaders.map((l) => l.name).join(", ")}`]
      : [],
    relativeWeaknesses: [],
    growthPositioning: avgMonthly != null ? `Sector 1M avg: ${fmtPct(avgMonthly)}` : "Data Unavailable",
    valuationPositioning: null, // filled when peer fundamentals available
    table: {
      headers: ["Peer", "Price", "1D%", "1M%", "Trend"],
      rows: valid.map((p) => [p.name, p.price, p.changePercent, p.monthlyChangePercent, p.trend]),
    },
    source: "Yahoo Finance Chart API + static sector constituent reference",
    dataType: "factual",
  };
}

/**
 * Merge peer-fundamental averages into sector benchmarking table (subject vs sector avg).
 */
function buildSectorBenchmark(subjectMetrics, industryComparison, sectorPrice) {
  const ind = industryComparison || {};
  const rows = [
    {
      metric: "Market Cap",
      company: subjectMetrics.marketCap,
      sectorAvg: ind.avgMarketCap ?? null,
      type: "cr",
    },
    {
      metric: "P/E",
      company: subjectMetrics.peRatio,
      sectorAvg: ind.avgPe ?? null,
      type: "x",
    },
    {
      metric: "P/B",
      company: subjectMetrics.pbRatio,
      sectorAvg: ind.avgPb ?? null,
      type: "x",
    },
    {
      metric: "EV/EBITDA",
      company: subjectMetrics.evEbitda,
      sectorAvg: ind.avgEvEbitda ?? null,
      type: "x",
    },
    {
      metric: "ROE",
      company: subjectMetrics.roe,
      sectorAvg: ind.avgRoe ?? null,
      type: "ratio",
    },
    {
      metric: "ROA",
      company: subjectMetrics.roa,
      sectorAvg: ind.avgRoa ?? null,
      type: "ratio",
    },
    {
      metric: "ROCE",
      company: null,
      sectorAvg: null,
      type: "ratio",
      note: "ROCE not provided by Yahoo feed",
    },
    {
      metric: "Net Margin",
      company: subjectMetrics.netMargin,
      sectorAvg: ind.avgNetMargin ?? null,
      type: "ratio",
    },
    {
      metric: "Operating / EBITDA Margin",
      company: subjectMetrics.operatingMargin,
      sectorAvg: ind.avgOperatingMargin ?? null,
      type: "ratio",
    },
    {
      metric: "Debt / Equity",
      company: subjectMetrics.debtToEquity,
      sectorAvg: ind.avgDebtToEquity ?? null,
      type: "number",
    },
    {
      metric: "Dividend Yield",
      company: subjectMetrics.dividendYield,
      sectorAvg: ind.avgDividendYield ?? null,
      type: "yield",
    },
    {
      metric: "Revenue Growth",
      company: subjectMetrics.revenueGrowth,
      sectorAvg: ind.avgRevenueGrowth ?? null,
      type: "ratio",
    },
    {
      metric: "Earnings Growth",
      company: subjectMetrics.profitGrowth,
      sectorAvg: ind.avgProfitGrowth ?? null,
      type: "ratio",
    },
    {
      metric: "1M Price Change",
      company: sectorPrice?.subjectMonthly ?? null,
      sectorAvg: sectorPrice?.sectorAvgChange1m ?? null,
      type: "pct",
    },
  ];

  const availableCount = rows.filter(
    (r) => (r.company != null && Number.isFinite(Number(r.company))) || (r.sectorAvg != null && Number.isFinite(Number(r.sectorAvg)))
  ).length;

  return {
    available: availableCount > 0,
    message:
      availableCount > 0
        ? "Company metrics from Yahoo quoteSummary; sector averages from verified peer cohort (nulls excluded)."
        : "Awaiting Latest Verified Data for sector fundamental benchmarks.",
    rows,
    peerCount: ind.peerCount ?? sectorPrice?.peerCount ?? 0,
    source: ind.source || sectorPrice?.source || "Yahoo Finance",
    methodology: ind.methodology || "Arithmetic mean of available peer metrics",
  };
}

/**
 * Structured sector outlook — facts vs analytical interpretation clearly separated.
 * Does NOT invent regulatory developments, capex trends, or demand forecasts.
 */
function buildSectorOutlook({ sector, sectorPrice, industryComparison, relativeStrength }) {
  const unavailable = (reason) => ({
    available: false,
    display: "Data Unavailable",
    reason: reason || "Source does not provide this information",
  });

  const avg1m = sectorPrice?.sectorAvgChange1m;
  const avg1d = sectorPrice?.sectorAvgChange1d;
  const outlook = sectorPrice?.sectorOutlook || "Neutral";

  const verifiedFacts = [];
  if (sector) verifiedFacts.push({ label: "Sector classification", value: sector, source: "Reference mapping / Yahoo profile" });
  if (avg1d != null) verifiedFacts.push({ label: "Sector avg 1D price change", value: `${avg1d}%`, source: "Yahoo peer prices" });
  if (avg1m != null) verifiedFacts.push({ label: "Sector avg 1M price change", value: `${avg1m}%`, source: "Yahoo peer prices" });
  if (sectorPrice?.leaders?.length) {
    verifiedFacts.push({
      label: "Session sector leaders (by 1D %)",
      value: sectorPrice.leaders.map((l) => `${l.name} (${l.changePercent}%)`).join(", "),
      source: "Yahoo peer prices",
    });
  }
  if (industryComparison?.available && industryComparison.avgPe != null) {
    verifiedFacts.push({
      label: "Peer cohort avg P/E",
      value: Number(industryComparison.avgPe).toFixed(1),
      source: "Yahoo quoteSummary peer average",
    });
  }
  if (relativeStrength?.vsNifty != null) {
    verifiedFacts.push({
      label: "Stock vs NIFTY 50 (1M)",
      value: `${relativeStrength.vsNifty}% (stock ${relativeStrength.stockReturn1m}% · index ${relativeStrength.niftyReturn1m}%)`,
      source: "Yahoo Finance Chart API",
    });
  }

  const analyticalInterpretations = [];
  if (avg1m != null) {
    analyticalInterpretations.push({
      type: "analytical-interpretation",
      text:
        avg1m > 1
          ? `Rule-based outlook: Bullish — sector peer 1M average return is +${avg1m}% (threshold > +1%).`
          : avg1m < -1
            ? `Rule-based outlook: Bearish — sector peer 1M average return is ${avg1m}% (threshold < −1%).`
            : `Rule-based outlook: Neutral — sector peer 1M average return is ${avg1m}% (within ±1%).`,
      inputs: [`sectorAvgChange1m=${avg1m}`],
    });
  } else {
    analyticalInterpretations.push({
      type: "analytical-interpretation",
      text: "Rule-based sector momentum outlook cannot be formed without verified peer price history.",
      inputs: [],
    });
  }

  // Cyclical vs defensive — only from known sector taxonomy (static reference), not invented dynamics
  const DEFENSIVE = new Set(["FMCG", "Utilities", "Pharma", "Healthcare"]);
  const CYCLICAL = new Set(["Auto", "Materials", "Industrials", "Energy", "Financial Services", "IT", "Consumer", "Telecom", "Conglomerate"]);
  let cycleCharacter = unavailable("Sector cycle classification requires curated taxonomy match");
  if (sector && DEFENSIVE.has(sector)) {
    cycleCharacter = {
      available: true,
      value: "Typically defensive (reference taxonomy)",
      source: "Static sector taxonomy — not a live economic classification feed",
      dataType: "reference",
    };
  } else if (sector && CYCLICAL.has(sector)) {
    cycleCharacter = {
      available: true,
      value: "Typically cyclical / growth-sensitive (reference taxonomy)",
      source: "Static sector taxonomy — not a live economic classification feed",
      dataType: "reference",
    };
  }

  return {
    available: verifiedFacts.length > 0,
    sector: sector || "Unknown",
    sectorOutlook: outlook,
    outlookMethodology:
      "Bullish if sector peer 1M avg change > +1%; Bearish if < −1%; else Neutral. Based solely on verified peer prices.",
    verifiedFacts,
    analyticalInterpretations,
    sectorOverview: sector
      ? {
          available: true,
          value: `${sector} sector (from verified company/sector mapping). Live narrative industry research feeds are not connected.`,
          dataType: "factual",
        }
      : unavailable("Sector classification unavailable"),
    industryGrowthDrivers: unavailable("Industry growth-driver narrative requires licensed research feed"),
    industryHeadwinds: unavailable("Industry headwind narrative requires licensed research feed"),
    regulatoryDevelopments: unavailable("Regulatory developments require licensed news/filings feed"),
    demandTrends: unavailable("Demand trend series requires licensed industry feed"),
    supplyTrends: unavailable("Supply trend series requires licensed industry feed"),
    capitalExpenditureTrends: unavailable("Sector capex trends require licensed industry feed"),
    industryRisks: [
      {
        type: "analytical-framework",
        text: "Sector cycle, competitive intensity, and policy change are standard equity risk factors — not company-specific verified events.",
      },
    ],
    opportunities: [
      {
        type: "analytical-framework",
        text: "Relative strength vs index and peer valuation discounts (when verified) may present opportunity sets — not forecasts.",
      },
    ],
    competitiveLandscape: sectorPrice?.leaders?.length
      ? {
          available: true,
          value: `Near-term price leaders among tracked peers: ${sectorPrice.leaders.map((l) => l.name).join(", ")}.`,
          dataType: "factual",
          source: "Yahoo peer prices",
        }
      : unavailable("Competitive landscape narrative requires licensed research feed"),
    cycleCharacter,
    macroeconomicFactors: unavailable("Macro factor attribution requires licensed macro research feed"),
    message:
      verifiedFacts.length > 0
        ? "Outlook combines verified peer price facts with clearly labeled rule-based interpretation. Unsupported narratives are marked Data Unavailable."
        : "Awaiting Latest Verified Data for sector outlook.",
  };
}

/**
 * Risk assessment grounded in verified metrics + labeled analytical framework items.
 */
function buildRiskAssessment(data) {
  const t = data.technicalAnalysis || {};
  const fund = data.fundamentalAnalysis || {};
  const price = data.price;

  const factual = [];
  const analytical = [];

  if (t.atr != null && price != null && price > 0) {
    const vol = (t.atr / price) * 100;
    factual.push({
      category: "Liquidity / Volatility",
      text: `14-day ATR is ${t.atr.toFixed(2)} (${vol.toFixed(2)}% of last price) from verified OHLCV.`,
      metric: "ATR",
      dataType: "factual",
    });
    if (vol > 4) {
      analytical.push({
        category: "Liquidity / Volatility",
        text: "Elevated short-term volatility vs price (ATR/price > 4%) — position sizing risk is higher.",
        dataType: "analytical-interpretation",
        inputs: [`atr=${t.atr}`, `price=${price}`],
      });
    }
  }

  if (t.trend === "BEARISH") {
    factual.push({
      category: "Technical",
      text: "Technical ensemble rating is BEARISH (RSI/MACD/SMA/EMA rules on verified OHLCV).",
      dataType: "factual",
    });
  }

  if (t.rsi != null && t.rsi > 70) {
    factual.push({
      category: "Technical",
      text: `RSI at ${t.rsi.toFixed(1)} is above 70 (overbought threshold in model rules).`,
      dataType: "factual",
    });
  }

  const de = val(fund.debtToEquity);
  if (de != null) {
    factual.push({
      category: "Financial",
      text: `Debt-to-equity as reported by Yahoo: ${de}.`,
      dataType: "factual",
      source: "Yahoo financialData.debtToEquity",
    });
    // Yahoo often reports D/E as percent-style (e.g. 42.5) or ratio — only flag extreme high when ratio-like > 2 or percent-like > 200
    if (de > 200 || (de > 2 && de < 20)) {
      analytical.push({
        category: "Financial",
        text: "Leverage appears elevated relative to common screening thresholds — confirm units in filings before acting.",
        dataType: "analytical-interpretation",
        inputs: [`debtToEquity=${de}`],
      });
    }
  } else {
    factual.push({
      category: "Financial",
      text: "Debt-to-equity: Data Unavailable from current feed.",
      dataType: "factual",
    });
  }

  const roe = val(fund.roe);
  if (roe != null && roe < 0) {
    factual.push({
      category: "Business / Profitability",
      text: `ROE is negative (${(roe * 100).toFixed(1)}%) per Yahoo.`,
      dataType: "factual",
    });
  }

  // Framework risks — never presented as company-specific verified events
  const framework = [
    {
      category: "Industry",
      text: "Sector cycle and competitive intensity may affect earnings — company-specific industry risks require filings/news feeds.",
      dataType: "analytical-framework",
    },
    {
      category: "Regulatory",
      text: "Policy and compliance changes can impact equities — live regulatory event feed not connected.",
      dataType: "analytical-framework",
    },
    {
      category: "Currency",
      text: "INR and foreign-currency translation risks for exporters/importers — not quantified without FX exposure data.",
      dataType: "analytical-framework",
    },
    {
      category: "Operational",
      text: "Operational risks (execution, supply chain, key person) require company disclosures — not estimated here.",
      dataType: "analytical-framework",
    },
    {
      category: "Commodity",
      text: "Commodity input/output price risk applies to certain sectors — not scored without cost-structure feed.",
      dataType: "analytical-framework",
    },
  ];

  return {
    available: true,
    factualRisks: factual,
    analyticalRisks: analytical,
    frameworkRisks: framework,
    note: "Factual risks cite verified metrics. Framework items are generic categories — not invented company events.",
    businessRisks: factual.filter((r) => r.category.startsWith("Business")).map((r) => r.text),
    financialRisks: factual.filter((r) => r.category === "Financial").map((r) => r.text),
    industryRisks: framework.filter((r) => r.category === "Industry").map((r) => r.text),
    regulatoryRisks: framework.filter((r) => r.category === "Regulatory").map((r) => r.text),
  };
}

/**
 * Valuation summary narrative — only from verified multiples.
 */
function buildValuationSummary(valuation, industryComparison, fund) {
  const pe = val(valuation?.peRatio);
  const pb = val(valuation?.pbRatio);
  const evEbitda = val(valuation?.evEbitda);
  const avgPe = industryComparison?.avgPe;
  const points = [];
  const interpretations = [];

  if (pe != null) points.push(`Trailing P/E ${pe.toFixed(1)}x (Yahoo verified)`);
  if (pb != null) points.push(`P/B ${pb.toFixed(2)}x (Yahoo verified)`);
  if (evEbitda != null) points.push(`EV/EBITDA ${evEbitda.toFixed(1)}x (Yahoo verified)`);
  if (val(valuation?.dividendYield) != null) {
    const y = val(valuation.dividendYield);
    const scaled = Math.abs(y) <= 1 ? y * 100 : y;
    points.push(`Dividend yield ${scaled.toFixed(2)}% (Yahoo verified)`);
  }
  if (val(valuation?.freeCashFlowYield) != null) {
    points.push(`FCF yield ${(val(valuation.freeCashFlowYield) * 100).toFixed(2)}% (computed from verified FCF ÷ market cap)`);
  }

  if (pe != null && avgPe != null) {
    if (pe < avgPe * 0.85) {
      interpretations.push({
        type: "analytical-interpretation",
        text: `P/E ${pe.toFixed(1)} is more than 15% below peer average ${avgPe.toFixed(1)} — model labels valuation Attractive vs peers.`,
        inputs: [`pe=${pe}`, `avgPe=${avgPe}`],
      });
    } else if (pe > avgPe * 1.2) {
      interpretations.push({
        type: "analytical-interpretation",
        text: `P/E ${pe.toFixed(1)} is more than 20% above peer average ${avgPe.toFixed(1)} — model labels valuation Expensive vs peers.`,
        inputs: [`pe=${pe}`, `avgPe=${avgPe}`],
      });
    } else {
      interpretations.push({
        type: "analytical-interpretation",
        text: `P/E ${pe.toFixed(1)} is within ±20% of peer average ${avgPe.toFixed(1)} — model labels valuation Fair vs peers.`,
        inputs: [`pe=${pe}`, `avgPe=${avgPe}`],
      });
    }
  }

  if (val(fund?.roe) != null) {
    points.push(`ROE ${(val(fund.roe) * 100).toFixed(1)}% (Yahoo verified)`);
  }

  return {
    available: points.length > 0,
    verifiedPoints: points,
    interpretations,
    intrinsicValue: {
      available: false,
      display: "Data Unavailable",
      reason: "Intrinsic value requires documented DCF with verified inputs — never estimated",
    },
    historicalMultiples: {
      available: false,
      display: "Data Unavailable",
      reason: "Historical valuation multiple series requires licensed time-series fundamentals feed",
    },
    message:
      points.length > 0
        ? "Valuation summary uses only verified Yahoo multiples and peer averages where available."
        : "Awaiting Latest Verified Data for valuation summary.",
  };
}

module.exports = {
  buildSectorPriceComparison,
  buildSectorBenchmark,
  buildSectorOutlook,
  buildRiskAssessment,
  buildValuationSummary,
  fetchPriceSnapshot,
};
