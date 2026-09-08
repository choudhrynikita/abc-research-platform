/**
 * Mutual funds (AMFI NAVs) + NSE-listed index/commodity ETFs (Nifty BeES and peers).
 * Live ETF prices from Yahoo; scheme NAVs from AMFI's public NAVAll file.
 */

const { fetchWithTimeout } = require("./fetch-utils");
const { fetchChart } = require("./yahoo");
const { mapPool } = require("./async-pool");
const { getDashboardCache, setDashboardCache } = require("./dashboard-cache");
const { computeIndicators, technicalSignal } = require("./indicators");
const { buildFundDeskPlans } = require("./funds-strategies");

const AMFI_NAV_URL = "https://www.amfiindia.com/spages/NAVAll.txt";
const AMFI_NAV_URLS = [
  "https://portal.amfiindia.com/spages/NAVAll.txt",
  AMFI_NAV_URL,
];
const AMFI_TTL_MS = 12 * 60 * 60 * 1000;
const AMFI_DATE_RE = /^\d{1,2}-[A-Za-z]{3}-\d{2,4}$/;

const ETF_UNIVERSE = [
  { symbol: "NIFTYBEES.NS", nse: "NIFTYBEES", name: "Nippon India ETF Nifty BeES", tracks: "Nifty 50", kind: "index", match: /etf nifty 50 bees/i },
  { symbol: "JUNIORBEES.NS", nse: "JUNIORBEES", name: "Nippon India ETF Junior BeES", tracks: "Nifty Next 50", kind: "index", match: /junior bees/i },
  { symbol: "BANKBEES.NS", nse: "BANKBEES", name: "Nippon India ETF Bank BeES", tracks: "Nifty Bank", kind: "index", match: /etf nifty bank bees/i },
  { symbol: "ITBEES.NS", nse: "ITBEES", name: "Nippon India ETF IT BeES", tracks: "Nifty IT", kind: "index", match: /etf nifty it\b/i },
  { symbol: "PSUBNKBEES.NS", nse: "PSUBNKBEES", name: "Nippon India ETF PSU Bank BeES", tracks: "Nifty PSU Bank", kind: "index", match: /etf nifty psu bank bees/i },
  { symbol: "MID150BEES.NS", nse: "MID150BEES", name: "Nippon India ETF Nifty Midcap 150", tracks: "Nifty Midcap 150", kind: "index", match: /etf nifty midcap 150/i },
  { symbol: "SETFNIF50.NS", nse: "SETFNIF50", name: "SBI Nifty 50 ETF", tracks: "Nifty 50", kind: "index", match: /sbi nifty 50 etf/i },
  { symbol: "NIFTYIETF.NS", nse: "NIFTYIETF", name: "ICICI Prudential Nifty 50 ETF", tracks: "Nifty 50", kind: "index", match: /icici prudential nifty 50 etf/i },
  { symbol: "NIFTY1.NS", nse: "NIFTY1", name: "Kotak Nifty 50 ETF", tracks: "Nifty 50", kind: "index", match: /kotak nifty 50 etf/i },
  { symbol: "NIFTYBETA.NS", nse: "NIFTYBETA", name: "UTI Nifty 50 ETF", tracks: "Nifty 50", kind: "index", match: /uti nifty 50 etf/i },
  { symbol: "GOLDBEES.NS", nse: "GOLDBEES", name: "Nippon India ETF Gold BeES", tracks: "Gold", kind: "commodity", match: /gold bees/i },
  { symbol: "SILVERBEES.NS", nse: "SILVERBEES", name: "Nippon India Silver ETF", tracks: "Silver", kind: "commodity", match: /nippon india silver etf/i },
  { symbol: "GOLDIETF.NS", nse: "GOLDIETF", name: "ICICI Prudential Gold ETF", tracks: "Gold", kind: "commodity", match: /icici prudential gold etf/i },
  { symbol: "LIQUIDBEES.NS", nse: "LIQUIDBEES", name: "Nippon India ETF Liquid BeES", tracks: "Liquid", kind: "liquid", match: /liquid bees/i },
  { symbol: "INFRABEES.NS", nse: "INFRABEES", name: "Nippon India ETF Infra BeES", tracks: "Nifty Infrastructure", kind: "index", match: /infrastructure bees/i },
  { symbol: "MON100.NS", nse: "MON100", name: "Motilal Oswal Nasdaq 100 ETF", tracks: "Nasdaq 100", kind: "international", match: /nasdaq 100 etf/i },
];

const FEATURED_MATCH = [
  { kind: "flexicap", re: /parag parikh flexi/i, blurb: "Flexi-cap, quality + global sleeve" },
  { kind: "smallcap", re: /nippon india small cap/i, blurb: "Small-cap compounder — high drawdown" },
  { kind: "smallcap", re: /quant small cap/i, blurb: "Quant small-cap — concentration risk" },
  { kind: "largecap", re: /icici prudential bluechip/i, blurb: "Large-cap core" },
  { kind: "largecap", re: /mirae asset large cap/i, blurb: "Large-cap core" },
  { kind: "midcap", re: /kotak emerging equity/i, blurb: "Mid-cap" },
  { kind: "index", re: /uti nifty 50 index/i, blurb: "Plain Nifty 50 index fund" },
  { kind: "index", re: /hdfc index fund.*nifty 50/i, blurb: "Nifty 50 index fund" },
  { kind: "index", re: /sbi nifty index/i, blurb: "SBI Nifty index" },
  { kind: "elss", re: /mirae asset elss|mirae asset tax saver/i, blurb: "ELSS — 3-year lock-in" },
  { kind: "elss", re: /axis (elss|long term equity)/i, blurb: "ELSS — 3-year lock-in" },
  { kind: "hybrid", re: /hdfc balanced advantage/i, blurb: "Dynamic hybrid" },
  { kind: "debt", re: /hdfc corporate bond/i, blurb: "Corporate bond" },
  { kind: "liquid", re: /hdfc liquid fund/i, blurb: "Parking cash" },
  { kind: "international", re: /motilal oswal nasdaq/i, blurb: "US tech via India wrapper" },
];

function classifyScheme(name, category) {
  const n = `${name} ${category || ""}`.toLowerCase();
  if (/\betf\b|bees/.test(n)) return "etf";
  if (/index fund|index scheme|nifty 50 index|sensex index/.test(n)) return "index";
  if (/liquid|overnight|money market/.test(n)) return "liquid";
  if (/gold|silver/.test(n) && /fund|etf/.test(n)) return "commodity";
  if (/elss|tax saver|tax-saver/.test(n)) return "elss";
  if (/hybrid|balanced|arbitrage|multi asset/.test(n)) return "hybrid";
  if (/gilt|bond|debt|income|credit risk|corporate bond|short duration|low duration/.test(n)) return "debt";
  if (/small cap/.test(n)) return "smallcap";
  if (/mid cap/.test(n)) return "midcap";
  if (/large cap|bluechip|blue chip/.test(n)) return "largecap";
  if (/flexi cap|multi cap|multicap/.test(n)) return "flexicap";
  if (/nasdaq|s&p 500|us |international/.test(n)) return "international";
  if (/equity scheme|equity/.test(n)) return "equity";
  return "other";
}

function looksLikeAmfiDate(value) {
  return AMFI_DATE_RE.test(String(value || "").trim());
}

function parseNavNumber(value) {
  const n = Number(String(value || "").replace(/,/g, "").trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

function composeSchemeName(name, plan, option) {
  return [name, plan, option]
    .map((part) => String(part || "").trim())
    .filter((part) => part && part !== "-")
    .join(" - ");
}

function parseAmfiParts(parts) {
  if (!Array.isArray(parts) || parts.length < 5) return null;
  const code = String(parts[0] || "").trim();
  const isinG = String(parts[1] || "").trim();
  const isinR = String(parts[2] || "").trim();
  const schemeName = String(parts[3] || "").trim();
  if (!code || !schemeName) return null;

  const last = parts[parts.length - 1];
  const secondLast = parts[parts.length - 2];
  let plan = null;
  let option = null;
  let nav = null;
  let date = null;

  if (looksLikeAmfiDate(last) && parseNavNumber(secondLast) != null) {
    date = String(last).trim();
    nav = parseNavNumber(secondLast);
    if (parts.length >= 8) {
      plan = String(parts[4] || "").trim() || null;
      option = String(parts[5] || "").trim() || null;
    } else if (parts.length === 7) {
      const extra = String(parts[4] || "").trim();
      if (/direct|regular|plan/i.test(extra)) plan = extra;
      else if (extra && extra !== "-") option = extra;
    }
  } else if (parseNavNumber(parts[4]) != null && looksLikeAmfiDate(parts[5])) {
    nav = parseNavNumber(parts[4]);
    date = String(parts[5]).trim();
  } else {
    return null;
  }

  if (nav == null) return null;
  return {
    code,
    isin: (isinG && isinG !== "-" ? isinG : isinR && isinR !== "-" ? isinR : null),
    schemeName,
    plan: plan && plan !== "-" ? plan : null,
    option: option && option !== "-" ? option : null,
    name: composeSchemeName(schemeName, plan, option),
    nav,
    date,
  };
}

function parseAmfiNavText(text) {
  const lines = String(text || "").split(/\r?\n/);
  let category = "Uncategorised";
  let amc = null;
  const schemes = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (/^scheme code/i.test(t)) continue;
    if (!t.includes(";")) {
      if (/mutual fund/i.test(t)) amc = t;
      else category = t.replace(/^[()\s]+|[()\s]+$/g, "");
      continue;
    }
    const parsed = parseAmfiParts(t.split(";"));
    if (!parsed) continue;
    schemes.push({
      ...parsed,
      amc,
      category,
      kind: classifyScheme(parsed.name, category),
    });
  }
  return schemes;
}

function pickNavDate(schemes) {
  const counts = new Map();
  for (const s of schemes || []) {
    if (!looksLikeAmfiDate(s.date)) continue;
    counts.set(s.date, (counts.get(s.date) || 0) + 1);
  }
  let best = null;
  let n = 0;
  for (const [date, count] of counts) {
    if (count > n) {
      best = date;
      n = count;
    }
  }
  return best;
}

function returnBetween(candles, days) {
  if (!Array.isArray(candles) || candles.length < 2) return null;
  const last = candles[candles.length - 1]?.close;
  if (last == null) return null;
  const target = new Date(`${candles[candles.length - 1].date}T00:00:00Z`);
  target.setUTCDate(target.getUTCDate() - days);
  let prior = candles[0];
  for (const c of candles) {
    if (c.date && new Date(`${c.date}T00:00:00Z`) <= target) prior = c;
  }
  if (prior?.close == null || prior.close === 0) return null;
  return Number((((last - prior.close) / prior.close) * 100).toFixed(2));
}

async function quoteEtf(row) {
  const chart = await fetchChart(row.symbol, "1d", "6mo");
  const candles = chart.candles || [];
  const last = candles[candles.length - 1] || {};
  const prev = candles[candles.length - 2] || {};
  const price = last.close ?? chart.meta?.regularMarketPrice ?? null;
  const changePct =
    price != null && prev.close
      ? Number((((price - prev.close) / prev.close) * 100).toFixed(2))
      : null;
  const indicators = candles.length >= 40 ? computeIndicators(candles) : { latest: {} };
  const latest = indicators.latest || {};
  const trend = candles.length >= 40 ? technicalSignal(indicators) : null;
  return {
    symbol: row.symbol,
    nse: row.nse,
    name: row.name,
    tracks: row.tracks,
    kind: row.kind,
    price,
    changePct,
    volume: last.volume ?? null,
    ret1m: returnBetween(candles, 21),
    ret3m: returnBetween(candles, 63),
    ret6m: returnBetween(candles, 126),
    high52: chart.meta?.fiftyTwoWeekHigh ?? null,
    low52: chart.meta?.fiftyTwoWeekLow ?? null,
    currency: chart.meta?.currency || "INR",
    atr: latest.atr ?? null,
    sma20: latest.sma20 ?? null,
    sma50: latest.sma50 ?? null,
    rsi: latest.rsi ?? null,
    trend,
    fetchedAt: new Date().toISOString(),
  };
}

function isEtfScheme(scheme) {
  const n = `${scheme?.name || ""} ${scheme?.category || ""}`.toLowerCase();
  if (/fund of fund|\bfof\b/.test(n)) return false;
  if (/\betf\b|bees/.test(n)) return true;
  return scheme?.kind === "etf";
}

function matchAmfi(schemes, row) {
  const hits = (schemes || []).filter((s) => row.match.test(s.name) && isEtfScheme(s));
  if (!hits.length) return null;
  const growth = hits.find((s) => /growth|bees|etf/i.test(s.name) && !/idcw|dividend/i.test(s.name));
  return growth || hits[0];
}

function premiumToNav(price, nav) {
  if (price == null || nav == null || nav === 0) return null;
  return Number((((price - nav) / nav) * 100).toFixed(2));
}

let amfiMemory = null;

async function loadAmfiSchemes() {
  if (amfiMemory && Date.now() - amfiMemory.cachedAt < AMFI_TTL_MS) return amfiMemory.data;
  let lastError = null;
  let text = "";
  for (const url of AMFI_NAV_URLS) {
    try {
      const res = await fetchWithTimeout(url, {}, 25_000);
      if (!res.ok) {
        lastError = new Error(`AMFI NAV file returned ${res.status}`);
        continue;
      }
      text = await res.text();
      if (text && text.includes(";")) break;
      lastError = new Error("AMFI NAV file was empty");
      text = "";
    } catch (err) {
      lastError = err;
    }
  }
  if (!text) throw lastError || new Error("AMFI NAV file unavailable");
  const schemes = parseAmfiNavText(text);
  if (!schemes.length) throw new Error("AMFI NAV file parsed empty");
  const payload = {
    schemes,
    fetchedAt: new Date().toISOString(),
    navDate: pickNavDate(schemes),
    count: schemes.length,
  };
  amfiMemory = { data: payload, cachedAt: Date.now() };
  return payload;
}

function pickFeatured(schemes, prevNav) {
  const out = [];
  const used = new Set();
  for (const spec of FEATURED_MATCH) {
    const pool = schemes.filter((s) => spec.re.test(s.name) && !used.has(s.code) && !/idcw|dividend/i.test(s.name));
    const hit = pool.find((s) => /growth/i.test(s.name) && /direct/i.test(s.name))
      || pool.find((s) => /growth/i.test(s.name))
      || null;
    if (!hit) continue;
    used.add(hit.code);
    const prev = prevNav?.[hit.code];
    out.push({
      ...hit,
      blurb: spec.blurb,
      changePct: prev && prev > 0 ? Number((((hit.nav - prev) / prev) * 100).toFixed(2)) : null,
    });
  }
  return out;
}

function categoryCounts(schemes) {
  const counts = {};
  for (const s of schemes) counts[s.kind] = (counts[s.kind] || 0) + 1;
  return counts;
}

async function buildFundsDashboard() {
  const amfi = await loadAmfiSchemes();
  const prevCache = await getDashboardCache("amfi-prev-nav", 14 * 24 * 60 * 60 * 1000);
  const prevNav = prevCache?.data?.byCode || {};

  const uniqueEtf = [];
  const seen = new Set();
  for (const row of ETF_UNIVERSE) {
    if (seen.has(row.nse)) continue;
    seen.add(row.nse);
    uniqueEtf.push(row);
  }

  const quoted = await mapPool(uniqueEtf, 4, async (row) => {
    try {
      const q = await quoteEtf(row);
      const navRow = matchAmfi(amfi.schemes, row);
      return {
        ...q,
        nav: navRow?.nav ?? null,
        navDate: navRow?.date ?? amfi.navDate,
        amc: navRow?.amc ?? null,
        premiumPct: premiumToNav(q.price, navRow?.nav),
        schemeCode: navRow?.code ?? null,
      };
    } catch (err) {
      return {
        symbol: row.symbol,
        nse: row.nse,
        name: row.name,
        tracks: row.tracks,
        kind: row.kind,
        error: err.message,
        price: null,
        nav: matchAmfi(amfi.schemes, row)?.nav ?? null,
      };
    }
  });

  const featured = pickFeatured(amfi.schemes, prevNav);
  const bees = quoted.find((e) => e.nse === "NIFTYBEES") || quoted[0] || null;
  const strategies = buildFundDeskPlans({ etfs: quoted, featured, navDate: amfi.navDate });

  const byCode = {};
  for (const row of [...featured, ...quoted]) {
    if (row.schemeCode) byCode[row.schemeCode] = row.nav;
    if (row.code) byCode[row.code] = row.nav;
  }
  await setDashboardCache("amfi-prev-nav", { byCode, savedFrom: amfi.fetchedAt });

  return {
    source: "AMFI NAVAll + Yahoo ETF quotes",
    refreshedAt: new Date().toISOString(),
    navDate: amfi.navDate,
    schemeCount: amfi.count,
    executiveSummary: {
      niftyBees: bees?.price ?? null,
      niftyBeesChange: bees?.changePct ?? null,
      niftyBeesNav: bees?.nav ?? null,
      niftyBeesPremium: bees?.premiumPct ?? null,
      etfCount: quoted.filter((e) => e.price != null).length,
      schemeCount: amfi.count,
      navDate: amfi.navDate,
      actionable: strategies.filter((s) => s.status === "Plan").length,
    },
    etfs: quoted.map((e) => ({
      ...e,
      playbook: strategies.find((s) => s.contract === e.nse) || null,
    })),
    featured: featured.map((f) => ({
      ...f,
      playbook: strategies.find((s) => s.id === `fund-sip-${f.code}`) || null,
    })),
    strategies,
    counts: categoryCounts(amfi.schemes),
    notes: [
      "ETF last price is the exchange print. NAV is the fund's end-of-day value from AMFI.",
      "Premium/discount = (price − NAV) / NAV. A persistent premium is not a bargain.",
      "Mutual-fund NAVs are T+0/T+1 AMFI prints — not live like Nifty BeES on NSE.",
      "Index ETFs (BeES and peers) are how most people buy 'the Nifty' in one fill.",
      "Playbooks below tell you BUY / WAIT / SIP with a rupee size and a premium rule. They are not broker orders.",
    ],
  };
}

function searchFunds(schemes, query, limit = 40) {
  const q = String(query || "").trim().toLowerCase();
  if (q.length < 2) return [];
  const scored = [];
  for (const s of schemes) {
    const name = s.name.toLowerCase();
    if (!name.includes(q) && !(s.amc || "").toLowerCase().includes(q) && s.code !== q) continue;
    const growthBoost = /growth/i.test(s.name) ? 2 : 0;
    const etfBoost = s.kind === "etf" ? 3 : 0;
    scored.push({ s, score: (name.startsWith(q) ? 10 : 0) + growthBoost + etfBoost });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((row) => row.s);
}

async function searchFundsQuery(query) {
  const amfi = await loadAmfiSchemes();
  return {
    query,
    navDate: amfi.navDate,
    results: searchFunds(amfi.schemes, query, 40),
  };
}

module.exports = {
  ETF_UNIVERSE,
  parseAmfiNavText,
  classifyScheme,
  premiumToNav,
  searchFunds,
  buildFundsDashboard,
  searchFundsQuery,
  loadAmfiSchemes,
  buildFundDeskPlans,
  matchAmfi,
  pickFeatured,
  pickNavDate,
};
