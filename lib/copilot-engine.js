/**
 * ABC AI Research Copilot — verified-data grounded Q&A.
 *
 * Architecture:
 *  1. Classify intent + extract ticker symbols from the user query.
 *  2. Fetch verified market/fundamentals/flow data from platform modules.
 *  3. Build a structured answer from those facts only.
 *  4. Optionally polish prose via xAI (SpaceXAI) when XAI_API_KEY is set —
 *     the LLM is instructed never to invent numbers not present in the payload.
 *
 * Never fabricates prices, ratios, peers, or holdings.
 */

const { buildInstitutionalResearch } = require("./research-institutional");
const { buildResearchReport, normalizeSymbol } = require("./research");
const { fetchChart, fetchNiftyHistory } = require("./yahoo");
const { buildNiftyPrediction } = require("./ensemble");
const { fetchFiiDii } = require("./nse");
const { buildNifty500Dashboard } = require("./nifty500");
const { computeIndicators, technicalSignal } = require("./indicators");
const { fetchFundamentals } = require("./fundamentals");
const { MESSAGES, DATA_CLASSIFICATION, getPolicyMeta, classifyDataType } = require("./financial-intelligence");
const { val } = require("./research-insights");
const { fetchWithTimeout } = require("./fetch-utils");

const MAX_QUERY_LEN = 2000;
const XAI_BASE = "https://api.x.ai/v1";
const XAI_MODEL = process.env.XAI_MODEL || "grok-4.5";
const COPILOT_CACHE_TTL_MS = Number(process.env.COPILOT_CACHE_TTL_MS) || 90_000;
const COPILOT_CACHE_MAX = 64;

/** Short-lived in-memory answer cache (verified payloads only). */
const answerCache = new Map();

function cacheGet(key) {
  const entry = answerCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    answerCache.delete(key);
    return null;
  }
  return entry.value;
}

function cacheSet(key, value) {
  if (answerCache.size >= COPILOT_CACHE_MAX) {
    const oldest = answerCache.keys().next().value;
    if (oldest != null) answerCache.delete(oldest);
  }
  answerCache.set(key, { value, expiresAt: Date.now() + COPILOT_CACHE_TTL_MS });
}

function getCopilotStatus() {
  return {
    available: true,
    public: true,
    engine: "abc-copilot-verified-v2",
    llmConfigured: Boolean(process.env.XAI_API_KEY || process.env.GROK_API_KEY),
    llmOptional: true,
    cacheTtlMs: COPILOT_CACHE_TTL_MS,
    maxQueryLength: MAX_QUERY_LEN,
    note: "Structured verified-data engines always available; xAI polish optional",
  };
}

/** Common NSE names → Yahoo symbols (verified mapping, not invented peers). */
const SYMBOL_ALIASES = {
  reliance: "RELIANCE.NS",
  ril: "RELIANCE.NS",
  tcs: "TCS.NS",
  infosys: "INFY.NS",
  infy: "INFY.NS",
  hdfc: "HDFCBANK.NS",
  hdfcbank: "HDFCBANK.NS",
  icici: "ICICIBANK.NS",
  icicibank: "ICICIBANK.NS",
  sbi: "SBIN.NS",
  sbin: "SBIN.NS",
  itc: "ITC.NS",
  wipro: "WIPRO.NS",
  hcl: "HCLTECH.NS",
  hcltech: "HCLTECH.NS",
  maruti: "MARUTI.NS",
  ongc: "ONGC.NS",
  airtel: "BHARTIARTL.NS",
  bharti: "BHARTIARTL.NS",
  kotak: "KOTAKBANK.NS",
  axis: "AXISBANK.NS",
  nestle: "NESTLEIND.NS",
  hindunilvr: "HINDUNILVR.NS",
  hul: "HINDUNILVR.NS",
  ntpc: "NTPC.NS",
  powergrid: "POWERGRID.NS",
  titan: "TITAN.NS",
  asianpaint: "ASIANPAINT.NS",
  sunpharma: "SUNPHARMA.NS",
  tatamotors: "TATAMOTORS.NS",
  m_m: "M&M.NS",
  mahindra: "M&M.NS",
  techm: "TECHM.NS",
  lnt: "LT.NS",
  lt: "LT.NS",
  jsw: "JSWSTEEL.NS",
  ultratech: "ULTRACEMCO.NS",
  bajajfinance: "BAJFINANCE.NS",
  adani: "ADANIENT.NS",
};

const SUGGESTED_QUERIES = [
  "Analyze RELIANCE fundamentals and technicals",
  "What is the NIFTY 50 outlook?",
  "Show FII DII institutional flows",
  "Compare TCS with IT peers",
  "HDFCBANK valuation summary",
  "Explain what RSI means",
  "Banking sector performance today",
  "INFY risk analysis",
];

function fmtNum(n, decimals = 2) {
  if (n == null || !Number.isFinite(Number(n))) return null;
  return Number(n).toLocaleString("en-IN", { maximumFractionDigits: decimals });
}

function fmtPctFraction(n) {
  if (n == null || !Number.isFinite(Number(n))) return null;
  const scaled = Math.abs(n) <= 1 ? n * 100 : n;
  return `${scaled.toFixed(2)}%`;
}

function fmtInr(n) {
  const s = fmtNum(n);
  return s != null ? `₹${s}` : null;
}

function fmtCr(n) {
  if (n == null || !Number.isFinite(Number(n))) return null;
  return `₹${(Number(n) / 1e7).toLocaleString("en-IN", { maximumFractionDigits: 2 })} Cr`;
}

function unavailable(reason) {
  return reason || MESSAGES.UNAVAILABLE_GENERAL || "Data Unavailable";
}

const STOP_TICKERS = new Set([
  "NIFTY", "SENSEX", "FII", "DII", "IPO", "RSI", "MACD", "PE", "PB", "ROE", "ROA", "API",
  "PEG", "EPS", "FCF", "ATR", "ADX", "SMA", "EMA", "VWAP", "ROCE", "EBITDA", "CAGR", "YOY",
  "QOQ", "TTM", "YTD", "CEO", "CFO", "GDP", "CPI", "RBI", "SEBI", "NSE", "BSE", "USD", "INR",
  "WHAT", "IS", "THE", "AND", "FOR", "WITH", "FROM", "THIS", "THAT", "SHOW", "TELL", "GIVE",
  "HOW", "WHY", "WHEN", "WHERE", "WHO", "ARE", "WAS", "WERE", "HAS", "HAVE", "HAD", "CAN",
  "WILL", "WOULD", "SHOULD", "COULD", "ABOUT", "OVERVIEW", "OUTLOOK", "SECTOR", "MARKET",
  "PRICE", "STOCK", "STOCKS", "SHARE", "SHARES", "RATIO", "RATIOS", "DATA", "LIVE", "HELP",
  "PLEASE", "COMPARE", "VERSUS", "VS", "MEAN", "MEANS", "DEFINE", "EXPLAIN", "ANALYSIS",
  "ANALYZE", "RESEARCH", "REPORT", "TODAY", "WEEKLY", "MONTHLY", "ANNUAL", "FLOW", "FLOWS",
  "BANKING", "PHARMA", "FMCG", "AUTO", "ENERGY", "TELECOM", "IT", "ASK", "TRY", "SEE",
]);

function extractSymbols(query) {
  const q = query.toLowerCase();
  const found = new Set();

  // Prefer known aliases first (high confidence)
  for (const [alias, sym] of Object.entries(SYMBOL_ALIASES)) {
    if (new RegExp(`\\b${alias.replace(/_/g, "[\\s_]?")}\\b`, "i").test(q)) {
      found.add(sym);
    }
  }

  // Explicit NSE-style tickers: RELIANCE.NS / RELIANCE
  const tickerRe = /\b([A-Za-z]{2,15}(?:&[A-Za-z]+)?(?:\.NS|\.BO)?)\b/g;
  let m;
  while ((m = tickerRe.exec(query)) !== null) {
    const raw = m[1].toUpperCase();
    if (STOP_TICKERS.has(raw.replace(/\.(NS|BO)$/, ""))) continue;
    if (raw.includes(".")) {
      found.add(normalizeSymbol(raw));
      continue;
    }
    // Bare uppercase-ish tickers only if already in alias map or looks like NSE symbol (≥3 chars)
    const bare = raw.replace(/\.(NS|BO)$/, "");
    if (SYMBOL_ALIASES[bare.toLowerCase()]) {
      found.add(SYMBOL_ALIASES[bare.toLowerCase()]);
    } else if (bare.length >= 3 && bare === m[1].toUpperCase() && /[A-Z]{3,}/.test(bare)) {
      // Only accept ALL-CAPS tokens of length ≥3 from original query to avoid English words
      if (m[1] === m[1].toUpperCase() && m[1].length >= 3) {
        found.add(normalizeSymbol(bare));
      }
    }
  }

  return [...found];
}

function classifyIntent(query) {
  const q = query.toLowerCase();
  const symbols = extractSymbols(query);

  // Market / flow intents first (before generic "what is")
  if (/\b(fii|dii|institutional flow|foreign institutional|domestic institutional)\b/.test(q)) {
    return "fiidii";
  }
  if (/\b(nifty|sensex|index outlook)\b/.test(q) || /\bmarket outlook\b/.test(q)) {
    if (!symbols.length) return "nifty_outlook";
  }
  if (/\b(sector outlook|industry outlook)\b/.test(q)) return "sector_outlook";
  if (
    /\b(sector|banking|it sector|pharma|fmcg|auto sector|rotation)\b/.test(q) &&
    !/\b(compare|vs|versus|peer)\b/.test(q) &&
    !symbols.length
  ) {
    return "sector";
  }
  if (/\b(competitor|peer|compare|vs\.?|versus)\b/.test(q)) return "competitors";

  // Educational definitions — prefer glossary when asking "what is / define" about metrics
  const isDefQuestion = /\b(what is|define|meaning of|explain|how does|what does .+ mean)\b/.test(q);
  const mentionsTechMetric = /\b(rsi|macd|sma|ema|bollinger|atr|adx|vwap|stochastic|simple moving average|exponential moving average)\b/.test(q);
  const mentionsFundMetric = /\b(pe ratio|p\/e|pb ratio|p\/b|\bpe\b|roe|roa|roce|peg|ev\/ebitda|dividend yield|dividend|market cap|market capitali[sz]ation|fcf|free cash flow|ebitda|eps|earnings per share)\b/.test(q);
  if (isDefQuestion || mentionsTechMetric || mentionsFundMetric) {
    // If the only "symbols" look like metric aliases, treat as definition
    const realTickers = symbols.filter((s) => {
      const bare = s.replace(/\.(NS|BO)$/i, "").toUpperCase();
      return !STOP_TICKERS.has(bare);
    });
    if (!realTickers.length) {
      if (mentionsTechMetric) return "definition_technical";
      if (mentionsFundMetric) return "definition_fundamental";
      if (isDefQuestion) return "definition_general";
    }
  }

  if (/\b(valuation|fair value|intrinsic|expensive|cheap|multiple)\b/.test(q)) return "valuation";
  if (/\b(technical|chart|trend|support|resistance)\b/.test(q) || (mentionsTechMetric && symbols.length)) {
    return "technical";
  }
  if (/\b(fundamental|revenue|profit|margin|balance sheet|cash flow|earnings|quarterly|annual)\b/.test(q)) {
    return "fundamental";
  }
  if (/\b(risk|risks)\b/.test(q)) return "risk";
  if (/\b(shareholding|promoter|fii holding|dii holding|mutual fund holding)\b/.test(q)) return "shareholding";
  if (/\b(dividend|corporate action)\b/.test(q)) return "dividend";
  if (/\b(overview|about|company profile|analyze|analysis|research)\b/.test(q)) return "research_full";
  if (symbols.length) return "research_full";
  return "help";
}

function definitionAnswer(intent, query) {
  const q = query.toLowerCase();
  const defs = {
    rsi: {
      title: "RSI (Relative Strength Index)",
      body: "RSI is a momentum oscillator typically calculated over 14 periods from verified closing prices. Readings above 70 often indicate overbought conditions; below 30 oversold. ABC computes RSI only from Yahoo Finance OHLCV — never estimated.",
    },
    macd: {
      title: "MACD (Moving Average Convergence Divergence)",
      body: "MACD is the difference between a fast and slow EMA of price (commonly 12 and 26), with a signal line (often 9-period EMA of MACD). Histogram = MACD − signal. ABC derives MACD only from verified OHLCV.",
    },
    pe: {
      title: "P/E Ratio (Price-to-Earnings)",
      body: "Trailing P/E divides current price by trailing twelve-month earnings per share. Forward P/E uses expected earnings when the data vendor provides it. ABC displays P/E only from Yahoo quoteSummary — never invented.",
    },
    pb: {
      title: "P/B Ratio (Price-to-Book)",
      body: "P/B divides market price per share by book value per share. Values above 1 can indicate the market prices the firm above accounting equity. ABC shows P/B only from verified quoteSummary fields.",
    },
    roe: {
      title: "ROE (Return on Equity)",
      body: "ROE measures net income relative to shareholders' equity. ABC shows ROE only when Yahoo financial data provides it.",
    },
    roa: {
      title: "ROA (Return on Assets)",
      body: "ROA measures net income relative to total assets. ABC displays ROA only from verified vendor fundamentals.",
    },
    roce: {
      title: "ROCE (Return on Capital Employed)",
      body: "ROCE measures returns on capital employed. Yahoo Finance does not provide a standard ROCE field in the current feed; ABC displays Data Unavailable rather than estimating it.",
    },
    peg: {
      title: "PEG Ratio",
      body: "PEG divides the P/E ratio by expected earnings growth. ABC shows PEG only when the data vendor supplies it — growth is never invented.",
    },
    vwap: {
      title: "VWAP (Volume-Weighted Average Price)",
      body: "VWAP is the cumulative typical price weighted by volume over a session or window. ABC computes window VWAP only when volume is present on verified candles.",
    },
    sma: {
      title: "SMA (Simple Moving Average)",
      body: "SMA is the arithmetic mean of closing prices over N periods (e.g. 20, 50, 200). ABC computes SMAs only from verified Yahoo OHLCV series.",
    },
    ema: {
      title: "EMA (Exponential Moving Average)",
      body: "EMA weights recent closes more heavily than older ones. Used in MACD and trend systems. ABC derives EMAs only from verified OHLCV.",
    },
    atr: {
      title: "ATR (Average True Range)",
      body: "ATR measures average trading range including gaps. Used for volatility and risk sizing. ABC computes ATR only from verified high/low/close series.",
    },
    adx: {
      title: "ADX (Average Directional Index)",
      body: "ADX measures trend strength (not direction). Higher readings typically indicate a stronger trend. ABC computes ADX only from verified OHLCV.",
    },
    marketcap: {
      title: "Market Capitalization",
      body: "Market cap is share price multiplied by shares outstanding (as reported by the data vendor). ABC never estimates share count or market cap when the feed is missing.",
    },
    dividend: {
      title: "Dividend Yield",
      body: "Dividend yield is annual dividends per share divided by price (vendor methodology may use trailing or indicated yield). ABC shows yield only when Yahoo provides it.",
    },
    ebitda: {
      title: "EBITDA",
      body: "EBITDA is earnings before interest, taxes, depreciation, and amortization. ABC displays EBITDA only from verified financial statements in the vendor feed.",
    },
    fcf: {
      title: "Free Cash Flow (FCF)",
      body: "Free cash flow is typically operating cash flow minus capital expenditures. ABC shows FCF only when the vendor supplies the metric — never reconstructed from partial data.",
    },
    eps: {
      title: "EPS (Earnings Per Share)",
      body: "EPS is net income attributable to common shareholders divided by weighted average shares. Trailing and forward EPS are vendor-reported; ABC never invents earnings.",
    },
  };

  let key = null;
  if (/\brsi\b/.test(q)) key = "rsi";
  else if (/\bmacd\b/.test(q)) key = "macd";
  else if (/\b(p\/b|pb ratio|price.to.book)\b/.test(q)) key = "pb";
  else if (/\b(pe|p\/e|price.to.earnings)\b/.test(q)) key = "pe";
  else if (/\broe\b/.test(q)) key = "roe";
  else if (/\broa\b/.test(q)) key = "roa";
  else if (/\broce\b/.test(q)) key = "roce";
  else if (/\bpeg\b/.test(q)) key = "peg";
  else if (/\bvwap\b/.test(q)) key = "vwap";
  else if (/\bsma\b|simple moving average/.test(q)) key = "sma";
  else if (/\bema\b|exponential moving average/.test(q)) key = "ema";
  else if (/\batr\b|average true range/.test(q)) key = "atr";
  else if (/\badx\b/.test(q)) key = "adx";
  else if (/\bmarket\s*cap/.test(q)) key = "marketcap";
  else if (/\bdividend\b/.test(q)) key = "dividend";
  else if (/\bebitda\b/.test(q)) key = "ebitda";
  else if (/\bfcf\b|free cash flow/.test(q)) key = "fcf";
  else if (/\beps\b|earnings per share/.test(q)) key = "eps";

  if (key && defs[key]) {
    return {
      answer: `## ${defs[key].title}\n\n${defs[key].body}\n\n**Data policy:** Educational definition only — no live number is implied unless a ticker research query is run.`,
      dataType: DATA_CLASSIFICATION.OPINION,
      confidence: 100,
      intent: intent,
      sources: ["ABC educational glossary (no live market data required)"],
      sections: [{ heading: defs[key].title, body: defs[key].body, dataType: "educational" }],
    };
  }

  return {
    answer:
      "## Financial Concept\n\nAsk about a specific metric (e.g. RSI, MACD, P/E, ROE, PEG, ATR) or a ticker (e.g. \"Analyze TCS\"). Live figures require a company or market query and verified data sources.",
    dataType: DATA_CLASSIFICATION.OPINION,
    confidence: 100,
    intent,
    sources: [],
    sections: [],
  };
}

function buildResearchSections(report, institutional) {
  const data = institutional?.available ? institutional : null;
  const base = report;
  const t = (data || base).technicalAnalysis || base.technicalAnalysis || {};
  const fund = (data || base).fundamentalAnalysis || base.fundamentalAnalysis || {};
  const valn = (data || base).valuationAnalysis || base.valuationAnalysis || {};
  const biz = (data || base).businessOverview || base.businessOverview || {};
  const price = (data || base).price ?? base.price;
  const fetchedAt = (data || base).refreshedAt || base.fetchedAt;
  const company = (data || base).companyName || base.companyName;
  const symbol = (data || base).symbol || base.symbol;
  const sector = (data || base).sector || base.sector;
  const industry = (data || base).industry || null;

  const lines = [];
  const sections = [];
  const facts = [];

  lines.push(`## ${company || symbol}`);
  lines.push(`**Ticker:** ${symbol} · **Exchange:** ${(data || base).exchange || base.exchange || "NSE"}`);
  if (sector) lines.push(`**Sector:** ${sector}${industry ? ` · **Industry:** ${industry}` : ""}`);
  if (price != null) {
    lines.push(`**Last price:** ${fmtInr(price)} ${(data || base).currency || "INR"}`);
    facts.push({ key: "price", value: price });
  } else {
    lines.push(`**Last price:** ${unavailable()}`);
  }
  if (fetchedAt) lines.push(`**As of:** ${new Date(fetchedAt).toLocaleString()}`);
  lines.push("");

  // Overview
  const profile = val(biz.companyProfile) || (typeof biz.companyProfile === "string" ? biz.companyProfile : null);
  if (profile) {
    const short = profile.length > 400 ? `${profile.slice(0, 400)}…` : profile;
    sections.push({ heading: "Company Overview", body: short, dataType: "factual" });
    lines.push(`### Company Overview\n${short}\n`);
  } else {
    lines.push(`### Company Overview\n${unavailable("Source does not provide a company profile.")}\n`);
  }

  // Valuation
  const valLines = [];
  const pushMetric = (label, value, formatter) => {
    const raw = val(value) ?? (typeof value === "number" ? value : null);
    if (raw == null) valLines.push(`- **${label}:** ${unavailable()}`);
    else {
      valLines.push(`- **${label}:** ${formatter(raw)}`);
      facts.push({ key: label, value: raw });
    }
  };
  pushMetric("Market Cap", valn.marketCap, fmtCr);
  pushMetric("Enterprise Value", valn.enterpriseValue, fmtCr);
  pushMetric("P/E (TTM)", valn.peRatio, (n) => `${Number(n).toFixed(1)}x`);
  pushMetric("Forward P/E", valn.forwardPe, (n) => `${Number(n).toFixed(1)}x`);
  pushMetric("P/B", valn.pbRatio, (n) => `${Number(n).toFixed(2)}x`);
  pushMetric("EV/EBITDA", valn.evEbitda, (n) => `${Number(n).toFixed(2)}x`);
  pushMetric("PEG", valn.pegRatio, (n) => `${Number(n).toFixed(2)}x`);
  pushMetric("EV/Sales", valn.enterpriseToRevenue, (n) => `${Number(n).toFixed(2)}x`);
  pushMetric("P/S", valn.priceToSales, (n) => `${Number(n).toFixed(2)}x`);
  pushMetric("Dividend Yield", valn.dividendYield, fmtPctFraction);
  pushMetric("FCF Yield", valn.freeCashFlowYield, fmtPctFraction);
  pushMetric("ROE", valn.roe ?? fund.roe, fmtPctFraction);
  pushMetric("ROA", valn.roa ?? fund.roa, fmtPctFraction);
  valLines.push(`- **ROCE:** ${unavailable("ROCE not provided by Yahoo feed — never estimated")}`);
  valLines.push(`- **Intrinsic Value:** ${unavailable("Requires documented DCF — never estimated")}`);
  lines.push(`### Valuation Summary\n${valLines.join("\n")}\n`);
  sections.push({ heading: "Valuation Summary", body: valLines.join("\n"), dataType: "factual" });

  // Fundamentals
  const fundLines = [];
  const fMetrics = [
    ["Revenue Growth", fund.revenueGrowth, fmtPctFraction],
    ["Earnings Growth", fund.profitGrowth, fmtPctFraction],
    ["Operating Margin", fund.operatingMargin, fmtPctFraction],
    ["Net Margin", fund.netMargin, fmtPctFraction],
    ["Debt / Equity", fund.debtToEquity, (n) => Number(n).toFixed(2)],
    ["Current Ratio", fund.currentRatio, (n) => Number(n).toFixed(2)],
    ["Quick Ratio", fund.quickRatio, (n) => Number(n).toFixed(2)],
    ["Free Cash Flow", fund.freeCashFlow, fmtCr],
    ["EBITDA", fund.ebitda, fmtCr],
  ];
  for (const [label, value, formatter] of fMetrics) {
    const raw = val(value);
    fundLines.push(`- **${label}:** ${raw == null ? unavailable() : formatter(raw)}`);
    if (raw != null) facts.push({ key: label, value: raw });
  }
  lines.push(`### Fundamental Analysis\n${fundLines.join("\n")}\n`);
  sections.push({ heading: "Fundamental Analysis", body: fundLines.join("\n"), dataType: "factual" });

  // Technicals
  const techLines = [
    `- **Trend / Technical Rating:** ${t.trend || t.technicalRating || unavailable()}`,
    `- **RSI (14):** ${t.rsi != null ? Number(t.rsi).toFixed(1) : unavailable()}`,
    `- **MACD Line:** ${t.macdLine != null ? Number(t.macdLine).toFixed(3) : unavailable()}`,
    `- **MACD Signal:** ${t.macdSignal != null ? Number(t.macdSignal).toFixed(3) : unavailable()}`,
    `- **MACD Histogram:** ${t.macdHistogram != null ? Number(t.macdHistogram).toFixed(3) : unavailable()}`,
    `- **SMA 20 / 50:** ${t.sma20 != null ? fmtInr(t.sma20) : unavailable()} / ${t.sma50 != null ? fmtInr(t.sma50) : unavailable()}`,
    `- **SMA 100 / 200:** ${t.sma100 != null ? fmtInr(t.sma100) : unavailable()} / ${t.sma200 != null ? fmtInr(t.sma200) : unavailable()}`,
    `- **Support / Resistance:** ${t.support != null ? fmtInr(t.support) : unavailable()} / ${t.resistance != null ? fmtInr(t.resistance) : unavailable()}`,
    `- **ATR:** ${t.atr != null ? Number(t.atr).toFixed(2) : unavailable()}`,
    `- **ADX:** ${t.adx != null ? Number(t.adx).toFixed(1) : unavailable()}`,
    `- **Volume Trend:** ${t.volumeTrend || unavailable()}`,
  ];
  lines.push(`### Technical Analysis\n${techLines.join("\n")}\n`);
  sections.push({ heading: "Technical Analysis", body: techLines.join("\n"), dataType: "factual" });

  // Competitors
  const peers = data?.competitorComparison;
  if (peers?.available && peers.peers?.length) {
    const peerLines = peers.peers.slice(0, 5).map((p) => {
      const pe = val(p.peRatio);
      const roe = val(p.roe);
      return `- **${p.name}:** price ${p.price != null ? fmtInr(p.price) : unavailable()}, P/E ${pe != null ? pe.toFixed(1) : unavailable()}, ROE ${roe != null ? fmtPctFraction(roe) : unavailable()}, trend ${p.trend || unavailable()}`;
    });
    lines.push(`### Competitor Comparison\n${peers.message || ""}\n${peerLines.join("\n")}\n`);
    sections.push({ heading: "Competitor Comparison", body: peerLines.join("\n"), dataType: "factual" });
  } else {
    lines.push(
      `### Competitor Comparison\n${peers?.message || unavailable("No verified peer mapping for this symbol.")}\n`
    );
  }

  // Sector
  const sect = data?.sectorComparison || base.sectorComparison;
  if (sect?.available) {
    lines.push(
      `### Sector Comparison\n- **Sector:** ${sect.sector || sector || unavailable()}\n- **Avg 1D:** ${sect.sectorAvgChange1d != null ? `${sect.sectorAvgChange1d}%` : unavailable()}\n- **Avg 1M:** ${sect.sectorAvgChange1m != null ? `${sect.sectorAvgChange1m}%` : unavailable()}\n- **Rule-based outlook:** ${sect.sectorOutlook || unavailable()} _(interpretation from peer prices)_\n`
    );
  }

  // Shareholding
  lines.push(
    `### Shareholding Pattern\n${unavailable("Requires NSE/BSE shareholding feed — never estimated.")}\n`
  );

  // Risks
  const risk = data?.riskAssessment || base.riskAssessment;
  if (risk?.factualRisks?.length) {
    lines.push(
      `### Risk Analysis (verified metrics)\n${risk.factualRisks.map((r) => `- ${r.text}`).join("\n")}\n`
    );
  }

  // AI snapshot
  const exec = data?.executiveSummary;
  if (exec?.recommendation) {
    lines.push(
      `### Analytical Snapshot _(model opinion — not a broker rating)_\n- **Model recommendation:** ${exec.recommendation}\n- **Overall score:** ${exec.overallRating ?? unavailable()}/100\n- **Confidence:** ${exec.confidenceLevel || unavailable()}\n- **Valuation status vs peers:** ${exec.valuationStatus || unavailable()}\n`
    );
  }

  lines.push(
    `---\n**Sources:** Yahoo Finance Chart API + quoteSummary · ABC technical models on verified OHLCV · Peer maps from platform reference files.\n**Policy:** Missing metrics show Data Unavailable — never estimated or fabricated.`
  );

  return {
    answer: lines.join("\n"),
    sections,
    facts,
    companyName: company,
    symbol,
    price,
    fetchedAt,
  };
}

async function answerStockQuery(symbol, intent) {
  let institutional = null;
  let report = null;

  try {
    institutional = await buildInstitutionalResearch(symbol);
  } catch {
    institutional = null;
  }

  if (!institutional?.available) {
    try {
      report = await buildResearchReport(symbol);
    } catch (err) {
      return {
        answer: `## Live Data Currently Unavailable\n\nCould not retrieve verified research for **${symbol}**.\n\n${err.message || ""}\n\nPlease try again shortly. Values are never estimated when the feed fails.`,
        dataType: DATA_CLASSIFICATION.UNAVAILABLE,
        confidence: 0,
        intent,
        sources: ["Yahoo Finance (unreachable or incomplete)"],
        error: err.message,
      };
    }
  }

  const built = buildResearchSections(report || institutional, institutional?.available ? institutional : null);
  const confidence =
    institutional?.executiveSummary?.aiConviction ??
    report?.aiConclusion?.confidenceScore ??
    (built.price != null ? 75 : 40);

  return {
    answer: built.answer,
    dataType: classifyDataType({ verified: built.price != null, isModel: true }),
    confidence,
    intent,
    sources: [
      "Yahoo Finance Chart API",
      "Yahoo Finance quoteSummary",
      "ABC indicators (verified OHLCV only)",
    ],
    sections: built.sections,
    symbol: built.symbol,
    companyName: built.companyName,
    price: built.price,
    fetchedAt: built.fetchedAt,
    report: institutional?.available ? undefined : report,
    institutional: institutional?.available ? { symbol: institutional.symbol, available: true } : undefined,
  };
}

async function answerNiftyOutlook() {
  try {
    const history = await fetchNiftyHistory("1y");
    const candles = (history?.candles || []).filter((c) => c.close != null);
    if (candles.length < 30) {
      return {
        answer: `## NIFTY 50 Outlook\n\n${unavailable("Insufficient verified NIFTY history to build outlook.")}`,
        dataType: DATA_CLASSIFICATION.UNAVAILABLE,
        confidence: 0,
        intent: "nifty_outlook",
        sources: ["Yahoo Finance Chart API (^NSEI)"],
      };
    }
    const prediction = buildNiftyPrediction(candles, { name: history.name || "NIFTY 50" });
    const price = prediction?.currentPrice ?? history?.currentPrice;
    const signal = prediction?.ensembleSignal;
    const weekly = prediction?.predictions?.weekly;
    const monthly = prediction?.predictions?.monthly;

    const lines = [
      "## NIFTY 50 Outlook",
      price != null ? `**Spot (verified):** ${fmtInr(price)}` : `**Spot:** ${unavailable()}`,
      signal ? `**Ensemble signal:** ${signal} _(model opinion from verified history)_` : `**Ensemble signal:** ${unavailable()}`,
      "",
      "### Model Forecasts _(probability-based — not certainty)_",
      weekly?.target != null
        ? `- **Weekly target:** ${fmtInr(weekly.target)}${weekly.confidence != null ? ` · confidence ${weekly.confidence}%` : ""}`
        : `- **Weekly target:** ${unavailable()}`,
      monthly?.target != null
        ? `- **Monthly target:** ${fmtInr(monthly.target)}${monthly.confidence != null ? ` · confidence ${monthly.confidence}%` : ""}`
        : `- **Monthly target:** ${unavailable()}`,
      "",
      `**As of:** ${new Date().toLocaleString()}`,
      "**Source:** Yahoo Finance NIFTY history + ABC ensemble model",
      "**Policy:** Forecasts are analytical interpretations of verified price history — not guaranteed outcomes.",
    ];

    return {
      answer: lines.join("\n"),
      dataType: classifyDataType({ verified: price != null, isForecast: true }),
      confidence: monthly?.confidence ?? weekly?.confidence ?? (price != null ? 60 : 0),
      intent: "nifty_outlook",
      sources: ["Yahoo Finance Chart API (^NSEI)", "ABC ensemble model"],
      data: { price, signal, weekly, monthly },
    };
  } catch (err) {
    return {
      answer: `## Live Data Currently Unavailable\n\nNIFTY outlook could not be built from verified sources.\n\n${err.message || ""}`,
      dataType: DATA_CLASSIFICATION.UNAVAILABLE,
      confidence: 0,
      intent: "nifty_outlook",
      sources: [],
      error: err.message,
    };
  }
}

async function answerFiidii() {
  try {
    const fiiDii = await fetchFiiDii();
    const fiiNet = fiiDii?.fii?.netValue;
    const diiNet = fiiDii?.dii?.netValue;
    const date = fiiDii?.date;

    if (fiiNet == null && diiNet == null) {
      return {
        answer: `## Institutional Flows\n\n${unavailable("Live FII/DII figures not returned by NSE at this time.")}\n\nRetry during NSE market hours or when the exchange feed is available.`,
        dataType: DATA_CLASSIFICATION.UNAVAILABLE,
        confidence: 0,
        intent: "fiidii",
        sources: ["NSE India fiidiiTradeReact API"],
      };
    }

    const lines = [
      "## FII & DII Institutional Flows",
      `**Session date:** ${date || unavailable()}`,
      "",
      "### Verified Net Activity (₹ Cr)",
      `- **FII net:** ${fiiNet != null ? fmtNum(fiiNet) : unavailable()}`,
      `- **DII net:** ${diiNet != null ? fmtNum(diiNet) : unavailable()}`,
      fiiDii?.fii?.buyValue != null ? `- **FII buy:** ${fmtNum(fiiDii.fii.buyValue)}` : null,
      fiiDii?.fii?.sellValue != null ? `- **FII sell:** ${fmtNum(fiiDii.fii.sellValue)}` : null,
      fiiDii?.dii?.buyValue != null ? `- **DII buy:** ${fmtNum(fiiDii.dii.buyValue)}` : null,
      fiiDii?.dii?.sellValue != null ? `- **DII sell:** ${fmtNum(fiiDii.dii.sellValue)}` : null,
      "",
      "**Source:** NSE India official FII/DII trade data",
      `**Fetched:** ${new Date().toLocaleString()}`,
      "**Policy:** Stock-level and sector-level institutional ownership require additional licensed feeds — not estimated here.",
    ].filter(Boolean);

    return {
      answer: lines.join("\n"),
      dataType: classifyDataType({ verified: true }),
      confidence: fiiNet != null && diiNet != null ? 95 : 70,
      intent: "fiidii",
      sources: ["NSE India FII/DII API"],
      data: fiiDii,
    };
  } catch (err) {
    return {
      answer: `## Live Data Currently Unavailable\n\nFII/DII data could not be retrieved from NSE.\n\n${err.message || ""}`,
      dataType: DATA_CLASSIFICATION.UNAVAILABLE,
      confidence: 0,
      intent: "fiidii",
      sources: ["NSE India"],
      error: err.message,
    };
  }
}

async function answerSector(query) {
  try {
    const dash = await buildNifty500Dashboard();
    const sectors = dash.sectorAnalysis?.all || dash.sectorHeatmap || [];
    const q = query.toLowerCase();
    let focus = sectors;
    if (/\bbank|financial\b/.test(q)) focus = sectors.filter((s) => /financial|bank/i.test(s.sector || s.name || ""));
    else if (/\bit\b|tech|software/.test(q)) focus = sectors.filter((s) => /it|tech/i.test(s.sector || ""));
    else if (/\bpharma|health\b/.test(q)) focus = sectors.filter((s) => /pharma|health/i.test(s.sector || ""));
    else if (/\bfmcg|consumer\b/.test(q)) focus = sectors.filter((s) => /fmcg|consumer/i.test(s.sector || ""));
    else if (/\bauto\b/.test(q)) focus = sectors.filter((s) => /auto/i.test(s.sector || ""));

    if (!focus.length) focus = sectors.slice(0, 8);

    const lines = [
      "## Sector Comparison (tracked universe)",
      `**Sample size:** ${dash.marketBreadth?.sampleSize ?? unavailable()} stocks with verified prices`,
      "",
      "### Sector average session change",
      ...focus.slice(0, 10).map((s) => {
        const name = s.sector || s.name || "Unknown";
        const chg = s.avgChange ?? s.changePercent;
        return `- **${name}:** ${chg != null && Number.isFinite(chg) ? `${chg}%` : unavailable()}`;
      }),
      "",
      "**Source:** Yahoo Finance live quotes on platform constituent reference list",
      "**Policy:** Industry narrative outlooks and licensed sector averages beyond this universe are not fabricated.",
    ];

    return {
      answer: lines.join("\n"),
      dataType: classifyDataType({ verified: focus.length > 0 }),
      confidence: focus.length ? 80 : 30,
      intent: "sector",
      sources: ["Yahoo Finance quotes", "nifty500-constituents reference"],
      data: { sectors: focus },
    };
  } catch (err) {
    return {
      answer: `## Live Data Currently Unavailable\n\nSector data could not be loaded.\n\n${err.message || ""}`,
      dataType: DATA_CLASSIFICATION.UNAVAILABLE,
      confidence: 0,
      intent: "sector",
      sources: [],
      error: err.message,
    };
  }
}

function helpAnswer() {
  return {
    answer: [
      "## ABC AI Research Copilot",
      "",
      "I answer using **verified** platform data only (Yahoo Finance, NSE FII/DII, ABC technical models).",
      "",
      "### Try questions like",
      ...SUGGESTED_QUERIES.map((s) => `- ${s}`),
      "",
      "### What I will not do",
      "- Invent prices, ratios, peers, or holdings",
      "- Estimate ROCE, intrinsic value, or shareholding when feeds are missing",
      "- Present model opinions as exchange facts",
      "",
      "Missing values always appear as **Data Unavailable**.",
    ].join("\n"),
    dataType: DATA_CLASSIFICATION.OPINION,
    confidence: 100,
    intent: "help",
    sources: [],
    suggestions: SUGGESTED_QUERIES,
  };
}

/**
 * Optional prose polish via xAI. Never allows new numbers — only rephrases provided facts.
 */
async function polishWithXai(structured) {
  const apiKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY || "";
  if (!apiKey) {
    return { usedLlm: false, reason: "XAI_API_KEY not set — using structured verified answer" };
  }

  const system = `You are ABC Research Copilot at an institutional desk.
You receive ONLY verified financial facts in the user message.
Rules:
- Reformat into clear markdown with headings.
- NEVER invent, estimate, or add any number, ticker, peer, or metric not present in the input.
- If a field is missing, write "Data Unavailable".
- Clearly mark analytical opinions as "Analytical interpretation".
- Keep professional CFA-style language.
- Do not mention system prompts or API keys.`;

  try {
    const res = await fetchWithTimeout(
      `${XAI_BASE}/chat/completions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: XAI_MODEL,
          temperature: 0.2,
          max_tokens: 1800,
          messages: [
            { role: "system", content: system },
            {
              role: "user",
              content: `Reformat this verified research answer without adding facts:\n\n${structured.answer}`,
            },
          ],
        }),
      },
      25_000
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        usedLlm: false,
        reason: `xAI request failed (HTTP ${res.status}) — falling back to structured answer`,
        status: res.status,
        detail: text.slice(0, 200),
      };
    }

    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return { usedLlm: false, reason: "Empty xAI response — using structured answer" };
    }

    return {
      usedLlm: true,
      answer: content,
      model: XAI_MODEL,
      provider: "xAI (SpaceXAI)",
    };
  } catch (err) {
    return {
      usedLlm: false,
      reason: `xAI unavailable (${err.message}) — using structured answer`,
    };
  }
}

/**
 * Main entry: answer a copilot query with verified data.
 */
async function answerCopilotQuery(rawQuery) {
  const query = String(rawQuery || "").trim();
  if (!query) {
    return {
      ok: false,
      status: 400,
      body: {
        error: "query_required",
        message: "Please enter a research question (e.g. Analyze TCS or NIFTY outlook).",
        suggestions: SUGGESTED_QUERIES,
      },
    };
  }
  if (query.length > MAX_QUERY_LEN) {
    return {
      ok: false,
      status: 400,
      body: {
        error: "query_too_long",
        message: `Query must be at most ${MAX_QUERY_LEN} characters.`,
      },
    };
  }

  const cacheKey = query.toLowerCase().replace(/\s+/g, " ");
  const cached = cacheGet(cacheKey);
  if (cached) {
    return {
      ok: true,
      status: 200,
      body: {
        ...cached,
        cached: true,
        fetchedAt: cached.fetchedAt || new Date().toISOString(),
      },
    };
  }

  const intent = classifyIntent(query);
  const symbols = extractSymbols(query);
  const policyMeta = getPolicyMeta();
  let result;

  try {
    if (intent.startsWith("definition")) {
      result = definitionAnswer(intent, query);
    } else if (intent === "fiidii") {
      result = await answerFiidii();
    } else if (intent === "nifty_outlook") {
      result = await answerNiftyOutlook();
    } else if (intent === "sector" || intent === "sector_outlook") {
      result = await answerSector(query);
    } else if (intent === "help" && !symbols.length) {
      result = helpAnswer();
    } else {
      // Never invent a default stock when user did not name one — show help instead
      if (!symbols.length) {
        result = helpAnswer();
      } else {
        result = await answerStockQuery(symbols[0], intent === "help" ? "research_full" : intent);
      }
    }
  } catch (err) {
    return {
      ok: false,
      status: 503,
      body: {
        error: "service_unavailable",
        message:
          "AI service is temporarily unavailable while retrieving verified market data. Please try again later.",
        technical: process.env.NODE_ENV === "development" ? err.message : undefined,
        suggestions: SUGGESTED_QUERIES,
        ...policyMeta,
      },
    };
  }

  // Optional LLM polish — never the sole source of numbers
  const llm = await polishWithXai(result);
  const answer = llm.usedLlm ? llm.answer : result.answer;

  const body = {
    answer,
    intent: result.intent || intent,
    dataType: result.dataType,
    confidence: result.confidence,
    sources: result.sources || [],
    sections: result.sections || [],
    suggestions: result.suggestions || SUGGESTED_QUERIES,
    symbol: result.symbol || symbols[0] || null,
    companyName: result.companyName || null,
    price: result.price ?? null,
    fetchedAt: result.fetchedAt || new Date().toISOString(),
    cached: false,
    llm: {
      enabled: Boolean(process.env.XAI_API_KEY || process.env.GROK_API_KEY),
      used: Boolean(llm.usedLlm),
      provider: llm.provider || null,
      model: llm.model || null,
      note: llm.usedLlm
        ? "Prose polished by xAI using only verified facts supplied by ABC engines"
        : llm.reason || "Structured verified answer (no LLM polish)",
    },
    engine: "abc-copilot-verified-v2",
    ...policyMeta,
  };

  // Cache successful market-backed and educational answers (skip empty)
  if (body.answer) {
    cacheSet(cacheKey, body);
  }

  return {
    ok: true,
    status: 200,
    body,
  };
}

module.exports = {
  answerCopilotQuery,
  classifyIntent,
  extractSymbols,
  getCopilotStatus,
  SUGGESTED_QUERIES,
  MAX_QUERY_LEN,
  SYMBOL_ALIASES,
};
