const { unavailableField, UNAVAILABLE_FIELD, metricMeta } = require("./format");
const { fetchWithTimeout } = require("./fetch-utils");
const { YAHOO_HEADERS } = require("./yahoo");

const YAHOO_BROWSER_HEADERS = {
  ...YAHOO_HEADERS,
  "Accept-Language": "en-US,en;q=0.9",
};

/** Yahoo quoteSummary values are often `{ raw, fmt }` objects. Never treat the wrapper as a number. */
function raw(val) {
  if (val == null) return null;
  if (typeof val === "number") return Number.isFinite(val) ? val : null;
  if (typeof val === "string") {
    const n = Number(val);
    return Number.isFinite(n) ? n : val || null;
  }
  if (typeof val === "object") {
    if (val.raw != null && typeof val.raw === "number" && Number.isFinite(val.raw)) return val.raw;
    if (val.raw != null && typeof val.raw === "string") {
      const n = Number(val.raw);
      return Number.isFinite(n) ? n : val.raw;
    }
    if (typeof val.fmt === "string" && val.fmt.trim()) return null; // fmt-only is not trusted as numeric
  }
  return null;
}

function rawText(val) {
  if (val == null) return null;
  if (typeof val === "string" && val.trim()) return val.trim();
  if (typeof val === "object" && typeof val.longFmt === "string") return val.longFmt;
  if (typeof val === "object" && typeof val.fmt === "string") return val.fmt;
  return null;
}

let crumbCache = { crumb: null, cookie: null, expiresAt: 0 };

async function getYahooSession() {
  const now = Date.now();
  if (crumbCache.crumb && crumbCache.cookie && crumbCache.expiresAt > now) {
    return { crumb: crumbCache.crumb, cookie: crumbCache.cookie };
  }

  // Establish A3 cookie session (required for crumb + quoteSummary).
  const fcRes = await fetchWithTimeout(
    "https://fc.yahoo.com",
    { headers: YAHOO_BROWSER_HEADERS, redirect: "manual" },
    12_000
  ).catch(() => null);

  let cookie = "";
  if (fcRes) {
    const setCookie =
      typeof fcRes.headers.getSetCookie === "function"
        ? fcRes.headers.getSetCookie()
        : [fcRes.headers.get("set-cookie")].filter(Boolean);
    cookie = setCookie.map((c) => String(c).split(";")[0]).join("; ");
  }

  const crumbRes = await fetchWithTimeout(
    "https://query1.finance.yahoo.com/v1/test/getcrumb",
    {
      headers: {
        ...YAHOO_BROWSER_HEADERS,
        Accept: "*/*",
        ...(cookie ? { Cookie: cookie } : {}),
      },
    },
    12_000
  );

  const crumb = await crumbRes.text();
  if (!crumbRes.ok || !crumb || crumb.includes("{") || crumb.includes("<")) {
    throw new Error("Yahoo crumb unavailable");
  }

  crumbCache = {
    crumb: crumb.trim(),
    cookie,
    expiresAt: now + 45 * 60 * 1000,
  };
  return { crumb: crumbCache.crumb, cookie: crumbCache.cookie };
}

async function fetchYahooFundamentals(symbol) {
  try {
    const { crumb, cookie } = await getYahooSession();
    const modules = [
      "summaryProfile",
      "financialData",
      "defaultKeyStatistics",
      "summaryDetail",
      "incomeStatementHistory",
      "incomeStatementHistoryQuarterly",
      "balanceSheetHistory",
      "balanceSheetHistoryQuarterly",
      "cashflowStatementHistory",
      "cashflowStatementHistoryQuarterly",
      "calendarEvents",
    ].join(",");

    const hosts = ["query1.finance.yahoo.com", "query2.finance.yahoo.com"];
    let lastError = null;

    for (const host of hosts) {
      const url = `https://${host}/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}&crumb=${encodeURIComponent(crumb)}`;
      const res = await fetchWithTimeout(
        url,
        {
          headers: {
            ...YAHOO_BROWSER_HEADERS,
            Accept: "application/json",
            ...(cookie ? { Cookie: cookie } : {}),
          },
        },
        20_000
      );

      if (!res.ok) {
        lastError = new Error(`Yahoo fundamentals HTTP ${res.status}`);
        // Invalidate crumb on auth failures so the next call refreshes the session.
        if (res.status === 401 || res.status === 403) {
          crumbCache = { crumb: null, cookie: null, expiresAt: 0 };
        }
        continue;
      }

      const data = await res.json();
      const r = data.quoteSummary?.result?.[0];
      if (!r) {
        lastError = new Error(data?.quoteSummary?.error?.description || "Empty fundamentals response");
        continue;
      }
      return r;
    }

    throw lastError || new Error("Yahoo fundamentals unavailable");
  } catch {
    return null;
  }
}

function v(val, source, { asText = false } = {}) {
  const value = asText ? rawText(val) ?? (typeof val === "string" ? val : null) : raw(val);
  if (value == null || (typeof value === "number" && Number.isNaN(value))) {
    return unavailableField(`Source does not provide this information (${source})`);
  }
  return {
    available: true,
    value,
    display: typeof value === "number" ? Number(value.toFixed(6)) : value,
    source,
    ...metricMeta(source, new Date().toISOString(), "Fresh"),
  };
}

/**
 * Prefer first available numeric field from candidates.
 */
function firstAvailable(candidates, source) {
  for (const c of candidates) {
    const n = raw(c);
    if (n != null) return v(n, source);
  }
  return unavailableField(`Source does not provide this information (${source})`);
}

function mapStatementRows(rows, sourceLabel) {
  return (rows || []).slice(0, 8).map((row) => ({
    period:
      row.endDate?.fmt ||
      (row.endDate?.raw ? new Date(row.endDate.raw * 1000).toISOString().slice(0, 10) : null),
    revenue: raw(row.totalRevenue),
    ebitda: raw(row.ebitda ?? row.ebit),
    netIncome: raw(row.netIncome),
    totalAssets: raw(row.totalAssets),
    totalLiab: raw(row.totalLiab),
    totalEquity: raw(row.totalStockholderEquity),
    operatingCashFlow: raw(row.totalCashFromOperatingActivities),
    freeCashFlow: raw(row.freeCashFlow),
    source: sourceLabel,
  }));
}

function buildFromYahoo(rawData) {
  const fd = rawData.financialData || {};
  const ks = rawData.defaultKeyStatistics || {};
  const sd = rawData.summaryDetail || {};
  const sp = rawData.summaryProfile || {};
  const income = rawData.incomeStatementHistory?.incomeStatementHistory || [];
  const incomeQ = rawData.incomeStatementHistoryQuarterly?.incomeStatementHistory || [];
  const balance = rawData.balanceSheetHistory?.balanceSheetStatements || [];
  const balanceQ = rawData.balanceSheetHistoryQuarterly?.balanceSheetStatements || [];
  const cashflow = rawData.cashflowStatementHistory?.cashflowStatements || [];
  const cashflowQ = rawData.cashflowStatementHistoryQuarterly?.cashflowStatements || [];
  const cal = rawData.calendarEvents || {};

  const latestIncome = income[0];
  const latestBalance = balance[0];
  const latestCash = cashflow[0];

  const peRatio = firstAvailable([sd.trailingPE, ks.trailingPE], "Yahoo trailing P/E");
  const forwardPe = firstAvailable([sd.forwardPE, ks.forwardPE], "Yahoo forward P/E");
  const pb = firstAvailable([sd.priceToBook, ks.priceToBook], "Yahoo price-to-book");
  const marketCap = firstAvailable([sd.marketCap, ks.marketCap], "Yahoo market cap");
  const dividendYield = firstAvailable(
    [sd.dividendYield, sd.trailingAnnualDividendYield, ks.yield],
    "Yahoo dividend yield"
  );
  const beta = firstAvailable([sd.beta, ks.beta], "Yahoo beta");
  const trailingEps = firstAvailable([ks.trailingEps, sd.trailingEps], "Yahoo trailing EPS");
  const enterpriseValue = firstAvailable([ks.enterpriseValue, sd.enterpriseValue], "Yahoo enterprise value");
  // EV/EBITDA / PEG only when Yahoo provides them — never estimate from partial inputs.
  const evEbitda = firstAvailable([ks.enterpriseToEbitda, sd.enterpriseToEbitda], "Yahoo EV/EBITDA");
  const pegRatio = firstAvailable([ks.pegRatio, sd.pegRatio], "Yahoo PEG ratio");
  // Price/Sales and EV/Sales only when Yahoo provides them — never estimated.
  const priceToSales = firstAvailable(
    [sd.priceToSalesTrailing12Months, ks.priceToSalesTrailing12Months],
    "Yahoo price-to-sales (TTM)"
  );
  const enterpriseToRevenue = firstAvailable(
    [ks.enterpriseToRevenue, sd.enterpriseToRevenue],
    "Yahoo EV/Sales (enterpriseToRevenue)"
  );
  const bookValue = firstAvailable([ks.bookValue, sd.bookValue], "Yahoo book value per share");
  const fiftyTwoWeekHigh = firstAvailable(
    [sd.fiftyTwoWeekHigh, ks.fiftyTwoWeekHigh],
    "Yahoo 52-week high"
  );
  const fiftyTwoWeekLow = firstAvailable(
    [sd.fiftyTwoWeekLow, ks.fiftyTwoWeekLow],
    "Yahoo 52-week low"
  );
  const currentPrice = firstAvailable(
    [fd.currentPrice, sd.regularMarketPrice, sd.previousClose],
    "Yahoo current / last price"
  );
  const trailingAnnualDividendRate = firstAvailable(
    [sd.trailingAnnualDividendRate, ks.lastDividendValue],
    "Yahoo trailing annual dividend rate"
  );
  const exDividendDate = v(
    cal.exDividendDate || sd.exDividendDate,
    "Yahoo ex-dividend date",
    { asText: true }
  );
  const sharesOutstanding = firstAvailable(
    [ks.sharesOutstanding, sd.sharesOutstanding],
    "Yahoo shares outstanding"
  );
  // Face value is not a Yahoo standard field for most equities.
  const faceValue = unavailableField("Face value requires exchange master data feed");

  const revenueGrowth = v(fd.revenueGrowth, "Yahoo financialData.revenueGrowth");
  const profitGrowth = v(fd.earningsGrowth, "Yahoo financialData.earningsGrowth");
  const roe = firstAvailable([fd.returnOnEquity, ks.returnOnEquity], "Yahoo ROE");
  const roa = firstAvailable([fd.returnOnAssets, ks.returnOnAssets], "Yahoo ROA");
  // Yahoo debtToEquity is typically reported as a percentage-style figure (e.g. 42.5 = 42.5%).
  const debtToEquity = v(fd.debtToEquity, "Yahoo financialData.debtToEquity");
  const operatingMargin = v(fd.operatingMargins, "Yahoo financialData.operatingMargins");
  const netMargin = firstAvailable([fd.profitMargins, ks.profitMargins], "Yahoo net/profit margin");
  const grossMargin = v(fd.grossMargins, "Yahoo financialData.grossMargins");
  const freeCashFlow = v(fd.freeCashflow, "Yahoo financialData.freeCashflow");
  const operatingCashFlow = v(fd.operatingCashflow, "Yahoo financialData.operatingCashflow");
  const currentRatio = v(fd.currentRatio, "Yahoo financialData.currentRatio");
  const quickRatio = v(fd.quickRatio, "Yahoo financialData.quickRatio");
  const totalCash = v(fd.totalCash, "Yahoo financialData.totalCash");
  const totalDebt = v(fd.totalDebt, "Yahoo financialData.totalDebt");
  const ebitda = v(fd.ebitda, "Yahoo financialData.ebitda");
  const totalRevenue = v(fd.totalRevenue, "Yahoo financialData.totalRevenue");

  const shareholdingUnavailable = unavailableField(
    "Shareholding pattern requires NSE/BSE shareholding feed — never estimated"
  );

  return {
    available: true,
    source: "Yahoo Finance quoteSummary API",
    fetchedAt: new Date().toISOString(),
    businessOverview: {
      companyProfile: v(sp.longBusinessSummary, "Yahoo summaryProfile", { asText: true }),
      // Segment / revenue mix require licensed filings — do not invent.
      businessSegments: unavailableField("Segment breakdown requires licensed filings feed"),
      revenueSources: unavailableField("Revenue source breakdown requires licensed filings feed"),
      marketPosition: v(sp.industry || sp.sector, "Yahoo summaryProfile", { asText: true }),
      sector: v(sp.sector, "Yahoo summaryProfile", { asText: true }),
      industry: v(sp.industry, "Yahoo summaryProfile", { asText: true }),
      country: v(sp.country, "Yahoo summaryProfile", { asText: true }),
      website: v(sp.website, "Yahoo summaryProfile", { asText: true }),
      fullTimeEmployees: v(sp.fullTimeEmployees, "Yahoo summaryProfile"),
    },
    fundamentalAnalysis: {
      revenueGrowth,
      profitGrowth,
      // Explicitly unavailable — Yahoo does not provide multi-period EBITDA growth here.
      ebitdaGrowth: unavailableField("EBITDA growth series unavailable from current feed"),
      roe,
      roa,
      // ROCE is not a standard Yahoo field; never estimate from EBIT/capital employed.
      roce: unavailableField("ROCE unavailable from current feed"),
      debtToEquity,
      operatingMargin,
      netMargin,
      grossMargin,
      freeCashFlow,
      operatingCashFlow,
      currentRatio,
      quickRatio,
      totalCash,
      totalDebt,
      ebitda,
      totalRevenue,
      // Alias kept for scorers — same verified earnings growth field (not a second estimate).
      earningsTrend: profitGrowth,
      trailingEps,
      beta,
      bookValue,
      faceValue,
      fiftyTwoWeekHigh,
      fiftyTwoWeekLow,
      currentPrice,
      trailingAnnualDividendRate,
      exDividendDate,
      sharesOutstanding,
    },
    financialStatements: {
      incomeStatement: {
        revenue: latestIncome
          ? v(latestIncome.totalRevenue, "Yahoo incomeStatementHistory")
          : totalRevenue.available
            ? totalRevenue
            : unavailableField(),
        ebitda: latestIncome
          ? v(latestIncome.ebitda ?? latestIncome.ebit, "Yahoo incomeStatementHistory")
          : ebitda.available
            ? ebitda
            : unavailableField(),
        pat: latestIncome
          ? v(latestIncome.netIncome, "Yahoo incomeStatementHistory")
          : unavailableField(),
      },
      balanceSheet: {
        assets: latestBalance
          ? v(latestBalance.totalAssets, "Yahoo balanceSheetHistory")
          : unavailableField(),
        liabilities: latestBalance
          ? v(latestBalance.totalLiab, "Yahoo balanceSheetHistory")
          : unavailableField(),
        debt: latestBalance
          ? v(latestBalance.longTermDebt ?? latestBalance.totalDebt, "Yahoo balanceSheetHistory")
          : totalDebt.available
            ? totalDebt
            : unavailableField(),
        equity: latestBalance
          ? v(latestBalance.totalStockholderEquity, "Yahoo balanceSheetHistory")
          : unavailableField(),
      },
      cashFlow: {
        operating: latestCash
          ? v(latestCash.totalCashFromOperatingActivities, "Yahoo cashflowStatementHistory")
          : operatingCashFlow.available
            ? operatingCashFlow
            : unavailableField(),
        investing: latestCash
          ? v(latestCash.totalCashflowsFromInvestingActivities, "Yahoo cashflowStatementHistory")
          : unavailableField(),
        financing: latestCash
          ? v(latestCash.totalCashFromFinancingActivities, "Yahoo cashflowStatementHistory")
          : unavailableField(),
      },
      annualResults: mapStatementRows(income, "Yahoo incomeStatementHistory (annual)"),
      quarterlyResults: mapStatementRows(incomeQ, "Yahoo incomeStatementHistoryQuarterly"),
      annualBalance: mapStatementRows(balance, "Yahoo balanceSheetHistory (annual)"),
      quarterlyBalance: mapStatementRows(balanceQ, "Yahoo balanceSheetHistoryQuarterly"),
      annualCashFlow: mapStatementRows(cashflow, "Yahoo cashflowStatementHistory (annual)"),
      quarterlyCashFlow: mapStatementRows(cashflowQ, "Yahoo cashflowStatementHistoryQuarterly"),
    },
    historicalTrends: {
      income3y: income.slice(0, 3).map((row) => ({
        year: row.endDate?.fmt || (row.endDate?.raw ? new Date(row.endDate.raw * 1000).getFullYear() : null),
        revenue: raw(row.totalRevenue),
        pat: raw(row.netIncome),
        source: "Yahoo incomeStatementHistory",
      })),
      income5y: income.slice(0, 5).map((row) => ({
        year: row.endDate?.fmt || null,
        revenue: raw(row.totalRevenue),
        pat: raw(row.netIncome),
        source: "Yahoo incomeStatementHistory",
      })),
      income10y: income.slice(0, 10),
      cashFlowTrends: cashflow.slice(0, 5).map((row) => ({
        period: row.endDate?.fmt || null,
        operating: raw(row.totalCashFromOperatingActivities),
        freeCashFlow: raw(row.freeCashFlow),
        source: "Yahoo cashflowStatementHistory",
      })),
      available: income.length > 0,
    },
    dividend: {
      yield: dividendYield,
      trailingAnnualRate: trailingAnnualDividendRate,
      exDividendDate,
      // Full multi-year dividend history requires a dedicated dividends module / exchange feed.
      history: unavailableField("Detailed multi-year dividend history requires dedicated dividend history feed"),
      recentCorporateActions: unavailableField("Corporate actions require exchange corporate-action feed"),
    },
    shareholding: {
      promoter: shareholdingUnavailable,
      fii: shareholdingUnavailable,
      dii: shareholdingUnavailable,
      mutualFunds: shareholdingUnavailable,
      institutional: shareholdingUnavailable,
      public: shareholdingUnavailable,
      message: "Shareholding pattern is not provided by the current Yahoo quoteSummary modules.",
    },
    valuation: {
      peRatio,
      forwardPe,
      pbRatio: pb,
      marketCap,
      dividendYield,
      enterpriseValue,
      evEbitda,
      pegRatio,
      priceToSales,
      enterpriseToRevenue,
      bookValue,
      currentPrice,
      fiftyTwoWeekHigh,
      fiftyTwoWeekLow,
      faceValue,
      // Intrinsic value only when a documented DCF exists — never invent.
      intrinsicValue: unavailableField("Intrinsic value requires documented DCF with verified inputs — never estimated"),
      // Free cash flow yield = FCF / Market Cap when both verified (transparent calc).
      freeCashFlowYield: (() => {
        const fcf = freeCashFlow.available ? freeCashFlow.value : null;
        const mcap = marketCap.available ? marketCap.value : null;
        if (fcf == null || mcap == null || mcap <= 0 || !Number.isFinite(fcf) || !Number.isFinite(mcap)) {
          return unavailableField("FCF yield requires verified free cash flow and market cap");
        }
        return {
          available: true,
          value: fcf / mcap,
          display: Number((fcf / mcap).toFixed(6)),
          source: "Computed: Yahoo freeCashflow / marketCap",
          methodology: "FCF Yield = Free Cash Flow ÷ Market Capitalization (verified Yahoo inputs only)",
        };
      })(),
    },
  };
}

function buildUnavailableFundamentals() {
  const u = (reason) => unavailableField(reason || UNAVAILABLE_FIELD);
  const shareU = u("Shareholding pattern requires NSE/BSE shareholding feed — never estimated");
  return {
    available: false,
    source: "Yahoo Finance quoteSummary API",
    fetchedAt: new Date().toISOString(),
    message: UNAVAILABLE_FIELD,
    businessOverview: {
      companyProfile: u(),
      businessSegments: u("Segment breakdown requires licensed filings feed"),
      revenueSources: u("Revenue source breakdown requires licensed filings feed"),
      marketPosition: u(),
      sector: u(),
      industry: u(),
      country: u(),
      website: u(),
      fullTimeEmployees: u(),
    },
    fundamentalAnalysis: {
      revenueGrowth: u(),
      profitGrowth: u(),
      ebitdaGrowth: u("EBITDA growth series unavailable from current feed"),
      roe: u(),
      roa: u(),
      roce: u("ROCE unavailable from current feed"),
      debtToEquity: u(),
      operatingMargin: u(),
      netMargin: u(),
      grossMargin: u(),
      freeCashFlow: u(),
      operatingCashFlow: u(),
      currentRatio: u(),
      quickRatio: u(),
      totalCash: u(),
      totalDebt: u(),
      ebitda: u(),
      totalRevenue: u(),
      earningsTrend: u(),
      trailingEps: u(),
      beta: u(),
      bookValue: u(),
      faceValue: u("Face value requires exchange master data feed"),
      fiftyTwoWeekHigh: u(),
      fiftyTwoWeekLow: u(),
      currentPrice: u(),
      trailingAnnualDividendRate: u(),
      exDividendDate: u(),
      sharesOutstanding: u(),
    },
    financialStatements: {
      incomeStatement: { revenue: u(), ebitda: u(), pat: u() },
      balanceSheet: { assets: u(), liabilities: u(), debt: u(), equity: u() },
      cashFlow: { operating: u(), investing: u(), financing: u() },
      annualResults: [],
      quarterlyResults: [],
      annualBalance: [],
      quarterlyBalance: [],
      annualCashFlow: [],
      quarterlyCashFlow: [],
    },
    historicalTrends: {
      available: false,
      message: UNAVAILABLE_FIELD,
      income3y: [],
      income5y: [],
      income10y: [],
      cashFlowTrends: [],
    },
    dividend: {
      yield: u(),
      trailingAnnualRate: u(),
      exDividendDate: u(),
      history: u("Detailed multi-year dividend history requires dedicated dividend history feed"),
      recentCorporateActions: u("Corporate actions require exchange corporate-action feed"),
    },
    shareholding: {
      promoter: shareU,
      fii: shareU,
      dii: shareU,
      mutualFunds: shareU,
      institutional: shareU,
      public: shareU,
      message: "Shareholding pattern is not provided by the current Yahoo quoteSummary modules.",
    },
    valuation: {
      peRatio: u(),
      forwardPe: u(),
      pbRatio: u(),
      marketCap: u(),
      dividendYield: u(),
      enterpriseValue: u(),
      evEbitda: u(),
      pegRatio: u(),
      priceToSales: u(),
      enterpriseToRevenue: u(),
      bookValue: u(),
      currentPrice: u(),
      fiftyTwoWeekHigh: u(),
      fiftyTwoWeekLow: u(),
      faceValue: u("Face value requires exchange master data feed"),
      intrinsicValue: u("Intrinsic value requires documented DCF with verified inputs — never estimated"),
      freeCashFlowYield: u("FCF yield requires verified free cash flow and market cap"),
    },
  };
}

async function fetchFundamentals(symbol) {
  const rawData = await fetchYahooFundamentals(symbol);
  if (!rawData) return buildUnavailableFundamentals();
  return buildFromYahoo(rawData);
}

module.exports = {
  fetchFundamentals,
  buildUnavailableFundamentals,
  fetchYahooFundamentals,
  raw,
};
