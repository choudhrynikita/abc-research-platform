const { unavailableField, UNAVAILABLE_FIELD, metricMeta } = require("./format");

async function fetchYahooFundamentals(symbol) {
  try {
    const crumbRes = await fetch("https://query1.finance.yahoo.com/v1/test/getcrumb", {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    });
    const crumb = await crumbRes.text();
    if (!crumb || crumb.includes("{")) throw new Error("Crumb unavailable");

    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=summaryProfile,financialData,defaultKeyStatistics,incomeStatementHistory,balanceSheetHistory,cashflowStatementHistory,summaryDetail`;
    const res = await fetch(`${url}&crumb=${encodeURIComponent(crumb)}`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    });
    if (!res.ok) throw new Error(`Yahoo fundamentals HTTP ${res.status}`);
    const data = await res.json();
    const r = data.quoteSummary?.result?.[0];
    if (!r) throw new Error("Empty fundamentals response");
    return r;
  } catch {
    return null;
  }
}

function v(val, source) {
  if (val == null || Number.isNaN(val)) return unavailableField();
  return {
    available: true,
    value: val,
    display: typeof val === "number" ? Number(val.toFixed(4)) : val,
    source,
    ...metricMeta(source, new Date().toISOString(), "Fresh"),
  };
}

function buildFromYahoo(raw, symbol) {
  const fd = raw.financialData || {};
  const ks = raw.defaultKeyStatistics || {};
  const sd = raw.summaryDetail || {};
  const sp = raw.summaryProfile || {};
  const income = raw.incomeStatementHistory?.incomeStatementHistory || [];
  const balance = raw.balanceSheetHistory?.balanceSheetStatements || [];
  const cashflow = raw.cashflowStatementHistory?.cashflowStatements || [];

  const latestIncome = income[0];
  const latestBalance = balance[0];
  const latestCash = cashflow[0];

  return {
    available: true,
    source: "Yahoo Finance quoteSummary API",
    fetchedAt: new Date().toISOString(),
    businessOverview: {
      companyProfile: v(sp.longBusinessSummary, "Yahoo summaryProfile"),
      businessSegments: unavailableField("Segment breakdown requires licensed filings feed"),
      revenueSources: unavailableField("Revenue source breakdown requires licensed filings feed"),
      marketPosition: v(sp.industry, "Yahoo summaryProfile"),
    },
    fundamentalAnalysis: {
      revenueGrowth: v(fd.revenueGrowth, "Yahoo financialData"),
      profitGrowth: v(fd.earningsGrowth, "Yahoo financialData"),
      ebitdaGrowth: unavailableField("EBITDA growth series unavailable from current feed"),
      roe: v(ks.returnOnEquity, "Yahoo defaultKeyStatistics"),
      roce: unavailableField("ROCE unavailable from current feed"),
      debtToEquity: v(fd.debtToEquity, "Yahoo financialData"),
      operatingMargin: v(fd.operatingMargins, "Yahoo financialData"),
      netMargin: v(fd.profitMargins, "Yahoo financialData"),
      freeCashFlow: v(fd.freeCashflow, "Yahoo financialData"),
      earningsTrend: v(fd.earningsGrowth, "Yahoo financialData"),
    },
    financialStatements: {
      incomeStatement: {
        revenue: latestIncome ? v(latestIncome.totalRevenue, "Yahoo incomeStatementHistory") : unavailableField(),
        ebitda: latestIncome ? v(latestIncome.ebitda, "Yahoo incomeStatementHistory") : unavailableField(),
        pat: latestIncome ? v(latestIncome.netIncome, "Yahoo incomeStatementHistory") : unavailableField(),
      },
      balanceSheet: {
        assets: latestBalance ? v(latestBalance.totalAssets, "Yahoo balanceSheetHistory") : unavailableField(),
        liabilities: latestBalance ? v(latestBalance.totalLiab, "Yahoo balanceSheetHistory") : unavailableField(),
        debt: latestBalance ? v(latestBalance.longTermDebt, "Yahoo balanceSheetHistory") : unavailableField(),
        equity: latestBalance ? v(latestBalance.totalStockholderEquity, "Yahoo balanceSheetHistory") : unavailableField(),
      },
      cashFlow: {
        operating: latestCash ? v(latestCash.totalCashFromOperatingActivities, "Yahoo cashflowStatementHistory") : unavailableField(),
        investing: latestCash ? v(latestCash.totalCashflowsFromInvestingActivities, "Yahoo cashflowStatementHistory") : unavailableField(),
        financing: latestCash ? v(latestCash.totalCashFromFinancingActivities, "Yahoo cashflowStatementHistory") : unavailableField(),
      },
    },
    historicalTrends: {
      income3y: income.slice(0, 3).map((row) => ({
        year: row.endDate?.fmt || row.endDate?.raw,
        revenue: row.totalRevenue,
        pat: row.netIncome,
        source: "Yahoo incomeStatementHistory",
      })),
      income5y: income.slice(0, 5),
      income10y: income.slice(0, 10),
      available: income.length > 0,
    },
    valuation: {
      peRatio: v(sd.trailingPE, "Yahoo summaryDetail"),
      pbRatio: v(sd.priceToBook, "Yahoo summaryDetail"),
      marketCap: v(sd.marketCap, "Yahoo summaryDetail"),
    },
  };
}

function buildUnavailableFundamentals() {
  const u = () => unavailableField();
  return {
    available: false,
    source: "Yahoo Finance quoteSummary API",
    fetchedAt: new Date().toISOString(),
    message: UNAVAILABLE_FIELD,
    businessOverview: {
      companyProfile: u(),
      businessSegments: u(),
      revenueSources: u(),
      marketPosition: u(),
    },
    fundamentalAnalysis: {
      revenueGrowth: u(),
      profitGrowth: u(),
      ebitdaGrowth: u(),
      roe: u(),
      roce: u(),
      debtToEquity: u(),
      operatingMargin: u(),
      netMargin: u(),
      freeCashFlow: u(),
      earningsTrend: u(),
    },
    financialStatements: {
      incomeStatement: { revenue: u(), ebitda: u(), pat: u() },
      balanceSheet: { assets: u(), liabilities: u(), debt: u(), equity: u() },
      cashFlow: { operating: u(), investing: u(), financing: u() },
    },
    historicalTrends: {
      available: false,
      message: UNAVAILABLE_FIELD,
      income3y: [],
      income5y: [],
      income10y: [],
    },
    valuation: { peRatio: u(), pbRatio: u(), marketCap: u() },
  };
}

async function fetchFundamentals(symbol) {
  const raw = await fetchYahooFundamentals(symbol);
  if (!raw) return buildUnavailableFundamentals();
  return buildFromYahoo(raw, symbol);
}

module.exports = { fetchFundamentals, buildUnavailableFundamentals };