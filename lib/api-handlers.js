const { fetchNiftyHistory, fetchChart } = require("./yahoo");
const { sanitizeCandles, normalizeChartRange, buildChartMeta } = require("./chart-series");
const { logApiFailure } = require("./data-logger");
const { computeIndicators } = require("./indicators");
const { buildNiftyPrediction } = require("./ensemble");
const { buildAlignmentReport } = require("./alignment");
const { wrapResponse, wrapIntelligenceError } = require("./compliance");
const { mapApiFailure, MESSAGES } = require("./financial-intelligence");
const { fetchFiiDii } = require("./nse");
const { buildNifty500Dashboard } = require("./nifty500");
const { buildInstitutionalDashboard } = require("./nifty500-institutional");
const { buildInstitutionalFiiDiiDashboard } = require("./fiidii-institutional");
const { buildInstitutionalResearch } = require("./research-institutional");
const { buildInstitutionalStrategyDashboard } = require("./nifty-strategy-institutional");
const { buildInstitutionalEquityFnoDashboard } = require("./equity-fno-institutional");
const { buildResearchReport } = require("./research");
const { logRecommendation, readLog } = require("./audit");
const { toCsv } = require("./reports");
const { generateAndStore } = require("./generate-report");
const { listReports, getReport } = require("./report-store");
const { buildPdfBuffer, buildExcelBuffer, buildCsvFromReport } = require("./export");
const { appendSnapshot, computeTrends } = require("./fii-history");
const { fetchIpoDashboard, fetchIpoDetail, findIpoInDashboard, enrichOpenWithSubscription } = require("./nse-ipo");
const { checkApiAuth, getMutationAuthMode } = require("./api-auth");
const { IPO_UNAVAILABLE_MSG } = require("./format");
const { enrichListedPrice } = require("./ipo-research");
const { buildInstitutionalIpoDashboard, buildInstitutionalIpoDetail } = require("./ipo-institutional");
const { exportTerminal } = require("./terminal-export");
const { answerStrategyQuestion, MAX_QUERY_LEN: MAX_STRATEGY_ASSISTANT_QUERY_LEN } = require("./strategy-assistant");
const { readAlerts, updatePreferences, evaluateAlerts } = require("./ipo-alerts");
const { readJson, writeJson, getStorageMode, isKvConfigured } = require("./json-store");

const CACHE_TTL_MS = 5 * 60 * 1000;
const LIVE_FEED_CACHE_MS = 2 * 60 * 1000;
const DEFAULT_SYMBOLS = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA", "META",
  "RELIANCE.NS", "TCS.NS", "INFY.NS", "HDFCBANK.NS", "ICICIBANK.NS",
  "^NSEI", "^BSESN", "^GSPC",
];

const API_ROUTES = [
  { method: "GET", path: "/api/health", description: "Server health check" },
  { method: "GET", path: "/api", description: "API index" },
  { method: "GET", path: "/api/defaults", description: "Default watchlist symbols" },
  { method: "GET", path: "/api/quotes", description: "Live quotes" },
  { method: "GET", path: "/api/nifty/history", description: "Nifty 50 history" },
  { method: "GET", path: "/api/nifty/prediction", description: "Nifty forecast" },
  { method: "GET", path: "/api/strategies", description: "List strategies" },
  { method: "GET", path: "/api/strategies/alignment", description: "Strategy vs Nifty alignment" },
  { method: "GET", path: "/api/nifty500/dashboard", description: "NIFTY 500 sample dashboard" },
  { method: "GET", path: "/api/nifty500/top50", description: "Institutional Top 50 buy recommendations" },
  { method: "GET", path: "/api/chart/:symbol", description: "OHLCV chart + indicators" },
  { method: "GET", path: "/api/fii-dii", description: "FII/DII live + trends" },
  { method: "GET", path: "/api/fiidii/dashboard", description: "Institutional FII/DII intelligence dashboard" },
  { method: "GET", path: "/api/nifty-strategy/dashboard", description: "Institutional NIFTY options strategy center" },
  { method: "GET", path: "/api/equity-fno/dashboard", description: "Institutional equity F&O strategy center" },
  { method: "GET", path: "/api/research/:symbol", description: "Research report JSON" },
  { method: "GET", path: "/api/research/terminal/:symbol", description: "Institutional research terminal" },
  { method: "GET", path: "/api/ipo/dashboard", description: "IPO dashboard" },
  { method: "GET", path: "/api/ipo/terminal", description: "Institutional IPO research center" },
  { method: "GET", path: "/api/ipo/terminal/:symbol", description: "Institutional IPO detail analysis" },
  { method: "GET", path: "/api/export/:module/pdf", description: "Export module view as PDF" },
  { method: "GET", path: "/api/export/:module/xlsx", description: "Export module data as Excel" },
  { method: "GET", path: "/api/ipo/:symbol", description: "IPO detail" },
  { method: "GET", path: "/api/ipo-alerts", description: "IPO alert log" },
  { method: "GET", path: "/api/audit", description: "Audit log" },
  { method: "GET", path: "/api/report-center", description: "Report archive" },
  { method: "GET", path: "/api/reports/generate/:type", description: "Generate and store report" },
  { method: "GET", path: "/api/report-center/:id/export/:format", description: "Export pdf/xlsx/csv" },
  { method: "POST", path: "/api/copilot", description: "Research copilot" },
  { method: "POST", path: "/api/strategy-assistant", description: "Context-aware strategy derivatives assistant" },
];

const cache = {
  niftyHistory: { value: null, expiresAt: 0 },
  niftyPrediction: { value: null, expiresAt: 0 },
  fiiDii: { value: null, expiresAt: 0 },
  ipoDashboard: { value: null, expiresAt: 0 },
};

const STRATEGIES_FILE = "strategies.json";

function json(status, data, extraHeaders = {}) {
  return {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
    body: data,
    json: true,
  };
}

function text(status, body, extraHeaders = {}) {
  return { status, headers: extraHeaders, body, json: false };
}

function getCached(key) {
  const entry = cache[key];
  if (entry?.value && Date.now() < entry.expiresAt) return entry.value;
  return null;
}

function setCached(key, value, ttlMs = CACHE_TTL_MS) {
  cache[key] = { value, expiresAt: Date.now() + ttlMs };
}

function getMarketState(meta) {
  const now = Math.floor(Date.now() / 1000);
  const periods = meta?.currentTradingPeriod;
  if (!periods) return "UNKNOWN";
  if (periods.pre && now >= periods.pre.start && now < periods.pre.end) return "PRE";
  if (periods.regular && now >= periods.regular.start && now < periods.regular.end) return "REGULAR";
  if (periods.post && now >= periods.post.start && now < periods.post.end) return "POST";
  return "CLOSED";
}

function normalizeChartQuote(meta) {
  const price = meta.regularMarketPrice ?? null;
  const previousClose = meta.chartPreviousClose ?? meta.previousClose ?? null;
  const change = price != null && previousClose != null ? Number((price - previousClose).toFixed(4)) : null;
  const changePercent = change != null && previousClose ? Number(((change / previousClose) * 100).toFixed(4)) : null;
  return {
    symbol: meta.symbol,
    name: meta.shortName || meta.longName || meta.symbol,
    price, change, changePercent,
    volume: meta.regularMarketVolume ?? null,
    marketCap: meta.marketCap ?? null,
    dayHigh: meta.regularMarketDayHigh ?? null,
    dayLow: meta.regularMarketDayLow ?? null,
    previousClose,
    currency: meta.currency || "",
    exchange: meta.fullExchangeName || meta.exchangeName || "",
    marketState: getMarketState(meta),
    updatedAt: meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString() : new Date().toISOString(),
  };
}

async function fetchSymbolQuote(symbol) {
  const chart = await fetchChart(symbol, "1d", "1d");
  if (!chart.meta?.regularMarketPrice && chart.meta?.regularMarketPrice !== 0) {
    throw new Error(`No quote data for ${symbol}`);
  }
  return normalizeChartQuote(chart.meta);
}

async function fetchYahooQuotes(symbols) {
  const uniqueSymbols = [...new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))];
  const settled = await Promise.allSettled(uniqueSymbols.map((symbol) => fetchSymbolQuote(symbol)));
  return settled.map((result, index) => {
    const symbol = uniqueSymbols[index];
    if (result.status === "fulfilled") return result.value;
    return {
      symbol, name: symbol, price: null, change: null, changePercent: null,
      volume: null, marketCap: null, dayHigh: null, dayLow: null, previousClose: null,
      currency: "", exchange: "", marketState: "NOT_FOUND",
      updatedAt: new Date().toISOString(),
      error: result.reason?.message || "Failed to fetch",
    };
  });
}

async function getNiftyHistory() {
  const cached = getCached("niftyHistory");
  if (cached) return cached;
  const history = await fetchNiftyHistory("1y");
  setCached("niftyHistory", history);
  return history;
}

async function getNiftyPrediction() {
  const cached = getCached("niftyPrediction");
  if (cached) return cached;
  const history = await getNiftyHistory();
  const prediction = buildNiftyPrediction(history.candles, { name: history.name });
  prediction.historyCount = history.candles.length;
  setCached("niftyPrediction", prediction);
  return prediction;
}

async function getFiiDiiLive() {
  const cached = getCached("fiiDii");
  if (cached) return cached;
  const data = await fetchFiiDii();
  setCached("fiiDii", data, LIVE_FEED_CACHE_MS);
  return data;
}

async function getIpoDashboardBundle() {
  const cached = getCached("ipoDashboard");
  if (cached) return cached;
  const raw = await fetchIpoDashboard();
  const [open, listedEnriched] = await Promise.all([
    enrichOpenWithSubscription(raw.open),
    Promise.all(raw.listed.slice(0, 15).map(enrichListedPrice)),
  ]);
  const dashboard = { ...raw, open, listedEnriched };
  const alerts = await evaluateAlerts(dashboard);
  const bundle = { dashboard, alerts };
  setCached("ipoDashboard", bundle, LIVE_FEED_CACHE_MS);
  return bundle;
}

async function readStrategies() {
  return readJson(STRATEGIES_FILE, []);
}

const MAX_STRATEGIES = 500;

async function writeStrategies(strategies) {
  await writeJson(STRATEGIES_FILE, strategies.slice(0, MAX_STRATEGIES));
}

function parseOptionalNumber(value) {
  if (value == null || value === "") return null;
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return undefined;
  return num;
}

const MAX_STRATEGY_NAME_LEN = 120;
const MAX_COPILOT_QUERY_LEN = 2000;

function sanitizeStrategyName(name) {
  const trimmed = String(name ?? "").trim().replace(/[\x00-\x1f\x7f]/g, "");
  if (!trimmed) return { error: "name is required" };
  if (trimmed.length > MAX_STRATEGY_NAME_LEN) {
    return { error: `name must be at most ${MAX_STRATEGY_NAME_LEN} characters` };
  }
  return { value: trimmed };
}

function buildStrategyEntry(body, id) {
  const name = sanitizeStrategyName(body.name);
  if (name.error) return { error: name.error };

  const entry = parseOptionalNumber(body.entry);
  const target = parseOptionalNumber(body.target);
  const stopLoss = parseOptionalNumber(body.stopLoss);
  if (entry === undefined || target === undefined || stopLoss === undefined) {
    return { error: "entry, target, and stopLoss must be positive numbers when provided" };
  }
  return {
    id, name: name.value, date: body.date, expiry: body.expiry || "Weekly",
    bias: body.bias || "NEUTRAL", status: body.status || "active",
    entry, target, stopLoss, notes: body.notes || "",
  };
}

function isIpoNotFoundError(error) {
  return String(error?.message || "").includes("not found in NSE IPO feeds");
}

async function handleApi({ method, pathname, query = {}, body = null, authHeader = null }) {
  try {
    const authError = checkApiAuth({ method, pathname, authHeader });
    if (authError) return json(authError.status, authError.body);
    if (method === "GET" && pathname === "/api/health") {
      return json(200, {
        status: "ok",
        project: "abc",
        version: "2.0.0",
        framework: "nextjs",
        storage: getStorageMode(),
        mutationAuth: getMutationAuthMode(),
        apiSecretConfigured: Boolean(process.env.API_SECRET),
        kvConfigured: isKvConfigured(),
        cacheTtlMs: CACHE_TTL_MS,
        liveFeedCacheMs: LIVE_FEED_CACHE_MS,
        timestamp: new Date().toISOString(),
      });
    }

    if (method === "GET" && pathname === "/api") {
      return json(200, { name: "ABC API", version: "2.0.0", framework: "nextjs", routes: API_ROUTES });
    }

    if (method === "GET" && pathname === "/api/defaults") {
      return json(200, { symbols: DEFAULT_SYMBOLS });
    }

    if (method === "GET" && pathname === "/api/quotes") {
      const requested = query.symbols
        ? String(query.symbols).split(",").map((s) => s.trim()).filter(Boolean)
        : DEFAULT_SYMBOLS;
      const quotes = await fetchYahooQuotes(requested);
      return json(200, wrapResponse(
        { count: quotes.length, quotes },
        { source: "Yahoo Finance v8 Chart API (free)", dataType: "factual", confidence: 100 }
      ));
    }

    if (method === "GET" && pathname === "/api/nifty/history") {
      return json(200, await getNiftyHistory());
    }

    if (method === "GET" && pathname === "/api/nifty/prediction") {
      return json(200, await getNiftyPrediction());
    }

    if (method === "GET" && pathname === "/api/strategies") {
      const strategies = await readStrategies();
      return json(200, { count: strategies.length, active: strategies.filter((s) => s.status === "active").length, strategies });
    }

    if (method === "GET" && pathname === "/api/strategies/alignment") {
      return json(200, buildAlignmentReport(await readStrategies(), await getNiftyPrediction()));
    }

    const strategyIdMatch = pathname.match(/^\/api\/strategies\/([^/]+)$/);
    if (method === "GET" && strategyIdMatch && strategyIdMatch[1] !== "alignment") {
      const strategy = (await readStrategies()).find((s) => s.id === strategyIdMatch[1]);
      if (!strategy) return json(404, { error: "Strategy not found" });
      return json(200, strategy);
    }

    if (method === "POST" && pathname === "/api/strategies") {
      if (!body?.name || !body?.date) return json(400, { error: "name and date are required" });
      const built = buildStrategyEntry(body, `strategy-${Date.now()}`);
      if (built.error) return json(400, { error: built.error });
      const strategies = await readStrategies();
      strategies.unshift(built);
      await writeStrategies(strategies);
      return json(201, built);
    }

    if (method === "PATCH" && strategyIdMatch) {
      const strategies = await readStrategies();
      const index = strategies.findIndex((s) => s.id === strategyIdMatch[1]);
      if (index === -1) return json(404, { error: "Strategy not found" });
      const merged = { ...strategies[index], ...body, id: strategies[index].id };
      const built = buildStrategyEntry(merged, merged.id);
      if (built.error) return json(400, { error: built.error });
      strategies[index] = built;
      await writeStrategies(strategies);
      return json(200, built);
    }

    if (method === "DELETE" && strategyIdMatch) {
      const strategies = await readStrategies();
      const index = strategies.findIndex((s) => s.id === strategyIdMatch[1]);
      if (index === -1) return json(404, { error: "Strategy not found" });
      const [removed] = strategies.splice(index, 1);
      await writeStrategies(strategies);
      return json(200, { deleted: true, strategy: removed });
    }

    const dupMatch = pathname.match(/^\/api\/strategies\/([^/]+)\/duplicate$/);
    if (method === "POST" && dupMatch) {
      const strategies = await readStrategies();
      const source = strategies.find((s) => s.id === dupMatch[1]);
      if (!source) return json(404, { error: "Strategy not found" });
      const copy = buildStrategyEntry({ ...source, name: `${source.name} (copy)`, date: new Date().toISOString().slice(0, 10), status: "active" }, `strategy-${Date.now()}`);
      if (copy.error) return json(400, { error: copy.error });
      strategies.unshift(copy);
      await writeStrategies(strategies);
      return json(201, copy);
    }

    if (method === "GET" && pathname === "/api/nifty500/dashboard") {
      const data = await buildNifty500Dashboard();
      return json(200, wrapResponse(data, { source: "Yahoo Finance Chart API + static NIFTY 500 constituent reference", dataType: "factual", confidence: 85 }));
    }

    if (method === "GET" && pathname === "/api/nifty500/top50") {
      const data = await buildInstitutionalDashboard();
      return json(200, wrapResponse(data, {
        source: "Yahoo Finance Chart API + ABC quantitative scoring model",
        dataType: "mixed",
        confidence: 80,
        disclaimer: "Recommendations are quantitative opinions derived from verified data. Not investment advice.",
      }));
    }

    const chartMatch = pathname.match(/^\/api\/chart\/(.+)$/);
    if (method === "GET" && chartMatch) {
      const symbol = decodeURIComponent(chartMatch[1]);
      const range = normalizeChartRange(query.range);
      let chart;
      try {
        chart = await fetchChart(symbol, "1d", range);
      } catch (err) {
        logApiFailure("Yahoo Finance", `/v8/finance/chart/${symbol}`, err, { range });
        const intelErr = mapApiFailure(err, { symbol, action: "Retry chart request or verify symbol listing." });
        return json(intelErr.httpStatus, wrapIntelligenceError(intelErr, {
          chartMeta: buildChartMeta({ symbol, range, candleCount: 0, rejected: 0 }),
        }));
      }

      const sanitized = sanitizeCandles(chart.candles);
      if (!sanitized.available) {
        const intelErr = mapApiFailure(new Error(sanitized.reason || MESSAGES.UNAVAILABLE_GENERAL), {
          symbol,
          httpStatus: 502,
          code: "INSUFFICIENT_VERIFIED_CANDLES",
        });
        return json(502, wrapIntelligenceError(intelErr, {
          chartMeta: buildChartMeta({
            symbol,
            range,
            candleCount: 0,
            rejected: sanitized.rejected,
            fetchedAt: new Date().toISOString(),
          }),
        }));
      }

      const { candles } = sanitized;
      const indicators = computeIndicators(candles);
      const fetchedAt = new Date().toISOString();
      const chartMeta = buildChartMeta({
        symbol,
        range,
        candleCount: candles.length,
        rejected: sanitized.rejected,
        fetchedAt,
      });

      return json(200, wrapResponse(
        {
          symbol,
          range,
          candles,
          meta: chart.meta,
          chartMeta,
          indicators: { latest: indicators.latest, series: indicators.series, rsi: indicators.latest.rsi },
        },
        { source: "Yahoo Finance Chart API", dataType: "factual", lastUpdated: fetchedAt, confidence: 100 }
      ));
    }

    if (method === "GET" && pathname === "/api/fiidii/dashboard") {
      const data = await buildInstitutionalFiiDiiDashboard();
      const confidence = data.available ? (data.usedCache ? 75 : 95) : 0;
      return json(data.available ? 200 : 503, wrapResponse(data, {
        source: "NSE India fiidiiTradeReact API",
        dataType: "factual",
        confidence,
        disclaimer: "Institutional flow data from NSE. Sector/stock-level data requires additional licensed feeds.",
      }));
    }

    if (method === "GET" && pathname === "/api/nifty-strategy/dashboard") {
      const data = await buildInstitutionalStrategyDashboard();
      const chainOk = data.chainStatus?.verified === true;
      return json(200, wrapResponse(data, {
        source: data.source,
        dataType: "mixed",
        confidence: chainOk ? 85 : 55,
        disclaimer: data.disclaimer,
        lastUpdated: data.refreshedAt,
      }));
    }

    if (method === "GET" && pathname === "/api/equity-fno/dashboard") {
      const data = await buildInstitutionalEquityFnoDashboard();
      const chainsOk = (data.executiveSummary?.chainsVerified ?? 0) > 0;
      return json(200, wrapResponse(data, {
        source: data.source,
        dataType: "mixed",
        confidence: chainsOk ? 82 : 52,
        disclaimer: data.disclaimer,
        lastUpdated: data.refreshedAt,
      }));
    }

    if (method === "GET" && pathname === "/api/fii-dii") {
      const data = await getFiiDiiLive();
      const history = await appendSnapshot(data);
      const trends = computeTrends(history);
      const alerts = [];
      if (data.fii?.netValue > 3000) alerts.push({ type: "fii_buying", message: "Significant FII net buying" });
      if (data.fii?.netValue < -3000) alerts.push({ type: "fii_selling", message: "Significant FII net selling" });
      if (data.dii?.netValue > 2000) alerts.push({ type: "dii_buying", message: "Significant DII net buying" });
      if (data.dii?.netValue < -2000) alerts.push({ type: "dii_selling", message: "Significant DII net selling" });
      return json(200, wrapResponse({ ...data, trends, history: history.slice(0, 10), alerts, institutionalAnalysis: {
        smartMoneyDirection: data.fii?.netValue > 0 ? "FII_NET_BUY" : "FII_NET_SELL",
        note: `Weekly/monthly trends computed from ${trends.sessionsTracked} stored NSE sessions.`,
      }}, { source: "NSE India — fiidiiTradeReact API", dataType: "factual", asOfDate: data.date, lastUpdated: new Date().toISOString(), confidence: 95 }));
    }

    const researchTerminalMatch = pathname.match(/^\/api\/research\/terminal\/(.+)$/);
    if (method === "GET" && researchTerminalMatch) {
      const data = await buildInstitutionalResearch(decodeURIComponent(researchTerminalMatch[1]));
      if (data.available) {
        await logRecommendation({
          type: "research_report",
          symbol: data.symbol,
          confidence: data.executiveSummary?.aiConviction,
          signal: data.technicalAnalysis?.trend,
        });
      }
      return json(data.available ? 200 : 503, wrapResponse(data, {
        source: "Yahoo Finance + ABC institutional research engine",
        dataType: "mixed",
        confidence: data.executiveSummary?.aiConviction ?? 0,
      }));
    }

    const researchMatch = pathname.match(/^\/api\/research\/(.+)$/);
    if (method === "GET" && researchMatch) {
      const report = await buildResearchReport(researchMatch[1]);
      await logRecommendation({ type: "research_report", symbol: report.symbol, confidence: report.aiConclusion.confidenceScore, signal: report.technicalAnalysis.trend });
      return json(200, wrapResponse(report, { source: "Yahoo Finance Chart API + ABC technical model", dataType: "mixed", confidence: report.aiConclusion.confidenceScore }));
    }

    const csvMatch = pathname.match(/^\/api\/reports\/csv\/(.+)$/);
    if (method === "GET" && csvMatch) {
      const type = csvMatch[1];
      let csv = "";
      let filename = "report.csv";
      if (type === "nifty500") {
        const data = await buildNifty500Dashboard();
        csv = toCsv(data.constituents, [{ key: "symbol", label: "Symbol" }, { key: "name", label: "Name" }, { key: "sector", label: "Sector" }, { key: "price", label: "Price" }, { key: "changePercent", label: "ChangePct" }, { key: "volume", label: "Volume" }]);
        filename = `nifty500-constituents-${new Date().toISOString().slice(0, 10)}.csv`;
      } else if (type === "strategies") {
        csv = toCsv(await readStrategies(), [{ key: "name", label: "Name" }, { key: "date", label: "Date" }, { key: "expiry", label: "Expiry" }, { key: "bias", label: "Bias" }, { key: "status", label: "Status" }, { key: "entry", label: "Entry" }, { key: "target", label: "Target" }, { key: "stopLoss", label: "StopLoss" }]);
        filename = `strategies-${new Date().toISOString().slice(0, 10)}.csv`;
      } else if (type === "fii-dii") {
        const data = await getFiiDiiLive();
        csv = toCsv(data.raw, [{ key: "category", label: "Category" }, { key: "date", label: "Date" }, { key: "buyValue", label: "BuyValue" }, { key: "sellValue", label: "SellValue" }, { key: "netValue", label: "NetValue" }]);
        filename = `fii-dii-${data.date || "latest"}.csv`;
      } else {
        return json(400, { error: "Unknown report type. Use: nifty500, strategies, fii-dii" });
      }
      return text(200, csv, { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="${filename}"` });
    }

    if (method === "POST" && pathname === "/api/copilot") {
      const rawQuery = String(body?.query ?? "").trim();
      if (!rawQuery) return json(400, { error: "query is required" });
      if (rawQuery.length > MAX_COPILOT_QUERY_LEN) {
        return json(400, { error: `query must be at most ${MAX_COPILOT_QUERY_LEN} characters` });
      }
      const queryText = rawQuery.toLowerCase();
      let response = { answer: "", dataType: "model-opinion", confidence: 50 };
      const symbolMatch = queryText.match(/\b(reliance|tcs|infy|hdfcbank|itc|sbin|wipro)\b/i);
      if (symbolMatch || queryText.includes("analyze")) {
        const sym = symbolMatch ? symbolMatch[0] : "RELIANCE";
        const report = await buildResearchReport(sym);
        response = { answer: `${report.companyName}: Technical trend is ${report.technicalAnalysis.trend}. RSI ${report.technicalAnalysis.rsi?.toFixed(1)}. See full research report for details.`, dataType: "mixed", confidence: report.aiConclusion.confidenceScore, report };
      } else if (queryText.includes("nifty") || queryText.includes("outlook")) {
        const prediction = await getNiftyPrediction();
        response = { answer: `Nifty ensemble signal: ${prediction.ensembleSignal}. Current price ${prediction.currentPrice}. Weekly target ${prediction.predictions.weekly.target}. This is a probability-based model, not a certainty.`, dataType: "model-estimate", confidence: prediction.predictions.monthly.confidence, data: prediction };
      } else if (queryText.includes("fii") || queryText.includes("dii") || queryText.includes("institutional")) {
        const fiiDii = await getFiiDiiLive();
        response = { answer: `FII net ${fiiDii.fii?.netValue} Cr, DII net ${fiiDii.dii?.netValue} Cr on ${fiiDii.date} (NSE source).`, dataType: "factual", confidence: 95, data: fiiDii };
      } else if (queryText.includes("banking") || queryText.includes("sector")) {
        const dash = await buildNifty500Dashboard();
        const banks = dash.sectorAnalysis.all.filter((s) => s.sector === "Financial Services");
        response = { answer: `Financial Services sector avg change: ${banks[0]?.avgChange ?? "N/A"}% (sample of ${dash.marketBreadth.sampleSize} tracked stocks).`, dataType: "factual", confidence: 80, data: dash.sectorAnalysis };
      } else {
        response.answer = "I can analyze stocks (e.g. 'Analyze Reliance'), NIFTY outlook, FII/DII activity, or sector rotation. All responses use verified data sources only.";
      }
      await logRecommendation({ type: "copilot", query: queryText, confidence: response.confidence });
      return json(200, wrapResponse(response, { source: "ABC Copilot", dataType: response.dataType, confidence: response.confidence }));
    }

    if (method === "POST" && pathname === "/api/strategy-assistant") {
      const moduleId = body?.module === "equity-fno" ? "equity-fno" : "nifty-strategy";
      const strategy = body?.strategy ?? null;
      const prefetch = Boolean(body?.prefetch);

      if (!prefetch) {
        const rawQuery = String(body?.query ?? "").trim();
        if (!rawQuery) return json(400, { error: "query is required unless prefetch is true" });
        if (rawQuery.length > MAX_STRATEGY_ASSISTANT_QUERY_LEN) {
          return json(400, { error: `query must be at most ${MAX_STRATEGY_ASSISTANT_QUERY_LEN} characters` });
        }
      }

      if (!strategy) return json(400, { error: "strategy context is required" });

      const response = answerStrategyQuestion({
        query: body?.query,
        strategy,
        marketContext: body?.marketContext ?? {},
        derivativesIntel: body?.derivativesIntel ?? {},
        history: body?.history ?? [],
        module: moduleId,
        refreshedAt: body?.refreshedAt ?? null,
        prefetch,
      });

      await logRecommendation({
        type: "strategy_assistant",
        module: moduleId,
        strategy: strategy?.name || strategy?.nseSymbol,
        query: prefetch ? "__prefetch__" : String(body?.query ?? "").slice(0, 200),
        confidence: response.confidence,
      });

      return json(200, wrapResponse(response, {
        source: "ABC Strategy Assistant — verified data only",
        dataType: response.dataType || "educational",
        confidence: response.confidence ?? 85,
        lastUpdated: body?.refreshedAt,
      }));
    }

    if (method === "GET" && pathname === "/api/audit") {
      return json(200, wrapResponse({ entries: await readLog() }, { source: "ABC Audit Log", dataType: "factual", confidence: 100 }));
    }

    if (method === "GET" && pathname === "/api/ipo/dashboard") {
      const { dashboard, alerts } = await getIpoDashboardBundle();
      return json(200, wrapResponse({ dashboard, alerts }, { source: "NSE India IPO APIs", dataType: "factual", lastUpdated: dashboard.fetchedAt, confidence: 95 }));
    }

    const ipoTerminalDetailMatch = pathname.match(/^\/api\/ipo\/terminal\/(.+)$/);
    if (method === "GET" && ipoTerminalDetailMatch) {
      const data = await buildInstitutionalIpoDetail(decodeURIComponent(ipoTerminalDetailMatch[1]));
      return json(data.available ? 200 : 404, wrapResponse(data, {
        source: "NSE India IPO APIs",
        dataType: "mixed",
        confidence: data.executiveSummary?.confidence ?? 0,
        disclaimer: data.disclaimer,
      }));
    }

    if (method === "GET" && pathname === "/api/ipo/terminal") {
      const data = await buildInstitutionalIpoDashboard();
      return json(200, wrapResponse(data, {
        source: data.source,
        dataType: "factual",
        confidence: 92,
        lastUpdated: data.refreshedAt,
        disclaimer: data.disclaimer,
      }));
    }

    if (method === "GET" && pathname === "/api/ipo-alerts") {
      return json(200, wrapResponse(await readAlerts(), { source: "ABC IPO Alerts", dataType: "factual", confidence: 100 }));
    }

    if (method === "POST" && pathname === "/api/ipo-alerts/preferences") {
      const prefs = await updatePreferences(body || {});
      return json(200, wrapResponse({ preferences: prefs }, { source: "ABC IPO Alerts", dataType: "factual", confidence: 100 }));
    }

    const ipoGenMatch = pathname.match(/^\/api\/reports\/generate\/ipo\/(.+)$/);
    if (method === "GET" && ipoGenMatch) {
      return json(200, await generateAndStore("ipo", { symbol: ipoGenMatch[1] }));
    }

    const researchGenMatch = pathname.match(/^\/api\/reports\/generate\/research\/(.+)$/);
    if (method === "GET" && researchGenMatch) {
      const result = await generateAndStore("research", { symbol: researchGenMatch[1] });
      await logRecommendation({ type: "research_report", symbol: result.report.symbol, confidence: result.report.confidence });
      return json(200, result);
    }

    const genMatch = pathname.match(/^\/api\/reports\/generate\/(.+)$/);
    if (method === "GET" && genMatch) {
      const type = genMatch[1];
      if (type === "research") return json(400, { error: "Use /api/reports/generate/research/:symbol for research reports" });
      if (type === "ipo") return json(400, { error: "Use /api/reports/generate/ipo/:symbol for IPO reports" });
      return json(200, await generateAndStore(type, query));
    }

    if (method === "GET" && pathname === "/api/report-center") {
      return json(200, wrapResponse({ reports: await listReports() }, { source: "ABC Report Center", dataType: "factual", confidence: 100 }));
    }

    const exportMatch = pathname.match(/^\/api\/report-center\/([^/]+)\/export\/(.+)$/);
    if (method === "GET" && exportMatch) {
      const entry = await getReport(exportMatch[1]);
      if (!entry) return json(404, { error: "Report not found" });
      const report = entry.data;
      const format = exportMatch[2];
      const safeName = entry.name.replace(/[^a-z0-9-_]/gi, "_").slice(0, 60);
      if (format === "pdf") {
        const buf = await buildPdfBuffer(report);
        return text(200, buf, { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${safeName}.pdf"` });
      }
      if (format === "xlsx") {
        const buf = await buildExcelBuffer(report);
        return text(200, buf, { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${safeName}.xlsx"` });
      }
      if (format === "csv") {
        const csv = buildCsvFromReport(report);
        return text(200, csv, { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="${safeName}.csv"` });
      }
      return json(400, { error: "Format must be pdf, xlsx, or csv" });
    }

    const ipoSymbolMatch = pathname.match(/^\/api\/ipo\/([^/]+)$/);
    if (method === "GET" && ipoSymbolMatch && ipoSymbolMatch[1] !== "dashboard") {
      const symbol = ipoSymbolMatch[1];
      const found = await findIpoInDashboard(symbol);
      if (!found) {
        return json(404, {
          error: IPO_UNAVAILABLE_MSG,
          message: `Symbol ${symbol} not found in NSE IPO feeds`,
        });
      }
      const detail = await fetchIpoDetail(symbol);
      return json(200, wrapResponse(detail, { source: "NSE ipo-detail API", dataType: "factual", lastUpdated: detail.fetchedAt, confidence: 95 }));
    }

    const terminalExportMatch = pathname.match(/^\/api\/export\/([^/]+)\/(pdf|xlsx)$/);
    if (method === "GET" && terminalExportMatch) {
      const [, mod, format] = terminalExportMatch;
      const valid = ["nifty500", "fiidii", "research", "nifty-strategy", "fno", "ipo"];
      if (!valid.includes(mod)) {
        return json(400, { error: "Unknown module", modules: valid });
      }
      try {
        const { buffer, filename, contentType } = await exportTerminal(mod, format, query.symbol);
        return text(200, buffer, {
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="${filename}"`,
        });
      } catch (err) {
        return json(502, { error: "Export failed", message: err.message });
      }
    }

    return json(404, { error: "Not found", path: pathname });
  } catch (error) {
    if (isIpoNotFoundError(error)) {
      return json(404, { error: IPO_UNAVAILABLE_MSG, message: error.message });
    }
    return json(502, { error: "Request failed", message: error.message });
  }
}

module.exports = { handleApi };