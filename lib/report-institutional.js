const { UNAVAILABLE_FIELD } = require("./format");

function coverSection(title, symbol, generatedAt) {
  return {
    title: "Cover Page",
    dataType: "verified",
    content: `${title}${symbol ? ` — ${symbol}` : ""}. Generated ${new Date(generatedAt).toLocaleString()}. ABC Research Platform — Institutional Research Document.`,
  };
}

function methodologySection(methods) {
  return {
    title: "Methodology",
    dataType: "verified",
    bullets: methods || [
      "Verified Data → Validation → Analysis → Evidence → Report",
      "No estimation or backfill of missing financial metrics",
      "AI commentary clearly labeled as model-opinion",
    ],
  };
}

function aiCommentarySection(content, bullets) {
  return {
    title: "AI Commentary",
    dataType: "model-opinion",
    content: content || "Model-generated interpretation separated from verified market data.",
    bullets,
  };
}

function macroSection(content) {
  return {
    title: "Macro Environment Analysis",
    dataType: content ? "model-opinion" : "unavailable",
    content: content || UNAVAILABLE_FIELD + " Macro feed not connected.",
  };
}

function institutionalOwnershipSection(content) {
  return {
    title: "Institutional Ownership Analysis",
    dataType: "unavailable",
    content: content || UNAVAILABLE_FIELD + " Connect NSE/BSE shareholding filings feed.",
  };
}

function fiiDiiSection(content) {
  return {
    title: "FII/DII Activity Analysis",
    dataType: content ? "verified" : "unavailable",
    content: content || UNAVAILABLE_FIELD,
  };
}

function optionsSection(content) {
  return {
    title: "Options & Derivatives Analysis",
    dataType: content ? "verified" : "unavailable",
    content: content || UNAVAILABLE_FIELD + " Requires verified NSE options chain.",
  };
}

function mergeInstitutionalSections(baseSections, extras = {}) {
  const byTitle = new Map(baseSections.map((s) => [s.title, s]));

  const required = [
    coverSection(extras.title, extras.symbol, extras.generatedAt || new Date().toISOString()),
    byTitle.get("Executive Summary"),
    byTitle.get("Market Overview") || macroSection(extras.macro),
    macroSection(extras.macro),
    byTitle.get("Company Overview") || byTitle.get("Business Overview"),
    byTitle.get("Fundamental Analysis"),
    byTitle.get("Financial Statement Analysis") || byTitle.get("Financial Analysis"),
    byTitle.get("Historical Performance Analysis") || byTitle.get("Historical Financial Trends"),
    byTitle.get("Competitor Benchmarking") || byTitle.get("Competitor Comparison"),
    byTitle.get("Sector Benchmarking") || byTitle.get("Sector Comparison"),
    byTitle.get("Valuation Analysis"),
    byTitle.get("Technical Analysis"),
    institutionalOwnershipSection(extras.institutionalOwnership),
    fiiDiiSection(extras.fiiDii),
    optionsSection(extras.options),
    byTitle.get("Scenario Analysis"),
    byTitle.get("Bull Case"),
    byTitle.get("Bear Case"),
    byTitle.get("Key Catalysts"),
    byTitle.get("Key Risks") || byTitle.get("Risk Assessment"),
    byTitle.get("Investment Thesis"),
    byTitle.get("Assumptions Used"),
    byTitle.get("Supporting Evidence"),
    byTitle.get("Data Sources"),
    methodologySection(extras.methodology),
    aiCommentarySection(extras.aiCommentary, extras.aiBullets),
    byTitle.get("Disclaimer"),
  ];

  return required.filter(Boolean).map((s, i) => ({ ...s, order: i + 1 }));
}

module.exports = {
  mergeInstitutionalSections,
  coverSection,
  methodologySection,
  aiCommentarySection,
};