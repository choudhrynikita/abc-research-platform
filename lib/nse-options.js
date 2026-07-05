const { fetchWithTimeout } = require("./fetch-utils");

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

function parseLeg(leg, strike, type) {
  if (!leg) return null;
  const premium =
    leg.lastPrice != null ? leg.lastPrice
      : leg.buyPrice1 != null ? leg.buyPrice1
        : leg.sellPrice1 != null ? leg.sellPrice1
          : null;
  if (premium == null) return null;

  return {
    strike,
    type,
    premium,
    bid: leg.bidprice ?? leg.buyPrice1 ?? null,
    ask: leg.askPrice ?? leg.sellPrice1 ?? null,
    openInterest: leg.openInterest ?? null,
    oiChange: leg.changeinOpenInterest ?? null,
    iv: leg.impliedVolatility ?? null,
    volume: leg.totalTradedVolume ?? null,
    expiry: leg.expiryDate ?? null,
    delta: leg.delta ?? null,
    gamma: leg.gamma ?? null,
    theta: leg.theta ?? null,
    vega: leg.vega ?? null,
  };
}

function analyzeChain(data, sourceLabel = "NSE India option-chain API", selectedExpiry = null) {
  const rows = data?.records?.data || [];
  if (!rows.length) return { available: false, reason: "Empty options chain response" };

  const underlying = data.records?.underlyingValue ?? null;
  const expiries = data.records?.expiryDates || [];
  let callOi = 0;
  let putOi = 0;
  let callOiChange = 0;
  let putOiChange = 0;
  const painMap = {};
  const strikes = [];
  let maxCallOi = { strike: null, oi: 0 };
  let maxPutOi = { strike: null, oi: 0 };

  rows.forEach((row) => {
    const strike = row.strikePrice;
    const ce = row.CE || {};
    const pe = row.PE || {};
    callOi += ce.openInterest || 0;
    putOi += pe.openInterest || 0;
    callOiChange += ce.changeinOpenInterest || 0;
    putOiChange += pe.changeinOpenInterest || 0;

    if ((ce.openInterest || 0) > maxCallOi.oi) maxCallOi = { strike, oi: ce.openInterest };
    if ((pe.openInterest || 0) > maxPutOi.oi) maxPutOi = { strike, oi: pe.openInterest };

    const cePain = (strike - underlying) * (ce.openInterest || 0);
    const pePain = (underlying - strike) * (pe.openInterest || 0);
    painMap[strike] = (painMap[strike] || 0) + Math.max(0, -cePain) + Math.max(0, -pePain);

    strikes.push({
      strike,
      ce: parseLeg(ce, strike, "CE"),
      pe: parseLeg(pe, strike, "PE"),
    });
  });

  const maxPainStrike = Object.entries(painMap).sort((a, b) => a[1] - b[1])[0]?.[0] ?? null;
  const pcr = callOi ? Number((putOi / callOi).toFixed(2)) : null;

  const ivSamples = rows
    .flatMap((r) => [r.CE?.impliedVolatility, r.PE?.impliedVolatility])
    .filter((v) => v != null && v > 0);
  const avgIv = ivSamples.length
    ? Number((ivSamples.reduce((a, b) => a + b, 0) / ivSamples.length).toFixed(2))
    : null;

  const atmStrike = underlying != null
    ? strikes.reduce((best, s) =>
        Math.abs(s.strike - underlying) < Math.abs((best?.strike ?? Infinity) - underlying) ? s : best
      , strikes[0])?.strike
    : null;

  const lotSize = data?.records?.lotSize
    ?? data?.records?.marketLot
    ?? data?.filtered?.CE?.marketLot
    ?? data?.filtered?.PE?.marketLot
    ?? null;

  return {
    available: true,
    underlying,
    lotSize: lotSize != null ? Number(lotSize) : null,
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
    impliedVolatility: avgIv,
    source: sourceLabel,
    fetchedAt: new Date().toISOString(),
  };
}

function getLegAtStrike(chain, strike, legType, expiry = null) {
  if (!chain?.available || !chain.strikes) return null;
  const row = chain.strikes.find((s) => s.strike === strike);
  if (!row) return null;
  const leg = legType === "CE" ? row.ce : row.pe;
  if (!leg) return null;
  if (expiry && leg.expiry && leg.expiry !== expiry) return null;
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
    .map((e) => ({ e, t: new Date(e).getTime() }))
    .filter((x) => !Number.isNaN(x.t) && x.t >= now - 86400000)
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
  return analyzeChain(data, sourceLabel, expiry);
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

function pickMonthlyExpiry(expiries) {
  if (!expiries?.length) return null;
  const now = Date.now();
  const parsed = expiries
    .map((e) => ({ e, t: new Date(e).getTime() }))
    .filter((x) => !Number.isNaN(x.t) && x.t > now + 5 * 86400000)
    .sort((a, b) => a.t - b.t);
  if (!parsed.length) return expiries[expiries.length - 1];
  const monthly = parsed.find((x) => {
    const days = (x.t - now) / 86400000;
    return days >= 18 && days <= 50;
  });
  return monthly?.e ?? parsed[parsed.length - 1]?.e ?? expiries[0];
}

module.exports = {
  fetchOptionChain,
  fetchNiftyOptionChain,
  fetchContractInfo,
  analyzeChain,
  getLegAtStrike,
  nearestStrike,
  pickMonthlyExpiry,
  pickNearestExpiry,
};