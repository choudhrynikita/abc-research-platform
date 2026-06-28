const {
  fetchIpoDashboard,
  fetchIpoDetail,
  findIpoInDashboard,
  enrichOpenWithSubscription,
} = require("./nse-ipo");
const { enrichListedPrice } = require("./ipo-research");
const { IPO_UNAVAILABLE_MSG } = require("./format");

const AWAITING = "Awaiting official verified data.";

function parsePriceMid(priceBand) {
  if (!priceBand) return null;
  const str = String(priceBand);
  const range = str.match(/(\d+(?:\.\d+)?)\s*[-–to]+\s*(\d+(?:\.\d+)?)/i);
  if (range) return Number(((Number(range[1]) + Number(range[2])) / 2).toFixed(2));
  const nums = str.match(/\d+(?:\.\d+)?/g);
  if (!nums?.length) return null;
  if (nums.length >= 2) return Number(((Number(nums[0]) + Number(nums[1])) / 2).toFixed(2));
  return Number(nums[0]);
}

function computeMinInvestment(lotSize, priceBand) {
  const mid = parsePriceMid(priceBand);
  if (lotSize == null || mid == null) return null;
  return Number((Number(lotSize) * mid).toFixed(2));
}

function ipoType(ipo) {
  const s = `${ipo.series || ""} ${ipo.securityType || ""} ${ipo.category || ""}`.toUpperCase();
  if (s.includes("SME")) return "SME";
  return "Mainboard";
}

function filterListedLast30Days(listed) {
  const cutoff = Date.now() - 30 * 86400000;
  return listed.filter((ipo) => {
    if (!ipo.listingDate) return false;
    const t = new Date(ipo.listingDate).getTime();
    return !Number.isNaN(t) && t >= cutoff;
  });
}

function sortByOpenDate(ipos) {
  return [...ipos].sort((a, b) => {
    const da = a.issueStartDate ? new Date(a.issueStartDate).getTime() : Number.MAX_SAFE_INTEGER;
    const db = b.issueStartDate ? new Date(b.issueStartDate).getTime() : Number.MAX_SAFE_INTEGER;
    if (da !== db) return da - db;
    return (a.companyName || "").localeCompare(b.companyName || "");
  });
}

function buildScorecard(ipo, subscription, listedEnriched) {
  const dimensions = [
    { key: "businessQuality", label: "Business Quality", available: false, score: null, note: AWAITING },
    { key: "financialHealth", label: "Financial Health", available: false, score: null, note: AWAITING },
    { key: "profitability", label: "Profitability", available: false, score: null, note: AWAITING },
    { key: "growth", label: "Growth", available: false, score: null, note: AWAITING },
    { key: "valuation", label: "Valuation", available: false, score: null, note: AWAITING },
    { key: "management", label: "Management Quality", available: false, score: null, note: AWAITING },
    { key: "industry", label: "Industry Outlook", available: !!ipo.industry, score: ipo.industry ? 50 : null, note: ipo.industry ? `Industry: ${ipo.industry} (NSE tag only)` : AWAITING },
    { key: "risk", label: "Risk Level", available: subscription?.overall?.available, score: subscription?.overall?.value != null ? (subscription.overall.value < 1 ? 75 : 45) : null, note: subscription?.overall?.available ? "Based on verified subscription" : AWAITING },
    { key: "listingGain", label: "Listing Gain Potential", available: subscription?.overall?.available, score: subscription?.overall?.value != null ? Math.min(100, subscription.overall.value * 22) : null, note: subscription?.overall?.display || AWAITING },
    { key: "longTerm", label: "Long-Term Potential", available: false, score: null, note: "Requires verified DRHP financials" },
  ];

  if (listedEnriched?.listingGainLoss?.available) {
    const gain = listedEnriched.listingGainLoss.value;
    dimensions.find((d) => d.key === "listingGain").available = true;
    dimensions.find((d) => d.key === "listingGain").score = gain >= 0 ? Math.min(100, 50 + gain) : Math.max(0, 50 + gain);
    dimensions.find((d) => d.key === "listingGain").note = `Post-listing performance: ${listedEnriched.listingGainLoss.display}`;
  }

  const verified = dimensions.filter((d) => d.available && d.score != null);
  const overallScore = verified.length
    ? Math.round(verified.reduce((a, d) => a + d.score, 0) / verified.length)
    : null;

  return { dimensions, overallScore, methodology: "Average of verified dimensions only — missing data excluded" };
}

function buildRecommendation(ipo, subscription, listedEnriched) {
  const thesis = [];
  const evidence = [];
  let recommendation = "Neutral / Watch";
  let confidence = 40;
  let riskLevel = "Moderate";
  let horizon = "Listing window";

  if (subscription?.overall?.available) {
    const ov = subscription.overall.value;
    evidence.push(`Overall subscription ${subscription.overall.display} (NSE)`);
    if (ov >= 3) {
      recommendation = "Buy for Listing Gains";
      confidence = Math.min(85, 55 + ov * 5);
      thesis.push("Strong institutional and retail demand visible in verified subscription data");
    } else if (ov < 1) {
      recommendation = "Avoid";
      confidence = 65;
      riskLevel = "High";
      thesis.push("Subscribed below 1x — weak demand signal from NSE");
    } else {
      recommendation = "Neutral / Watch";
      confidence = 50;
      thesis.push("Moderate subscription — monitor daily book before deciding");
    }
  } else {
    thesis.push(AWAITING);
  }

  if (ipo.issuePrice) thesis.push(`Price band ${ipo.issuePrice} from NSE`);
  if (ipo.issueSize) thesis.push(`Issue size ${ipo.issueSize}`);

  thesis.push("Long-term buy thesis requires verified DRHP financials — not generated without filings feed");

  if (listedEnriched?.listingGainLoss?.available) {
    horizon = "Post-listing";
    evidence.push(`Listed performance ${listedEnriched.listingGainLoss.display}`);
  }

  return {
    recommendation,
    confidence,
    riskLevel,
    horizon,
    thesis: thesis.slice(0, 5),
    evidence,
    longTermNote: "Buy for Long-Term Investment requires verified financial statements — currently unavailable",
  };
}

function buildIpoCard(ipo, extras = {}) {
  const subscription = extras.subscription;
  const listedEnriched = extras.listedEnriched;
  const minInv = computeMinInvestment(ipo.lotSize, ipo.issuePrice);

  return {
    symbol: ipo.symbol,
    companyName: ipo.companyName,
    logo: null,
    industry: ipo.industry || null,
    sector: null,
    ipoType: ipoType(ipo),
    issueSize: ipo.issueSize || null,
    priceBand: ipo.issuePrice || null,
    lotSize: ipo.lotSize ?? null,
    minInvestment: minInv,
    exchange: ipo.exchange || "NSE",
    openDate: ipo.issueStartDate || null,
    closeDate: ipo.issueEndDate || null,
    allotmentDate: null,
    listingDate: ipo.listingDate || null,
    status: ipo.status,
    category: ipo.status === "Active" || extras.isOpen ? "open" : ipo.listingDate ? "listed" : "upcoming",
    subscription: subscription
      ? {
          overall: subscription.overall,
          retail: subscription.retail,
          hni: subscription.hni,
          qib: subscription.qib,
          employee: subscription.employee,
        }
      : ipo.overallSubscription != null
        ? { overall: { available: true, value: ipo.overallSubscription, display: `${ipo.overallSubscription}x`, source: "NSE" } }
        : null,
    listedPerformance: listedEnriched
      ? {
          currentPrice: listedEnriched.currentMarketPrice,
          listingGainLoss: listedEnriched.listingGainLoss,
        }
      : null,
    lastUpdated: extras.fetchedAt || new Date().toISOString(),
    source: ipo.source,
  };
}

async function buildInstitutionalIpoDetail(symbol) {
  const found = await findIpoInDashboard(symbol);
  if (!found) {
    return { available: false, message: `${IPO_UNAVAILABLE_MSG} Symbol not in NSE IPO feeds.` };
  }

  const { dashboard, ipo } = found;
  let subscription = null;
  let detail = null;

  try {
    detail = await fetchIpoDetail(symbol);
    subscription = detail.subscription;
  } catch {
    subscription = null;
  }

  const isOpen = dashboard.open.some((i) => i.symbol === symbol);
  const isListed = dashboard.listed.some((i) => i.symbol === symbol);
  let listedEnriched = null;
  if (isListed) listedEnriched = await enrichListedPrice(ipo);

  const card = buildIpoCard(ipo, { subscription, listedEnriched, isOpen, fetchedAt: dashboard.fetchedAt });
  const scorecard = buildScorecard(ipo, subscription, listedEnriched);
  const recommendation = buildRecommendation(ipo, subscription, listedEnriched);

  return {
    available: true,
    symbol,
    refreshedAt: new Date().toISOString(),
    card,
    executiveSummary: {
      ipoScore: scorecard.overallScore,
      recommendation: recommendation.recommendation,
      confidence: recommendation.confidence,
      riskLevel: recommendation.riskLevel,
      horizon: recommendation.horizon,
      thesis: recommendation.thesis,
    },
    recommendation,
    scorecard,
    subscription: subscription || { overall: { available: false, display: AWAITING } },
    fundamentals: {
      available: false,
      message: AWAITING,
      metrics: {
        revenueTrend: null,
        profitTrend: null,
        ebitdaTrend: null,
        epsTrend: null,
        operatingMargin: null,
        netMargin: null,
        roe: null,
        roce: null,
        debtToEquity: null,
        cashFlow: null,
        assetGrowth: null,
        borrowings: null,
      },
      bullets: [
        "Revenue, profit, and margin trends require verified DRHP/RHP financial statements",
        "Promoter background and business model require official prospectus feed",
        AWAITING,
      ],
    },
    financialCharts: { available: false, message: AWAITING, series: null },
    valuation: {
      available: false,
      ipoPrice: parsePriceMid(ipo.issuePrice),
      message: AWAITING,
      rating: null,
      peerPremium: null,
      industryPe: null,
    },
    peers: { available: false, message: AWAITING, peers: [], highlights: null },
    industryOutlook: {
      available: !!ipo.industry,
      industry: ipo.industry,
      outlook: ipo.industry ? "Neutral" : null,
      bullets: ipo.industry
        ? [`NSE industry classification: ${ipo.industry}`, "Detailed industry growth statistics require licensed research feed", AWAITING]
        : [AWAITING],
    },
    risks: {
      bullets: [
        subscription?.overall?.value != null && subscription.overall.value < 1
          ? "Weak subscription — demand risk"
          : "Subscription risk: monitor official NSE book",
        "Financial statement risk: unverified without DRHP feed",
        "Valuation risk: multiples unavailable from verified sources",
        "New listing liquidity risk",
        ipoType(ipo) === "SME" ? "SME segment — higher volatility and lower liquidity" : null,
      ].filter(Boolean),
    },
    prospectus: {
      available: false,
      leadManagers: ipo.leadManagers || null,
      registrar: ipo.registrar || null,
      message: "Full DRHP/RHP sections require official filing integration",
    },
    listedPerformance: listedEnriched,
    disclaimer: "Not investment advice. Verify all data with NSE, BSE, SEBI, and official RHP/DRHP before investing.",
  };
}

async function buildInstitutionalIpoDashboard() {
  const raw = await fetchIpoDashboard();
  const [openEnriched, listedFiltered] = await Promise.all([
    enrichOpenWithSubscription(raw.open),
    Promise.all(filterListedLast30Days(raw.listed).map(enrichListedPrice)),
  ]);

  const listedSymbols = new Set(listedFiltered.map((i) => i.symbol));
  const openSymbols = new Set(openEnriched.map((i) => i.symbol));

  const upcoming = sortByOpenDate(
    raw.upcoming.filter((u) => !openSymbols.has(u.symbol) && !listedSymbols.has(u.symbol))
  );
  const open = sortByOpenDate(openEnriched);
  const listed = sortByOpenDate(listedFiltered);

  const allCards = [
    ...open.map((ipo) => ({ ...buildIpoCard(ipo, { subscription: ipo.subscription, isOpen: true, fetchedAt: raw.fetchedAt }), section: "open" })),
    ...upcoming.map((ipo) => ({ ...buildIpoCard(ipo, { fetchedAt: raw.fetchedAt }), section: "upcoming" })),
    ...listed.map((ipo) => ({
      ...buildIpoCard(ipo, { listedEnriched: ipo, fetchedAt: raw.fetchedAt }),
      section: "listed",
    })),
  ];

  return {
    available: true,
    title: "IPO Research Center",
    subtitle: "Upcoming · Open · Recently listed (30 days) — NSE verified data only",
    refreshedAt: raw.fetchedAt,
    source: "NSE India IPO APIs",
    executiveSummary: {
      openCount: open.length,
      upcomingCount: upcoming.length,
      listedCount: listed.length,
      dataStatus: raw.dataStatus,
    },
    sections: {
      open: open.map((ipo) => buildIpoCard(ipo, { subscription: ipo.subscription, isOpen: true, fetchedAt: raw.fetchedAt })),
      upcoming: upcoming.map((ipo) => buildIpoCard(ipo, { fetchedAt: raw.fetchedAt })),
      listed: listed.map((ipo) => buildIpoCard(ipo, { listedEnriched: ipo, fetchedAt: raw.fetchedAt })),
    },
    allIpos: allCards,
    counts: { open: open.length, upcoming: upcoming.length, listed: listed.length },
    disclaimer: "GMP never displayed without verified source. Financial and valuation metrics require DRHP/RHP feed.",
  };
}

module.exports = {
  buildInstitutionalIpoDashboard,
  buildInstitutionalIpoDetail,
  filterListedLast30Days,
  sortByOpenDate,
};