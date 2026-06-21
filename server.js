const express = require("express");
const path = require("path");
const fs = require("fs");
const { fetchNiftyHistory, fetchChart } = require("./lib/yahoo");
const { computeIndicators } = require("./lib/indicators");
const { buildNiftyPrediction } = require("./lib/ensemble");
const { buildAlignmentReport } = require("./lib/alignment");
const { wrapResponse } = require("./lib/compliance");
const { fetchFiiDii } = require("./lib/nse");
const { buildNifty500Dashboard } = require("./lib/nifty500");
const { buildResearchReport, normalizeSymbol } = require("./lib/research");
const { logRecommendation, readLog } = require("./lib/audit");
const { toCsv } = require("./lib/reports");
const { generateAndStore } = require("./lib/generate-report");
const { listReports, getReport } = require("./lib/report-store");
const { buildPdfBuffer, buildExcelBuffer, buildCsvFromReport } = require("./lib/export");
const { appendSnapshot, computeTrends, readHistory } = require("./lib/fii-history");
const { fetchIpoDashboard, fetchIpoDetail, enrichOpenWithSubscription } = require("./lib/nse-ipo");
const { buildIpoDashboardReport } = require("./lib/report-ipo");
const { enrichListedPrice } = require("./lib/ipo-research");
const { readAlerts, updatePreferences, evaluateAlerts } = require("./lib/ipo-alerts");

const app = express();
const PORT = process.env.PORT || 4000;
const CACHE_TTL_MS = 5 * 60 * 1000;

const DEFAULT_SYMBOLS = [
  "AAPL",
  "MSFT",
  "GOOGL",
  "AMZN",
  "TSLA",
  "NVDA",
  "META",
  "RELIANCE.NS",
  "TCS.NS",
  "INFY.NS",
  "HDFCBANK.NS",
  "ICICIBANK.NS",
  "^NSEI",
  "^BSESN",
  "^GSPC",
];

const API_ROUTES = [
  { method: "GET", path: "/api/health", description: "Server health check" },
  { method: "GET", path: "/api/defaults", description: "Default watchlist symbols" },
  { method: "GET", path: "/api/quotes?symbols=AAPL,TCS.NS", description: "Live quotes for comma-separated symbols" },
  { method: "GET", path: "/api/nifty/history", description: "Nifty 50 daily candle history (1 year)" },
  { method: "GET", path: "/api/nifty/prediction", description: "Ensemble weekly/monthly expiry forecast" },
  { method: "GET", path: "/api/strategies", description: "List saved trading strategies" },
  { method: "GET", path: "/api/strategies/alignment", description: "Active strategies vs Nifty ensemble signal" },
  { method: "GET", path: "/api/strategies/:id", description: "Get a single strategy by id" },
  { method: "POST", path: "/api/strategies", description: "Add a new strategy (JSON body)" },
  { method: "PATCH", path: "/api/strategies/:id", description: "Update a strategy" },
  { method: "DELETE", path: "/api/strategies/:id", description: "Delete a strategy" },
  { method: "POST", path: "/api/strategies/:id/duplicate", description: "Duplicate a strategy" },
  { method: "GET", path: "/api/nifty500/dashboard", description: "NIFTY 500 market intelligence dashboard" },
  { method: "GET", path: "/api/fii-dii", description: "Latest FII & DII institutional activity (NSE)" },
  { method: "GET", path: "/api/research/:symbol", description: "Institutional research report for a symbol" },
  { method: "GET", path: "/api/reports/csv/:type", description: "Download CSV report (nifty500, strategies, research)" },
  { method: "POST", path: "/api/copilot", description: "AI copilot query router" },
  { method: "GET", path: "/api/audit", description: "AI recommendation audit log" },
];

const cache = {
  niftyHistory: { value: null, expiresAt: 0 },
  niftyPrediction: { value: null, expiresAt: 0 },
};

const strategiesPath = path.join(__dirname, "data", "strategies.json");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function getCached(key) {
  const entry = cache[key];
  if (entry?.value && Date.now() < entry.expiresAt) {
    return entry.value;
  }
  return null;
}

function setCached(key, value) {
  cache[key] = {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };
}

function getMarketState(meta) {
  const now = Math.floor(Date.now() / 1000);
  const periods = meta?.currentTradingPeriod;
  if (!periods) return "UNKNOWN";

  if (periods.pre && now >= periods.pre.start && now < periods.pre.end) return "PRE";
  if (periods.regular && now >= periods.regular.start && now < periods.regular.end) {
    return "REGULAR";
  }
  if (periods.post && now >= periods.post.start && now < periods.post.end) return "POST";
  return "CLOSED";
}

function normalizeChartQuote(meta) {
  const price = meta.regularMarketPrice ?? null;
  const previousClose = meta.chartPreviousClose ?? meta.previousClose ?? null;
  const change =
    price != null && previousClose != null ? Number((price - previousClose).toFixed(4)) : null;
  const changePercent =
    change != null && previousClose
      ? Number(((change / previousClose) * 100).toFixed(4))
      : null;

  return {
    symbol: meta.symbol,
    name: meta.shortName || meta.longName || meta.symbol,
    price,
    change,
    changePercent,
    volume: meta.regularMarketVolume ?? null,
    marketCap: meta.marketCap ?? null,
    dayHigh: meta.regularMarketDayHigh ?? null,
    dayLow: meta.regularMarketDayLow ?? null,
    previousClose,
    currency: meta.currency || "",
    exchange: meta.fullExchangeName || meta.exchangeName || "",
    marketState: getMarketState(meta),
    updatedAt: meta.regularMarketTime
      ? new Date(meta.regularMarketTime * 1000).toISOString()
      : new Date().toISOString(),
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
  if (uniqueSymbols.length === 0) {
    return [];
  }

  const settled = await Promise.allSettled(uniqueSymbols.map((symbol) => fetchSymbolQuote(symbol)));

  return settled.map((result, index) => {
    const symbol = uniqueSymbols[index];
    if (result.status === "fulfilled") {
      return result.value;
    }
    return {
      symbol,
      name: symbol,
      price: null,
      change: null,
      changePercent: null,
      volume: null,
      marketCap: null,
      dayHigh: null,
      dayLow: null,
      previousClose: null,
      currency: "",
      exchange: "",
      marketState: "NOT_FOUND",
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

function readStrategies() {
  const raw = fs.readFileSync(strategiesPath, "utf8");
  return JSON.parse(raw);
}

function writeStrategies(strategies) {
  fs.writeFileSync(strategiesPath, JSON.stringify(strategies, null, 2));
}

function parseOptionalNumber(value) {
  if (value == null || value === "") return null;
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return undefined;
  return num;
}

function buildStrategyEntry(body, id) {
  const entry = parseOptionalNumber(body.entry);
  const target = parseOptionalNumber(body.target);
  const stopLoss = parseOptionalNumber(body.stopLoss);

  if (entry === undefined || target === undefined || stopLoss === undefined) {
    return { error: "entry, target, and stopLoss must be positive numbers when provided" };
  }

  return {
    id,
    name: body.name,
    date: body.date,
    expiry: body.expiry || "Weekly",
    bias: body.bias || "NEUTRAL",
    status: body.status || "active",
    entry,
    target,
    stopLoss,
    notes: body.notes || "",
  };
}

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    project: "abc",
    version: "1.0.0",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get("/api", (_req, res) => {
  res.json({
    name: "ABC API",
    version: "1.0.0",
    baseUrl: `http://localhost:${PORT}`,
    routes: API_ROUTES,
  });
});

app.get("/api/defaults", (_req, res) => {
  res.json({ symbols: DEFAULT_SYMBOLS });
});

app.get("/api/quotes", async (req, res) => {
  try {
    const requested = req.query.symbols
      ? req.query.symbols.split(",").map((s) => s.trim()).filter(Boolean)
      : DEFAULT_SYMBOLS;

    const quotes = await fetchYahooQuotes(requested);
    res.json({
      source: "Yahoo Finance v8 Chart API (free)",
      fetchedAt: new Date().toISOString(),
      count: quotes.length,
      quotes,
    });
  } catch (error) {
    res.status(502).json({
      error: "Failed to fetch live market data",
      message: error.message,
    });
  }
});

app.get("/api/nifty/history", async (_req, res) => {
  try {
    const history = await getNiftyHistory();
    res.json(history);
  } catch (error) {
    res.status(502).json({
      error: "Failed to fetch Nifty history",
      message: error.message,
    });
  }
});

app.get("/api/nifty/prediction", async (_req, res) => {
  try {
    const prediction = await getNiftyPrediction();
    res.json(prediction);
  } catch (error) {
    res.status(502).json({
      error: "Failed to build Nifty prediction",
      message: error.message,
    });
  }
});

app.get("/api/strategies", (_req, res) => {
  try {
    const strategies = readStrategies();
    res.json({
      count: strategies.length,
      active: strategies.filter((s) => s.status === "active").length,
      strategies,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to load strategies", message: error.message });
  }
});

app.get("/api/strategies/alignment", async (_req, res) => {
  try {
    const strategies = readStrategies();
    const prediction = await getNiftyPrediction();
    res.json(buildAlignmentReport(strategies, prediction));
  } catch (error) {
    res.status(502).json({
      error: "Failed to build strategy alignment",
      message: error.message,
    });
  }
});

app.get("/api/strategies/:id", (req, res) => {
  try {
    const strategies = readStrategies();
    const strategy = strategies.find((s) => s.id === req.params.id);
    if (!strategy) {
      return res.status(404).json({ error: "Strategy not found" });
    }
    res.json(strategy);
  } catch (error) {
    res.status(500).json({ error: "Failed to load strategy", message: error.message });
  }
});

app.post("/api/strategies", (req, res) => {
  try {
    if (!req.body.name || !req.body.date) {
      return res.status(400).json({ error: "name and date are required" });
    }

    const built = buildStrategyEntry(req.body, `strategy-${Date.now()}`);
    if (built.error) {
      return res.status(400).json({ error: built.error });
    }

    const strategies = readStrategies();
    strategies.unshift(built);
    writeStrategies(strategies);
    res.status(201).json(built);
  } catch (error) {
    res.status(500).json({ error: "Failed to save strategy", message: error.message });
  }
});

app.patch("/api/strategies/:id", (req, res) => {
  try {
    const strategies = readStrategies();
    const index = strategies.findIndex((s) => s.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: "Strategy not found" });
    }

    const merged = { ...strategies[index], ...req.body, id: strategies[index].id };
    const built = buildStrategyEntry(merged, merged.id);
    if (built.error) {
      return res.status(400).json({ error: built.error });
    }

    strategies[index] = built;
    writeStrategies(strategies);
    res.json(built);
  } catch (error) {
    res.status(500).json({ error: "Failed to update strategy", message: error.message });
  }
});

app.post("/api/strategies/:id/duplicate", (req, res) => {
  try {
    const strategies = readStrategies();
    const source = strategies.find((s) => s.id === req.params.id);
    if (!source) {
      return res.status(404).json({ error: "Strategy not found" });
    }

    const copy = buildStrategyEntry(
      {
        ...source,
        name: `${source.name} (copy)`,
        date: new Date().toISOString().slice(0, 10),
        status: "active",
      },
      `strategy-${Date.now()}`
    );

    if (copy.error) {
      return res.status(400).json({ error: copy.error });
    }

    strategies.unshift(copy);
    writeStrategies(strategies);
    res.status(201).json(copy);
  } catch (error) {
    res.status(500).json({ error: "Failed to duplicate strategy", message: error.message });
  }
});

app.get("/api/nifty500/dashboard", async (_req, res) => {
  try {
    const data = await buildNifty500Dashboard();
    res.json(
      wrapResponse(data, {
        source: "Yahoo Finance Chart API + static NIFTY 500 constituent reference",
        dataType: "factual",
        confidence: 85,
      })
    );
  } catch (error) {
    res.status(502).json({ error: "Failed to build NIFTY 500 dashboard", message: error.message });
  }
});

app.get("/api/chart/:symbol", async (req, res) => {
  try {
    const range = req.query.range || "1y";
    const chart = await fetchChart(req.params.symbol, "1d", range);
    const candles = chart.candles.filter((c) => c.close != null);
    if (!candles.length) {
      return res.status(502).json({
        error: "Chart data unavailable",
        message: "Verified data unavailable. Analysis cannot be generated until fresh data is received from approved sources.",
      });
    }
    const indicators = computeIndicators(candles);
    res.json(
      wrapResponse(
        {
          symbol: req.params.symbol,
          candles,
          meta: chart.meta,
          indicators: { latest: indicators.latest, series: indicators.series, rsi: indicators.latest.rsi },
        },
        {
          source: "Yahoo Finance Chart API",
          dataType: "factual",
          lastUpdated: new Date().toISOString(),
          confidence: 100,
        }
      )
    );
  } catch (error) {
    res.status(502).json({ error: "Chart fetch failed", message: error.message });
  }
});

app.get("/api/fii-dii", async (_req, res) => {
  try {
    const data = await fetchFiiDii();
    const history = appendSnapshot(data);
    const trends = computeTrends(history);
    const alerts = [];
    if (data.fii?.netValue > 3000) alerts.push({ type: "fii_buying", message: "Significant FII net buying" });
    if (data.fii?.netValue < -3000) alerts.push({ type: "fii_selling", message: "Significant FII net selling" });
    if (data.dii?.netValue > 2000) alerts.push({ type: "dii_buying", message: "Significant DII net buying" });
    if (data.dii?.netValue < -2000) alerts.push({ type: "dii_selling", message: "Significant DII net selling" });

    res.json(
      wrapResponse({ ...data, trends, history: history.slice(0, 10), alerts, institutionalAnalysis: {
        smartMoneyDirection: data.fii?.netValue > 0 ? "FII_NET_BUY" : "FII_NET_SELL",
        note: `Weekly/monthly trends computed from ${trends.sessionsTracked} stored NSE sessions.`,
      }}, {
        source: "NSE India — fiidiiTradeReact API",
        dataType: "factual",
        asOfDate: data.date,
        lastUpdated: new Date().toISOString(),
        confidence: 95,
      })
    );
  } catch (error) {
    res.status(502).json({ error: "Failed to fetch FII/DII data", message: error.message });
  }
});

app.get("/api/research/:symbol", async (req, res) => {
  try {
    const report = await buildResearchReport(req.params.symbol);
    logRecommendation({
      type: "research_report",
      symbol: report.symbol,
      confidence: report.aiConclusion.confidenceScore,
      signal: report.technicalAnalysis.trend,
    });
    res.json(
      wrapResponse(report, {
        source: "Yahoo Finance Chart API + ABC technical model",
        dataType: "mixed",
        confidence: report.aiConclusion.confidenceScore,
      })
    );
  } catch (error) {
    res.status(502).json({ error: "Failed to generate research report", message: error.message });
  }
});

app.get("/api/reports/csv/:type", async (req, res) => {
  try {
    const { type } = req.params;
    let csv = "";
    let filename = "report.csv";

    if (type === "nifty500") {
      const data = await buildNifty500Dashboard();
      csv = toCsv(data.constituents, [
        { key: "symbol", label: "Symbol" },
        { key: "name", label: "Name" },
        { key: "sector", label: "Sector" },
        { key: "price", label: "Price" },
        { key: "changePercent", label: "ChangePct" },
        { key: "volume", label: "Volume" },
      ]);
      filename = `nifty500-constituents-${new Date().toISOString().slice(0, 10)}.csv`;
    } else if (type === "strategies") {
      const strategies = readStrategies();
      csv = toCsv(strategies, [
        { key: "name", label: "Name" },
        { key: "date", label: "Date" },
        { key: "expiry", label: "Expiry" },
        { key: "bias", label: "Bias" },
        { key: "status", label: "Status" },
        { key: "entry", label: "Entry" },
        { key: "target", label: "Target" },
        { key: "stopLoss", label: "StopLoss" },
      ]);
      filename = `strategies-${new Date().toISOString().slice(0, 10)}.csv`;
    } else if (type === "fii-dii") {
      const data = await fetchFiiDii();
      csv = toCsv(data.raw, [
        { key: "category", label: "Category" },
        { key: "date", label: "Date" },
        { key: "buyValue", label: "BuyValue" },
        { key: "sellValue", label: "SellValue" },
        { key: "netValue", label: "NetValue" },
      ]);
      filename = `fii-dii-${data.date || "latest"}.csv`;
    } else {
      return res.status(400).json({ error: "Unknown report type. Use: nifty500, strategies, fii-dii" });
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    res.status(502).json({ error: "Failed to generate report", message: error.message });
  }
});

app.post("/api/copilot", async (req, res) => {
  try {
    const query = (req.body.query || "").trim().toLowerCase();
    if (!query) return res.status(400).json({ error: "query is required" });

    let response = { answer: "", dataType: "model-opinion", confidence: 50 };

    const symbolMatch = query.match(/\b(reliance|tcs|infy|hdfcbank|itc|sbin|wipro)\b/i);
    if (symbolMatch || query.includes("analyze")) {
      const sym = symbolMatch ? symbolMatch[0] : "RELIANCE";
      const report = await buildResearchReport(sym);
      response = {
        answer: `${report.companyName}: Technical trend is ${report.technicalAnalysis.trend}. RSI ${report.technicalAnalysis.rsi?.toFixed(1)}. See full research report for details.`,
        dataType: "mixed",
        confidence: report.aiConclusion.confidenceScore,
        report,
      };
    } else if (query.includes("nifty") || query.includes("outlook")) {
      const prediction = await getNiftyPrediction();
      response = {
        answer: `Nifty ensemble signal: ${prediction.ensembleSignal}. Current price ${prediction.currentPrice}. Weekly target ${prediction.predictions.weekly.target}. This is a probability-based model, not a certainty.`,
        dataType: "model-estimate",
        confidence: prediction.predictions.monthly.confidence,
        data: prediction,
      };
    } else if (query.includes("fii") || query.includes("dii") || query.includes("institutional")) {
      const fiiDii = await fetchFiiDii();
      response = {
        answer: `FII net ${fiiDii.fii?.netValue} Cr, DII net ${fiiDii.dii?.netValue} Cr on ${fiiDii.date} (NSE source).`,
        dataType: "factual",
        confidence: 95,
        data: fiiDii,
      };
    } else if (query.includes("banking") || query.includes("sector")) {
      const dash = await buildNifty500Dashboard();
      const banks = dash.sectorAnalysis.all.filter((s) => s.sector === "Financial Services");
      response = {
        answer: `Financial Services sector avg change: ${banks[0]?.avgChange ?? "N/A"}% (sample of ${dash.marketBreadth.sampleSize} tracked stocks).`,
        dataType: "factual",
        confidence: 80,
        data: dash.sectorAnalysis,
      };
    } else {
      response.answer =
        "I can analyze stocks (e.g. 'Analyze Reliance'), NIFTY outlook, FII/DII activity, or sector rotation. All responses use verified data sources only.";
    }

    logRecommendation({ type: "copilot", query, confidence: response.confidence });
    res.json(wrapResponse(response, { source: "ABC Copilot", dataType: response.dataType, confidence: response.confidence }));
  } catch (error) {
    res.status(502).json({ error: "Copilot query failed", message: error.message });
  }
});

app.get("/api/audit", (_req, res) => {
  res.json(wrapResponse({ entries: readLog() }, { source: "ABC Audit Log", dataType: "factual", confidence: 100 }));
});

app.get("/api/ipo/dashboard", async (_req, res) => {
  try {
    const raw = await fetchIpoDashboard();
    const [open, listedEnriched] = await Promise.all([
      enrichOpenWithSubscription(raw.open),
      Promise.all(raw.listed.slice(0, 15).map(enrichListedPrice)),
    ]);
    const dashboard = { ...raw, open, listedEnriched };
    const alerts = evaluateAlerts(dashboard);
    res.json(
      wrapResponse({ dashboard, alerts }, {
        source: "NSE India IPO APIs",
        dataType: "factual",
        lastUpdated: dashboard.fetchedAt,
        confidence: 95,
      })
    );
  } catch (error) {
    res.status(502).json({
      error: "IPO dashboard unavailable",
      message: error.message || "Verified IPO data unavailable. Analysis cannot be generated until fresh source data is received.",
    });
  }
});

app.get("/api/ipo/:symbol", async (req, res) => {
  try {
    const detail = await fetchIpoDetail(req.params.symbol);
    res.json(
      wrapResponse(detail, {
        source: "NSE ipo-detail API",
        dataType: "factual",
        lastUpdated: detail.fetchedAt,
        confidence: 95,
      })
    );
  } catch (error) {
    res.status(502).json({ error: "IPO detail unavailable", message: error.message });
  }
});

app.get("/api/ipo-alerts", (_req, res) => {
  res.json(wrapResponse(readAlerts(), { source: "ABC IPO Alerts", dataType: "factual", confidence: 100 }));
});

app.post("/api/ipo-alerts/preferences", (req, res) => {
  try {
    const prefs = updatePreferences(req.body || {});
    res.json(wrapResponse({ preferences: prefs }, { source: "ABC IPO Alerts", dataType: "factual", confidence: 100 }));
  } catch (error) {
    res.status(500).json({ error: "Failed to update preferences", message: error.message });
  }
});

app.get("/api/reports/generate/ipo/:symbol", async (req, res) => {
  try {
    const result = await generateAndStore("ipo", { symbol: req.params.symbol });
    res.json(result);
  } catch (error) {
    res.status(502).json({ error: "IPO report generation failed", message: error.message });
  }
});

app.get("/api/reports/generate/research/:symbol", async (req, res) => {
  try {
    const result = await generateAndStore("research", { symbol: req.params.symbol });
    logRecommendation({
      type: "research_report",
      symbol: result.report.symbol,
      confidence: result.report.confidence,
    });
    res.json(result);
  } catch (error) {
    res.status(502).json({ error: "Research report generation failed", message: error.message });
  }
});

app.get("/api/reports/generate/:type", async (req, res) => {
  try {
    const { type } = req.params;
    if (type === "research") {
      return res.status(400).json({ error: "Use /api/reports/generate/research/:symbol for research reports" });
    }
    if (type === "ipo") {
      return res.status(400).json({ error: "Use /api/reports/generate/ipo/:symbol for IPO reports" });
    }
    const result = await generateAndStore(type, req.query);
    res.json(result);
  } catch (error) {
    res.status(502).json({ error: "Report generation failed", message: error.message });
  }
});

app.get("/api/report-center", (_req, res) => {
  res.json(wrapResponse({ reports: listReports() }, { source: "ABC Report Center", dataType: "factual", confidence: 100 }));
});

app.get("/api/report-center/:id/export/:format", async (req, res) => {
  try {
    const entry = getReport(req.params.id);
    if (!entry) return res.status(404).json({ error: "Report not found" });

    const report = entry.data;
    const { format } = req.params;
    const safeName = entry.name.replace(/[^a-z0-9-_]/gi, "_").slice(0, 60);

    if (format === "pdf") {
      const buf = await buildPdfBuffer(report);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${safeName}.pdf"`);
      return res.send(buf);
    }
    if (format === "xlsx") {
      const buf = await buildExcelBuffer(report);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${safeName}.xlsx"`);
      return res.send(buf);
    }
    if (format === "csv") {
      const csv = buildCsvFromReport(report);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${safeName}.csv"`);
      return res.send(csv);
    }
    return res.status(400).json({ error: "Format must be pdf, xlsx, or csv" });
  } catch (error) {
    res.status(502).json({ error: "Export failed", message: error.message });
  }
});

app.delete("/api/strategies/:id", (req, res) => {
  try {
    const strategies = readStrategies();
    const index = strategies.findIndex((s) => s.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: "Strategy not found" });
    }

    const [removed] = strategies.splice(index, 1);
    writeStrategies(strategies);
    res.json({ deleted: true, strategy: removed });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete strategy", message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`ABC Research Platform running at http://localhost:${PORT}`);
});