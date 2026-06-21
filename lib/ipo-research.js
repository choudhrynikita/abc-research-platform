const { fetchChart } = require("./yahoo");
const { fetchIpoDashboard, fetchIpoDetail } = require("./nse-ipo");
const { appendSubscriptionSnapshot, getSubscriptionHistory } = require("./ipo-history");
const { unavailableField, IPO_UNAVAILABLE_MSG, fmt, noNullRows, metricMeta } = require("./format");
const { computeConfidence, field } = require("./confidence");
const { buildAuditTrail, dataSourcesSection, assumptionsSection } = require("./traceability");

const GMP_DISCLAIMER =
  "GMP is unofficial and may not predict listing performance. Never used for scoring when unverified.";

function u(reason) {
  return unavailableField(reason || IPO_UNAVAILABLE_MSG);
}

function disp(metric) {
  if (!metric) return "Verified IPO data unavailable.";
  return metric.available ? metric.display ?? metric.value : metric.display || "Verified IPO data unavailable.";
}

async function enrichListedPrice(listed) {
  const sym = `${listed.symbol}.NS`;
  try {
    const chart = await fetchChart(sym, "1d", "3mo");
    const price = chart.meta.regularMarketPrice ?? chart.candles.at(-1)?.close ?? null;
    const issue = Number(listed.issuePrice);
    let listingGainLoss = null;
    if (price != null && issue) {
      listingGainLoss = Number((((price - issue) / issue) * 100).toFixed(2));
    }
    return {
      ...listed,
      currentMarketPrice: { available: price != null, value: price, display: price, source: "Yahoo Finance Chart API" },
      listingGainLoss: { available: listingGainLoss != null, value: listingGainLoss, display: listingGainLoss != null ? `${listingGainLoss}%` : null, source: "Computed from verified issue price + live price" },
      listingPrice: u("Listing day open price not available from NSE past-issues feed"),
    };
  } catch {
    return {
      ...listed,
      currentMarketPrice: u("Live market price unavailable — symbol may not be active on Yahoo feed"),
      listingGainLoss: u("Cannot compute without verified current price"),
      listingPrice: u("Listing day open price not in NSE feed"),
    };
  }
}

function subscriptionAssessment(sub) {
  const overall = sub?.overall?.value;
  if (overall == null) return { listing: "Unavailable", longTerm: "Unavailable", evidence: [IPO_UNAVAILABLE_MSG] };
  const evidence = [`Overall subscription ${overall.toFixed(2)}x from NSE bidDetails`];
  let listing = "Neutral";
  if (overall >= 3) listing = "Favorable";
  else if (overall < 1) listing = "Unfavorable";
  return { listing, longTerm: "Neutral", evidence };
}

function buildScorecard(ctx) {
  const scores = [];
  const add = (name, available, score, evidence) => {
    scores.push({ name, available, score: available ? score : null, display: available ? score : "Verified IPO data unavailable.", evidence });
  };

  add("Subscription Demand", ctx.subscription?.overall?.available, ctx.subscription?.overall?.value != null ? Math.min(100, ctx.subscription.overall.value * 25) : null, ctx.subscription?.overall?.display);
  add("Business Quality", false, null, IPO_UNAVAILABLE_MSG);
  add("Financial Strength", false, null, "Financial statements not available from NSE IPO feed");
  add("Valuation", false, null, "PE/PB/EV metrics not available from verified feed");
  add("Industry Outlook", false, null, "Industry analysis feed not connected");
  add("Risk Profile", ctx.subscription?.overall?.available, ctx.subscription?.overall?.value != null && ctx.subscription.overall.value < 1 ? 70 : 40, "Based on subscription + unavailable financial risk data");

  const availableScores = scores.filter((s) => s.available && s.score != null);
  const composite = availableScores.length
    ? Number((availableScores.reduce((a, s) => a + s.score, 0) / availableScores.length).toFixed(1))
    : null;

  return {
    methodology: "Weighted average of dimensions with verified data only. Missing dimensions excluded — never estimated.",
    scores,
    composite,
    source: "ABC IPO scorecard engine",
  };
}

async function buildIpoResearchReport(symbol) {
  const dashboard = await fetchIpoDashboard();
  const ipo =
    dashboard.open.find((i) => i.symbol === symbol) ||
    dashboard.upcoming.find((i) => i.symbol === symbol) ||
    dashboard.listed.find((i) => i.symbol === symbol);

  if (!ipo) {
    throw new Error(`${IPO_UNAVAILABLE_MSG} (Symbol ${symbol} not found in NSE IPO feeds)`);
  }

  let detail = null;
  let subscription = null;
  let subHistory = [];

  try {
    detail = await fetchIpoDetail(symbol);
    subscription = detail.subscription;
    subHistory = appendSubscriptionSnapshot(symbol, subscription, { status: ipo.status });
    subHistory = getSubscriptionHistory(symbol);
  } catch {
    subscription = {
      overall: u(),
      retail: u(),
      hni: u(),
      qib: u(),
      employee: u(),
    };
  }

  let listedEnriched = null;
  if (dashboard.listed.some((l) => l.symbol === symbol)) {
    listedEnriched = await enrichListedPrice(ipo);
  }

  const assessment = subscriptionAssessment(subscription);
  const scorecard = buildScorecard({ subscription, ipo });

  const confidence = computeConfidence({
    fields: [
      field("nseMeta", !!ipo.companyName, "NSE"),
      field("subscription", subscription?.overall?.available, "NSE ipo-detail"),
      field("issueDates", !!ipo.issueStartDate, "NSE"),
      field("financials", false, "DRHP feed"),
    ],
    alignment: subscription?.overall?.available ? 70 : 40,
  });

  const fetchedAt = dashboard.fetchedAt;

  const sections = [
    {
      title: "Cover Page",
      dataType: "verified",
      content: `${ipo.companyName} (${symbol}) — Institutional IPO Research Report. Exchange: NSE. Generated ${new Date().toLocaleString()}.`,
    },
    {
      title: "Executive Summary",
      dataType: "model-opinion",
      content: `${ipo.companyName} IPO on NSE. Price band: ${ipo.issuePrice || "Verified IPO data unavailable."}. Status: ${ipo.status}.`,
      bullets: [
        `Issue size: ${ipo.issueSize || "Verified IPO data unavailable."}`,
        `Open: ${ipo.issueStartDate || "—"} — Close: ${ipo.issueEndDate || "—"}`,
        `Listing assessment (subscription-based): ${assessment.listing}`,
        `Key risk: Financial fundamentals unavailable from verified feed — due diligence limited to NSE issue data`,
      ],
    },
    {
      title: "IPO Snapshot",
      dataType: "verified",
      table: {
        headers: ["Field", "Value", "Source"],
        rows: noNullRows([
          ["Company", ipo.companyName, ipo.source],
          ["Symbol", symbol, "NSE"],
          ["Price Band", ipo.issuePrice, ipo.source],
          ["Issue Size", ipo.issueSize, ipo.source],
          ["Lot Size", ipo.lotSize || "Verified IPO data unavailable.", ipo.source],
          ["Open Date", ipo.issueStartDate, ipo.source],
          ["Close Date", ipo.issueEndDate, ipo.source],
          ["Listing Date", ipo.listingDate || "Verified IPO data unavailable.", ipo.source],
          ["Lead Managers", ipo.leadManagers || "Verified IPO data unavailable.", "—"],
          ["Registrar", ipo.registrar || "Verified IPO data unavailable.", "—"],
        ]),
      },
    },
    {
      title: "Industry Analysis",
      dataType: "unavailable",
      content: ipo.industry ? `Industry tag from feed: ${ipo.industry}. Detailed industry analysis requires licensed research feed.` : IPO_UNAVAILABLE_MSG,
    },
    {
      title: "Company Analysis",
      dataType: "unavailable",
      bullets: [
        `Business model: ${disp(u("DRHP/business description feed unavailable"))}`,
        `Revenue streams: ${disp(u())}`,
        `Market share: ${disp(u())}`,
        `Geographic presence: ${disp(u())}`,
      ],
    },
    {
      title: "Management Analysis",
      dataType: "unavailable",
      content: IPO_UNAVAILABLE_MSG + " Promoter and management data requires DRHP/RHP licensed feed.",
    },
    {
      title: "Financial Analysis",
      dataType: "unavailable",
      table: {
        headers: ["Metric", "Value"],
        rows: noNullRows([
          ["Revenue Growth", disp(u())],
          ["EBITDA", disp(u())],
          ["PAT", disp(u())],
          ["Operating Margin", disp(u())],
          ["Net Worth", disp(u())],
          ["Operating Cash Flow", disp(u())],
        ]),
      },
    },
    {
      title: "Historical Financial Trends",
      dataType: "unavailable",
      content: IPO_UNAVAILABLE_MSG + " 3Y/5Y/10Y financial trends require verified DRHP financial statement feed.",
    },
    {
      title: "Valuation Analysis",
      dataType: "unavailable",
      bullets: [
        `PE Ratio: ${disp(u())}`,
        `PB Ratio: ${disp(u())}`,
        `EV/EBITDA: ${disp(u())}`,
        `Industry comparison: ${disp(u())}`,
      ],
    },
    {
      title: "Peer Comparison",
      dataType: "unavailable",
      content: IPO_UNAVAILABLE_MSG + " Peer financial comparison requires listed peer fundamentals feed. Not estimated.",
    },
    {
      title: "Use of Funds Analysis",
      dataType: "unavailable",
      content: IPO_UNAVAILABLE_MSG + " Use of proceeds requires DRHP section from verified filing feed.",
    },
    {
      title: "Subscription Analysis",
      dataType: subscription?.overall?.available ? "verified" : "unavailable",
      table: {
        headers: ["Category", "Subscription", "Source", "Updated"],
        rows: noNullRows([
          ["Overall", disp(subscription?.overall), subscription?.overall?.source, fetchedAt],
          ["Retail", disp(subscription?.retail), subscription?.retail?.source, fetchedAt],
          ["HNI (>10L)", disp(subscription?.hni), subscription?.hni?.source, fetchedAt],
          ["QIB", disp(subscription?.qib), subscription?.qib?.source, fetchedAt],
          ["Employee", disp(subscription?.employee), subscription?.employee?.source, fetchedAt],
        ]),
      },
      bullets: subHistory.length
        ? [`${subHistory.length} verified subscription snapshots stored`, `Latest overall: ${subHistory[0].overall ?? "—"}x`]
        : ["No subscription history stored yet"],
    },
    {
      title: "GMP Intelligence",
      dataType: "unavailable",
      content: IPO_UNAVAILABLE_MSG + " No verified GMP source connected.",
      bullets: [GMP_DISCLAIMER, "GMP is never estimated, inferred, or backfilled on this platform."],
    },
    {
      title: "Risk Assessment",
      dataType: "model-opinion",
      bullets: [
        "Business risks: Verified IPO data unavailable for customer concentration and competitive metrics",
        "Financial risks: Debt/margin/cash flow data unavailable from NSE IPO feed",
        "Regulatory risks: Requires DRHP legal section",
        "IPO-specific: Valuation risk — fundamentals unavailable; market sentiment partially observable via subscription",
        `Liquidity risk: Moderate for new listings; SME status: ${ipo.securityType || ipo.series || "—"}`,
      ],
    },
    {
      title: "Scenario Analysis",
      dataType: "model-opinion",
      bullets: [
        `Bull case: Strong subscription (${disp(subscription?.overall)}) sustains — assumption, not guarantee`,
        "Base case: Listing in line with market sentiment for sector — financial base case unavailable",
        "Bear case: Weak subscription or market risk-off — supported when overall < 1x",
      ],
    },
    {
      title: "IPO Scorecard",
      dataType: "verified",
      content: scorecard.methodology,
      table: {
        headers: ["Dimension", "Score", "Evidence"],
        rows: scorecard.scores.map((s) => [s.name, s.display, s.evidence || "—"]),
      },
      bullets: [`Composite (verified dimensions only): ${scorecard.composite ?? "Verified IPO data unavailable."}`],
    },
    {
      title: "Analyst Assessment",
      dataType: "model-opinion",
      bullets: [
        ...assessment.evidence,
        `Listing gain assessment: ${assessment.listing}`,
        `Long-term assessment: ${assessment.longTerm} (fundamentals unavailable)`,
        `Valuation: Unavailable without verified PE/PB`,
        `Risk: ${subscription?.overall?.value != null && subscription.overall.value < 1 ? "Moderate-High" : "Moderate"}`,
      ],
    },
    {
      title: "IPO Decision Framework",
      dataType: "model-opinion",
      table: {
        headers: ["Assessment", "Rating", "Evidence"],
        rows: noNullRows([
          ["Listing Gain", assessment.listing, assessment.evidence.join("; ")],
          ["Long-Term Investment", assessment.longTerm, "Financial statements unavailable"],
          ["Valuation", "Unavailable", IPO_UNAVAILABLE_MSG],
          ["Risk", subscription?.overall?.value != null && subscription.overall.value < 1 ? "Moderate" : "Moderate", "Limited verified data"],
        ]),
      },
    },
    listedEnriched
      ? {
          title: "Listed Performance",
          dataType: listedEnriched.currentMarketPrice?.available ? "verified" : "unavailable",
          bullets: [
            `Issue price: ${ipo.issuePrice}`,
            `Current price: ${disp(listedEnriched.currentMarketPrice)}`,
            `Performance since issue: ${disp(listedEnriched.listingGainLoss)}`,
            `Listing price: ${disp(listedEnriched.listingPrice)}`,
          ],
        }
      : null,
    dataSourcesSection([
      { name: "NSE IPO APIs", provider: "nseindia.com", fetchedAt },
      { name: "NSE ipo-detail", provider: "bidDetails subscription", fetchedAt: detail?.fetchedAt },
    ]),
    assumptionsSection([
      "Financial and valuation metrics require DRHP/RHP licensed feed — not estimated",
      "GMP never displayed without verified source",
      "Scorecard excludes unavailable dimensions",
      GMP_DISCLAIMER,
    ]),
    buildAuditTrail([
      { metric: "Overall Subscription", value: subscription?.overall?.value, source: "NSE", collectedAt: fetchedAt, derivation: "ipo-detail bidDetails" },
      { metric: "Issue Price Band", value: ipo.issuePrice, source: "NSE", collectedAt: fetchedAt, derivation: "ipo-current-issue / upcoming" },
    ]),
    { title: "Disclaimer", content: "Not investment advice. IPO involves risk. Verify all data with NSE, RHP/DRHP, and SEBI filings." },
  ].filter(Boolean);

  return {
    type: "ipo",
    title: `${ipo.companyName} — IPO Research Report`,
    source: "NSE India IPO APIs + ABC IPO research engine",
    generatedAt: new Date().toISOString(),
    dataFreshness: { fetchedAt, status: dashboard.dataStatus },
    confidence,
    symbol,
    disclaimer: GMP_DISCLAIMER,
    sections,
    ipo,
    detail,
    subscription,
    subscriptionHistory: subHistory,
    scorecard,
    assessment,
    listedEnriched,
    ...metricMeta("NSE India IPO APIs", fetchedAt, "Fresh"),
  };
}

async function buildIpoDashboardReport() {
  const dashboard = await fetchIpoDashboard();
  const listedEnriched = await Promise.all(dashboard.listed.slice(0, 10).map(enrichListedPrice));

  return {
    type: "ipo-dashboard",
    title: `IPO Intelligence Dashboard — ${new Date().toISOString().slice(0, 10)}`,
    source: "NSE India IPO APIs",
    generatedAt: new Date().toISOString(),
    dataFreshness: { fetchedAt: dashboard.fetchedAt, status: dashboard.dataStatus },
    confidence: 90,
    dashboard: { ...dashboard, listedEnriched },
    sections: [
      {
        title: "Executive Summary",
        dataType: "verified",
        content: `Open: ${dashboard.counts.open}, Upcoming: ${dashboard.counts.upcoming}, Recently listed: ${dashboard.counts.listed}. Source: NSE.`,
      },
      {
        title: "Open IPOs",
        dataType: "verified",
        table: {
          headers: ["Company", "Symbol", "Price Band", "Close", "Overall Sub"],
          rows: noNullRows(dashboard.open.map((i) => [i.companyName, i.symbol, i.issuePrice, i.issueEndDate, i.overallSubscription])),
        },
      },
      {
        title: "Upcoming IPOs",
        dataType: "verified",
        table: {
          headers: ["Company", "Symbol", "Price Band", "Open", "Close"],
          rows: noNullRows(dashboard.upcoming.map((i) => [i.companyName, i.symbol, i.issuePrice, i.issueStartDate, i.issueEndDate])),
        },
      },
      {
        title: "Recently Listed",
        dataType: "verified",
        table: {
          headers: ["Company", "Symbol", "Issue Price", "Listing Date", "Current Price", "Gain/Loss%"],
          rows: noNullRows(
            listedEnriched.map((i) => [
              i.companyName,
              i.symbol,
              i.issuePrice,
              i.listingDate,
              disp(i.currentMarketPrice),
              disp(i.listingGainLoss),
            ])
          ),
        },
      },
    ],
  };
}

module.exports = { buildIpoResearchReport, buildIpoDashboardReport, enrichListedPrice };