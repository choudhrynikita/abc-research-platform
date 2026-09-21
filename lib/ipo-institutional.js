const {
  fetchIpoDashboard,
  fetchIpoDetail,
  findIpoInDashboard,
  enrichOpenWithSubscription,
  enrichWithDetail,
  mergeIpoDetail,
  nseNumber,
  nseRhpArchiveUrl,
} = require("./nse-ipo");
const { enrichListedPrice } = require("./ipo-research");
const { IPO_UNAVAILABLE_MSG } = require("./format");
const { parseIssueComposition, mergeIssueBreakdown, mainBookRows } = require("./ipo-prospectus");
const { loadProspectusDossier } = require("./ipo-rhp");

const NSE_NOT_PUBLISHED = "Not published by NSE";

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

function computeMinInvestment(lotSize, priceBand, explicit) {
  if (explicit != null && Number.isFinite(Number(explicit))) return Number(explicit);
  const mid = parsePriceMid(priceBand);
  if (lotSize == null || mid == null) return null;
  return Number((Number(lotSize) * mid).toFixed(2));
}

function ipoType(ipo) {
  const s = `${ipo.series || ""} ${ipo.securityType || ""} ${ipo.category || ""} ${ipo.ipoType || ""}`.toUpperCase();
  if (s.includes("SME")) return "SME";
  return "Mainboard";
}

function parseLooseDate(value) {
  if (!value) return null;
  const t = new Date(value).getTime();
  if (!Number.isNaN(t)) return t;
  const m = String(value).match(/(\d{1,2})[- ]([A-Za-z]{3})[- ](\d{4})/);
  if (!m) return null;
  return new Date(`${m[2]} ${m[1]}, ${m[3]}`).getTime();
}

function filterListedLast30Days(listed) {
  const cutoff = Date.now() - 30 * 86400000;
  return listed.filter((ipo) => {
    const listing = parseLooseDate(ipo.listingDate);
    if (listing && listing >= cutoff) return true;
    const ended = parseLooseDate(ipo.issueEndDate);
    return Boolean(ended && ended >= cutoff);
  });
}

function sortByOpenDate(ipos) {
  return [...ipos].sort((a, b) => {
    const da = a.issueStartDate ? parseLooseDate(a.issueStartDate) : Number.MAX_SAFE_INTEGER;
    const db = b.issueStartDate ? parseLooseDate(b.issueStartDate) : Number.MAX_SAFE_INTEGER;
    if (da !== db) return (da || 0) - (db || 0);
    return (a.companyName || "").localeCompare(b.companyName || "");
  });
}

function demandScore(times) {
  if (times == null || Number.isNaN(times)) return null;
  if (times < 1) return 22;
  if (times < 3) return 45;
  if (times < 10) return 62;
  if (times < 20) return 78;
  if (times < 40) return 88;
  return 94;
}

function buildScorecard(ipo, subscription, listedEnriched) {
  const dimensions = [];
  const overallTimes = subscription?.overall?.value;
  const qibTimes = subscription?.qib?.value;
  const retailTimes = subscription?.retail?.value;

  if (overallTimes != null) {
    dimensions.push({
      key: "demand",
      label: "Subscription Demand",
      available: true,
      score: demandScore(overallTimes),
      note: `NSE overall book ${subscription.overall.display}`,
    });
  }
  if (qibTimes != null) {
    dimensions.push({
      key: "qib",
      label: "QIB Demand",
      available: true,
      score: demandScore(qibTimes),
      note: `QIB ${subscription.qib.display}`,
    });
  }
  if (retailTimes != null) {
    dimensions.push({
      key: "retail",
      label: "Retail Demand",
      available: true,
      score: demandScore(retailTimes),
      note: `Retail ${subscription.retail.display}`,
    });
  }

  const type = ipoType(ipo);
  dimensions.push({
    key: "structure",
    label: "Issue Structure",
    available: true,
    score: type === "SME" ? 42 : 72,
    note: `${type} · ${ipo.issueType || "NSE issue"}`,
  });

  if (overallTimes != null) {
    dimensions.push({
      key: "risk",
      label: "Demand Risk",
      available: true,
      score: overallTimes < 1 ? 78 : overallTimes < 3 ? 55 : 32,
      note: overallTimes < 1 ? "Subscribed below 1x" : overallTimes < 3 ? "Moderate book" : "Covered book",
    });
  }

  if (listedEnriched?.listingGainLoss?.available) {
    const gain = listedEnriched.listingGainLoss.value;
    dimensions.push({
      key: "listingGain",
      label: "Listing Outcome",
      available: true,
      score: gain >= 0 ? Math.min(100, 50 + gain) : Math.max(0, 50 + gain),
      note: `Post-listing: ${listedEnriched.listingGainLoss.display}`,
    });
  } else if (overallTimes != null) {
    dimensions.push({
      key: "listingGain",
      label: "Listing Bias (book)",
      available: true,
      score: demandScore(overallTimes),
      note: "Inferred from NSE subscription only — not GMP",
    });
  }

  const verified = dimensions.filter((d) => d.available && d.score != null);
  const overallScore = verified.length
    ? Math.round(verified.reduce((a, d) => a + d.score, 0) / verified.length)
    : null;

  return {
    dimensions,
    overallScore,
    methodology: "Average of NSE-verified dimensions only (bid book, issue type, listing). DRHP P&L is linked, not scored.",
  };
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
    evidence.push(`Overall subscription ${subscription.overall.display} (NSE bid book)`);
    if (subscription.qib?.available) evidence.push(`QIB ${subscription.qib.display}`);
    if (subscription.retail?.available) evidence.push(`Retail ${subscription.retail.display}`);
    if (ov >= 10) {
      recommendation = "Buy for Listing Gains";
      confidence = Math.min(88, 60 + ov);
      thesis.push("Heavy NSE bid-book coverage — listing demand is strong on official numbers");
    } else if (ov >= 3) {
      recommendation = "Buy for Listing Gains";
      confidence = Math.min(78, 55 + ov * 2);
      thesis.push("Subscription is comfortably above 3x on the NSE book");
    } else if (ov < 1) {
      recommendation = "Avoid";
      confidence = 68;
      riskLevel = "High";
      thesis.push("Subscribed below 1x on NSE — weak official demand");
    } else {
      recommendation = "Neutral / Watch";
      confidence = 52;
      thesis.push("Moderate subscription — wait for the last-day book before sizing");
    }
  } else {
    thesis.push("Bid book not published yet — plan from issue terms only");
  }

  if (ipo.issueSnapshot?.issueSizeDisplay) thesis.push(`Issue size ${ipo.issueSnapshot.issueSizeDisplay}`);
  else if (ipo.issueSize) thesis.push(`Issue size ${ipo.issueSize}`);
  if (ipo.issuePrice) thesis.push(`Price band ${ipo.issuePrice}`);
  if (ipo.lotSize) thesis.push(`Bid lot ${ipo.lotSize} shares`);
  if (ipoType(ipo) === "SME") {
    riskLevel = riskLevel === "High" ? "High" : "Elevated";
    thesis.push("SME issue — thinner liquidity after listing");
  }

  if (listedEnriched?.listingGainLoss?.available) {
    horizon = "Post-listing";
    evidence.push(`Listed performance ${listedEnriched.listingGainLoss.display}`);
  }

  return {
    recommendation,
    confidence,
    riskLevel,
    horizon,
    thesis: thesis.slice(0, 6),
    evidence,
    longTermNote: "Long-term fundamental call needs the RHP P&L. NSE publishes the RHP zip on the issue page — linked below when available.",
  };
}

function displayOrNull(value) {
  if (value == null || value === "" || value === NSE_NOT_PUBLISHED) return null;
  return value;
}

function formatPriceBand(value) {
  if (value == null || value === "") return null;
  const text = String(value).trim();
  if (!text || text === NSE_NOT_PUBLISHED) return null;
  if (/₹|Rs\.?/i.test(text)) return text;
  if (/^\d+(\.\d+)?$/.test(text)) return `₹${text}`;
  return text;
}

function buildIpoCard(ipo, extras = {}) {
  const subscription = extras.subscription || ipo.subscription;
  const listedEnriched = extras.listedEnriched;
  const snap = ipo.issueSnapshot || {};
  const lotSize = snap.lotSize ?? ipo.lotSize ?? null;
  const priceBand = formatPriceBand(snap.priceRange || ipo.issuePrice || ipo.priceRange || null);
  const minInv = computeMinInvestment(lotSize, priceBand, snap.minInvestment ?? ipo.minInvestment);

  return {
    symbol: ipo.symbol,
    companyName: ipo.companyName,
    logo: null,
    industry: displayOrNull(ipo.industry),
    sector: displayOrNull(ipo.industry),
    ipoType: ipoType(ipo),
    issueType: snap.issueType || null,
    issueSize: snap.issueSizeDisplay || displayOrNull(ipo.issueSize),
    issueSizeCrore: snap.issueSizeCrore ?? ipo.issueSizeCrore ?? null,
    priceBand,
    lotSize,
    faceValue: snap.faceValue ?? ipo.faceValue ?? null,
    minInvestment: minInv,
    exchange: ipo.exchange || "NSE",
    openDate: snap.issueStartDate || ipo.issueStartDate || null,
    closeDate: snap.issueEndDate || ipo.issueEndDate || null,
    allotmentDate: null,
    listingDate: ipo.listingDate || null,
    leadManagers: snap.leadManagers || ipo.leadManagers || null,
    registrar: snap.registrar || ipo.registrar || null,
    status: ipo.status,
    category: extras.isOpen ? "open" : (extras.isListed || ipo.listingDate ? "listed" : "upcoming"),
    subscription: subscription
      ? {
          overall: subscription.overall,
          retail: subscription.retail,
          hni: subscription.hni,
          nii: subscription.nii,
          qib: subscription.qib,
          employee: subscription.employee,
        }
      : ipo.overallSubscription != null && nseNumber(ipo.sharesOffered) > 0
        ? { overall: { available: true, value: ipo.overallSubscription, display: `${ipo.overallSubscription}x`, source: "NSE" } }
        : { overall: { available: false, value: null, display: null, source: "NSE" } },
    listedPerformance: listedEnriched
      ? {
          currentPrice: listedEnriched.currentMarketPrice,
          listingGainLoss: listedEnriched.listingGainLoss,
        }
      : null,
    documents: ipo.documents || [],
    issueSnapshot: snap,
    lastUpdated: extras.fetchedAt || new Date().toISOString(),
    source: ipo.source,
  };
}

function snapshotFields(ipo, card) {
  const snap = ipo.issueSnapshot || {};
  const breakdown = ipo.issueBreakdown;
  return [
    { label: "Price band", value: card.priceBand },
    { label: "Price source", value: snap.priceSource === "NSE bid ladder" ? "NSE bid ladder — SME issue-info page is empty" : null, wide: true },
    { label: "Face value", value: snap.faceValue != null ? `₹${snap.faceValue}` : null },
    { label: "Bid lot", value: card.lotSize != null ? `${Number(card.lotSize).toLocaleString("en-IN")} shares` : null },
    { label: "Min. investment", value: card.minInvestment != null ? `₹${Number(card.minInvestment).toLocaleString("en-IN")}` : null },
    { label: "Issue size", value: card.issueSize },
    { label: "Fresh issue", value: breakdown ? null : (snap.freshLabel || null) },
    { label: "Offer for sale", value: breakdown ? null : (snap.ofsLabel || null) },
    { label: "Shares offered", value: snap.sharesOffered != null ? Number(snap.sharesOffered).toLocaleString("en-IN") : null },
    { label: "Issue type", value: snap.issueType || card.ipoType },
    { label: "Open", value: card.openDate },
    { label: "Close", value: card.closeDate },
    { label: "Listing", value: card.listingDate },
    { label: "Industry", value: card.industry, wide: true },
    { label: "Lead managers", value: card.leadManagers, wide: true },
    { label: "Registrar", value: card.registrar, wide: true },
    { label: "Sponsor bank", value: snap.sponsorBank, wide: true },
    { label: "Retail max", value: snap.retailMaxAmount },
    { label: "ISIN", value: ipo.isin },
  ].filter((row) => row.value);
}

function buildRisks(ipo, subscription) {
  const bullets = [];
  const ov = subscription?.overall?.value;
  if (ov != null && ov < 1) bullets.push(`Weak official book: overall subscription ${subscription.overall.display}`);
  else if (ov != null && ov < 3) bullets.push(`Only moderate coverage at ${subscription.overall.display} — last-day bids can still swing allotment`);
  else if (ov != null) bullets.push(`Book is covered at ${subscription.overall.display} — still a new listing, liquidity can gap`);
  else bullets.push("Subscription not yet on the NSE book — do not size from unofficial GMP");
  if (ipoType(ipo) === "SME") bullets.push("SME segment: wider spreads and lower post-listing liquidity");
  if (ipo.issueSnapshot?.upiCutoff) bullets.push(`UPI mandate cut-off: ${ipo.issueSnapshot.upiCutoff.split("The new")[0].trim()}`);
  bullets.push("GMP is not used. All numbers are from NSE issue info and the live bid book.");
  if (ipo.documents?.some((d) => d.key === "rhp")) {
    bullets.push("Read the RHP (linked below) for promoter, related-party and financial-statement risk before a long-term call");
  }
  return { bullets };
}

async function listedFinancials(ipo) {
  if (!ipo?.symbol || !ipo.listingDate) return { available: false, metrics: [] };
  try {
    const { fetchFundamentals } = require("./fundamentals");
    const fund = await fetchFundamentals(`${ipo.symbol}.NS`);
    if (!fund) return { available: false, metrics: [] };
    const pick = (obj, ...keys) => {
      for (const key of keys) {
        const m = obj?.[key];
        if (m?.available && m.value != null) return m;
      }
      return null;
    };
    const metrics = [
      { label: "Market cap", metric: pick(fund, "marketCap") },
      { label: "Trailing P/E", metric: pick(fund, "trailingPE", "pe") },
      { label: "Price / Book", metric: pick(fund, "priceToBook") },
      { label: "Revenue", metric: pick(fund, "totalRevenue", "revenue") },
      { label: "Profit margin", metric: pick(fund, "profitMargins", "netMargin") },
      { label: "ROE", metric: pick(fund, "returnOnEquity") },
      { label: "Debt / Equity", metric: pick(fund, "debtToEquity") },
    ]
      .filter((row) => row.metric?.available)
      .map((row) => ({
        label: row.label,
        value: row.metric.display ?? row.metric.value,
        source: row.metric.source,
      }));
    return {
      available: metrics.length > 0,
      metrics,
      source: "Yahoo Finance quoteSummary (post-listing)",
    };
  } catch {
    return { available: false, metrics: [] };
  }
}

async function buildInstitutionalIpoDetail(symbol) {
  const found = await findIpoInDashboard(symbol);
  if (!found) {
    return { available: false, message: `${IPO_UNAVAILABLE_MSG} Symbol not in NSE IPO feeds.` };
  }

  const { dashboard, ipo: listedIpo } = found;
  let ipo = listedIpo;
  let detail = null;

  try {
    detail = await fetchIpoDetail(symbol, ipo);
    ipo = mergeIpoDetail(ipo, detail);
  } catch {
    detail = null;
  }

  const isOpen = dashboard.open.some((i) => i.symbol === symbol);
  const isListed = dashboard.listed.some((i) => i.symbol === symbol) || Boolean(ipo.listingDate);
  let listedEnriched = null;
  if (isListed) listedEnriched = await enrichListedPrice(ipo);

  const subscription = ipo.subscription || (ipo.overallSubscription != null && nseNumber(ipo.sharesOffered) > 0
    ? { overall: { available: true, value: ipo.overallSubscription, display: `${Number(ipo.overallSubscription).toFixed(2)}x`, source: "NSE" } }
    : null);

  const card = buildIpoCard(ipo, { subscription, listedEnriched, isOpen, fetchedAt: dashboard.fetchedAt });
  const scorecard = buildScorecard(ipo, subscription, listedEnriched);
  const recommendation = buildRecommendation(ipo, subscription, listedEnriched);
  const financials = isListed ? await listedFinancials(ipo) : { available: false, metrics: [] };
  const rhp = (ipo.documents || []).find((d) => d.key === "rhp")
    || (nseRhpArchiveUrl(symbol) ? { key: "rhp", title: "Red Herring Prospectus", url: nseRhpArchiveUrl(symbol) } : null);
  const ratios = (ipo.documents || []).find((d) => d.key === "ratios");

  let prospectusDossier = { available: false };
  try {
    prospectusDossier = await loadProspectusDossier({ symbol, rhpUrl: rhp?.url });
  } catch {
    prospectusDossier = { available: false };
  }

  const issueBreakdown = mergeIssueBreakdown(
    prospectusDossier.issueBreakdown,
    parseIssueComposition(ipo.issueSizeText || ipo.issueSnapshot?.issueSizeText, card.issueSizeCrore)
  );
  if (issueBreakdown) ipo.issueBreakdown = issueBreakdown;
  if (issueBreakdown?.totalLabel) {
    card.issueSize = issueBreakdown.totalLabel;
    card.issueSizeCrore = issueBreakdown.totalCrore;
  }
  const fields = snapshotFields(ipo, card);

  if (prospectusDossier.financials) {
    recommendation.longTermNote = "Restated P&L is from the NSE-hosted RHP (shown above). That is not a buy/sell call. Verify with NSE, SEBI and a CA.";
  }

  const bookRows = mainBookRows(subscription?.categories || []);
  const companyRisks = prospectusDossier.risks || [];
  const demandRisks = buildRisks(ipo, subscription);
  const riskBullets = companyRisks.length
    ? [...companyRisks, ...demandRisks.bullets.filter((b) => /GMP|SME segment/i.test(b))]
    : demandRisks.bullets;
  let documents = ipo.documents || [];
  if (prospectusDossier.rhpUrl && !documents.some((d) => d.key === "rhp")) {
    documents = [{ key: "rhp", title: "Red Herring Prospectus", url: prospectusDossier.rhpUrl }, ...documents];
  }

  return {
    available: true,
    symbol,
    refreshedAt: new Date().toISOString(),
    card,
    executiveSummary: {
      ipoScore: scorecard.overallScore,
      recommendation: recommendation.recommendation,
      confidence: Math.round(Number(recommendation.confidence) || 0),
      riskLevel: recommendation.riskLevel,
      horizon: recommendation.horizon,
      thesis: recommendation.thesis,
    },
    recommendation,
    scorecard,
    subscription: subscription
      ? { ...subscription, bookRows }
      : { overall: { available: false, display: null, source: "NSE" }, bookRows },
    snapshot: { available: fields.length > 0, fields },
    documents,
    issueBreakdown,
    company: {
      available: Boolean(
        prospectusDossier.about
        || prospectusDossier.operations
        || prospectusDossier.financials
        || (prospectusDossier.strengths || []).length
        || (prospectusDossier.risks || []).length
        || prospectusDossier.sector
        || issueBreakdown
      ),
      about: prospectusDossier.about || null,
      operations: prospectusDossier.operations || null,
      strengths: prospectusDossier.strengths || [],
      risks: companyRisks,
      financials: prospectusDossier.financials || null,
      utilisation: prospectusDossier.objects || null,
      issueBreakdown,
      sector: prospectusDossier.sector || null,
      source: prospectusDossier.source || (issueBreakdown ? issueBreakdown.source : null),
      rhpUrl: prospectusDossier.rhpUrl || rhp?.url || null,
      message: prospectusDossier.about
        ? "Company write-up, restated financials, objects and risks are from the NSE-hosted Red Herring Prospectus."
        : rhp
          ? "RHP zip is on NSE. If the company section is empty this session, open the prospectus link — we do not copy unofficial IPO blogs."
          : "NSE has not published this issue's RHP zip yet. Bid book and issue terms above are from the live NSE feed. Company P&L, objects and business write-up appear here once the official prospectus is up.",
    },
    fundamentals: {
      available: financials.available || Boolean(prospectusDossier.financials),
      message: financials.available
        ? "Post-listing financials from Yahoo Finance"
        : prospectusDossier.financials
          ? "Restated financials from the NSE-hosted Red Herring Prospectus."
          : "NSE does not publish DRHP P&L as API fields. Restated numbers are read from the official RHP when the zip is on NSE.",
      metrics: financials.metrics,
      years: prospectusDossier.financials?.years || [],
      analysis: prospectusDossier.financials?.analysis || [],
    },
    financialCharts: {
      available: false,
      message: "Price-level bid ladder is not shown. Subscription times are from the NSE category book.",
    },
    valuation: {
      available: Boolean(card.priceBand || card.minInvestment || ratios),
      ipoPrice: parsePriceMid(card.priceBand),
      priceBand: card.priceBand,
      faceValue: card.faceValue,
      minInvestment: card.minInvestment,
      issueSize: card.issueSize,
      ratiosUrl: ratios?.url || null,
      message: ratios
        ? "NSE basis-of-issue-price file is linked. Multiples are not computed from an unofficial feed."
        : "Valuation multiples need the RHP. Price band, lot and issue size are from NSE issue info.",
    },
    peers: { available: false, message: null, peers: [] },
    industryOutlook: prospectusDossier.sector
      ? {
        available: true,
        industry: card.industry || "India beer and malt-spirit process equipment",
        outlook: prospectusDossier.sector.overview,
        bullets: [
          prospectusDossier.sector.overview,
          prospectusDossier.sector.competition,
          prospectusDossier.sector.stand,
        ].filter(Boolean),
      }
      : {
        available: Boolean(card.industry),
        industry: card.industry,
        outlook: card.industry ? "See RHP industry section" : null,
        bullets: card.industry
          ? [`NSE industry tag: ${card.industry}`, rhp ? `Industry discussion is in the RHP: ${rhp.url}` : "Full industry write-up is in the RHP, not the IPO JSON feed"]
          : [],
      },
    risks: { bullets: riskBullets, source: companyRisks.length ? "RHP risk factors + NSE bid book" : "NSE bid book" },
    prospectus: {
      available: Boolean(card.leadManagers || card.registrar || rhp),
      leadManagers: card.leadManagers,
      registrar: card.registrar,
      sponsorBank: ipo.issueSnapshot?.sponsorBank,
      rhpUrl: rhp?.url || null,
      message: rhp ? "Official RHP is hosted by NSE." : "RHP zip is published on the NSE issue page when the issue opens.",
    },
    listedPerformance: listedEnriched,
    disclaimer: "Not investment advice. Verify with NSE, BSE, SEBI and the official RHP/DRHP before investing.",
  };
}

async function buildInstitutionalIpoDashboard() {
  const raw = await fetchIpoDashboard();
  const [openEnriched, upcomingEnriched, listedFiltered] = await Promise.all([
    enrichOpenWithSubscription(raw.open),
    enrichWithDetail(raw.upcoming),
    Promise.all(filterListedLast30Days(raw.listed).map(enrichListedPrice)),
  ]);

  const listedSymbols = new Set(listedFiltered.map((i) => i.symbol));
  const openSymbols = new Set(openEnriched.map((i) => i.symbol));

  const upcoming = sortByOpenDate(
    upcomingEnriched.filter((u) => !openSymbols.has(u.symbol) && !listedSymbols.has(u.symbol))
  );
  const open = sortByOpenDate(openEnriched);
  const listed = sortByOpenDate(listedFiltered);

  return {
    available: true,
    title: "IPO Research Center",
    subtitle: "Upcoming · Open · Recently listed — NSE issue info + live bid book",
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
      listed: listed.map((ipo) => buildIpoCard(ipo, { listedEnriched: ipo, isListed: true, fetchedAt: raw.fetchedAt })),
    },
    allIpos: [
      ...open.map((ipo) => ({ ...buildIpoCard(ipo, { subscription: ipo.subscription, isOpen: true, fetchedAt: raw.fetchedAt }), section: "open" })),
      ...upcoming.map((ipo) => ({ ...buildIpoCard(ipo, { fetchedAt: raw.fetchedAt }), section: "upcoming" })),
      ...listed.map((ipo) => ({ ...buildIpoCard(ipo, { listedEnriched: ipo, isListed: true, fetchedAt: raw.fetchedAt }), section: "listed" })),
    ],
    counts: { open: open.length, upcoming: upcoming.length, listed: listed.length },
    disclaimer: "GMP is never displayed. Lot size, price band, bid book and RHP links come from NSE issue APIs.",
  };
}

module.exports = {
  buildInstitutionalIpoDashboard,
  buildInstitutionalIpoDetail,
  filterListedLast30Days,
  sortByOpenDate,
  parseIssueSizeCrore: require("./nse-ipo").parseIssueSizeCrore,
  parseIssueComposition,
  mainBookRows,
};
