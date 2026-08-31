const { fetchWithTimeout } = require("./fetch-utils");

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
  const res = await fetchWithTimeout("https://www.nseindia.com/market-data/all-upcoming-issues-ipo", {
    headers: NSE_HEADERS,
  }, 15_000);
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
      const res = await fetchWithTimeout(`https://www.nseindia.com${path}`, {
        headers: { ...NSE_HEADERS, Cookie: sessionCookies },
      }, 20_000);
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
  const issuePrice = cleanNseText(row.issuePrice);
  const priceRange = cleanNseText(row.priceRange);
  const listingDate = cleanNseText(row.listingDate);
  return {
    symbol: row.symbol,
    companyName: row.companyName || row.company,
    issuePrice: issuePrice && issuePrice !== "-" ? issuePrice : priceRange,
    priceRange: priceRange || null,
    issueStartDate: row.ipoStartDate || null,
    issueEndDate: row.ipoEndDate || null,
    listingDate: listingDate && listingDate !== "-" ? listingDate : null,
    securityType: row.securityType || row.series || null,
    series: row.securityType || row.series || null,
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

function nseNumber(value) {
  if (value == null || value === "") return null;
  const n = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

function cleanNseText(value) {
  if (value == null) return null;
  let text = String(value).trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    text = text.slice(1, -1).trim();
  }
  text = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text || null;
}

function parseIssueInfoMap(dataList = []) {
  const map = {};
  for (const row of dataList) {
    const title = cleanNseText(row?.title);
    if (!title) continue;
    map[title] = cleanNseText(row?.value);
  }
  return map;
}

function pickInfo(map, ...titles) {
  for (const title of titles) {
    if (map[title]) return map[title];
    const match = Object.keys(map).find((key) => key.toLowerCase() === title.toLowerCase());
    if (match && map[match]) return map[match];
  }
  return null;
}

function firstNumber(text) {
  if (!text) return null;
  const match = String(text).replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

function parseIssuePeriod(text) {
  if (!text) return { start: null, end: null };
  const parts = String(text).split(/\s+to\s+/i);
  return { start: parts[0]?.trim() || null, end: parts[1]?.trim() || null };
}

function parseIssueSizeCrore(text) {
  if (!text) return null;
  const millions = [...String(text).matchAll(/Rs\.?\s*([\d,]+(?:\.\d+)?)\s*million/gi)]
    .map((m) => Number(m[1].replace(/,/g, "")))
    .filter(Number.isFinite);
  if (millions.length) {
    const crore = Number((millions.reduce((a, b) => a + b, 0) / 10).toFixed(2));
    return crore;
  }
  const crores = [...String(text).matchAll(/Rs\.?\s*([\d,]+(?:\.\d+)?)\s*crore/gi)]
    .map((m) => Number(m[1].replace(/,/g, "")))
    .filter(Number.isFinite);
  if (crores.length) return Number(crores.reduce((a, b) => a + b, 0).toFixed(2));
  return null;
}

function parsePriceBand(text) {
  if (!text) return { display: null, low: null, high: null, mid: null };
  const display = cleanNseText(text);
  const nums = [...String(display).matchAll(/(\d+(?:\.\d+)?)/g)].map((m) => Number(m[1]));
  const prices = nums.filter((n) => n >= 1);
  const low = prices[0] ?? null;
  const high = prices.length > 1 ? prices[1] : prices[0] ?? null;
  const mid = low != null && high != null ? Number(((low + high) / 2).toFixed(2)) : low;
  return { display, low, high, mid };
}

function extractDocumentLinks(dataList = []) {
  const labels = {
    "Red Herring Prospectus": "rhp",
    "Ratios / Basis of Issue Price": "ratios",
    "Anchor Allocation Report": "anchor",
    "Bidding Centers": "biddingCenters",
    "Sample Application Forms": "forms",
    "Security Parameters (Pre Anchor)": "preAnchor",
    "Security Parameters (Post Anchor)": "postAnchor",
  };
  const documents = [];
  for (const row of dataList) {
    const title = cleanNseText(row?.title);
    const raw = String(row?.value || "");
    const href = raw.match(/https?:\/\/[^\s"'<>]+/i)?.[0];
    if (!title || !href) continue;
    const key = labels[title] || title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    documents.push({ key, title, url: href.replace(/["']+$/, "") });
  }
  return documents;
}

function parseDemand(rows) {
  if (!Array.isArray(rows) || !rows.length) return null;
  const levels = rows
    .map((row) => ({
      price: cleanNseText(row.price),
      cumulativeQty: cleanNseText(row.cumQty),
      timestamp: cleanNseText(row.timestamp),
    }))
    .filter((row) => row.price);
  if (!levels.length) return null;
  return {
    available: true,
    levels,
    updatedAt: levels[0]?.timestamp || null,
    source: "NSE ipo-detail demandDataNSE",
  };
}

function parseIssueSnapshot(data, fallback = {}) {
  const map = parseIssueInfoMap(data?.issueInfo?.dataList || []);
  const price = parsePriceBand(pickInfo(map, "Price Range") || fallback.issuePrice);
  const lotSize = firstNumber(pickInfo(map, "Bid Lot", "Minimum Order Quantity")) ?? nseNumber(fallback.lotSize);
  const faceValue = firstNumber(pickInfo(map, "Face Value"));
  const issueSizeText = pickInfo(map, "Issue Size");
  const issueSizeCrore = parseIssueSizeCrore(issueSizeText);
  const sharesOffered = nseNumber(fallback.sharesOffered || fallback.issueSize);
  const minInvestment = lotSize != null && price.high != null
    ? Number((lotSize * price.high).toFixed(2))
    : null;
  const period = parseIssuePeriod(pickInfo(map, "Issue Period"));
  const companyTitle = Object.keys(map).find((key) => /limited|llp|inc/i.test(key) && !map[key]);

  return {
    companyName: data?.companyName && data.companyName !== fallback.symbol
      ? data.companyName
      : (companyTitle || fallback.companyName || null),
    symbol: pickInfo(map, "Symbol") || fallback.symbol || data?.symbol || null,
    priceRange: price.display,
    priceLow: price.low,
    priceHigh: price.high,
    priceMid: price.mid,
    lotSize,
    faceValue,
    minInvestment,
    issueType: pickInfo(map, "Issue Type"),
    issueSizeText,
    issueSizeCrore,
    issueSizeDisplay: issueSizeCrore != null
      ? `₹${issueSizeCrore.toLocaleString("en-IN")} Cr`
      : (sharesOffered != null ? `${sharesOffered.toLocaleString("en-IN")} shares` : null),
    sharesOffered,
    issueStartDate: period.start || fallback.issueStartDate || null,
    issueEndDate: period.end || fallback.issueEndDate || null,
    leadManagers: pickInfo(map, "Book Running Lead Managers"),
    registrar: pickInfo(map, "Name of the Registrar"),
    registrarAddress: pickInfo(map, "Address of the Registrar"),
    registrarContact: pickInfo(map, "Contact person name number and Email id"),
    sponsorBank: pickInfo(map, "Sponsor Bank"),
    marketTimings: pickInfo(map, "IPO Market Timings"),
    retailMaxAmount: pickInfo(map, "Maximum Subscription Amount for Retail Investor"),
    employeeMaxAmount: pickInfo(map, "Maximum Subscription Amount for Eligible Employee"),
    discount: pickInfo(map, "Discount"),
    categories: pickInfo(map, "Categories"),
    upiCutoff: pickInfo(map, "Cut-off time for UPI Mandate Confirmation"),
  };
}

function emptySub(source = "NSE ipo-detail") {
  return { available: false, value: null, display: null, source };
}

function parseSubscriptionCategories(bidDetails = []) {
  const rows = Array.isArray(bidDetails)
    ? bidDetails.filter((b) => b?.category && b.category !== "Category")
    : [];

  const find = (match, { exact = false } = {}) => {
    const use = exact
      ? rows.find((b) => b.category === match)
      : rows.find((b) => (b.category || "").includes(match));
    if (!use) return emptySub();
    const times = nseNumber(use.noOfTime);
    const formatted = formatSubscription(times);
    return {
      available: formatted != null,
      value: times,
      display: formatted != null ? `${formatted}x` : null,
      sharesOffered: nseNumber(use.noOfSharesOffered),
      sharesBid: nseNumber(use.noOfsharesBid),
      source: "NSE ipo-detail bidDetails",
    };
  };

  const total = rows.find((b) => b.category === "Total");
  const overallTimes = nseNumber(total?.noOfTime);
  const overallFmt = formatSubscription(overallTimes);
  const niiExact = find("Non Institutional Investors", { exact: true });

  return {
    overall: {
      available: overallFmt != null,
      value: overallTimes,
      display: overallFmt != null ? `${overallFmt}x` : null,
      sharesOffered: nseNumber(total?.noOfSharesOffered),
      sharesBid: nseNumber(total?.noOfsharesBid),
      source: "NSE ipo-detail",
    },
    retail: find("Retail Individual Investors"),
    nii: niiExact.available ? niiExact : find("Non Institutional Investors"),
    hni: find("Non Institutional Investors(Bid amount of more than Ten Lakh"),
    sNii: find("Non Institutional Investors(Bid amount of more than Two Lakh"),
    qib: find("Qualified Institutional Buyers"),
    fii: find("Foreign Institutional Investors"),
    employee: find("Employee"),
    categories: rows.map((b) => ({
      srNo: b.srNo,
      category: b.category,
      sharesOffered: nseNumber(b.noOfSharesOffered),
      sharesBid: nseNumber(b.noOfsharesBid),
      times: nseNumber(b.noOfTime),
    })),
    fetchedAt: new Date().toISOString(),
  };
}

function mergeIpoDetail(ipo, detail) {
  if (!detail) return ipo;
  const snap = detail.issueSnapshot || {};
  return {
    ...ipo,
    companyName: snap.companyName && !/^[A-Z0-9]+$/.test(snap.companyName)
      ? snap.companyName
      : (ipo.companyName || snap.companyName),
    issuePrice: snap.priceRange || ipo.issuePrice,
    issueSize: snap.issueSizeDisplay || ipo.issueSize,
    issueSizeCrore: snap.issueSizeCrore ?? null,
    issueSizeText: snap.issueSizeText || null,
    sharesOffered: snap.sharesOffered ?? ipo.sharesOffered ?? null,
    lotSize: snap.lotSize ?? ipo.lotSize ?? null,
    faceValue: snap.faceValue ?? null,
    minInvestment: snap.minInvestment ?? null,
    leadManagers: snap.leadManagers || ipo.leadManagers || null,
    registrar: snap.registrar || ipo.registrar || null,
    sponsorBank: snap.sponsorBank || null,
    issueType: snap.issueType || null,
    industry: detail.metaInfo?.industry || ipo.industry || null,
    listingDate: detail.metaInfo?.listingDate || ipo.listingDate || null,
    isin: detail.metaInfo?.isin || null,
    documents: detail.documents || [],
    subscription: detail.subscription || ipo.subscription || null,
    demand: detail.demand || null,
    issueSnapshot: snap,
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

  const listed = (Array.isArray(past) ? past : []).slice(0, 40).map(normalizeListed);

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

async function findIpoInDashboard(symbol) {
  const dashboard = await fetchIpoDashboard();
  const key = String(symbol || "").trim().toUpperCase();
  if (!key) return null;
  const ipo =
    dashboard.open.find((i) => i.symbol?.toUpperCase() === key) ||
    dashboard.upcoming.find((i) => i.symbol?.toUpperCase() === key) ||
    dashboard.listed.find((i) => i.symbol?.toUpperCase() === key);
  return ipo ? { dashboard, ipo } : null;
}

function normalizeBidRows(rows) {
  return (rows || [])
    .filter((row) => row?.category && row.category !== "Category")
    .map((row) => ({
      category: row.category,
      srNo: row.srNo,
      noOfSharesOffered: row.noOfSharesOffered ?? row.noOfShareOffered,
      noOfsharesBid: row.noOfsharesBid ?? row.noOfSharesBid,
      noOfTime: row.noOfTime ?? row.noOfTotalMeant,
    }));
}

async function fetchIpoDetail(symbol) {
  const data = await fetchNseJson(`/api/ipo-detail?symbol=${encodeURIComponent(symbol)}`);
  const bidDetails = normalizeBidRows(
    Array.isArray(data.bidDetails) && data.bidDetails.length
      ? data.bidDetails
      : data.activeCat?.dataList
  );
  const subscription = parseSubscriptionCategories(bidDetails);
  const issueSnapshot = parseIssueSnapshot(data, { symbol });
  return {
    symbol,
    companyName: issueSnapshot.companyName || data.companyName || symbol,
    metaInfo: data.metaInfo || {},
    issueSnapshot,
    documents: extractDocumentLinks(data.issueInfo?.dataList || []),
    demand: parseDemand(data.demandDataNSE),
    subscription,
    bidDetails,
    source: "NSE ipo-detail API",
    fetchedAt: new Date().toISOString(),
    dataStatus: "live",
  };
}

async function enrichWithDetail(ipos) {
  return Promise.all(
    (ipos || []).map(async (ipo) => {
      try {
        const detail = await fetchIpoDetail(ipo.symbol);
        return mergeIpoDetail(ipo, detail);
      } catch {
        return ipo;
      }
    })
  );
}

async function enrichOpenWithSubscription(open) {
  return enrichWithDetail(open);
}

module.exports = {
  fetchIpoDashboard,
  fetchIpoDetail,
  findIpoInDashboard,
  parseSubscriptionCategories,
  parseIssueSnapshot,
  parseIssueSizeCrore,
  parsePriceBand,
  extractDocumentLinks,
  fetchNseJson,
  enrichOpenWithSubscription,
  enrichWithDetail,
  mergeIpoDetail,
  nseNumber,
};