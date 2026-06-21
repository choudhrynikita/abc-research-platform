const NSE_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  Referer: "https://www.nseindia.com/market-data/all-upcoming-issues-ipo",
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
  const res = await fetch("https://www.nseindia.com/market-data/all-upcoming-issues-ipo", {
    headers: NSE_HEADERS,
  });
  const cookies = parseCookies(res);
  if (cookies) sessionCookies = cookies;
  lastWarmAt = Date.now();
}

async function fetchNseJson(path, retries = 3) {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      if (i > 0) {
        sessionCookies = "";
        lastWarmAt = 0;
        await new Promise((r) => setTimeout(r, 800 * i));
      }
      await warmSession();
      const res = await fetch(`https://www.nseindia.com${path}`, {
        headers: { ...NSE_HEADERS, Cookie: sessionCookies },
      });
      if (!res.ok) throw new Error(`NSE IPO API ${path} returned ${res.status}`);
      return await res.json();
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

function normalizeUpcoming(row) {
  return {
    symbol: row.symbol,
    companyName: row.companyName || row.company,
    issuePrice: row.issuePrice || row.priceRange || null,
    issueSize: row.issueSize || null,
    issueStartDate: row.issueStartDate || row.ipoStartDate || null,
    issueEndDate: row.issueEndDate || row.ipoEndDate || null,
    listingDate: row.listingDate || null,
    status: row.status || "Upcoming",
    series: row.series || row.securityType || "EQ",
    exchange: "NSE",
    lotSize: row.lotSize || null,
    industry: row.industry || null,
    leadManagers: row.leadManagers || null,
    registrar: row.registrar || null,
    source: "NSE all-upcoming-issues API",
  };
}

function normalizeOpen(row) {
  const times = Number(row.noOfTime);
  return {
    ...normalizeUpcoming(row),
    status: row.status || "Active",
    overallSubscription: Number.isFinite(times) ? Number(times.toFixed(2)) : null,
    sharesOffered: row.noOfSharesOffered || null,
    sharesBid: row.noOfsharesBid || null,
    category: row.category || null,
    source: "NSE ipo-current-issue API",
  };
}

function normalizeListed(row) {
  return {
    symbol: row.symbol,
    companyName: row.companyName || row.company,
    issuePrice: row.issuePrice || null,
    priceRange: row.priceRange || null,
    issueStartDate: row.ipoStartDate || null,
    issueEndDate: row.ipoEndDate || null,
    listingDate: row.listingDate || null,
    securityType: row.securityType || row.series || null,
    exchange: "NSE",
    listingGainLoss: null,
    listingPrice: null,
    currentMarketPrice: null,
    source: "NSE public-past-issues API",
  };
}

function formatSubscription(times) {
  if (times == null || Number.isNaN(times)) return null;
  const decimals = times > 0 && times < 0.01 ? 4 : 2;
  return Number(times.toFixed(decimals));
}

function parseSubscriptionCategories(bidDetails = []) {
  const find = (match) => {
    const row = bidDetails.find((b) => b.category?.includes(match));
    if (!row) return { available: false, display: "Verified IPO data unavailable." };
    const times = row.noOfTime != null && row.noOfTime !== "" ? Number(row.noOfTime) : null;
    const formatted = formatSubscription(times);
    return {
      available: formatted != null,
      value: times,
      display: formatted != null ? `${formatted}x` : "Verified IPO data unavailable.",
      sharesOffered: row.noOfSharesOffered,
      sharesBid: row.noOfsharesBid,
      source: "NSE ipo-detail bidDetails",
    };
  };

  const total = bidDetails.find((b) => b.category === "Total");
  const overall = total?.noOfTime != null && total.noOfTime !== "" ? Number(total.noOfTime) : null;
  const overallFmt = formatSubscription(overall);

  return {
    overall: {
      available: overallFmt != null,
      value: overall,
      display: overallFmt != null ? `${overallFmt}x` : "Verified IPO data unavailable.",
      source: "NSE ipo-detail",
    },
    retail: find("Retail Individual Investors"),
    hni: find("Non Institutional Investors(Bid amount of more than Ten Lakh"),
    qib: find("Qualified Institutional Buyers"),
    employee: find("Employee"),
    dayWise: bidDetails,
    fetchedAt: new Date().toISOString(),
  };
}

async function fetchIpoDashboard() {
  const fetchedAt = new Date().toISOString();
  const [current, upcoming, past] = await Promise.all([
    fetchNseJson("/api/ipo-current-issue"),
    fetchNseJson("/api/all-upcoming-issues?category=ipo"),
    fetchNseJson("/api/public-past-issues?category=ipo"),
  ]);

  const openRaw = Array.isArray(current) ? current : [];
  const openSymbols = new Set(openRaw.map((r) => r.symbol));
  const open = openRaw
    .filter((r) => r.category === "Total" || !r.category)
    .map(normalizeOpen);

  const upcomingAll = (Array.isArray(upcoming) ? upcoming : []).map(normalizeUpcoming);
  const upcomingOnly = upcomingAll.filter((u) => !openSymbols.has(u.symbol) && u.status !== "Active");

  const listed = (Array.isArray(past) ? past : []).slice(0, 30).map(normalizeListed);

  return {
    source: "NSE India IPO APIs",
    fetchedAt,
    dataStatus: "live",
    open,
    upcoming: upcomingOnly,
    listed,
    counts: { open: open.length, upcoming: upcomingOnly.length, listed: listed.length },
  };
}

async function fetchIpoDetail(symbol) {
  const data = await fetchNseJson(`/api/ipo-detail?symbol=${encodeURIComponent(symbol)}`);
  const subscription = parseSubscriptionCategories(data.bidDetails || []);
  return {
    symbol,
    companyName: data.companyName || symbol,
    metaInfo: data.metaInfo || {},
    subscription,
    bidDetails: data.bidDetails || [],
    source: "NSE ipo-detail API",
    fetchedAt: new Date().toISOString(),
    dataStatus: "live",
  };
}

async function enrichOpenWithSubscription(open) {
  return Promise.all(
    open.map(async (ipo) => {
      try {
        const detail = await fetchIpoDetail(ipo.symbol);
        return { ...ipo, subscription: detail.subscription };
      } catch {
        return { ...ipo, subscription: null };
      }
    })
  );
}

module.exports = {
  fetchIpoDashboard,
  fetchIpoDetail,
  parseSubscriptionCategories,
  fetchNseJson,
  enrichOpenWithSubscription,
};