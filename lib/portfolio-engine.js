/**
 * Watchlist + Portfolio analysis on verified market data only.
 * Never invents prices, P&L, or performance when quotes are missing.
 */

const { readJson, writeJson, getStorageMode } = require("./json-store");
const { fetchChart } = require("./yahoo");
const { loadConstituents } = require("./nifty500");
const { mapPool } = require("./async-pool");
const { DATA_UNAVAILABLE } = require("./strategy-dossier");

const WATCHLISTS_FILE = "watchlists.json";
const PORTFOLIOS_FILE = "portfolios.json";

function nowIso() {
  return new Date().toISOString();
}

function normalizeSymbol(raw) {
  if (!raw || typeof raw !== "string") return null;
  let s = raw.trim().toUpperCase();
  if (!s) return null;
  // Allow bare NSE tickers
  if (!s.includes(".") && !s.startsWith("^")) s = `${s}.NS`;
  return s;
}

function pct(from, to) {
  if (from == null || to == null || !Number.isFinite(from) || !Number.isFinite(to) || from === 0) {
    return null;
  }
  return Number((((to - from) / from) * 100).toFixed(2));
}

function defaultWatchlists() {
  return {
    version: 1,
    updatedAt: nowIso(),
    lists: [
      {
        id: "default",
        name: "Primary Watchlist",
        symbols: ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "SBIN.NS"],
        createdAt: nowIso(),
        updatedAt: nowIso(),
      },
    ],
  };
}

function defaultPortfolios() {
  return {
    version: 1,
    updatedAt: nowIso(),
    portfolios: [
      {
        id: "default",
        name: "Core Equity Portfolio",
        currency: "INR",
        holdings: [],
        createdAt: nowIso(),
        updatedAt: nowIso(),
        note: "Add holdings with verified avg cost and quantity. P&L uses live Yahoo prices only.",
      },
    ],
  };
}

async function loadWatchlists() {
  const data = await readJson(WATCHLISTS_FILE, null);
  if (!data || !Array.isArray(data.lists)) return defaultWatchlists();
  return data;
}

async function saveWatchlists(data) {
  data.updatedAt = nowIso();
  await writeJson(WATCHLISTS_FILE, data);
  return data;
}

async function loadPortfolios() {
  const data = await readJson(PORTFOLIOS_FILE, null);
  if (!data || !Array.isArray(data.portfolios)) return defaultPortfolios();
  return data;
}

async function savePortfolios(data) {
  data.updatedAt = nowIso();
  await writeJson(PORTFOLIOS_FILE, data);
  return data;
}

function resolveName(symbol, constituents) {
  const hit = constituents.find((c) => c.symbol === symbol);
  return hit?.name || symbol.replace(".NS", "");
}

function resolveSector(symbol, constituents) {
  const hit = constituents.find((c) => c.symbol === symbol);
  return hit?.sector || null;
}

async function fetchLiveQuote(symbol) {
  try {
    const chart = await fetchChart(symbol, "1d", "5d");
    const meta = chart.meta || {};
    const candles = (chart.candles || []).filter((c) => c.close != null);
    const latest = candles.at(-1);
    const prev = candles.at(-2);
    const price = meta.regularMarketPrice ?? latest?.close ?? null;
    const prevClose = meta.chartPreviousClose ?? prev?.close ?? null;
    return {
      symbol,
      name: meta.shortName || meta.longName || null,
      price: price != null && Number.isFinite(price) ? Number(price) : null,
      previousClose: prevClose != null && Number.isFinite(prevClose) ? Number(prevClose) : null,
      change:
        price != null && prevClose != null ? Number((price - prevClose).toFixed(2)) : null,
      changePercent: pct(prevClose, price),
      volume: meta.regularMarketVolume ?? latest?.volume ?? null,
      currency: meta.currency || "INR",
      marketState: meta.marketState || null,
      updatedAt: meta.regularMarketTime
        ? new Date(meta.regularMarketTime * 1000).toISOString()
        : nowIso(),
      source: "Yahoo Finance Chart API",
      available: price != null,
    };
  } catch (err) {
    return {
      symbol,
      name: null,
      price: null,
      previousClose: null,
      change: null,
      changePercent: null,
      volume: null,
      currency: "INR",
      marketState: null,
      updatedAt: nowIso(),
      source: "Yahoo Finance Chart API",
      available: false,
      error: err.message,
      message: DATA_UNAVAILABLE,
    };
  }
}

async function enrichSymbols(symbols) {
  const unique = [...new Set(symbols.map(normalizeSymbol).filter(Boolean))];
  let constituents = [];
  try {
    constituents = loadConstituents();
  } catch {
    constituents = [];
  }
  const quotes = await mapPool(unique, 8, (sym) => fetchLiveQuote(sym));
  return quotes.map((q) => ({
    ...q,
    name: q.name || resolveName(q.symbol, constituents),
    sector: resolveSector(q.symbol, constituents),
  }));
}

async function getWatchlistDashboard(listId = "default") {
  const store = await loadWatchlists();
  const list = store.lists.find((l) => l.id === listId) || store.lists[0];
  if (!list) {
    return {
      available: false,
      reason: "No watchlist configured",
      lists: store.lists,
    };
  }
  const items = await enrichSymbols(list.symbols || []);
  const available = items.filter((i) => i.available);
  const adv = available.filter((i) => (i.changePercent ?? 0) > 0).length;
  const dec = available.filter((i) => (i.changePercent ?? 0) < 0).length;

  return {
    available: true,
    list: {
      id: list.id,
      name: list.name,
      symbolCount: (list.symbols || []).length,
      updatedAt: list.updatedAt,
    },
    lists: store.lists.map((l) => ({
      id: l.id,
      name: l.name,
      symbolCount: (l.symbols || []).length,
      updatedAt: l.updatedAt,
    })),
    items,
    breadth: {
      advancing: adv,
      declining: dec,
      unchanged: available.length - adv - dec,
      withQuotes: available.length,
      withoutQuotes: items.length - available.length,
    },
    policy: {
      zeroHallucination: true,
      note: "Quotes from Yahoo Finance only. Missing prices show Data Unavailable — never estimated.",
    },
    refreshedAt: nowIso(),
  };
}

async function addWatchlistSymbol(listId, symbolRaw) {
  const symbol = normalizeSymbol(symbolRaw);
  if (!symbol) return { error: "Invalid symbol" };
  const store = await loadWatchlists();
  const list = store.lists.find((l) => l.id === listId);
  if (!list) return { error: "Watchlist not found" };
  if (!list.symbols.includes(symbol)) {
    list.symbols.push(symbol);
    list.updatedAt = nowIso();
    await saveWatchlists(store);
  }
  return { ok: true, list };
}

async function removeWatchlistSymbol(listId, symbolRaw) {
  const symbol = normalizeSymbol(symbolRaw);
  const store = await loadWatchlists();
  const list = store.lists.find((l) => l.id === listId);
  if (!list) return { error: "Watchlist not found" };
  list.symbols = (list.symbols || []).filter((s) => s !== symbol);
  list.updatedAt = nowIso();
  await saveWatchlists(store);
  return { ok: true, list };
}

async function createWatchlist(name) {
  const store = await loadWatchlists();
  const id = `wl-${Date.now()}`;
  const list = {
    id,
    name: name || `Watchlist ${store.lists.length + 1}`,
    symbols: [],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  store.lists.push(list);
  await saveWatchlists(store);
  return list;
}

/**
 * Portfolio holding: { symbol, quantity, avgCost, notes? }
 * Analysis never invents missing prices.
 */
function analyzeHolding(holding, quote) {
  const qty = Number(holding.quantity);
  const avg = Number(holding.avgCost);
  const quantityOk = Number.isFinite(qty) && qty > 0;
  const avgOk = Number.isFinite(avg) && avg >= 0;
  const price = quote?.available ? quote.price : null;

  const costBasis = quantityOk && avgOk ? Number((qty * avg).toFixed(2)) : null;
  const marketValue =
    quantityOk && price != null ? Number((qty * price).toFixed(2)) : null;
  const unrealizedPnl =
    costBasis != null && marketValue != null
      ? Number((marketValue - costBasis).toFixed(2))
      : null;
  const unrealizedPnlPct = pct(costBasis, marketValue);
  const dayPnl =
    quantityOk && quote?.change != null
      ? Number((qty * quote.change).toFixed(2))
      : null;

  return {
    id: holding.id || null,
    symbol: holding.symbol,
    name: quote?.name || holding.symbol,
    sector: quote?.sector || null,
    quantity: quantityOk ? qty : null,
    avgCost: avgOk ? avg : null,
    lastPrice: price,
    previousClose: quote?.previousClose ?? null,
    changePercent: quote?.changePercent ?? null,
    costBasis,
    marketValue,
    unrealizedPnl,
    unrealizedPnlPct,
    dayPnl,
    weightPct: null, // filled after totals
    dataAvailable: price != null && quantityOk && avgOk,
    unavailableReason:
      price == null
        ? "Awaiting Latest Verified Data — live price unavailable"
        : !quantityOk || !avgOk
          ? "Invalid quantity or average cost"
          : null,
    source: quote?.source || null,
    updatedAt: quote?.updatedAt || null,
  };
}

async function getPortfolioAnalysis(portfolioId = "default") {
  const store = await loadPortfolios();
  const portfolio =
    store.portfolios.find((p) => p.id === portfolioId) || store.portfolios[0];
  if (!portfolio) {
    return { available: false, reason: "No portfolio configured" };
  }

  const holdings = portfolio.holdings || [];
  const symbols = holdings.map((h) => h.symbol);
  const quotes = await enrichSymbols(symbols);
  const qmap = new Map(quotes.map((q) => [q.symbol, q]));

  const rows = holdings.map((h) =>
    analyzeHolding({ ...h, symbol: normalizeSymbol(h.symbol) }, qmap.get(normalizeSymbol(h.symbol)))
  );

  const valued = rows.filter((r) => r.marketValue != null);
  const totalMarketValue = valued.length
    ? Number(valued.reduce((a, r) => a + r.marketValue, 0).toFixed(2))
    : null;
  const totalCost = rows.every((r) => r.costBasis != null)
    ? Number(rows.reduce((a, r) => a + r.costBasis, 0).toFixed(2))
    : rows.some((r) => r.costBasis != null)
      ? Number(
          rows.filter((r) => r.costBasis != null).reduce((a, r) => a + r.costBasis, 0).toFixed(2)
        )
      : null;
  const totalUnrealized =
    totalMarketValue != null && totalCost != null
      ? Number((totalMarketValue - totalCost).toFixed(2))
      : null;
  const totalDayPnl = rows.every((r) => r.dayPnl != null || r.quantity == null)
    ? Number(
        rows.filter((r) => r.dayPnl != null).reduce((a, r) => a + r.dayPnl, 0).toFixed(2)
      )
    : rows.some((r) => r.dayPnl != null)
      ? Number(
          rows.filter((r) => r.dayPnl != null).reduce((a, r) => a + r.dayPnl, 0).toFixed(2)
        )
      : null;

  for (const r of rows) {
    r.weightPct =
      totalMarketValue != null && r.marketValue != null && totalMarketValue > 0
        ? Number(((r.marketValue / totalMarketValue) * 100).toFixed(2))
        : null;
  }

  const sectorMap = {};
  for (const r of valued) {
    const sec = r.sector || "Unclassified";
    if (!sectorMap[sec]) sectorMap[sec] = { marketValue: 0, count: 0 };
    sectorMap[sec].marketValue += r.marketValue;
    sectorMap[sec].count += 1;
  }
  const sectorAllocation = Object.entries(sectorMap)
    .map(([sector, d]) => ({
      sector,
      marketValue: Number(d.marketValue.toFixed(2)),
      weightPct:
        totalMarketValue != null && totalMarketValue > 0
          ? Number(((d.marketValue / totalMarketValue) * 100).toFixed(2))
          : null,
      holdings: d.count,
    }))
    .sort((a, b) => (b.marketValue ?? 0) - (a.marketValue ?? 0));

  return {
    available: true,
    portfolio: {
      id: portfolio.id,
      name: portfolio.name,
      currency: portfolio.currency || "INR",
      holdingCount: holdings.length,
      note: portfolio.note || null,
      updatedAt: portfolio.updatedAt,
    },
    portfolios: store.portfolios.map((p) => ({
      id: p.id,
      name: p.name,
      holdingCount: (p.holdings || []).length,
    })),
    summary: {
      totalMarketValue,
      totalCostBasis: totalCost,
      totalUnrealizedPnl: totalUnrealized,
      totalUnrealizedPnlPct: pct(totalCost, totalMarketValue),
      totalDayPnl,
      holdingsWithPrice: valued.length,
      holdingsWithoutPrice: rows.length - valued.length,
    },
    holdings: rows,
    sectorAllocation,
    policy: {
      zeroHallucination: true,
      factVsOpinion:
        "Prices and P&L from verified Yahoo quotes × user-entered quantity/avg cost. Missing quotes never estimated. Allocation weights are calculated only from valued holdings.",
      notAdvice: "Portfolio analytics are informational — not investment advice.",
    },
    refreshedAt: nowIso(),
  };
}

async function upsertHolding(portfolioId, body) {
  const symbol = normalizeSymbol(body?.symbol);
  const quantity = Number(body?.quantity);
  const avgCost = Number(body?.avgCost);
  if (!symbol) return { error: "symbol is required" };
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { error: "quantity must be a positive number" };
  }
  if (!Number.isFinite(avgCost) || avgCost < 0) {
    return { error: "avgCost must be a non-negative number (verified cost basis)" };
  }

  const store = await loadPortfolios();
  const portfolio = store.portfolios.find((p) => p.id === portfolioId);
  if (!portfolio) return { error: "Portfolio not found" };

  const existing = (portfolio.holdings || []).find((h) => normalizeSymbol(h.symbol) === symbol);
  if (existing) {
    existing.quantity = quantity;
    existing.avgCost = avgCost;
    existing.notes = body?.notes ?? existing.notes ?? null;
    existing.updatedAt = nowIso();
  } else {
    portfolio.holdings = portfolio.holdings || [];
    portfolio.holdings.push({
      id: `h-${Date.now()}`,
      symbol,
      quantity,
      avgCost,
      notes: body?.notes || null,
      addedAt: nowIso(),
      updatedAt: nowIso(),
    });
  }
  portfolio.updatedAt = nowIso();
  await savePortfolios(store);
  return { ok: true, portfolio };
}

async function removeHolding(portfolioId, symbolRaw) {
  const symbol = normalizeSymbol(symbolRaw);
  const store = await loadPortfolios();
  const portfolio = store.portfolios.find((p) => p.id === portfolioId);
  if (!portfolio) return { error: "Portfolio not found" };
  portfolio.holdings = (portfolio.holdings || []).filter(
    (h) => normalizeSymbol(h.symbol) !== symbol
  );
  portfolio.updatedAt = nowIso();
  await savePortfolios(store);
  return { ok: true, portfolio };
}

async function createPortfolio(name) {
  const store = await loadPortfolios();
  const p = {
    id: `pf-${Date.now()}`,
    name: name || `Portfolio ${store.portfolios.length + 1}`,
    currency: "INR",
    holdings: [],
    createdAt: nowIso(),
    updatedAt: nowIso(),
    note: null,
  };
  store.portfolios.push(p);
  await savePortfolios(store);
  return p;
}

function csvEscape(val) {
  if (val == null) return "";
  const s = String(val);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * Export holdings as CSV (symbol, quantity, avgCost, notes).
 * Prices are NOT exported as cost basis — only user-entered fields for re-import.
 */
async function exportPortfolioCsv(portfolioId = "default") {
  const store = await loadPortfolios();
  const portfolio =
    store.portfolios.find((p) => p.id === portfolioId) || store.portfolios[0];
  if (!portfolio) return { error: "Portfolio not found" };
  const lines = ["symbol,quantity,avgCost,notes"];
  for (const h of portfolio.holdings || []) {
    lines.push(
      [h.symbol, h.quantity, h.avgCost, h.notes || ""].map(csvEscape).join(",")
    );
  }
  return {
    ok: true,
    filename: `abc-portfolio-${portfolio.id}.csv`,
    csv: lines.join("\n") + "\n",
    portfolioId: portfolio.id,
    rows: (portfolio.holdings || []).length,
  };
}

/**
 * Export analysis snapshot CSV with live P&L columns (verified prices only).
 */
async function exportPortfolioAnalysisCsv(portfolioId = "default") {
  const analysis = await getPortfolioAnalysis(portfolioId);
  if (!analysis.available) return { error: analysis.reason || "Unavailable" };
  const lines = [
    "symbol,name,quantity,avgCost,lastPrice,marketValue,unrealizedPnl,unrealizedPnlPct,weightPct,dataAvailable",
  ];
  for (const h of analysis.holdings) {
    lines.push(
      [
        h.symbol,
        h.name,
        h.quantity,
        h.avgCost,
        h.lastPrice,
        h.marketValue,
        h.unrealizedPnl,
        h.unrealizedPnlPct,
        h.weightPct,
        h.dataAvailable,
      ]
        .map(csvEscape)
        .join(",")
    );
  }
  return {
    ok: true,
    filename: `abc-portfolio-analysis-${analysis.portfolio.id}.csv`,
    csv: lines.join("\n") + "\n",
    rows: analysis.holdings.length,
  };
}

/**
 * Import CSV holdings. Expected headers (case-insensitive):
 *   symbol, quantity, avgCost [, notes]
 * Compatible with simple broker export remaps (Zerodha-style Symbol/Qty/Avg. cost aliases).
 * Never invents prices — only stores cost basis.
 */
function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      q = !q;
      continue;
    }
    if (c === "," && !q) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += c;
  }
  out.push(cur.trim());
  return out;
}

async function importPortfolioCsv(portfolioId, csvText, { replace = false } = {}) {
  if (!csvText || typeof csvText !== "string") {
    return { error: "csv text is required" };
  }
  const lines = csvText.replace(/^\uFEFF/, "").trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return { error: "CSV must include header and at least one row" };

  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/[\s._]/g, ""));
  const idx = {
    symbol: header.findIndex((h) =>
      ["symbol", "tradingsymbol", "ticker", "scrip", "stock"].includes(h)
    ),
    quantity: header.findIndex((h) =>
      ["quantity", "qty", "shares", "units"].includes(h)
    ),
    avgCost: header.findIndex((h) =>
      ["avgcost", "averagecost", "avgprice", "buyavg", "averageprice", "price"].includes(h)
    ),
    notes: header.findIndex((h) => ["notes", "note", "remark"].includes(h)),
  };
  if (idx.symbol < 0 || idx.quantity < 0 || idx.avgCost < 0) {
    return {
      error:
        "CSV headers must include symbol, quantity (or qty), and avgCost (or avg price). Compatible with common broker export aliases.",
    };
  }

  const store = await loadPortfolios();
  const portfolio = store.portfolios.find((p) => p.id === portfolioId);
  if (!portfolio) return { error: "Portfolio not found" };

  const imported = [];
  const errors = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const symbol = normalizeSymbol(cols[idx.symbol]);
    const quantity = Number(String(cols[idx.quantity]).replace(/,/g, ""));
    const avgCost = Number(String(cols[idx.avgCost]).replace(/,/g, ""));
    const notes = idx.notes >= 0 ? cols[idx.notes] || null : null;
    if (!symbol || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(avgCost) || avgCost < 0) {
      errors.push({ row: i + 1, reason: "Invalid symbol, quantity, or avgCost" });
      continue;
    }
    imported.push({ symbol, quantity, avgCost, notes });
  }

  if (!imported.length) {
    return { error: "No valid rows imported", errors };
  }

  if (replace) {
    portfolio.holdings = [];
  }

  for (const row of imported) {
    const existing = (portfolio.holdings || []).find(
      (h) => normalizeSymbol(h.symbol) === row.symbol
    );
    if (existing) {
      existing.quantity = row.quantity;
      existing.avgCost = row.avgCost;
      existing.notes = row.notes ?? existing.notes;
      existing.updatedAt = nowIso();
    } else {
      portfolio.holdings = portfolio.holdings || [];
      portfolio.holdings.push({
        id: `h-${Date.now()}-${row.symbol}`,
        symbol: row.symbol,
        quantity: row.quantity,
        avgCost: row.avgCost,
        notes: row.notes,
        addedAt: nowIso(),
        updatedAt: nowIso(),
      });
    }
  }
  portfolio.updatedAt = nowIso();
  await savePortfolios(store);

  return {
    ok: true,
    imported: imported.length,
    errors,
    portfolio,
    storageMode: getStorageMode(),
    note: "Imported cost basis only — live P&L uses verified Yahoo prices on next analysis refresh. Not a live broker link.",
  };
}

async function exportWatchlistCsv(listId = "default") {
  const store = await loadWatchlists();
  const list = store.lists.find((l) => l.id === listId) || store.lists[0];
  if (!list) return { error: "Watchlist not found" };
  const lines = ["symbol"];
  for (const s of list.symbols || []) lines.push(csvEscape(s));
  return {
    ok: true,
    filename: `abc-watchlist-${list.id}.csv`,
    csv: lines.join("\n") + "\n",
    rows: (list.symbols || []).length,
  };
}

function getPersistenceInfo() {
  return {
    storageMode: getStorageMode(),
    modes: {
      "vercel-kv": "Persistent Vercel KV (recommended for production multi-instance)",
      "custom-dir": "Custom ABC_DATA_DIR filesystem",
      "vercel-tmp": "Ephemeral /tmp on Vercel (resets on cold start — set KV for permanence)",
      "local-fs": "Local data/ directory",
    },
    brokerLink: {
      available: false,
      reason:
        "Live broker connectivity requires user API keys (Zerodha/Kite, Groww, etc.) and is not enabled. Use CSV import of holdings from your broker export instead.",
    },
  };
}

module.exports = {
  getWatchlistDashboard,
  addWatchlistSymbol,
  removeWatchlistSymbol,
  createWatchlist,
  getPortfolioAnalysis,
  upsertHolding,
  removeHolding,
  createPortfolio,
  exportPortfolioCsv,
  exportPortfolioAnalysisCsv,
  importPortfolioCsv,
  exportWatchlistCsv,
  getPersistenceInfo,
  normalizeSymbol,
  loadWatchlists,
  loadPortfolios,
  WATCHLISTS_FILE,
  PORTFOLIOS_FILE,
};
