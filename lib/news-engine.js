/**
 * Market news desk: verified headlines from public feeds + rule-based impact.
 *
 * Headlines/source/time are factual (publisher RSS / Yahoo Finance search).
 * Impact, bias, and "what to do" are analytical interpretations of wording
 * only — never treated as prices, filings, or investment advice.
 */

const { fetchWithTimeout } = require("./fetch-utils");
const { YAHOO_HEADERS } = require("./yahoo");
const { loadConstituents } = require("./nifty500");
const { wrapResponse } = require("./compliance");

const CACHE_TTL_MS = 4 * 60 * 1000;
const MAX_ITEMS = 28;

const YAHOO_SEARCH =
  "https://query1.finance.yahoo.com/v1/finance/search?quotesCount=0&newsCount=12&q=";

const GOOGLE_RSS =
  "https://news.google.com/rss/search?hl=en-IN&gl=IN&ceid=IN:en&q=";

const GOOGLE_QUERIES = [
  'NIFTY OR Sensex OR "share market" India when:2d',
  "RBI OR FII OR DII OR SEBI stock India when:2d",
  "NSE BSE earnings OR IPO OR listing India when:2d",
  "rupee OR crude OR inflation India market when:2d",
];

const YAHOO_QUERIES = ["NIFTY 50 India", "BSE Sensex", "RBI repo rate India", "FII DII India stocks"];

const MARKET_RE =
  /\b(nifty|sensex|nse|bse|stock|stocks|share|shares|equity|equities|market|markets|rbi|sebi|fiis?|diis?|ipo|listing|rupee|inr|crude|oil|repo|mpc|earnings|results|pat|q[1-4]|bank|nbfc|index|indices|rally|selloff|circuit|fno|f&o|derivative|sgx)\b/i;

const EXCLUDE_RE =
  /\b(cricket|bollywood|recipe|horoscope|ipl squad|football score|netflix|movie review)\b/i;

const THEMES = [
  {
    id: "holiday_session",
    label: "Session / Holiday",
    scope: "market",
    re: /\b(holiday|closed|trading halt|muhurat|good friday|independence day|diwali|market holiday)\b/i,
  },
  {
    id: "rbi_policy",
    label: "RBI / Rates",
    scope: "market",
    re: /\b(rbi|reserve bank|repo rate|mpc|monetary policy|rate cut|rate hike|liquidity)\b/i,
  },
  {
    id: "fii_dii",
    label: "FII / DII Flows",
    scope: "market",
    re: /\b(fiis?|diis?|foreign institutional|domestic institutional|foreign fund)\b/i,
  },
  {
    id: "inflation",
    label: "Inflation / Macro",
    scope: "market",
    re: /\b(cpi|wpi|inflation|gdp|iip|pmi)\b/i,
  },
  {
    id: "currency_oil",
    label: "Rupee / Crude",
    scope: "market",
    re: /\b(rupee|usd\/inr|dollar|crude|brent|opec|oil price)\b/i,
  },
  {
    id: "sebi_reg",
    label: "SEBI / Regulation",
    scope: "market",
    re: /\b(sebi|regulator|compliance|ban|penalty|insider)\b/i,
  },
  {
    id: "earnings",
    label: "Earnings / Results",
    scope: "stock",
    re: /\b(earnings|results|profit|pat|revenue|q1|q2|q3|q4|quarterly|beats|misses)\b/i,
  },
  {
    id: "ipo",
    label: "IPO / Primary",
    scope: "stock",
    re: /\b(ipo|listing|grey market|subscription|issue price)\b/i,
  },
  {
    id: "mna",
    label: "M&A / Stake",
    scope: "stock",
    re: /\b(merger|acquisition|acquire|stake|open offer|buyback|demerger)\b/i,
  },
  {
    id: "geopolitics",
    label: "Geopolitics / Trade",
    scope: "market",
    re: /\b(tariff|sanction|war|geopolit|export duty|import duty)\b/i,
  },
  {
    id: "sector_move",
    label: "Sector Move",
    scope: "sector",
    re: /\b(it stocks|bank stocks|auto stocks|pharma|metal|realty|fmcg|psu)\b/i,
  },
];

const BULLISH_RE =
  /\b(surge|rally|jumps?|soars?|gains?|rallies|beats?|upgrade|inflow|inflows|record high|all-time high|strong results|profit jump|rate cut)\b/i;
const BEARISH_RE =
  /\b(crash|slump|plunge|tumble|misses?|downgrade|outflow|outflows|sell[- ]?off|selling|dumps?|probe|ban|default|fraud|weak results|profit drop|falls?|rate hike)\b/i;

let cache = { key: "", expiresAt: 0, value: null };
let tickerIndex = null;

function decodeXml(s) {
  return String(s || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function stripTags(s) {
  return decodeXml(s).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function tag(xml, name) {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decodeXml(m[1]) : "";
}

function parseRssItems(xml, sourceName) {
  const items = [];
  const re = /<item>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = re.exec(xml))) {
    const block = m[1];
    const title = stripTags(tag(block, "title"));
    const link = tag(block, "link");
    const pubDate = tag(block, "pubDate");
    const source = stripTags(tag(block, "source")) || sourceName;
    const description = stripTags(tag(block, "description"));
    if (!title || !link) continue;
    const publishedAt = pubDate ? new Date(pubDate) : null;
    items.push({
      id: `rss:${Buffer.from(title).toString("base64url").slice(0, 24)}`,
      title,
      url: link,
      publisher: source,
      summary: description && description !== title ? description.slice(0, 280) : "",
      publishedAt: publishedAt && !Number.isNaN(publishedAt.getTime()) ? publishedAt.toISOString() : null,
      sourceKind: "rss",
      feed: sourceName,
    });
  }
  return items;
}

function yahooItems(payload, query) {
  const news = payload?.news;
  if (!Array.isArray(news)) return [];
  return news
    .filter((n) => n && n.title && (n.link || n.url))
    .map((n) => {
      const ts = Number(n.providerPublishTime);
      const publishedAt = Number.isFinite(ts) && ts > 0 ? new Date(ts * 1000).toISOString() : null;
      return {
        id: `yh:${n.uuid || n.title}`,
        title: n.title,
        url: n.link || n.url,
        publisher: n.publisher || "Yahoo Finance",
        summary: "",
        publishedAt,
        thumbnail: n.thumbnail?.resolutions?.[0]?.url || null,
        relatedTickers: Array.isArray(n.relatedTickers) ? n.relatedTickers : [],
        sourceKind: "yahoo",
        feed: `Yahoo search: ${query}`,
      };
    });
}

const INDIA_RE =
  /\b(india|indian|nifty|sensex|nse|bse|rbi|sebi|rupee|₹|inr|mumbai|fiis?|diis?|sgx nifty|dalal street)\b/i;

const INDIA_PUBLISHER_RE =
  /\b(moneycontrol|economic times|livemint|business standard|hindu business|ndtv profit|cnbctv18|zee business|newsonair|fortune india|the hindu|mint|reuters india|scanx|the hans india)\b/i;

function isMarketNews(item) {
  const blob = `${item.title} ${item.summary || ""} ${item.publisher || ""}`;
  if (EXCLUDE_RE.test(blob)) return false;
  if (!MARKET_RE.test(blob) && !INDIA_RE.test(blob)) return false;
  if (INDIA_RE.test(blob) || INDIA_PUBLISHER_RE.test(blob)) return true;
  return extractRelatedSymbols(item).length > 0;
}

function getTickerIndex() {
  if (tickerIndex) return tickerIndex;
  const list = loadConstituents();
  tickerIndex = list.map((c) => {
    const ticker = String(c.symbol || "").replace(/\.NS$/i, "");
    const name = String(c.name || "").replace(/\s+(Ltd\.?|Limited|Inc\.?)\.?$/i, "").trim();
    return {
      symbol: c.symbol,
      ticker,
      name,
      sector: c.sector || null,
      nameRe: name.length >= 5 ? new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i") : null,
    };
  });
  return tickerIndex;
}

const EXTRA_ALIASES = [
  ["reliance industries", "RELIANCE.NS"],
  ["reliance", "RELIANCE.NS"],
  ["tcs", "TCS.NS"],
  ["infosys", "INFY.NS"],
  ["hdfc bank", "HDFCBANK.NS"],
  ["icici bank", "ICICIBANK.NS"],
  ["state bank", "SBIN.NS"],
  ["sbi", "SBIN.NS"],
  ["bharti airtel", "BHARTIARTL.NS"],
  ["airtel", "BHARTIARTL.NS"],
  ["maruti", "MARUTI.NS"],
  ["wipro", "WIPRO.NS"],
  ["tata motors", "TATAMOTORS.NS"],
  ["adani", "ADANIENT.NS"],
];

function extractRelatedSymbols(item) {
  const text = `${item.title} ${item.summary || ""}`;
  const found = new Map();

  for (const [alias, symbol] of EXTRA_ALIASES) {
    if (new RegExp(`\\b${alias}\\b`, "i").test(text)) found.set(symbol, alias);
  }

  for (const row of getTickerIndex()) {
    if (row.nameRe && row.nameRe.test(text)) found.set(row.symbol, row.name);
    else if (row.ticker.length >= 4 && new RegExp(`\\b${row.ticker}\\b`, "i").test(text)) {
      found.set(row.symbol, row.ticker);
    }
  }

  for (const t of item.relatedTickers || []) {
    const raw = String(t || "").toUpperCase();
    if (!raw || raw.startsWith("^")) continue;
    const symbol = raw.endsWith(".NS") || raw.endsWith(".BO") ? raw : `${raw}.NS`;
    found.set(symbol, raw);
  }

  return [...found.entries()].slice(0, 5).map(([symbol, matchedAs]) => ({ symbol, matchedAs }));
}

function classifyTheme(text) {
  for (const theme of THEMES) {
    if (theme.re.test(text)) return theme;
  }
  return { id: "general_market", label: "Market Headline", scope: "market", re: null };
}

function classifyBias(text, themeId) {
  if (themeId === "holiday_session") return "watch";
  const up = BULLISH_RE.test(text);
  const down = BEARISH_RE.test(text);
  if (up && down) return "mixed";
  if (up) return "bullish";
  if (down) return "bearish";
  return "watch";
}

function impactCopy(theme, bias, symbols) {
  const names = symbols.map((s) => s.matchedAs || s.symbol.replace(/\.NS$/i, "")).join(", ");
  const stockBit = names ? ` Named name(s): ${names}.` : "";

  const market = {
    holiday_session: {
      watch: "Cash and F&O sessions are typically shut on exchange holidays. Overnight global cues can still gap the next open.",
    },
    rbi_policy: {
      bullish: "Rate-cut / easier-liquidity headlines usually lift banks, NBFCs, and realty first; the whole index often follows.",
      bearish: "A hike or tighter-liquidity headline typically pressures rate-sensitives (banks, housing finance, realty) and can cap the NIFTY.",
      mixed: "Policy headlines cut both ways — financials and duration assets will reprice first; wait for the official MPC statement.",
      watch: "RBI/MPC headlines reprice financials and the rupee. Until the official statement is out, treat this as a watch item.",
    },
    fii_dii: {
      bullish: "Sustained FII/DII buying supports index breadth. One-day prints do not confirm a trend.",
      bearish: "FII selling often hits large-cap index heavyweights first. DII buying can cushion but not always offset the tape.",
      mixed: "Offsetting FII vs DII prints usually mean a range-bound index with stock-specific moves.",
      watch: "Flow headlines matter over weeks, not minutes. Confirm against the NSE FII/DII terminal before changing risk.",
    },
    inflation: {
      bearish: "Hot inflation raises odds of tighter policy — a headwind for rate-sensitives and the multiple on the NIFTY.",
      bullish: "Cooler inflation can reopen rate-cut hopes and support the index multiple.",
      mixed: "Mixed macro prints often fade after the first hour. Wait for the official series, not the headline.",
      watch: "Macro prints move the rupee, bonds, and then equities. Check the actual CPI/GDP print before acting.",
    },
    currency_oil: {
      bearish: "A weaker rupee or a crude spike is a cost shock for OMCs, paints, aviation, and can weigh on the index.",
      bullish: "A stronger rupee or softer crude eases imported inflation — a tailwind for OMCs, paints, and the broader tape.",
      mixed: "Currency/crude headlines can reverse quickly. Map the move to your specific sector exposure.",
      watch: "Watch USD/INR and Brent; equities usually follow with a lag, not instantly.",
    },
    sebi_reg: {
      bearish: "Enforcement or restriction headlines can hit the named stock and, if systemic, risk appetite in that sector.",
      watch: "Regulatory headlines are often incomplete. Read the SEBI/exchange notice before changing a position.",
      mixed: "Rule changes can help one segment and hurt another — do not generalise to the whole market.",
    },
    earnings: {
      bullish: `A beat typically supports the named stock if guidance is intact.${stockBit} Peers can catch a sympathy bid.`,
      bearish: `A miss or weak guidance usually pressures the named stock first.${stockBit} Sector multiples can compress if it is a leader.`,
      mixed: `Results are mixed — price reaction depends on guidance, not just PAT.${stockBit}`,
      watch: `Treat this as a calendar event until the filing is out.${stockBit}`,
    },
    ipo: {
      watch: "IPO/listing headlines belong on the IPO terminal. Grey-market chatter is not a verified subscription figure.",
      bullish: "Strong listing/subscription headlines can lift sentiment in that sector for a session — they fade fast.",
      bearish: "A weak listing can sour primary-market sentiment and pressure similar names for a few sessions.",
    },
    mna: {
      bullish: `Stake/M&A headlines can re-rate the target if the deal is confirmed.${stockBit}`,
      bearish: `A deal break or a rich valuation can hurt both names.${stockBit}`,
      watch: `Unconfirmed M&A headlines are rumor-grade until a filing exists.${stockBit}`,
      mixed: `Deal headlines are name-specific; the index impact is usually small.${stockBit}`,
    },
    geopolitics: {
      bearish: "Trade/geopolitical shocks usually lift gold and USD and weigh on risk assets, especially exporters and energy.",
      watch: "Geopolitical headlines are noisy. Size risk down only if you already run leverage.",
      mixed: "Winners and losers split by export vs import exposure — do not treat this as a one-way market call.",
    },
    sector_move: {
      bullish: "A sector tape can lift the index if the group is heavy in NIFTY (IT, banks, oil).",
      bearish: "A sector sell-off can drag the index if those names are heavyweights.",
      mixed: "Rotation inside sectors is not the same as a market-wide risk-off.",
      watch: "Confirm the move on the Top 50 / sector heatmap before acting.",
    },
    general_market: {
      bullish: "A constructive market headline can support breadth, but one story rarely sets the trend.",
      bearish: "A negative tape headline can lift intra-day volatility. Do not assume a trend change from one item.",
      mixed: "The headline cuts both ways. Use it as context, not a trigger.",
      watch: "Use this as desk context. Confirm with price, flows, and filings before changing risk.",
    },
  };

  const bucket = market[theme.id] || market.general_market;
  return bucket[bias] || bucket.watch || market.general_market.watch;
}

function stockImpactCopy(bias, symbols, theme) {
  if (!symbols.length) {
    return {
      available: false,
      message: "No listed NSE name was identified in this headline. Treat the impact as market- or sector-wide only.",
    };
  }
  const list = symbols.map((s) => s.symbol.replace(/\.NS$/i, "")).join(", ");
  const lines = {
    bullish: `If the story holds, ${list} can see a positive gap or intra-day bid. Sympathy moves may show up in the same sector.`,
    bearish: `If the story holds, ${list} can gap down or lose relative strength. Avoid averaging until the filing or official print is out.`,
    mixed: `${list} may see a two-way open. Wait for the first 30–45 minutes rather than trading the headline.`,
    watch: `Keep ${list} on the watchlist and open the research terminal for verified price/fundamentals. Do not infer a target from the headline.`,
  };
  return {
    available: true,
    symbols,
    summary: lines[bias] || lines.watch,
    theme: theme.label,
    researchLinks: symbols.map((s) => ({
      symbol: s.symbol,
      href: `/nifty500/stock/${encodeURIComponent(s.symbol)}`,
    })),
  };
}

function actionPlan(theme, bias, symbols) {
  const named = symbols.length
    ? symbols.map((s) => s.symbol.replace(/\.NS$/i, "")).join(", ")
    : null;

  if (theme.id === "holiday_session") {
    return {
      label: "Stand down — session closed",
      urgency: "none",
      steps: [
        "Do not place cash-market orders that cannot fill today.",
        "Note overnight global futures; they can gap the next Indian open.",
        "Re-check NIFTY Strategy / F&O only after the next regular session starts.",
      ],
    };
  }

  if (theme.id === "rbi_policy") {
    return {
      label: bias === "watch" ? "Wait for the official MPC note" : "Review rate-sensitive exposure",
      urgency: bias === "watch" ? "low" : "medium",
      steps: [
        "Do not trade the leak — wait for the official RBI/MPC statement.",
        "If you hold banks, NBFCs, or realty, re-check thesis after the statement, not the headline.",
        "Avoid adding leverage into the first hour after a policy print.",
      ],
    };
  }

  if (theme.id === "fii_dii") {
    return {
      label: "Confirm on the FII/DII terminal",
      urgency: "low",
      steps: [
        "Open FII & DII Flows and compare this headline with the verified NSE session print.",
        "One-day flow is not a regime change — look at the weekly/monthly panels.",
        "Do not reverse a long-term position on a single flow headline.",
      ],
    };
  }

  if (theme.id === "earnings" && named) {
    return {
      label: bias === "bearish" ? `Review ${named} — do not average blindly` : `Do not chase ${named} on the open`,
      urgency: "medium",
      steps: [
        `Open the research terminal for ${named} and read verified results/valuation — not just this headline.`,
        "If you already hold it, check whether the thesis still holds; set/review a stop from the chart, not from the headline.",
        "If you do not hold it, wait for the first hour and a confirmed close rather than buying a gap.",
      ],
    };
  }

  if (theme.id === "ipo") {
    return {
      label: "Use the IPO Intelligence terminal",
      urgency: "low",
      steps: [
        "Verify subscription and timelines on the IPO terminal — grey-market talk is not a filing.",
        "Do not treat a listing pop as a sector buy signal.",
        "If you applied, wait for allotment; if you did not, skip chasing the first tick.",
      ],
    };
  }

  if (named) {
    return {
      label: `Watch ${named} — verify before acting`,
      urgency: bias === "bearish" ? "medium" : "low",
      steps: [
        `Open stock research for ${named} and confirm price, news, and fundamentals.`,
        "If you hold it, decide hold / trim / stop using your existing plan — not this headline alone.",
        "If you do not hold it, add it to a watchlist and wait for a confirmed session close.",
      ],
    };
  }

  return {
    label: bias === "bearish" ? "Reduce fresh leverage" : "Monitor — no forced action",
    urgency: bias === "bearish" ? "medium" : "low",
    steps: [
      "Treat this as desk context, not a trade ticket.",
      "Cross-check NIFTY / FII-DII / Top 50 before changing market-wide risk.",
      "If you run F&O, size down until the next verified print — do not add naked shorts or longs on a headline.",
    ],
  };
}

function analyzeHeadline(item) {
  const text = `${item.title} ${item.summary || ""}`;
  const theme = classifyTheme(text);
  const bias = classifyBias(text, theme.id);
  const symbols = extractRelatedSymbols(item);
  return {
    theme: theme.id,
    themeLabel: theme.label,
    scope: symbols.length ? "stock" : theme.scope,
    bias,
    relatedSymbols: symbols,
    marketImpact: {
      dataType: "analytical-interpretation",
      summary: impactCopy(theme, bias, symbols),
    },
    stockImpact: stockImpactCopy(bias, symbols, theme),
    action: actionPlan(theme, bias, symbols),
    disclaimer:
      "Analytical interpretation of headline wording only — not investment advice and not a substitute for exchange filings or official data.",
  };
}

function normalizeTitle(title) {
  return String(title || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function mergeAndRank(raw) {
  const seen = new Set();
  const out = [];
  for (const item of raw) {
    if (!item?.title || !isMarketNews(item)) continue;
    const key = normalizeTitle(item.title).slice(0, 80);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({
      ...item,
      analysis: analyzeHeadline(item),
    });
  }
  out.sort((a, b) => {
    const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return tb - ta;
  });
  return out.slice(0, MAX_ITEMS);
}

async function fetchYahooQuery(q) {
  const res = await fetchWithTimeout(`${YAHOO_SEARCH}${encodeURIComponent(q)}`, { headers: YAHOO_HEADERS }, 12_000);
  if (!res.ok) throw new Error(`Yahoo news search ${res.status}`);
  return yahooItems(await res.json(), q);
}

async function fetchGoogleQuery(q) {
  const res = await fetchWithTimeout(`${GOOGLE_RSS}${encodeURIComponent(q)}`, { headers: YAHOO_HEADERS }, 12_000);
  if (!res.ok) throw new Error(`Google News RSS ${res.status}`);
  return parseRssItems(await res.text(), "Google News");
}

async function collectHeadlines() {
  const jobs = [
    ...GOOGLE_QUERIES.map((q) => fetchGoogleQuery(q)),
    ...YAHOO_QUERIES.map((q) => fetchYahooQuery(q)),
  ];
  const settled = await Promise.allSettled(jobs);
  const raw = [];
  const errors = [];
  for (const s of settled) {
    if (s.status === "fulfilled") raw.push(...s.value);
    else errors.push(s.reason?.message || String(s.reason));
  }
  return { raw, errors };
}

function filterBySymbol(items, symbolRaw) {
  if (!symbolRaw) return items;
  const needle = String(symbolRaw).replace(/\.NS$/i, "").toUpperCase();
  if (!needle) return items;
  return items.filter((item) => {
    const hay = `${item.title} ${item.summary || ""} ${(item.analysis?.relatedSymbols || [])
      .map((s) => `${s.symbol} ${s.matchedAs}`)
      .join(" ")}`.toUpperCase();
    return hay.includes(needle);
  });
}

function summarizeDesk(items) {
  const counts = { bullish: 0, bearish: 0, mixed: 0, watch: 0 };
  for (const it of items) {
    const b = it.analysis?.bias;
    if (counts[b] != null) counts[b] += 1;
  }
  let tone = "Balanced / watchful";
  if (counts.bearish > counts.bullish + 2) tone = "Defensive tape in headlines";
  else if (counts.bullish > counts.bearish + 2) tone = "Constructive tape in headlines";
  return {
    total: items.length,
    ...counts,
    tone,
    note: "Tone is a count of headline wording, not a forecast of NIFTY.",
  };
}

async function buildNewsDesk({ symbol = null, refresh = false } = {}) {
  const key = "desk";
  if (!refresh && cache.value && Date.now() < cache.expiresAt && cache.key === key) {
    const items = filterBySymbol(cache.value.items, symbol);
    return finalize(items, cache.value.feedErrors, true, symbol);
  }

  const { raw, errors } = await collectHeadlines();
  const items = mergeAndRank(raw);
  cache = { key, expiresAt: Date.now() + CACHE_TTL_MS, value: { items, feedErrors: errors } };
  return finalize(filterBySymbol(items, symbol), errors, false, symbol);
}

function finalize(items, feedErrors, usedCache, symbol) {
  return wrapResponse(
    {
      available: items.length > 0,
      usedCache,
      symbolFilter: symbol || null,
      summary: summarizeDesk(items),
      items,
      filters: [
        { id: "all", label: "All" },
        { id: "market", label: "Market-wide" },
        { id: "stock", label: "Stock-specific" },
        { id: "rbi_policy", label: "RBI / Policy" },
        { id: "fii_dii", label: "FII / DII" },
        { id: "earnings", label: "Earnings" },
        { id: "ipo", label: "IPO" },
      ],
      feedErrors: feedErrors.length ? feedErrors.slice(0, 4) : [],
      message: items.length
        ? "Headlines from Google News (India markets) and Yahoo Finance search. Impact notes are analytical, not advice."
        : "No verified market headlines available from current feeds.",
    },
    {
      source: "Google News RSS (India) + Yahoo Finance news search",
      dataType: "mixed",
      confidence: items.length ? (usedCache ? 70 : 85) : 0,
      disclaimer:
        "Headlines are third-party publications and may be delayed or incomplete. Impact and action notes are analytical interpretations of wording — not investment advice. Always verify against NSE/BSE filings and official data.",
    }
  );
}

module.exports = {
  buildNewsDesk,
  analyzeHeadline,
  classifyTheme,
  classifyBias,
  extractRelatedSymbols,
  isMarketNews,
  parseRssItems,
  mergeAndRank,
  MARKET_RE,
};
