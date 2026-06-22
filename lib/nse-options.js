const { fetchWithTimeout } = require("./fetch-utils");

const NSE_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  Referer: "https://www.nseindia.com/option-chain",
};

let sessionCookies = "";
let lastWarmAt = 0;

function parseCookies(response) {
  const raw =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [response.headers.get("set-cookie")].filter(Boolean);
  return raw.map((c) => String(c).split(";")[0]).join("; ");
}

async function warmSession() {
  if (Date.now() - lastWarmAt < 60_000 && sessionCookies) return;
  const res = await fetchWithTimeout("https://www.nseindia.com/option-chain", { headers: NSE_HEADERS }, 15_000);
  const cookies = parseCookies(res);
  if (cookies) sessionCookies = cookies;
  lastWarmAt = Date.now();
}

function nseSymbol(symbol) {
  return symbol.replace(".NS", "").toUpperCase();
}

function analyzeChain(data) {
  const rows = data?.records?.data || [];
  if (!rows.length) return { available: false, reason: "Empty options chain response" };

  let callOi = 0;
  let putOi = 0;
  let callOiChange = 0;
  let putOiChange = 0;
  const painMap = {};

  rows.forEach((row) => {
    const strike = row.strikePrice;
    const ce = row.CE || {};
    const pe = row.PE || {};
    callOi += ce.openInterest || 0;
    putOi += pe.openInterest || 0;
    callOiChange += ce.changeinOpenInterest || 0;
    putOiChange += pe.changeinOpenInterest || 0;

    const cePain = (strike - (data.records.underlyingValue || 0)) * (ce.openInterest || 0);
    const pePain = ((data.records.underlyingValue || 0) - strike) * (pe.openInterest || 0);
    painMap[strike] = (painMap[strike] || 0) + Math.max(0, -cePain) + Math.max(0, -pePain);
  });

  const maxPainStrike = Object.entries(painMap).sort((a, b) => a[1] - b[1])[0]?.[0] ?? null;
  const pcr = callOi ? Number((putOi / callOi).toFixed(2)) : null;

  const ivSamples = rows
    .flatMap((r) => [r.CE?.impliedVolatility, r.PE?.impliedVolatility])
    .filter((v) => v != null && v > 0);
  const avgIv = ivSamples.length
    ? Number((ivSamples.reduce((a, b) => a + b, 0) / ivSamples.length).toFixed(2))
    : null;

  return {
    available: true,
    underlying: data.records?.underlyingValue ?? null,
    expiry: data.records?.expiryDates?.[0] ?? null,
    callOi,
    putOi,
    callOiChange,
    putOiChange,
    putCallRatio: pcr,
    maxPain: maxPainStrike ? Number(maxPainStrike) : null,
    impliedVolatility: avgIv,
    source: "NSE India option-chain-equities API",
    fetchedAt: new Date().toISOString(),
  };
}

async function fetchOptionChain(symbol, retries = 3) {
  const nseSym = nseSymbol(symbol);
  let lastError;

  for (let i = 0; i < retries; i++) {
    try {
      if (i > 0) {
        sessionCookies = "";
        lastWarmAt = 0;
        await new Promise((r) => setTimeout(r, 1000 * i));
      }
      await warmSession();
      const url = `https://www.nseindia.com/api/option-chain-equities?symbol=${nseSym}`;
      const res = await fetchWithTimeout(url, {
        headers: { ...NSE_HEADERS, Cookie: sessionCookies },
      }, 20_000);
      if (!res.ok) throw new Error(`NSE options API returned ${res.status}`);
      const data = await res.json();
      return analyzeChain(data);
    } catch (err) {
      lastError = err;
    }
  }

  return {
    available: false,
    reason: lastError?.message || "NSE options chain unavailable",
    source: "NSE India option-chain-equities API",
    fetchedAt: new Date().toISOString(),
  };
}

module.exports = { fetchOptionChain, analyzeChain };