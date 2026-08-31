const { fetchWithTimeout } = require("./fetch-utils");
const { validateIv } = require("./data-validation");

const NSE_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://www.nseindia.com/option-chain",
};

let sessionCookies = "";
let lastWarmAt = 0;

function parseCookies(response) {
  const raw =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [response.headers.get("set-cookie")].filter(Boolean);
  return raw.map((c) => String(c).split(";")[0]).filter(Boolean);
}

async function warmSession() {
  if (Date.now() - lastWarmAt < 60_000 && sessionCookies) return;

  const pages = [
    "https://www.nseindia.com/",
    "https://www.nseindia.com/option-chain",
  ];

  let cookies = sessionCookies;
  for (const page of pages) {
    const res = await fetchWithTimeout(page, {
      headers: {
        ...NSE_HEADERS,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        Cookie: cookies,
      },
    }, 15_000);
    const parts = parseCookies(res);
    if (parts.length) {
      const merged = new Set(
        [cookies, ...parts].join("; ").split("; ").filter(Boolean)
      );
      cookies = [...merged].join("; ");
    }
  }

  if (cookies) sessionCookies = cookies;
  lastWarmAt = Date.now();
}

function nseSymbol(symbol) {
  return symbol.replace(".NS", "").toUpperCase();
}

function firstPositivePremium(...values) {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

function parseLeg(leg, strike, type) {
  if (!leg) return null;
  // After hours / weekends NSE often prints lastPrice 0. Use the last
  // strictly-positive verified quote (LTP, prev close, ask, then bid).
  const premium = firstPositivePremium(
    leg.lastPrice,
    leg.lastTradedPrice,
    leg.ltp,
    leg.closePrice,
    leg.prevClose,
    leg.previousClose,
    leg.askPrice,
    leg.sellPrice1,
    leg.bidprice,
    leg.buyPrice1
  );
  if (premium == null) return null;

  return {
    strike,
    type,
    premium,
    bid: leg.bidprice ?? leg.buyPrice1 ?? null,
    ask: leg.askPrice ?? leg.sellPrice1 ?? null,
    openInterest: leg.openInterest ?? null,
    oiChange: leg.changeinOpenInterest ?? null,
    iv: (() => {
      const check = validateIv(leg.impliedVolatility);
      return check.valid ? check.value : null;
    })(),
    volume: leg.totalTradedVolume ?? null,
    expiry: leg.expiryDate ?? null,
    delta: leg.delta ?? null,
    gamma: leg.gamma ?? null,
    theta: leg.theta ?? null,
    vega: leg.vega ?? null,
  };
}

/**
 * Classic max-pain: expiry price S that minimises total option-writer payout
 * Σ CE_OI(K)·max(S−K,0) + PE_OI(K)·max(K−S,0). Never estimated.
 */
function computeMaxPain(strikeRows) {
  const rows = (strikeRows || []).filter((r) => r && Number.isFinite(Number(r.strike)));
  if (!rows.length) return null;
  const candidates = [...new Set(rows.map((r) => Number(r.strike)))].sort((a, b) => a - b);
  let best = null;
  let bestPain = Infinity;
  for (const S of candidates) {
    let pain = 0;
    for (const row of rows) {
      const k = Number(row.strike);
      const ceOi = Number(row.ce?.openInterest) || 0;
      const peOi = Number(row.pe?.openInterest) || 0;
      pain += ceOi * Math.max(S - k, 0);
      pain += peOi * Math.max(k - S, 0);
    }
    if (pain < bestPain) {
      bestPain = pain;
      best = S;
    }
  }
  return best;
}

function rowMatchesExpiry(row, selectedExpiry) {
  if (!selectedExpiry) return true;
  const exp = row?.CE?.expiryDate || row?.PE?.expiryDate || row?.expiryDate;
  if (!exp) return true;
  return expiriesMatch(exp, selectedExpiry);
}

/**
 * Official NSE market lot lives on each CE/PE contract (`marketLot`), not on
 * `records.lotSize` or `filtered.CE` (those keys are totals / missing).
 */
function extractLotSize(data, rows) {
  const candidates = [
    data?.records?.lotSize,
    data?.records?.marketLot,
    data?.filtered?.CE?.marketLot,
    data?.filtered?.PE?.marketLot,
  ];
  for (const row of rows || []) {
    candidates.push(
      row?.CE?.marketLot,
      row?.PE?.marketLot,
      row?.CE?.lotSize,
      row?.PE?.lotSize
    );
  }
  for (const value of candidates) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

function analyzeChain(data, sourceLabel = "NSE India option-chain API", selectedExpiry = null) {
  const rawRows = data?.records?.data || [];
  if (!rawRows.length) return { available: false, reason: "Empty options chain response" };

  const rows = rawRows.filter((row) => rowMatchesExpiry(row, selectedExpiry));
  // v3 scopes by URL expiry but prints CE.expiryDate as dd-MM-yyyy while
  // expiryDates is dd-Mon-yyyy. If matching still fails, keep the payload —
  // dropping every strike is what produced empty weekend plans.
  const useRows = rows.length ? rows : rawRows;
  if (!useRows.length) return { available: false, reason: "No strikes for selected expiry" };

  const underlying = data.records?.underlyingValue ?? null;
  const expiries = data.records?.expiryDates || [];
  let callOi = 0;
  let putOi = 0;
  let callOiChange = 0;
  let putOiChange = 0;
  const strikeMap = new Map();
  let maxCallOi = { strike: null, oi: 0 };
  let maxPutOi = { strike: null, oi: 0 };

  useRows.forEach((row) => {
    const strike = row.strikePrice;
    const ce = row.CE || {};
    const pe = row.PE || {};
    const ceOi = ce.openInterest || 0;
    const peOi = pe.openInterest || 0;
    callOi += ceOi;
    putOi += peOi;
    callOiChange += ce.changeinOpenInterest || 0;
    putOiChange += pe.changeinOpenInterest || 0;

    if (ceOi > maxCallOi.oi) maxCallOi = { strike, oi: ceOi };
    if (peOi > maxPutOi.oi) maxPutOi = { strike, oi: peOi };

    const parsed = {
      strike,
      ce: parseLeg(ce, strike, "CE"),
      pe: parseLeg(pe, strike, "PE"),
    };
    if (parsed.ce && parsed.ce.openInterest == null && ceOi) parsed.ce.openInterest = ceOi;
    if (parsed.pe && parsed.pe.openInterest == null && peOi) parsed.pe.openInterest = peOi;
    // Keep OI even when premium is missing so max-pain still sees the wall
    if (!parsed.ce && ceOi) parsed.ce = { strike, type: "CE", premium: null, openInterest: ceOi };
    if (!parsed.pe && peOi) parsed.pe = { strike, type: "PE", premium: null, openInterest: peOi };
    strikeMap.set(strike, parsed);
  });

  const strikes = [...strikeMap.values()].sort((a, b) => a.strike - b.strike);
  const maxPainStrike = computeMaxPain(strikes);
  const pcr = callOi ? Number((putOi / callOi).toFixed(2)) : null;

  const atmStrike = underlying != null
    ? strikes.reduce((best, s) =>
        Math.abs(s.strike - underlying) < Math.abs((best?.strike ?? Infinity) - underlying) ? s : best
      , strikes[0])?.strike
    : null;

  const atmIv = extractAtmIvFromStrikes(strikes, atmStrike);

  const lotSize = extractLotSize(data, rows);

  return {
    available: true,
    underlying,
    lotSize,
    expiry: selectedExpiry || (expiries[0] ?? null),
    expiries,
    atmStrike,
    strikes,
    callOi,
    putOi,
    callOiChange,
    putOiChange,
    putCallRatio: pcr,
    maxPain: maxPainStrike ? Number(maxPainStrike) : null,
    highestCallOi: maxCallOi.strike,
    highestPutOi: maxPutOi.strike,
    impliedVolatility: atmIv,
    atmIv,
    source: sourceLabel,
    fetchedAt: new Date().toISOString(),
  };
}

function parseNseExpiry(expiryStr) {
  if (!expiryStr) return null;
  const s = String(expiryStr).trim();

  // NSE v3 legs print dd-MM-yyyy ("01-09-2026"). Parse as day-month-year
  // BEFORE Date(), which would treat that string as US MM-DD-YYYY.
  const dmy = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dmy) {
    const parsed = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  // Contract-info / expiryDates: "01-Sep-2026"
  const dmony = s.match(/^(\d{1,2})-([A-Za-z]{3,})-(\d{4})$/);
  if (dmony) {
    const parsed = new Date(`${dmony[1]} ${dmony[2]} ${dmony[3]}`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(s);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function expiryKey(expiryStr) {
  const parsed = parseNseExpiry(expiryStr);
  return parsed ? parsed.toISOString().slice(0, 10) : String(expiryStr || "");
}

function expiriesMatch(a, b) {
  if (!a || !b) return true;
  return expiryKey(a) === expiryKey(b);
}

function getLegAtStrike(chain, strike, legType, expiry = null) {
  if (!chain?.available || !chain.strikes) return null;
  const row = chain.strikes.find((s) => s.strike === strike);
  if (!row) return null;
  const leg = legType === "CE" ? row.ce : row.pe;
  if (!leg) return null;
  if (expiry && leg.expiry && !expiriesMatch(leg.expiry, expiry)) return null;
  return leg;
}

function nearestStrike(chain, target) {
  if (!chain?.strikes?.length || target == null) return null;
  return chain.strikes.reduce((best, s) =>
    Math.abs(s.strike - target) < Math.abs(best.strike - target) ? s : best
  ).strike;
}

async function fetchContractInfo(symbol, retries = 2) {
  const nseSym = nseSymbol(symbol);
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      if (i > 0) {
        sessionCookies = "";
        lastWarmAt = 0;
        await new Promise((r) => setTimeout(r, 800 * i));
      }
      await warmSession();
      const url = `https://www.nseindia.com/api/option-chain-contract-info?symbol=${nseSym}`;
      const res = await fetchWithTimeout(url, {
        headers: { ...NSE_HEADERS, Cookie: sessionCookies },
      }, 15_000);
      if (!res.ok) throw new Error(`NSE contract-info returned ${res.status}`);
      const data = await res.json();
      return {
        available: true,
        expiries: data.expiryDates || [],
        strikes: (data.strikePrice || []).map(Number),
        source: "NSE option-chain-contract-info API",
      };
    } catch (err) {
      lastError = err;
    }
  }
  return { available: false, reason: lastError?.message || "Contract info unavailable" };
}

function pickNearestExpiry(expiries) {
  if (!expiries?.length) return null;
  const now = Date.now();
  const parsed = expiries
    .map((e) => ({ e, t: parseNseExpiry(e)?.getTime() }))
    .filter((x) => x.t && x.t >= now - 86400000)
    .sort((a, b) => a.t - b.t);
  return parsed[0]?.e ?? expiries[0];
}

async function fetchOptionChainV3(type, symbol, expiry, sourceLabel) {
  await warmSession();
  const nseSym = nseSymbol(symbol);
  const url =
    `https://www.nseindia.com/api/option-chain-v3?type=${encodeURIComponent(type)}` +
    `&symbol=${encodeURIComponent(nseSym)}&expiry=${encodeURIComponent(expiry)}`;
  const res = await fetchWithTimeout(url, {
    headers: { ...NSE_HEADERS, Cookie: sessionCookies },
  }, 25_000);
  if (!res.ok) throw new Error(`NSE option-chain-v3 returned ${res.status}`);
  const data = await res.json();
  if (!data?.records?.data?.length) {
    throw new Error("NSE option-chain-v3 returned empty chain");
  }
  const chain = analyzeChain(data, sourceLabel, expiry);
  await fillOfficialLotSize(chain, nseSym, expiry);
  return chain;
}

async function fillOfficialLotSize(chain, symbol, expiry) {
  if (!chain?.available) return chain;
  if (chain.lotSize != null) {
    chain.lotSizeSource = chain.lotSizeSource || "NSE option chain marketLot";
    return chain;
  }
  const { resolveMarketLot } = require("./nse-lots");
  const lot = await resolveMarketLot(symbol, expiry || chain.expiry);
  if (lot != null) {
    chain.lotSize = lot;
    chain.lotSizeSource = "NSE fo_mktlots.csv";
  }
  return chain;
}

async function fetchOptionChain(symbol, retries = 3, expiry = null) {
  const nseSym = nseSymbol(symbol);
  let lastError;

  for (let i = 0; i < retries; i++) {
    try {
      if (i > 0) {
        sessionCookies = "";
        lastWarmAt = 0;
        await new Promise((r) => setTimeout(r, 1000 * i));
      }

      let useExpiry = expiry;
      if (!useExpiry) {
        const info = await fetchContractInfo(symbol, 2);
        useExpiry = pickNearestExpiry(info.expiries) || pickMonthlyExpiry(info.expiries);
      }
      if (!useExpiry) throw new Error("No expiry available for equity option chain");

      return await fetchOptionChainV3(
        "Equity",
        nseSym,
        useExpiry,
        "NSE India option-chain-v3 API (Equity)"
      );
    } catch (err) {
      lastError = err;
    }
  }

  return {
    available: false,
    reason: lastError?.message || "NSE options chain unavailable",
    source: "NSE India option-chain-v3 API (Equity)",
    fetchedAt: new Date().toISOString(),
  };
}

async function fetchNiftyOptionChain(retries = 3) {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      if (i > 0) {
        sessionCookies = "";
        lastWarmAt = 0;
        await new Promise((r) => setTimeout(r, 1000 * i));
      }

      const info = await fetchContractInfo("NIFTY", 2);
      const expiry = pickNearestExpiry(info.expiries);
      if (!expiry) throw new Error("No NIFTY expiry available");

      return await fetchOptionChainV3(
        "Indices",
        "NIFTY",
        expiry,
        "NSE India option-chain-v3 API (NIFTY)"
      );
    } catch (err) {
      lastError = err;
    }
  }
  return {
    available: false,
    reason: lastError?.message || "NSE NIFTY options chain unavailable",
    source: "NSE India option-chain-v3 API (NIFTY)",
    fetchedAt: new Date().toISOString(),
  };
}

/** NIFTY monthly expiry = last Tuesday of the month (last week). */
function pickMonthlyExpiry(expiries, fromDate = new Date()) {
  if (!expiries?.length) return null;
  const { nextMonthlyExpiry } = require("./expiry");
  const target = nextMonthlyExpiry(fromDate);
  const targetYear = target.getFullYear();
  const targetMonth = target.getMonth();

  const inTargetMonth = expiries
    .map((e) => ({ e, t: parseNseExpiry(e) }))
    .filter((x) => x.t && x.t.getFullYear() === targetYear && x.t.getMonth() === targetMonth)
    .sort((a, b) => b.t - a.t);

  if (inTargetMonth.length) return inTargetMonth[0].e;

  const targetMs = target.getTime();
  const exact = expiries.find((e) => {
    const t = parseNseExpiry(e);
    return t && Math.abs(t.getTime() - targetMs) < 43200000;
  });
  if (exact) return exact;

  const now = startOfDay(fromDate).getTime();
  const parsed = expiries
    .map((e) => ({ e, t: parseNseExpiry(e)?.getTime() }))
    .filter((x) => x.t && x.t > now + 5 * 86400000)
    .sort((a, b) => a.t - b.t);
  if (!parsed.length) return expiries[expiries.length - 1];
  const monthly = parsed.find((x) => {
    const days = (x.t - now) / 86400000;
    return days >= 18 && days <= 50;
  });
  return monthly?.e ?? parsed[parsed.length - 1]?.e ?? expiries[0];
}

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function packHorizon(id, label, expiryType, item, today) {
  if (!item?.e) return null;
  const expiryDate = item.t || parseNseExpiry(item.e);
  const daysAway = expiryDate
    ? Math.max(0, Math.round((startOfDay(expiryDate).getTime() - today.getTime()) / 86400000))
    : null;
  return {
    id,
    label,
    expiryType,
    expiry: item.e,
    daysAway,
    holdingPeriod: id === "monthly" ? "Until monthly expiry" : `Until ${label} expiry`,
  };
}

/**
 * Always expose three NIFTY planning horizons from the official expiry list:
 * 7-day (nearest weekly), 15-day (weekly closest to 15 calendar days), monthly.
 */
function pickHorizonExpiries(expiries, fromDate = new Date()) {
  const today = startOfDay(fromDate);
  if (!expiries?.length) {
    return { sevenDay: null, fifteenDay: null, monthly: null };
  }

  const future = expiries
    .map((e) => ({ e, t: parseNseExpiry(e) }))
    .filter((x) => x.t && startOfDay(x.t).getTime() >= today.getTime())
    .sort((a, b) => a.t - b.t);

  const monthlyExpiry = pickMonthlyExpiry(expiries, fromDate);
  const seven = future[0] || null;

  const target15 = new Date(today);
  target15.setDate(target15.getDate() + 15);
  const fifteen = future
    .filter((x) => x.e !== seven?.e && x.e !== monthlyExpiry)
    .sort((a, b) => Math.abs(a.t - target15) - Math.abs(b.t - target15))[0]
    || future.find((x) => x.e !== seven?.e)
    || null;

  const monthlyItem = monthlyExpiry
    ? { e: monthlyExpiry, t: parseNseExpiry(monthlyExpiry) }
    : null;

  return {
    sevenDay: packHorizon("7-day", "7-day", "Weekly", seven, today),
    fifteenDay: packHorizon("15-day", "15-day", "Weekly", fifteen, today),
    monthly: packHorizon("monthly", "Monthly", "Monthly", monthlyItem, today),
  };
}

async function fetchNiftyChainForExpiry(expiry, sourceLabel) {
  const chain = await fetchOptionChainV3(
    "Indices",
    "NIFTY",
    expiry,
    sourceLabel
  );
  if (chain?.available) {
    const legExpiry = chain.strikes?.find((s) => s.ce?.expiry || s.pe?.expiry);
    chain.expiry = legExpiry?.ce?.expiry || legExpiry?.pe?.expiry || chain.expiry || expiry;
  }
  return chain;
}

async function fetchNiftyHorizonChains(retries = 2) {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      if (i > 0) {
        sessionCookies = "";
        lastWarmAt = 0;
        await new Promise((r) => setTimeout(r, 800 * i));
      }
      const info = await fetchContractInfo("NIFTY", 2);
      if (!info.available || !info.expiries?.length) {
        throw new Error(info.reason || "NIFTY expiry list unavailable");
      }
      const horizons = pickHorizonExpiries(info.expiries);
      const uniqueExpiries = [...new Set(
        [horizons.sevenDay, horizons.fifteenDay, horizons.monthly]
          .map((h) => h?.expiry)
          .filter(Boolean)
      )];

      await warmSession();
      const chains = {};
      await Promise.all(uniqueExpiries.map(async (expiry) => {
        try {
          chains[expiry] = await fetchNiftyChainForExpiry(
            expiry,
            `NSE India option-chain-v3 API (NIFTY ${expiry})`
          );
        } catch (err) {
          chains[expiry] = {
            available: false,
            reason: err.message || "NIFTY chain fetch failed",
            expiry,
            fetchedAt: new Date().toISOString(),
          };
        }
      }));

      const attach = (horizon) => {
        if (!horizon) {
          return {
            id: null,
            expiry: null,
            chain: { available: false, reason: "No matching NIFTY expiry" },
          };
        }
        return {
          ...horizon,
          chain: chains[horizon.expiry] || {
            available: false,
            reason: "NSE NIFTY chain unavailable for this expiry",
            expiry: horizon.expiry,
          },
        };
      };

      return {
        sevenDay: attach(horizons.sevenDay),
        fifteenDay: attach(horizons.fifteenDay),
        monthly: attach(horizons.monthly),
        expiries: info.expiries,
      };
    } catch (err) {
      lastError = err;
    }
  }

  const reason = lastError?.message || "NSE NIFTY horizon chains unavailable";
  const empty = { available: false, reason, fetchedAt: new Date().toISOString() };
  return {
    sevenDay: { id: "7-day", label: "7-day", chain: empty },
    fifteenDay: { id: "15-day", label: "15-day", chain: empty },
    monthly: { id: "monthly", label: "Monthly", chain: empty },
    expiries: [],
  };
}

async function fetchNiftyMonthlyChain(retries = 2) {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      if (i > 0) {
        sessionCookies = "";
        lastWarmAt = 0;
        await new Promise((r) => setTimeout(r, 1000 * i));
      }
      const info = await fetchContractInfo("NIFTY", 2);
      const monthlyExpiry = pickMonthlyExpiry(info.expiries);
      if (!monthlyExpiry) throw new Error("No NIFTY monthly expiry available");

      const chain = await fetchOptionChainV3(
        "Indices",
        "NIFTY",
        monthlyExpiry,
        "NSE India option-chain-v3 API (NIFTY Monthly)"
      );
      const legExpiry = chain.strikes?.find((s) => s.ce?.expiry || s.pe?.expiry);
      const resolvedExpiry = legExpiry?.ce?.expiry || legExpiry?.pe?.expiry || monthlyExpiry;
      chain.expiry = resolvedExpiry;
      return { chain, monthlyExpiry: resolvedExpiry };
    } catch (err) {
      lastError = err;
    }
  }
  return {
    chain: {
      available: false,
      reason: lastError?.message || "NSE NIFTY monthly options chain unavailable",
      source: "NSE India option-chain-v3 API (NIFTY Monthly)",
      fetchedAt: new Date().toISOString(),
    },
    monthlyExpiry: null,
  };
}

/**
 * ATM implied volatility from verified NSE chain — averages CE/PE at ATM when both valid.
 * Never uses deep OTM strikes or zero IV placeholders.
 */
function extractAtmIvFromStrikes(strikes, atmStrike) {
  if (!strikes?.length || atmStrike == null) return null;
  const row = strikes.find((s) => s.strike === atmStrike);
  if (!row) return null;
  const samples = [row.ce?.iv, row.pe?.iv]
    .map((v) => validateIv(v))
    .filter((r) => r.valid)
    .map((r) => r.value);
  if (!samples.length) return null;
  return Number((samples.reduce((a, b) => a + b, 0) / samples.length).toFixed(2));
}

function extractAtmIv(chain) {
  if (!chain?.available) return null;
  if (chain.atmIv != null) {
    const check = validateIv(chain.atmIv);
    return check.valid ? check.value : null;
  }
  return extractAtmIvFromStrikes(chain.strikes, chain.atmStrike);
}

module.exports = {
  fetchOptionChain,
  fetchNiftyOptionChain,
  fetchNiftyMonthlyChain,
  fetchNiftyHorizonChains,
  fetchNiftyChainForExpiry,
  fetchContractInfo,
  analyzeChain,
  computeMaxPain,
  extractLotSize,
  extractAtmIv,
  extractAtmIvFromStrikes,
  fillOfficialLotSize,
  getLegAtStrike,
  nearestStrike,
  parseNseExpiry,
  pickMonthlyExpiry,
  pickNearestExpiry,
  pickHorizonExpiries,
};