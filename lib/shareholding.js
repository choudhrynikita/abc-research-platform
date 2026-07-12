/**
 * Verified shareholding from NSE Corporate Filings (free public API + XBRL archives).
 * Policy: never invent promoter/FII/DII — only parse disclosed filings.
 */

const { fetchWithTimeout } = require("./fetch-utils");
const { unavailableField, metricMeta } = require("./format");
const { readJson, writeJson } = require("./json-store");

const NSE_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://www.nseindia.com/companies-listing/corporate-filings-shareholding-pattern",
};

const CACHE_FILE = "shareholding-cache.json";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

let sessionCookies = "";
let lastWarmAt = 0;

function nseSymbol(symbol) {
  if (!symbol) return null;
  return String(symbol).replace(/\.NS$/i, "").toUpperCase();
}

function parseCookies(response) {
  const raw =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [response.headers.get("set-cookie")].filter(Boolean);
  return raw.map((c) => String(c).split(";")[0]).join("; ");
}

async function warmSession() {
  if (Date.now() - lastWarmAt < 60_000 && sessionCookies) return;
  const res = await fetchWithTimeout(
    "https://www.nseindia.com/companies-listing/corporate-filings-shareholding-pattern",
    { headers: NSE_HEADERS },
    15_000
  );
  const cookies = parseCookies(res);
  if (cookies) sessionCookies = cookies;
  lastWarmAt = Date.now();
}

function pctField(value, source, asOf) {
  if (value == null || !Number.isFinite(Number(value))) {
    return unavailableField(`Source does not provide this information (${source})`);
  }
  let n = Number(value);
  // Master API uses 0–100; XBRL often uses 0–1 fractions
  if (n >= 0 && n <= 1.0001) n = n * 100;
  if (n < 0 || n > 100) {
    return unavailableField(`Out-of-range shareholding value rejected (${source})`);
  }
  return {
    available: true,
    value: Number((n / 100).toFixed(6)), // store as ratio for consistency with ROE-style fields
    display: Number(n.toFixed(2)),
    unit: "percent",
    source,
    asOf: asOf || null,
    ...metricMeta(source, new Date().toISOString(), "Fresh"),
  };
}

/**
 * Parse BSE/NSE SHP XBRL for category shareholding % (Main category contexts only).
 */
function parseShpXbrl(xml) {
  if (!xml || typeof xml !== "string") return null;

  const byCtx = {};
  const re =
    /<in-bse-shp:ShareholdingAsAPercentageOfTotalNumberOfShares[^>]*contextRef="([^"]+)"[^>]*>([^<]+)<\/in-bse-shp:ShareholdingAsAPercentageOfTotalNumberOfShares>/g;
  let m;
  while ((m = re.exec(xml))) {
    byCtx[m[1]] = Number(m[2]);
  }

  function fromCtx(ctxId) {
    const v = byCtx[ctxId];
    return Number.isFinite(v) ? v : null;
  }

  // Category totals use fixed context ids in SHP V1.1 filings
  return {
    promoter: fromCtx("ShareholdingOfPromoterAndPromoterGroup_ContextI"),
    public: fromCtx("PublicShareholding_ContextI"),
    diiDomestic: fromCtx("InstitutionsDomestic_ContextI"),
    fiiForeign: fromCtx("InstitutionsForeign_ContextI"),
    fpiCat1: fromCtx("InstitutionsForeignPortfolioInvestorCategoryOne_ContextI"),
    mutualFunds: fromCtx("MutualFundsOrUTI_ContextI"),
    insurance: fromCtx("InsuranceCompanies_ContextI"),
    nonInstitutions: fromCtx("NonInstitutions_ContextI"),
  };
}

async function fetchMasterRows(symbol) {
  await warmSession();
  const url = `https://www.nseindia.com/api/corporate-share-holdings-master?index=equities&symbol=${encodeURIComponent(symbol)}`;
  const res = await fetchWithTimeout(
    url,
    { headers: { ...NSE_HEADERS, Cookie: sessionCookies } },
    18_000
  );
  if (!res.ok) throw new Error(`NSE shareholding master HTTP ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data) || !data.length) throw new Error("Empty NSE shareholding master");
  // Prefer newest by date / submissionDate
  return data;
}

async function fetchXbrl(url) {
  const res = await fetchWithTimeout(
    url,
    {
      headers: {
        ...NSE_HEADERS,
        Accept: "application/xml,text/xml,*/*",
        Cookie: sessionCookies,
      },
    },
    25_000
  );
  if (!res.ok) throw new Error(`SHP XBRL HTTP ${res.status}`);
  return res.text();
}

async function readCache(symbol) {
  try {
    const store = await readJson(CACHE_FILE, { symbols: {} });
    const hit = store.symbols?.[symbol];
    if (!hit?.fetchedAt) return null;
    const age = Date.now() - new Date(hit.fetchedAt).getTime();
    if (age > CACHE_TTL_MS) return null;
    return hit;
  } catch {
    return null;
  }
}

async function writeCache(symbol, payload) {
  try {
    const store = await readJson(CACHE_FILE, { symbols: {}, updatedAt: null });
    store.symbols = store.symbols || {};
    store.symbols[symbol] = payload;
    store.updatedAt = new Date().toISOString();
    await writeJson(CACHE_FILE, store);
  } catch {
    // non-fatal
  }
}

/**
 * @returns {Promise<object>} shareholding block compatible with fundamentals.shareholding
 */
async function fetchShareholding(symbolRaw) {
  const symbol = nseSymbol(symbolRaw);
  if (!symbol) {
    return {
      available: false,
      message: "Invalid symbol for shareholding lookup",
      promoter: unavailableField("Invalid symbol"),
      fii: unavailableField("Invalid symbol"),
      dii: unavailableField("Invalid symbol"),
      public: unavailableField("Invalid symbol"),
      mutualFunds: unavailableField("Invalid symbol"),
      institutional: unavailableField("Invalid symbol"),
    };
  }

  const cached = await readCache(symbol);
  if (cached) return { ...cached, cacheHit: true };

  try {
    const rows = await fetchMasterRows(symbol);
    const latest = rows[0];
    const asOf = latest.date || latest.submissionDate || null;
    const masterPromoter = latest.pr_and_prgrp != null ? Number(latest.pr_and_prgrp) : null;
    const masterPublic = latest.public_val != null ? Number(latest.public_val) : null;

    let xbrlCats = null;
    if (latest.xbrl) {
      try {
        const xml = await fetchXbrl(latest.xbrl);
        xbrlCats = parseShpXbrl(xml);
      } catch {
        xbrlCats = null;
      }
    }

    const srcMaster = "NSE corporate-share-holdings-master";
    const srcXbrl = "NSE SHP XBRL archive (in-bse-shp)";

    const promoter =
      xbrlCats?.promoter != null
        ? pctField(xbrlCats.promoter, srcXbrl, asOf)
        : masterPromoter != null
          ? pctField(masterPromoter, srcMaster, asOf)
          : unavailableField("Promoter % not in latest NSE SHP filing");

    const publicHold =
      xbrlCats?.public != null
        ? pctField(xbrlCats.public, srcXbrl, asOf)
        : masterPublic != null
          ? pctField(masterPublic, srcMaster, asOf)
          : unavailableField("Public % not in latest NSE SHP filing");

    const fii =
      xbrlCats?.fiiForeign != null
        ? pctField(xbrlCats.fiiForeign, `${srcXbrl} · InstitutionsForeign`, asOf)
        : xbrlCats?.fpiCat1 != null
          ? pctField(xbrlCats.fpiCat1, `${srcXbrl} · FPI Category I`, asOf)
          : unavailableField("FII/FPI % not present in XBRL category totals for this filing");

    const dii =
      xbrlCats?.diiDomestic != null
        ? pctField(xbrlCats.diiDomestic, `${srcXbrl} · InstitutionsDomestic`, asOf)
        : unavailableField("DII (domestic institutions) % not present in XBRL for this filing");

    const mutualFunds =
      xbrlCats?.mutualFunds != null
        ? pctField(xbrlCats.mutualFunds, `${srcXbrl} · MutualFundsOrUTI`, asOf)
        : unavailableField("Mutual fund % not present in XBRL for this filing");

    // Institutional = domestic + foreign institutions when both verified
    let institutional = unavailableField("Institutional total requires domestic + foreign institution categories");
    if (xbrlCats?.diiDomestic != null && xbrlCats?.fiiForeign != null) {
      institutional = pctField(
        Number(xbrlCats.diiDomestic) + Number(xbrlCats.fiiForeign),
        `${srcXbrl} · Domestic+Foreign institutions`,
        asOf
      );
    } else if (xbrlCats?.diiDomestic != null) {
      institutional = pctField(xbrlCats.diiDomestic, `${srcXbrl} · Domestic institutions only`, asOf);
    } else if (xbrlCats?.fiiForeign != null) {
      institutional = pctField(xbrlCats.fiiForeign, `${srcXbrl} · Foreign institutions only`, asOf);
    }

    const payload = {
      available: promoter.available || publicHold.available || fii.available || dii.available,
      symbol,
      companyName: latest.name || null,
      asOf,
      filingDate: latest.submissionDate || latest.broadcastDate || null,
      xbrlUrl: latest.xbrl || null,
      source: "NSE India Corporate Filings Shareholding Pattern",
      fetchedAt: new Date().toISOString(),
      promoter,
      public: publicHold,
      fii,
      dii,
      mutualFunds,
      institutional,
      insiders: unavailableField("Insider % is Yahoo-only when majorHoldersBreakdown exists"),
      message:
        "Verified from NSE shareholding filings. Category totals from SHP XBRL when available; otherwise promoter/public from master API only.",
      policy: {
        zeroHallucination: true,
        note: "Never estimates missing FII/DII/promoter from residual math when not disclosed.",
      },
    };

    await writeCache(symbol, payload);
    return payload;
  } catch (err) {
    return {
      available: false,
      symbol,
      message: err.message || "NSE shareholding unavailable",
      promoter: unavailableField(err.message || "NSE shareholding unavailable"),
      public: unavailableField("NSE shareholding unavailable"),
      fii: unavailableField("NSE shareholding unavailable"),
      dii: unavailableField("NSE shareholding unavailable"),
      mutualFunds: unavailableField("NSE shareholding unavailable"),
      institutional: unavailableField("NSE shareholding unavailable"),
      fetchedAt: new Date().toISOString(),
      source: "NSE India Corporate Filings Shareholding Pattern",
    };
  }
}

module.exports = {
  fetchShareholding,
  parseShpXbrl,
  nseSymbol,
};
