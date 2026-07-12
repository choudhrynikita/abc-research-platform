const { fetchChart } = require("./yahoo");
const { computeIndicators, technicalSignal } = require("./indicators");
const { fetchFundamentals } = require("./fundamentals");
const { rankTop50 } = require("./top50-scoring");
const { loadConstituents, buildNifty500Dashboard } = require("./nifty500");
const { unavailable } = require("./compliance");
const { mapPool } = require("./async-pool");
const { readJson, writeJson } = require("./json-store");

const INDEX_TICKERS = [
  { symbol: "^NSEI", label: "NIFTY 50", key: "nifty50" },
  { symbol: "^NSEBANK", label: "BANK NIFTY", key: "banknifty" },
  { symbol: "NIFTY_FIN_SERVICE.NS", label: "FINNIFTY", key: "finnifty" },
  { symbol: "^INDIAVIX", label: "INDIA VIX", key: "vix" },
];

/**
 * Fast mode (default on Vercel unless ABC_TOP50_FULL=1):
 * Screen a liquid priority subset first so Hobby 60s limits don't fail cold starts.
 * Full 500: set ABC_TOP50_FULL=1 or ABC_TOP50_FAST=0 (and Pro maxDuration).
 */
function isFastScreenMode() {
  if (process.env.ABC_TOP50_FULL === "1" || process.env.ABC_TOP50_FULL === "true") return false;
  if (process.env.ABC_TOP50_FAST === "0" || process.env.ABC_TOP50_FAST === "false") return false;
  if (process.env.ABC_TOP50_FAST === "1" || process.env.ABC_TOP50_FAST === "true") return true;
  return Boolean(process.env.VERCEL);
}

/** Full-universe screen concurrency — keep Vercel/Yahoo friendly */
const SCREEN_CONCURRENCY = 18;
/** Deep fundamental enrichment pool for top candidates */
const DEEP_CONCURRENCY = 10;
/** Preliminary shortlist size before fundamental re-score */
const PRELIM_SHORTLIST = 60;
/** Fast-mode max names to chart-screen */
const FAST_SCREEN_LIMIT = 120;
/** In-memory hot cache */
const DASHBOARD_CACHE_TTL_MS = 12 * 60 * 1000;
/** Persistent JSON/KV cache — serves cold starts while allowing background refresh */
const PERSIST_CACHE_FILE = "top50-dashboard-cache.json";
const PERSIST_CACHE_TTL_MS = 30 * 60 * 1000;
/** Phase-1 chart range: 6mo ≈ 120 bars — enough for SMA50/RSI/backtest without 5y cost */
const SCREEN_RANGE = "6mo";

let dashboardCache = { value: null, expiresAt: 0 };
let rebuildInFlight = null;

function pctChange(from, to) {
  if (from == null || to == null || from === 0) return null;
  return Number((((to - from) / from) * 100).toFixed(2));
}

function cagr(from, to, years) {
  if (from == null || to == null || from <= 0 || years <= 0) return null;
  return Number(((Math.pow(to / from, 1 / years) - 1) * 100).toFixed(2));
}

function val(field) {
  if (field == null) return null;
  if (typeof field === "object") return field.available === false ? null : field.value ?? null;
  return field;
}

async function fetchIndexSnapshot({ symbol, label, key }) {
  try {
    const chart = await fetchChart(symbol, "1d", "1y");
    const candles = chart.candles.filter((c) => c.close != null);
    const latest = candles.at(-1);
    const prev = candles.at(-2);
    const weekAgo = candles.at(-6);
    const monthAgo = candles.at(-22);
    const ytdStart = candles.find((c) => c.date >= `${new Date().getFullYear()}-01-01`);
    const yearAgo = candles.at(-252) ?? candles[0];

    return {
      key,
      symbol,
      label,
      price: latest?.close ?? chart.meta?.regularMarketPrice ?? null,
      changePercent: prev ? pctChange(prev.close, latest?.close) : null,
      weeklyChangePercent: weekAgo ? pctChange(weekAgo.close, latest?.close) : null,
      monthlyChangePercent: monthAgo ? pctChange(monthAgo.close, latest?.close) : null,
      ytdChangePercent: ytdStart ? pctChange(ytdStart.close, latest?.close) : null,
      yearChangePercent: yearAgo ? pctChange(yearAgo.close, latest?.close) : null,
      updatedAt: chart.meta?.regularMarketTime
        ? new Date(chart.meta.regularMarketTime * 1000).toISOString()
        : new Date().toISOString(),
      source: "Yahoo Finance Chart API",
    };
  } catch (e) {
    return {
      key,
      symbol,
      label,
      price: null,
      error: e.message,
      source: "Yahoo Finance Chart API",
    };
  }
}

function applyFundamentals(base, fundamentals) {
  const fd = fundamentals?.fundamentalAnalysis || {};
  const valn = fundamentals?.valuation || {};
  const profile = fundamentals?.businessOverview || {};
  const sh = fundamentals?.shareholding || {};

  return {
    ...base,
    industry: val(profile.marketPosition) || base.industry || unavailable("industry", "Industry classification unavailable"),
    marketCap: valn.marketCap ?? unavailable("marketCap", "Market cap unavailable from current feed"),
    peRatio: valn.peRatio ?? unavailable("peRatio", "P/E unavailable from current feed"),
    forwardPe: valn.forwardPe ?? unavailable("forwardPe", "Forward P/E unavailable from current feed"),
    pbRatio: valn.pbRatio ?? unavailable("pbRatio", "P/B unavailable from current feed"),
    enterpriseValue: valn.enterpriseValue ?? unavailable("enterpriseValue", "Enterprise value unavailable from current feed"),
    roe: fd.roe ?? unavailable("roe", "ROE unavailable from current feed"),
    roa: fd.roa ?? unavailable("roa", "ROA unavailable from current feed"),
    // Transparent ROCE when Yahoo statements support it
    roce: fd.roce ?? unavailable("roce", "ROCE requires verified EBIT and capital employed from statements"),
    debtToEquity: fd.debtToEquity ?? unavailable("debtToEquity", "Debt/Equity unavailable from current feed"),
    operatingMargin: fd.operatingMargin ?? unavailable("operatingMargin", "Operating margin unavailable"),
    netMargin: fd.netMargin ?? unavailable("netMargin", "Net margin unavailable"),
    grossMargin: fd.grossMargin ?? unavailable("grossMargin", "Gross margin unavailable"),
    epsGrowth: fd.profitGrowth ?? fd.earningsTrend ?? unavailable("epsGrowth", "EPS growth unavailable"),
    revenueGrowth: fd.revenueGrowth ?? unavailable("revenueGrowth", "Revenue growth unavailable"),
    profitGrowth: fd.profitGrowth ?? unavailable("profitGrowth", "Profit growth unavailable"),
    freeCashFlow: fd.freeCashFlow ?? unavailable("freeCashFlow", "FCF unavailable"),
    operatingCashFlow: fd.operatingCashFlow ?? unavailable("operatingCashFlow", "Operating cash flow unavailable"),
    currentRatio: fd.currentRatio ?? unavailable("currentRatio", "Current ratio unavailable"),
    trailingEps: fd.trailingEps ?? unavailable("trailingEps", "Trailing EPS unavailable"),
    beta: fd.beta ?? unavailable("beta", "Beta unavailable"),
    pegRatio: valn.pegRatio ?? unavailable("peg", "PEG ratio unavailable from current feed"),
    evEbitda: valn.evEbitda ?? unavailable("evEbitda", "EV/EBITDA unavailable from current feed"),
    dividendYield: valn.dividendYield ?? unavailable("dividendYield", "Dividend yield unavailable from current feed"),
    // NSE SHP (promoter/FII/DII) merged into fundamentals.shareholding when available
    institutionalHolding: sh.institutional ?? unavailable("institutional", "Institutional % unavailable from NSE SHP / Yahoo"),
    promoterHolding: sh.promoter ?? unavailable("promoter", "Promoter % unavailable from NSE SHP"),
    fiiChange: sh.fii ?? unavailable("fiiChange", "FII % unavailable from NSE SHP XBRL"),
    diiChange: sh.dii ?? unavailable("diiChange", "DII % unavailable from NSE SHP XBRL"),
    mutualFundHolding: sh.mutualFunds ?? unavailable("mutualFund", "Mutual fund % unavailable from NSE SHP / Yahoo"),
    insiderHolding: sh.insiders ?? unavailable("insiders", "Insider % not in Yahoo majorHolders for this symbol"),
    publicHolding: sh.public ?? unavailable("public", "Public % unavailable from NSE SHP"),
    shareholdingAsOf: sh.asOf || null,
    shareholdingNote: sh.message || null,
    fundamentalsAvailable: fundamentals?.available === true,
    fundamentalsSource: fundamentals?.source || "Yahoo Finance quoteSummary API",
    fundamentalsMessage: fundamentals?.available
      ? null
      : fundamentals?.message || "Verified fundamental data is currently unavailable from the data feed.",
  };
}

function emptyFundamentalFields(base) {
  return {
    ...base,
    industry: unavailable("industry", "Industry classification unavailable"),
    marketCap: unavailable("marketCap", "Market cap unavailable from current feed"),
    peRatio: unavailable("peRatio", "P/E unavailable from current feed"),
    forwardPe: unavailable("forwardPe", "Forward P/E unavailable from current feed"),
    pbRatio: unavailable("pbRatio", "P/B unavailable from current feed"),
    enterpriseValue: unavailable("enterpriseValue", "Enterprise value unavailable from current feed"),
    roe: unavailable("roe", "ROE unavailable from current feed"),
    roa: unavailable("roa", "ROA unavailable from current feed"),
    roce: unavailable("roce", "ROCE deferred until shortlist enrichment"),
    debtToEquity: unavailable("debtToEquity", "Debt/Equity unavailable from current feed"),
    operatingMargin: unavailable("operatingMargin", "Operating margin unavailable"),
    netMargin: unavailable("netMargin", "Net margin unavailable"),
    grossMargin: unavailable("grossMargin", "Gross margin unavailable"),
    epsGrowth: unavailable("epsGrowth", "EPS growth unavailable"),
    revenueGrowth: unavailable("revenueGrowth", "Revenue growth unavailable"),
    profitGrowth: unavailable("profitGrowth", "Profit growth unavailable"),
    freeCashFlow: unavailable("freeCashFlow", "FCF unavailable"),
    operatingCashFlow: unavailable("operatingCashFlow", "Operating cash flow unavailable"),
    currentRatio: unavailable("currentRatio", "Current ratio unavailable"),
    trailingEps: unavailable("trailingEps", "Trailing EPS unavailable"),
    beta: unavailable("beta", "Beta unavailable"),
    pegRatio: unavailable("peg", "PEG ratio unavailable from current feed"),
    evEbitda: unavailable("evEbitda", "EV/EBITDA unavailable from current feed"),
    dividendYield: unavailable("dividendYield", "Dividend yield unavailable from current feed"),
    fundamentalsAvailable: false,
    fundamentalsSource: "Yahoo Finance quoteSummary API",
    fundamentalsMessage: "Fundamentals deferred until shortlist enrichment (universe screen phase).",
  };
}

/**
 * Phase-1 screen: 1y OHLCV + technicals only (no fundamentals).
 * Fast enough for full NIFTY 500 with bounded concurrency.
 */
async function fetchScreenQuote(item) {
  try {
    const chart = await fetchChart(item.symbol, "1d", SCREEN_RANGE);
    const meta = chart.meta;
    const candles = chart.candles.filter((c) => c.close != null);
    const latest = candles.at(-1);
    const prev = candles.at(-2);
    const weekAgo = candles.at(-6);
    const monthAgo = candles.at(-22);
    const ytdStart = candles.find((c) => c.date >= `${new Date().getFullYear()}-01-01`);
    const yearAgo = candles.at(-252) ?? candles[0];

    const price = meta.regularMarketPrice ?? latest?.close ?? null;

    let base = {
      symbol: item.symbol,
      name: meta.shortName || meta.longName || item.name,
      sector: item.sector,
      price,
      change: price != null && prev?.close != null ? Number((price - prev.close).toFixed(2)) : null,
      changePercent: prev?.close != null ? pctChange(prev.close, price) : null,
      weeklyChangePercent: weekAgo ? pctChange(weekAgo.close, latest?.close) : null,
      monthlyChangePercent: monthAgo ? pctChange(monthAgo.close, latest?.close) : null,
      ytdReturn: ytdStart ? pctChange(ytdStart.close, latest?.close) : null,
      oneYearReturn: yearAgo ? pctChange(yearAgo.close, latest?.close) : null,
      threeYearCagr: null,
      fiveYearCagr: null,
      volume: meta.regularMarketVolume ?? latest?.volume ?? null,
      deliveryPercent: unavailable("delivery", "Delivery % requires NSE exchange data feed"),
      institutionalHolding: unavailable("institutional", "Institutional holding requires NSE/BSE shareholding feed"),
      promoterHolding: unavailable("promoter", "Promoter holding requires NSE/BSE shareholding feed"),
      fiiChange: unavailable("fiiChange", "FII holding change requires NSE shareholding feed"),
      diiChange: unavailable("diiChange", "DII holding change requires NSE shareholding feed"),
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? null,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? null,
      updatedAt: meta.regularMarketTime
        ? new Date(meta.regularMarketTime * 1000).toISOString()
        : new Date().toISOString(),
      _candles: candles,
    };

    base = emptyFundamentalFields(base);

    if (candles.length >= 30) {
      const indicators = computeIndicators(candles);
      base.technicals = {
        ...indicators.latest,
        trend: technicalSignal(indicators),
        technicalRating: technicalSignal(indicators),
        sma100: null,
        sma200: null,
        ema: indicators.latest.ema12,
      };
      if (candles.length >= 100) {
        const closes = candles.map((c) => c.close);
        const { sma } = require("./indicators");
        const sma100 = sma(closes, 100);
        const sma200 = sma(closes, 200);
        base.technicals.sma100 = sma100.at(-1);
        base.technicals.sma200 = sma200.at(-1);
      }
    } else {
      base.technicals = null;
    }

    return base;
  } catch (error) {
    return {
      symbol: item.symbol,
      name: item.name,
      sector: item.sector,
      price: null,
      error: error.message,
      technicals: null,
    };
  }
}

/** Full enrich (5y + fundamentals) — used for shortlisted names */
async function fetchEnrichedQuote(item) {
  try {
    const [chart, fundamentals] = await Promise.all([
      fetchChart(item.symbol, "1d", "5y"),
      fetchFundamentals(item.symbol).catch(() => null),
    ]);

    const meta = chart.meta;
    const candles = chart.candles.filter((c) => c.close != null);
    const latest = candles.at(-1);
    const prev = candles.at(-2);
    const weekAgo = candles.at(-6);
    const monthAgo = candles.at(-22);
    const ytdStart = candles.find((c) => c.date >= `${new Date().getFullYear()}-01-01`);
    const yearAgo = candles.at(-252) ?? candles[0];
    const threeYearAgo = candles.at(-756) ?? candles[0];
    const fiveYearAgo = candles[0];

    const price = meta.regularMarketPrice ?? latest?.close ?? null;

    let base = {
      symbol: item.symbol,
      name: meta.shortName || meta.longName || item.name,
      sector: item.sector,
      price,
      change: price != null && prev?.close != null ? Number((price - prev.close).toFixed(2)) : null,
      changePercent: prev?.close != null ? pctChange(prev.close, price) : null,
      weeklyChangePercent: weekAgo ? pctChange(weekAgo.close, latest?.close) : null,
      monthlyChangePercent: monthAgo ? pctChange(monthAgo.close, latest?.close) : null,
      ytdReturn: ytdStart ? pctChange(ytdStart.close, latest?.close) : null,
      oneYearReturn: yearAgo ? pctChange(yearAgo.close, latest?.close) : null,
      threeYearCagr: cagr(threeYearAgo?.close, latest?.close, 3),
      fiveYearCagr: cagr(fiveYearAgo?.close, latest?.close, 5),
      volume: meta.regularMarketVolume ?? latest?.volume ?? null,
      deliveryPercent: unavailable("delivery", "Delivery % requires NSE exchange data feed"),
      institutionalHolding: unavailable("institutional", "Institutional holding requires NSE/BSE shareholding feed"),
      promoterHolding: unavailable("promoter", "Promoter holding requires NSE/BSE shareholding feed"),
      fiiChange: unavailable("fiiChange", "FII holding change requires NSE shareholding feed"),
      diiChange: unavailable("diiChange", "DII holding change requires NSE shareholding feed"),
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? null,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? null,
      updatedAt: meta.regularMarketTime
        ? new Date(meta.regularMarketTime * 1000).toISOString()
        : new Date().toISOString(),
      _candles: candles,
    };

    base = applyFundamentals(base, fundamentals);

    if (candles.length >= 30) {
      const indicators = computeIndicators(candles);
      base.technicals = {
        ...indicators.latest,
        trend: technicalSignal(indicators),
        technicalRating: technicalSignal(indicators),
        sma100: null,
        sma200: null,
        ema: indicators.latest.ema12,
      };
      if (candles.length >= 100) {
        const closes = candles.map((c) => c.close);
        const { sma } = require("./indicators");
        const sma100 = sma(closes, 100);
        const sma200 = sma(closes, 200);
        base.technicals.sma100 = sma100.at(-1);
        base.technicals.sma200 = sma200.at(-1);
      }
    } else {
      base.technicals = null;
    }

    return base;
  } catch (error) {
    return {
      symbol: item.symbol,
      name: item.name,
      sector: item.sector,
      price: null,
      error: error.message,
      technicals: null,
    };
  }
}

/** Attach fundamentals to a screen quote without re-fetching chart when possible */
async function deepEnrichScreenQuote(stock) {
  try {
    const fundamentals = await fetchFundamentals(stock.symbol).catch(() => null);
    const enriched = applyFundamentals(stock, fundamentals);
    // Keep _candles for rule backtest
    return enriched;
  } catch {
    return stock;
  }
}

async function readPersistentCache() {
  try {
    const stored = await readJson(PERSIST_CACHE_FILE, null);
    if (!stored?.payload || !stored?.savedAt) return null;
    const age = Date.now() - new Date(stored.savedAt).getTime();
    if (!Number.isFinite(age) || age < 0) return null;
    return { payload: stored.payload, ageMs: age, savedAt: stored.savedAt };
  } catch {
    return null;
  }
}

async function writePersistentCache(payload) {
  try {
    await writeJson(PERSIST_CACHE_FILE, {
      savedAt: new Date().toISOString(),
      payload,
    });
  } catch {
    // non-fatal
  }
}

/**
 * @param {{ forceRefresh?: boolean }} [opts]
 * Uses memory cache → persistent cache (stale-while-revalidate) → full rebuild.
 */
async function buildInstitutionalDashboard(opts = {}) {
  const forceRefresh = opts.forceRefresh === true;

  if (!forceRefresh && dashboardCache.value && Date.now() < dashboardCache.expiresAt) {
    return {
      ...dashboardCache.value,
      dataIntegrity: {
        ...dashboardCache.value.dataIntegrity,
        cacheHit: true,
        cacheLayer: "memory",
        refreshedAt: dashboardCache.value.dataIntegrity?.refreshedAt,
      },
    };
  }

  // Serve persistent cache immediately on cold start; rebuild in background if stale
  if (!forceRefresh) {
    const persisted = await readPersistentCache();
    if (persisted?.payload) {
      const fresh = persisted.ageMs < PERSIST_CACHE_TTL_MS;
      dashboardCache = {
        value: persisted.payload,
        expiresAt: Date.now() + (fresh ? DASHBOARD_CACHE_TTL_MS : 60_000),
      };
      if (!fresh && !rebuildInFlight) {
        rebuildInFlight = buildInstitutionalDashboardFresh()
          .catch(() => null)
          .finally(() => {
            rebuildInFlight = null;
          });
      }
      return {
        ...persisted.payload,
        dataIntegrity: {
          ...persisted.payload.dataIntegrity,
          cacheHit: true,
          cacheLayer: "persistent",
          cacheAgeMs: persisted.ageMs,
          staleWhileRevalidate: !fresh,
          persistedAt: persisted.savedAt,
          refreshedAt: persisted.payload.dataIntegrity?.refreshedAt,
        },
      };
    }
  }

  if (rebuildInFlight && !forceRefresh) {
    const result = await rebuildInFlight;
    if (result) return result;
  }

  rebuildInFlight = buildInstitutionalDashboardFresh()
    .finally(() => {
      rebuildInFlight = null;
    });
  return rebuildInFlight;
}

/**
 * Priority order for fast screens: keep large/liquid names first (NIFTY-heavy list head
 * is already roughly size-ordered from NSE CSV — take head + random tail sample is avoided).
 */
function selectScreenUniverse(constituentsMeta, fast) {
  if (!fast || constituentsMeta.length <= FAST_SCREEN_LIMIT) {
    return { list: constituentsMeta, mode: "full", screenedCap: constituentsMeta.length };
  }
  return {
    list: constituentsMeta.slice(0, FAST_SCREEN_LIMIT),
    mode: "fast",
    screenedCap: FAST_SCREEN_LIMIT,
    note: `Fast screen of ${FAST_SCREEN_LIMIT}/${constituentsMeta.length} names (set ABC_TOP50_FULL=1 for full NIFTY 500).`,
  };
}

async function buildInstitutionalDashboardFresh() {
  const fast = isFastScreenMode();
  const [baseDashboard, indices, constituentsMeta] = await Promise.all([
    buildNifty500Dashboard({ light: true }),
    Promise.all(INDEX_TICKERS.map(fetchIndexSnapshot)),
    Promise.resolve(loadConstituents()),
  ]);

  const universeSel = selectScreenUniverse(constituentsMeta, fast);

  // Phase 1: technical screen (bounded concurrency) — full or fast subset
  const screened = await mapPool(universeSel.list, SCREEN_CONCURRENCY, fetchScreenQuote);
  const valid = screened.filter((q) => q.price != null);

  const sectorMap = {};
  valid.forEach((q) => {
    if (!sectorMap[q.sector]) sectorMap[q.sector] = { changes: [], count: 0 };
    if (q.changePercent != null) sectorMap[q.sector].changes.push(q.changePercent);
    sectorMap[q.sector].count += 1;
  });
  Object.keys(sectorMap).forEach((sector) => {
    const data = sectorMap[sector];
    data.avgChange =
      data.changes.length > 0
        ? Number((data.changes.reduce((a, b) => a + b, 0) / data.changes.length).toFixed(2))
        : null;
  });

  const indexMonthlyChange = baseDashboard.marketOverview?.monthlyChangePercent ?? null;
  const context = { sectorMap, indexMonthlyChange };

  // Preliminary rank (technical-heavy when fundamentals deferred)
  const prelim = rankTop50(valid, context, PRELIM_SHORTLIST);

  // Phase 2: deep fundamental enrich shortlist (re-attach candles from screen map)
  const screenBySym = new Map(valid.map((q) => [q.symbol, q]));
  const shortlistBase = prelim.map((p) => {
    const full = screenBySym.get(p.symbol);
    return full || p;
  });

  const deep = await mapPool(shortlistBase, DEEP_CONCURRENCY, deepEnrichScreenQuote);
  const top50 = rankTop50(deep, context, 50);

  const slimMover = (q) => ({
    symbol: q.symbol,
    name: q.name,
    sector: q.sector || null,
    price: q.price,
    changePercent: q.changePercent,
    volume: q.volume ?? null,
    marketCap: q.marketCap ?? null,
  });

  const gainers = [...valid]
    .filter((q) => q.changePercent != null && Number.isFinite(q.changePercent))
    .sort((a, b) => b.changePercent - a.changePercent)
    .slice(0, 10)
    .map(slimMover);
  const losers = [...valid]
    .filter((q) => q.changePercent != null && Number.isFinite(q.changePercent))
    .sort((a, b) => a.changePercent - b.changePercent)
    .slice(0, 10)
    .map(slimMover);
  const mostActive = [...valid]
    .filter((q) => q.volume != null && Number.isFinite(q.volume))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 10)
    .map(slimMover);

  const sectors = Object.entries(sectorMap)
    .map(([sector, data]) => ({
      sector,
      avgChange: data.avgChange,
      count: data.count,
      momentum:
        data.avgChange != null
          ? data.avgChange > 0.3
            ? "BULLISH"
            : data.avgChange < -0.3
              ? "BEARISH"
              : "NEUTRAL"
          : null,
    }))
    .sort((a, b) => (b.avgChange ?? 0) - (a.avgChange ?? 0));

  const payload = {
    title: "Top 50 Stocks to Buy",
    subtitle: "Quantitative screening from verified market data — no estimated fundamentals",
    universe: {
      totalConstituents: constituentsMeta.length,
      screened: valid.length,
      screenMode: universeSel.mode,
      shortlistEnriched: deep.length,
      note:
        universeSel.mode === "fast"
          ? universeSel.note
          : constituentsMeta.length >= 450
            ? `Full NIFTY 500 reference universe (${constituentsMeta.length} names). Phase-1 technical screen of all constituents; phase-2 fundamental enrichment of top ${PRELIM_SHORTLIST} before final Top 50 ranking.`
            : `Screening ${constituentsMeta.length}-stock reference universe.`,
      source: "NSE NIFTY 500 index constituent list + Yahoo Finance live quotes",
      methodology: {
        phase1: `${SCREEN_RANGE} OHLCV technical screen (bounded concurrency, mode=${universeSel.mode})`,
        phase2: `quoteSummary fundamentals for top ${PRELIM_SHORTLIST} by multi-factor score`,
        phase3: "Final Top 50 with institutional dossier + rule backtest",
        fullUniverseEnv: "ABC_TOP50_FULL=1",
      },
    },
    marketOverview: {
      indices: indices.reduce((acc, idx) => {
        acc[idx.key] = idx;
        return acc;
      }, {}),
      breadth: {
        ...baseDashboard.marketBreadth,
        sampleSize: valid.length,
        advancers: valid.filter((q) => (q.changePercent ?? 0) > 0).length,
        decliners: valid.filter((q) => (q.changePercent ?? 0) < 0).length,
      },
      nifty500: baseDashboard.marketOverview,
    },
    top50,
    marketMovers: { gainers, losers, mostActive },
    sectorHeatmap: sectors,
    sectorRotation: {
      leading: sectors.slice(0, 3),
      lagging: sectors.slice(-3).reverse(),
    },
    filters: {
      sectors: [...new Set(constituentsMeta.map((c) => c.sector))].sort(),
      marketCaps: ["Large Cap", "Mid Cap", "Small Cap"],
    },
    dataIntegrity: {
      policy: "Never hallucinate. Unverified metrics display as Data Not Available.",
      priceSource: "Yahoo Finance Chart API",
      fundamentalsSource: "Yahoo Finance quoteSummary API (shortlist only)",
      shareholdingSource:
        "Yahoo majorHoldersBreakdown when available; NSE promoter/FII/DII categories require licensed feed — never fabricated",
      roceSource: "Computed ROCE = EBIT ÷ Capital Employed only when Yahoo statements provide both",
      constituentSource: "NSE ind_nifty500list.csv (static seed, refresh via scripts/build-nifty500-constituents.js)",
      screenRange: SCREEN_RANGE,
      cacheHit: false,
      cacheLayer: "live",
      refreshedAt: new Date().toISOString(),
    },
  };

  dashboardCache = { value: payload, expiresAt: Date.now() + DASHBOARD_CACHE_TTL_MS };
  await writePersistentCache(payload);
  return payload;
}

module.exports = {
  buildInstitutionalDashboard,
  fetchEnrichedQuote,
  fetchScreenQuote,
};
