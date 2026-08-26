const STORAGE_KEY = "abc-research-brief-v1";
const MAX_ENTRIES = 30;

function cleanEntries(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((entry) => entry && typeof entry.symbol === "string" && typeof entry.name === "string");
}

export function readBriefEntries() {
  try {
    return cleanEntries(JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]"));
  } catch {
    return [];
  }
}

function writeBriefEntries(entries) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
}

export function createBriefEntry(stock, asOf) {
  const rec = stock?.recommendation || {};
  const dossier = rec.dossier || {};
  return {
    id: stock.symbol,
    symbol: stock.symbol,
    name: stock.name || stock.symbol,
    sector: stock.sector || "Sector unavailable from current feed",
    price: Number.isFinite(stock.price) ? stock.price : null,
    changePercent: Number.isFinite(stock.changePercent) ? stock.changePercent : null,
    marketCap: Number.isFinite(stock.marketCap) ? stock.marketCap : null,
    addedAt: new Date().toISOString(),
    asOf: asOf || null,
    facts: {
      action: rec.action || "Not available",
      confidence: Number.isFinite(rec.confidence?.score) ? rec.confidence.score : null,
      horizon: rec.horizon || "Not supplied by current model output",
    },
    interpretation: {
      thesis: rec.message || "No model interpretation supplied for this snapshot.",
      reasons: Array.isArray(rec.reasons) ? rec.reasons.slice(0, 4) : [],
      risks: Array.isArray(rec.risks) ? rec.risks.slice(0, 4) : [],
      invalidation: Array.isArray(dossier.invalidation) ? dossier.invalidation.slice(0, 4) : [],
    },
    sources: [
      { label: "NSE universe", detail: "Instrument scope and exchange context", state: "Reference" },
      { label: "Yahoo Finance", detail: "Price and technical feed context", state: "Source" },
      { label: "ABC scoring layer", detail: "Model interpretation, not a reported fact", state: "Model" },
    ],
  };
}

export function addBriefEntry(entry) {
  const current = readBriefEntries();
  const next = [entry, ...current.filter((item) => item.symbol !== entry.symbol)];
  writeBriefEntries(next);
  return next;
}

export function removeBriefEntry(symbol) {
  const next = readBriefEntries().filter((entry) => entry.symbol !== symbol);
  writeBriefEntries(next);
  return next;
}

export function clearBriefEntries() {
  writeBriefEntries([]);
  return [];
}
