const { fetchWithTimeout } = require("./fetch-utils");

const NSE_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://www.nseindia.com/",
};

let sessionCookies = "";
let lastWarmAt = 0;

function parseCookies(response) {
  const raw = typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : [response.headers.get("set-cookie")].filter(Boolean);
  return raw.map((c) => String(c).split(";")[0]).join("; ");
}

async function warmSession() {
  if (Date.now() - lastWarmAt < 60_000 && sessionCookies) return;
  const res = await fetchWithTimeout("https://www.nseindia.com/", { headers: NSE_HEADERS }, 15_000);
  const cookies = parseCookies(res);
  if (cookies) sessionCookies = cookies;
  lastWarmAt = Date.now();
}

/** Parse a verified NSE numeric field — never coerce invalid values to 0. */
function nseNumber(value) {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function parseCategory(row) {
  if (!row) return null;
  const buyValue = nseNumber(row.buyValue);
  const sellValue = nseNumber(row.sellValue);
  const netValue = nseNumber(row.netValue);
  // Require at least one verified numeric field from the source row.
  if (buyValue == null && sellValue == null && netValue == null) return null;
  return { buyValue, sellValue, netValue };
}

function parseFiiDiiRows(rows) {
  if (!Array.isArray(rows) || !rows.length) {
    throw new Error("NSE FII/DII API returned empty data");
  }

  const fiiRow = rows.find((r) => String(r.category || "").includes("FII"));
  const diiRow = rows.find((r) => String(r.category || "").trim() === "DII");
  const fii = parseCategory(fiiRow);
  const dii = parseCategory(diiRow);

  if (!fii && !dii) {
    throw new Error("NSE FII/DII API returned no valid FII/DII metrics");
  }

  return {
    date: fiiRow?.date || diiRow?.date || null,
    fii,
    dii,
    raw: rows,
    dataStatus: "live",
    fetchedAt: new Date().toISOString(),
    source: "NSE India fiidiiTradeReact API",
  };
}

async function fetchFiiDiiOnce() {
  await warmSession();
  const response = await fetchWithTimeout("https://www.nseindia.com/api/fiidiiTradeReact", {
    headers: { ...NSE_HEADERS, Cookie: sessionCookies },
  }, 15_000);
  if (!response.ok) {
    throw new Error(`NSE FII/DII API returned ${response.status}`);
  }
  const rows = await response.json();
  if (!Array.isArray(rows) || !rows.length) {
    throw new Error("NSE FII/DII API returned empty data");
  }
  return parseFiiDiiRows(rows);
}

async function fetchFiiDii(retries = 3) {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      if (i > 0) {
        sessionCookies = "";
        lastWarmAt = 0;
        await new Promise((r) => setTimeout(r, 800 * i));
      }
      return await fetchFiiDiiOnce();
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

module.exports = { fetchFiiDii, parseFiiDiiRows, nseNumber };