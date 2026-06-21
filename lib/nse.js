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
  const res = await fetch("https://www.nseindia.com/", { headers: NSE_HEADERS });
  const cookies = parseCookies(res);
  if (cookies) sessionCookies = cookies;
  lastWarmAt = Date.now();
}

function parseFiiDiiRows(rows) {
  const fii = rows.find((r) => r.category?.includes("FII"));
  const dii = rows.find((r) => r.category === "DII");

  return {
    date: fii?.date || dii?.date || null,
    fii: fii
      ? {
          buyValue: Number(fii.buyValue),
          sellValue: Number(fii.sellValue),
          netValue: Number(fii.netValue),
        }
      : null,
    dii: dii
      ? {
          buyValue: Number(dii.buyValue),
          sellValue: Number(dii.sellValue),
          netValue: Number(dii.netValue),
        }
      : null,
    raw: rows,
    dataStatus: "live",
    fetchedAt: new Date().toISOString(),
  };
}

async function fetchFiiDiiOnce() {
  await warmSession();
  const response = await fetch("https://www.nseindia.com/api/fiidiiTradeReact", {
    headers: { ...NSE_HEADERS, Cookie: sessionCookies },
  });
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

module.exports = { fetchFiiDii, parseFiiDiiRows };