/**
 * Commodities desk — gold, silver, crude, natgas, copper, USDINR.
 * Prices from Yahoo futures (COMEX/NYMEX) plus Indian ETF proxies (BeES).
 * Strategies are technical plans from verified candles — not MCX LTP.
 */

const { fetchChart } = require("./yahoo");
const { computeIndicators, technicalSignal } = require("./indicators");
const { mapPool } = require("./async-pool");

const UNIVERSE = [
  { id: "gold", symbol: "GC=F", name: "Gold", venue: "COMEX", unit: "USD/oz", proxy: "GOLDBEES.NS", proxyName: "Gold BeES", mcx: "MCX Gold", kind: "metal" },
  { id: "silver", symbol: "SI=F", name: "Silver", venue: "COMEX", unit: "USD/oz", proxy: "SILVERBEES.NS", proxyName: "Silver BeES", mcx: "MCX Silver", kind: "metal" },
  { id: "crude", symbol: "CL=F", name: "Crude oil (WTI)", venue: "NYMEX", unit: "USD/bbl", proxy: null, proxyName: null, mcx: "MCX Crude", kind: "energy" },
  { id: "natgas", symbol: "NG=F", name: "Natural gas", venue: "NYMEX", unit: "USD/mmBtu", proxy: null, proxyName: null, mcx: "MCX Natural Gas", kind: "energy" },
  { id: "copper", symbol: "HG=F", name: "Copper", venue: "COMEX", unit: "USD/lb", proxy: null, proxyName: null, mcx: "MCX Copper", kind: "metal" },
  { id: "usdinr", symbol: "INR=X", name: "USD / INR", venue: "FX", unit: "INR per USD", proxy: null, proxyName: null, mcx: "NSE USDINR", kind: "fx" },
];

function round(n, d = 2) {
  if (n == null || !Number.isFinite(Number(n))) return null;
  return Number(Number(n).toFixed(d));
}

function changePct(candles) {
  if (!candles || candles.length < 2) return null;
  const a = candles[candles.length - 1]?.close;
  const b = candles[candles.length - 2]?.close;
  if (a == null || b == null || b === 0) return null;
  return round(((a - b) / b) * 100);
}

function ret(candles, days) {
  if (!candles || candles.length < 5) return null;
  const last = candles[candles.length - 1];
  if (!last?.close || !last.date) return null;
  const target = new Date(`${last.date}T00:00:00Z`);
  target.setUTCDate(target.getUTCDate() - days);
  let prior = candles[0];
  for (const c of candles) {
    if (c.date && new Date(`${c.date}T00:00:00Z`) <= target) prior = c;
  }
  if (!prior?.close) return null;
  return round(((last.close - prior.close) / prior.close) * 100);
}

function buildPlans(row, latest, trend, price) {
  const atr = latest.atr;
  const support = latest.support;
  const resistance = latest.resistance;
  const plans = [];
  const caution = row.id === "natgas"
    ? "Natural gas is violent. Size as if a limit day is normal."
    : row.kind === "energy"
      ? "Energy gaps on inventory and geopolitics. Defined size, not hope."
      : null;

  if (trend === "BULLISH" && price != null) {
    const stop = atr != null ? round(price - 1.5 * atr) : support;
    const t1 = atr != null ? round(price + 1 * atr) : resistance;
    const t2 = atr != null ? round(price + 2 * atr) : resistance;
    plans.push({
      name: `${row.name} trend pullback`,
      bias: "Bullish",
      type: "Trend follow",
      holdingPeriod: "5–20 sessions",
      entryZone: support != null ? { low: round(support), high: round(price) } : { low: price, high: price },
      stopLoss: stop,
      targets: { t1, t2 },
      why: [
        { category: "Trend", text: `${row.name} tape is bullish on SMA/RSI/MACD composite.` },
        atr != null ? { category: "Risk", text: `Stop ~1.5× ATR (${atr} ${row.unit}).` } : null,
        row.proxy ? { category: "India", text: `Rupee proxy: ${row.proxyName} (${row.proxy.replace(".NS", "")}).` } : null,
      ].filter(Boolean),
      caution,
    });
  } else if (trend === "BEARISH" && price != null) {
    const stop = atr != null ? round(price + 1.5 * atr) : resistance;
    const t1 = atr != null ? round(price - 1 * atr) : support;
    const t2 = atr != null ? round(price - 2 * atr) : support;
    plans.push({
      name: `${row.name} trend short / hedge`,
      bias: "Bearish",
      type: "Trend follow",
      holdingPeriod: "5–15 sessions",
      entryZone: resistance != null ? { low: round(price), high: round(resistance) } : { low: price, high: price },
      stopLoss: stop,
      targets: { t1, t2 },
      why: [
        { category: "Trend", text: `${row.name} composite is bearish. Short futures or reduce long BeES/physical hedges.` },
        caution ? { category: "Caution", text: caution } : null,
      ].filter(Boolean),
      caution,
    });
  } else if (price != null) {
    plans.push({
      name: `${row.name} range / stand aside`,
      bias: "Neutral",
      type: "Range",
      holdingPeriod: "Until ADX / SMA resume a side",
      entryZone: support != null && resistance != null ? { low: round(support), high: round(resistance) } : null,
      stopLoss: atr != null ? round(1.2 * atr) : null,
      targets: { t1: "Fade range extremes only with a written invalidation", t2: "No new trend add" },
      why: [
        { category: "Regime", text: "Composite is mixed. Mean-revert only if you will actually fade both edges." },
        { category: "Default", text: "Passing is a position. Energy especially." },
      ],
      caution,
    });
  }

  if (row.proxy) {
    plans.push({
      name: `${row.proxyName} as the rupee wrapper`,
      bias: trend === "BEARISH" ? "Bearish" : trend === "BULLISH" ? "Bullish" : "Neutral",
      type: "ETF proxy",
      holdingPeriod: "Position / SIP — not a day trade unless the premium is extreme",
      entryZone: null,
      stopLoss: "ATR stop on the BeES if you treat it as a trade, not jewellery",
      targets: { t1: "Track the metal, not a P/E", t2: "Watch ETF premium vs AMFI NAV on the Funds desk" },
      why: [
        { category: "India", text: `${row.proxyName} is how most Indian accounts own ${row.name} without an MCX login.` },
        { category: "Cost", text: "TER + tracking + premium. Futures have roll and SPAN instead." },
      ],
      caution: null,
    });
  }

  return plans.map((plan, i) => ({
    ...plan,
    id: `${row.id}-${i + 1}`,
    commodityId: row.id,
    commodity: row.name,
    mcx: row.mcx,
    venue: row.venue,
    symbol: row.symbol,
    proxy: row.proxy,
    rank: null,
  }));
}

async function analyzeOne(row) {
  const chart = await fetchChart(row.symbol, "1d", "1y");
  const candles = chart.candles || [];
  const price = candles.at(-1)?.close ?? chart.meta?.regularMarketPrice ?? null;
  const indicators = candles.length >= 30 ? computeIndicators(candles) : { latest: {} };
  const latest = indicators.latest || {};
  const trend = candles.length >= 30 ? technicalSignal(indicators) : "NEUTRAL";
  let proxy = null;
  if (row.proxy) {
    try {
      const p = await fetchChart(row.proxy, "1d", "3mo");
      const pc = p.candles || [];
      proxy = {
        symbol: row.proxy,
        name: row.proxyName,
        price: pc.at(-1)?.close ?? null,
        changePct: changePct(pc),
      };
    } catch {
      proxy = { symbol: row.proxy, name: row.proxyName, price: null };
    }
  }
  const plans = buildPlans(row, latest, trend, price);
  return {
    ...row,
    price,
    changePct: changePct(candles),
    ret1m: ret(candles, 21),
    ret3m: ret(candles, 63),
    trend,
    rsi: latest.rsi ?? null,
    atr: latest.atr ?? null,
    adx: latest.adx ?? null,
    sma20: latest.sma20 ?? null,
    sma50: latest.sma50 ?? null,
    support: latest.support ?? null,
    resistance: latest.resistance ?? null,
    proxy,
    plans,
    fetchedAt: new Date().toISOString(),
  };
}

async function buildCommoditiesDashboard() {
  const rows = await mapPool(UNIVERSE, 3, async (row) => {
    try {
      return await analyzeOne(row);
    } catch (err) {
      return {
        ...row,
        error: err.message,
        price: null,
        trend: null,
        plans: [],
      };
    }
  });

  const strategies = [];
  for (const row of rows) {
    for (const plan of row.plans || []) strategies.push({ ...plan, last: row.price, trend: row.trend });
  }
  strategies.forEach((s, i) => {
    s.rank = i + 1;
  });

  const gold = rows.find((r) => r.id === "gold");
  const crude = rows.find((r) => r.id === "crude");

  return {
    source: "Yahoo COMEX/NYMEX/FX + Indian ETF proxies",
    refreshedAt: new Date().toISOString(),
    executiveSummary: {
      gold: gold?.price ?? null,
      goldChange: gold?.changePct ?? null,
      goldTrend: gold?.trend ?? null,
      crude: crude?.price ?? null,
      crudeChange: crude?.changePct ?? null,
      contractsLive: rows.filter((r) => r.price != null).length,
      strategies: strategies.length,
    },
    contracts: rows,
    strategies,
    notes: [
      "Futures last prices are COMEX/NYMEX (USD). MCX rupee contracts can print a different number the same minute.",
      "Gold BeES / Silver BeES are the listed Indian wrappers — see Mutual Funds & ETFs for NAV vs price.",
      "Natural gas is a specialist product. If ATR looks like a horror film, it is doing its job.",
      "These are technical plans from verified daily candles, not a broker order ticket.",
    ],
  };
}

module.exports = { UNIVERSE, buildCommoditiesDashboard, buildPlans };
