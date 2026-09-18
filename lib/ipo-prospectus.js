/**
 * Parse official IPO issue-size text and RHP page text.
 * Numbers come from NSE issue info / the NSE-hosted prospectus — never from GMP blogs.
 */

function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/\u00ad/g, "")
    .replace(/\bie,\s/gi, "i.e., ")
    .replace(/\beg,\s/gi, "e.g., ")
    .trim();
}

function parseAmount(raw) {
  if (raw == null) return null;
  const n = Number(String(raw).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

function millionToCrore(n) {
  if (n == null || !Number.isFinite(n)) return null;
  return Math.round((n / 10) * 100) / 100;
}

function croreLabel(n) {
  if (n == null || !Number.isFinite(n)) return null;
  return `₹${Number(n).toLocaleString("en-IN")} Cr`;
}

function protectAbbreviations(text) {
  return String(text || "")
    .replace(/i\.e\./gi, "ie")
    .replace(/e\.g\./gi, "eg")
    .replace(/etc\./gi, "etc");
}

function takeRupeeBlock(text, leadRe) {
  const re = new RegExp(
    `${leadRe}[\\s\\S]{0,280}?aggregating(?: up)? to\\s*(?:Rs\\.?|₹)\\s*([\\d,]+(?:\\.\\d+)?)\\s*(million|crore)`,
    "i"
  );
  const m = String(text || "").match(re);
  if (!m) {
    const loose = new RegExp(
      `${leadRe}[\\s\\S]{0,160}?(?:Rs\\.?|₹)\\s*([\\d,]+(?:\\.\\d+)?)\\s*(million|crore)`,
      "i"
    );
    const m2 = String(text || "").match(loose);
    if (!m2) return null;
    const n2 = parseAmount(m2[1]);
    if (n2 == null || n2 <= 10) return null;
    return /crore/i.test(m2[2]) ? Number(n2.toFixed(2)) : millionToCrore(n2);
  }
  const n = parseAmount(m[1]);
  if (n == null) return null;
  return /crore/i.test(m[2]) ? Number(n.toFixed(2)) : millionToCrore(n);
}

function parseIssueComposition(text, totalCroreFallback = null) {
  const raw = String(text || "").trim();
  if (!raw && totalCroreFallback == null) return null;

  const fresh = takeRupeeBlock(raw, "Fresh Issue");
  const ofs = takeRupeeBlock(raw, "Offer for [Ss]ale");
  const onlyFresh = /fresh issue/i.test(raw) && (!/offer for sale/i.test(raw) || /NOT APPLICABLE AS THIS IS A FRESH ISSUE/i.test(raw));
  const ofsNil = /NOT APPLICABLE AS THIS IS A FRESH ISSUE|OFS SIZE[\s\S]{0,160}\bNIL\b/i.test(raw);
  let total = null;
  if (fresh != null && ofs != null) total = Number((fresh + ofs).toFixed(2));
  else if (fresh != null && (onlyFresh || ofsNil)) total = fresh;
  else if (totalCroreFallback != null) total = Number(Number(totalCroreFallback).toFixed(2));

  const freshCrore = fresh != null ? fresh : (onlyFresh || ofsNil) && total != null ? total : null;
  const ofsCrore = ofs != null ? ofs : (onlyFresh || ofsNil) ? 0 : null;

  if (total == null && freshCrore == null && ofsCrore == null) return null;

  return {
    totalCrore: total,
    freshCrore,
    ofsCrore,
    totalLabel: croreLabel(total),
    freshLabel: croreLabel(freshCrore),
    ofsLabel: ofsCrore === 0 ? "Nil — no offer for sale" : croreLabel(ofsCrore),
    source: raw ? "NSE issue size text / RHP cover" : "NSE shares offered × cap price",
  };
}

function mergeIssueBreakdown(primary, secondary) {
  if (!primary && !secondary) return null;
  const a = primary || {};
  const b = secondary || {};
  const ofsCrore = b.ofsCrore ?? a.ofsCrore ?? null;
  const totalCrore = a.totalCrore ?? b.totalCrore ?? null;
  let freshCrore = a.freshCrore ?? b.freshCrore ?? null;
  if (freshCrore == null && ofsCrore === 0 && totalCrore != null) freshCrore = totalCrore;
  if (totalCrore == null && freshCrore == null && ofsCrore == null) return null;
  return {
    totalCrore,
    freshCrore,
    ofsCrore,
    totalLabel: croreLabel(totalCrore) || a.totalLabel || b.totalLabel || null,
    freshLabel: croreLabel(freshCrore) || a.freshLabel || b.freshLabel || null,
    ofsLabel: ofsCrore === 0 ? "Nil — no offer for sale" : (croreLabel(ofsCrore) || a.ofsLabel || b.ofsLabel || null),
    source: [a.source, b.source].filter(Boolean).join(" · ") || null,
  };
}

function detectUnit(text) {
  const blob = String(text || "");
  const restated = blob.match(
    /(?:SUMMARY OF FINANCIAL INFORMATION|as Restated|RESTATED STATEMENT|Financial Statements of (?:Assets|Profit)|FINANCIAL KPIs)[\s\S]{0,320}?(in\s*(?:₹\s*)?lakhs?|in\s*(?:₹\s*)?million|in\s*(?:₹\s*)?crore)/i
  );
  if (restated) {
    if (/lakh/i.test(restated[1])) return "lakh";
    if (/crore/i.test(restated[1])) return "crore";
    return "million";
  }
  const lakhs = (blob.match(/in\s*(?:₹\s*)?lakhs?/gi) || []).length;
  const millions = (blob.match(/in\s*(?:₹\s*)?million/gi) || []).length;
  const crores = (blob.match(/in\s*(?:₹\s*)?crore/gi) || []).length;
  if (lakhs > 0 && lakhs >= millions && lakhs >= crores) return "lakh";
  if (crores > millions && crores > 0) return "crore";
  if (millions > 0) return "million";
  return "million";
}

function threeNumbersAfter(label, text) {
  const re = new RegExp(
    `${label}[\\s\\S]{0,48}?(-?[\\d,]+\\.\\d+)\\s+(-?[\\d,]+\\.\\d+)\\s+(-?[\\d,]+\\.\\d+)`,
    "i"
  );
  const m = String(text || "").match(re);
  if (!m) return null;
  const nums = [m[1], m[2], m[3]].map(parseAmount);
  if (nums.some((n) => n == null)) return null;
  return nums;
}

function fiscalYearsFromSummary(text) {
  const blob = String(text || "");
  const years = [
    ...blob.matchAll(/March\s*31,?\s*(20\d{2})/gi),
    ...blob.matchAll(/31\/03\/(20\d{2})/g),
    ...blob.matchAll(/year ended March 31,?\s*(20\d{2})/gi),
  ].map((m) => m[1]);
  const unique = [];
  for (const y of years) {
    if (!unique.includes(y)) unique.push(y);
    if (unique.length === 3) break;
  }
  if (unique.length === 3) return unique.map((y) => `March ${y}`);
  return ["Latest year", "Prior year", "Year -2"];
}

function toCrore(n, unit) {
  if (n == null) return null;
  if (unit === "lakh") return Number((n / 100).toFixed(2));
  if (unit === "million") return millionToCrore(n);
  return Number(Number(n).toFixed(2));
}

function parseFinancialSummary(text) {
  const blob = String(text || "");
  if (!/SUMMARY OF FINANCIAL INFORMATION|RESTATED STATEMENT OF ASSETS|Revenue from Operations/i.test(blob)) return null;
  const unit = detectUnit(blob);
  const assets = threeNumbersAfter("Total Assets", blob)
    || threeNumbersAfter("TOTAL\\(A\\+B\\)", blob)
    || threeNumbersAfter("Total assets", blob);
  const revenue = threeNumbersAfter("Revenue from operations", blob);
  const pat = threeNumbersAfter("Profit After Tax", blob)
    || threeNumbersAfter("Restated Profit/\\(Loss\\) For the Year", blob)
    || threeNumbersAfter("Restated Profit for the year", blob)
    || threeNumbersAfter("Profit for the year", blob)
    || threeNumbersAfter("PROFIT/\\(LOSS\\) AFTER TAX", blob);
  if (!assets && !revenue && !pat) return null;
  const labels = fiscalYearsFromSummary(blob);
  const years = [0, 1, 2].map((i) => ({
    label: labels[i],
    assets: assets ? toCrore(assets[i], unit) : null,
    revenue: revenue ? toCrore(revenue[i], unit) : null,
    pat: pat ? toCrore(pat[i], unit) : null,
  })).filter((y) => y.assets != null || y.revenue != null || y.pat != null);
  if (!years.length) return null;
  const analysis = [];
  if (years[0].revenue != null && years[1].revenue != null && years[1].revenue !== 0) {
    const pct = Number((((years[0].revenue - years[1].revenue) / Math.abs(years[1].revenue)) * 100).toFixed(1));
    analysis.push(
      `Revenue ${pct >= 0 ? "up" : "down"} ${Math.abs(pct)}% in ${years[0].label} vs ${years[1].label} (restated).`
    );
  }
  if (years[0].pat != null && years[1].pat != null && years[1].pat !== 0) {
    const pct = Number((((years[0].pat - years[1].pat) / Math.abs(years[1].pat)) * 100).toFixed(1));
    analysis.push(
      `Profit after tax ${pct >= 0 ? "up" : "down"} ${Math.abs(pct)}% over the same restated years.`
    );
  }
  if (years[0].pat != null && years[0].revenue) {
    const margin = Number(((years[0].pat / years[0].revenue) * 100).toFixed(1));
    analysis.push(`PAT margin ${margin}% on restated ${years[0].label} revenue.`);
  }
  if (years[0].assets != null && years[1].assets != null && years[1].assets !== 0) {
    const pct = Number((((years[0].assets - years[1].assets) / Math.abs(years[1].assets)) * 100).toFixed(1));
    analysis.push(
      `Total assets ${pct >= 0 ? "up" : "down"} ${Math.abs(pct)}% over the same restated years.`
    );
  }
  analysis.push("Figures are restated prospectus numbers, not a forecast and not a buy/sell call.");
  const y0 = Number((years[0].label.match(/20\d{2}/) || [])[0]);
  const yN = Number((years[years.length - 1].label.match(/20\d{2}/) || [])[0]);
  const chartYears = Number.isFinite(y0) && Number.isFinite(yN) && y0 > yN ? [...years].reverse() : years;
  return {
    unit: "₹ crore",
    years,
    chartYears,
    analysis,
    source: "NSE-hosted Red Herring Prospectus — summary of restated financials",
  };
}

function chapterStart(blob, headingRe) {
  const re = new RegExp(headingRe, "gi");
  for (const m of String(blob || "").matchAll(re)) {
    const after = blob.slice(m.index + m[0].length, m.index + m[0].length + 100);
    if (/\.{8,}/.test(after)) continue;
    return m.index;
  }
  return -1;
}

function parseAbout(text) {
  const blob = protectAbbreviations(text);
  const start = chapterStart(blob, "BUSINESS OVERVIEW|OUR BUSINESS|Overview");
  const body = start >= 0 ? blob.slice(start) : blob;
  const chunks = [];
  const overview = body.match(/Overview\s+(We are[\s\S]{80,900}?\.(?=\s+[A-Z“"']|\s*$))/i);
  if (overview) chunks.push(overview[1]);
  const companyIs = body.match(/Our Company is (?:an |a )?[\s\S]{40,700}?\.(?=\s+[A-Z“"']|\s*$)/i);
  if (companyIs && !/originally incorporated as “Company Limited|not related to such suppliers|quotations have been received|yet to place any orders/i.test(companyIs[0])) {
    chunks.push(companyIs[0]);
  }
  const specialise = body.match(/We specialise in[\s\S]{40,500}?\.(?=\s+[A-Z“"']|\s*$)/i);
  if (specialise) chunks.push(specialise[0]);
  const weAre = body.match(/We are (?:a |an |engaged|one of)[\s\S]{40,700}?\.(?=\s+[A-Z“"']|\s*$)/i);
  if (weAre) chunks.push(weAre[0]);
  let sentence = chunks
    .map((part) => cleanText(part).replace(/\(\s*Source:[^)]+\)/gi, "").replace(/\s+/g, " ").trim())
    .filter((part, i, arr) => part.length >= 40 && arr.findIndex((x) => x === part) === i)
    .filter((part, i, arr) => {
      const tail = part.slice(-72).toLowerCase();
      return arr.findIndex((x) => x.slice(-72).toLowerCase() === tail) === i;
    })
    .join(" ");
  if (sentence.length < 40) {
    const fallback = (body.match(/We are a[\s\S]{40,500}?\.(?=\s+[A-Z“"']|\s*$)/i) || [])[0] || "";
    sentence = cleanText(fallback);
  }
  if (sentence.length < 40) return null;
  const cut = sentence.length > 900 ? `${sentence.slice(0, 897).replace(/\s+\S*$/, "")}…` : sentence;
  return cut;
}

function parseOperations(text) {
  const blob = protectAbbreviations(text);
  const m = blob.match(/Our store operations are structured around[\s\S]{40,480}?\.(?=\s+[A-Z]|\s*$)/i)
    || blob.match(/We primarily focus on (?:the |our )?(?:COFO|franchisee)[\s\S]{40,360}?\.(?=\s+[A-Z]|\s*$)/i)
    || blob.match(/We operate as[\s\S]{40,480}?\.(?=\s+[A-Z]|\s*$)/i)
    || blob.match(/Our Company operates a manufacturing[\s\S]{40,420}?\.(?=\s+[A-Z]|\s*$)/i)
    || blob.match(/In India,\s+our manufacturing facilities are situated[\s\S]{20,420}?\.(?=\s+[A-Z]|\s*$)/i)
    || blob.match(/Our manufacturing facilities are situated[\s\S]{20,420}?\.(?=\s+[A-Z]|\s*$)/i)
    || blob.match(/We have a diversified product portfolio[\s\S]{40,400}?\.(?=\s+[A-Z]|\s*$)/i)
    || blob.match(/We commenced operations in[\s\S]{40,420}?\.(?=\s+[A-Z]|\s*$)/i);
  if (!m) return null;
  const cut = cleanText(m[0]);
  if (cut.length < 40) return null;
  return cut.length > 520 ? `${cut.slice(0, 517).replace(/\s+\S*$/, "")}…` : cut;
}

function isStrengthTitle(title) {
  if (!title) return false;
  if (/^(We |While |Our |The |This |These |That |It |If |When |In |As |For |To |During |Over |Since |Both |Further|Set out|Particulars|Geography|OVERVIEW)/i.test(title)) return false;
  if (/knowledge company report|page \d+|Fiscal 20\d{2}.*Fiscal 20\d{2}/i.test(title)) return false;
  if (/,.*,/.test(title)) return false;
  if (/inorganic growth|unidentified acquisition|general corporate purposes|repayment\/prepayment/i.test(title)) return false;
  const words = title.split(/\s+/).filter(Boolean);
  if (words.length < 3 || words.length > 18) return false;
  if (title.length < 18 || title.length > 140) return false;
  return true;
}

function parseNamedStrengths(text) {
  const blob = String(text || "").replace(/\u00ad/g, "");
  const idx = blob.search(/\b(?:Our Strengths|Our Competitive Strengths|Competitive Strengths)\b/i);
  if (idx < 0) return [];
  const slice = blob.slice(idx, idx + 40000)
    .split(/\bOur Strateg(?:y|ies)\b|\bBusiness Strateg(?:y|ies)\b|\bAwards and Recognitions\b/i)[0];
  const compact = slice.replace(/\s+/g, " ").replace(/^(?:Our )?(?:Competitive )?Strengths\s+/i, "").trim();
  const out = [];
  const seen = new Set();
  const re = /(?:^|[.]\s+)([A-Z][^.]{18,220}?)(?=\.?\s+(?:We |While we |Under the |To capitalise |Our business operations |Our inventory |Our Company))/g;
  for (const m of compact.matchAll(re)) {
    const title = cleanText(m[1]).replace(/[.;]+$/, "");
    if (!isStrengthTitle(title)) continue;
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(title);
    if (out.length >= 5) break;
  }
  return out;
}

function parseHeadingStrengths(text) {
  const blob = String(text || "").replace(/\s+/g, " ");
  const start = chapterStart(blob, "OUR COMPETITIVE STRENGTHS|Our Strengths|BUSINESS OVERVIEW|OUR BUSINESS");
  const slice = start >= 0 ? blob.slice(start, start + 24000) : blob.slice(0, 8000);
  const out = [];
  const seen = new Set();
  const re = /(?:^|[.]\s+)([A-Z][A-Za-z0-9 ,/&’'-]{18,90}?)\s+(We |Our Company|Our operations )/g;
  for (const m of slice.matchAll(re)) {
    const title = cleanText(m[1]).replace(/[.;]+$/, "");
    if (/^(Overview|The following|Financial KPIs|State wise|Quality|Awards|Unless|In this|For the|During|These include|SECTION)/i.test(title)) continue;
    if (!isStrengthTitle(title)) continue;
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(title);
    if (out.length >= 5) break;
  }
  return out;
}

function parseBulletStrengths(text) {
  const blob = String(text || "").replace(/\s+/g, " ");
  const idx = blob.search(/\b(?:Our Competitive Strengths|OUR COMPETITIVE STRENGTHS|Our Strengths)\b/i);
  if (idx < 0) return [];
  const slice = blob.slice(idx, idx + 6000).split(/\bOUR STRATEG(?:Y|IES)\b|\bOur Strateg(?:y|ies)\b/i)[0];
  const out = [];
  const seen = new Set();
  for (const m of slice.matchAll(/[•●]\s*([^•●]{18,140}?)(?:;|\.|$)/g)) {
    const title = cleanText(m[1])
      .replace(/[.;]+$/, "")
      .replace(/\s+and$/i, "")
      .replace(/(\w)\s+-\s*(\w)/g, "$1-$2");
    if (!isStrengthTitle(title)) continue;
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(title);
    if (out.length >= 6) break;
  }
  return out;
}

function parseStrengths(text) {
  const bullets = parseBulletStrengths(text);
  if (bullets.length) return bullets;
  const named = parseNamedStrengths(text);
  if (named.length) return named;
  return parseHeadingStrengths(text);
}

function parseRiskTitles(text) {
  const blob = protectAbbreviations(text);
  const idx = blob.search(/Internal Risk Factors|SECTION II:\s*RISK FACTORS|SECTION II\s*[–—-]\s*RISK FACTORS/i);
  const slice = idx >= 0 ? blob.slice(idx, idx + 45000) : blob.slice(0, 45000);
  const seen = new Set();
  const out = [];
  const re = /(\d{1,2})\.\s+((?:We|Our Company|Our |A substantial|The Company|Failure|Inability|Dependence)[\s\S]{20,260}?(?<!\d)\.(?!\d))/g;
  for (const m of slice.matchAll(re)) {
    const n = Number(m[1]);
    if (n < 1 || n > 12) continue;
    if (seen.has(n)) continue;
    let title = cleanText(m[2]);
    title = title.replace(/\s*During Fiscals[\s\S]*$/, "");
    title = title.replace(/\s*Set out below[\s\S]*$/, "");
    title = title.replace(/[.;]+$/, "");
    if (/not be material|material impact quantitatively|deem immaterial|forward-looking/i.test(title)) continue;
    if (title.length < 30 || title.length > 280) continue;
    if (/Particulars Fiscal|stores closed during/i.test(title)) continue;
    seen.add(n);
    out.push(title);
    if (out.length >= 6) break;
  }
  return out;
}

function decimalPairAfter(labelRe, text) {
  const re = new RegExp(`${labelRe}`, "i");
  const start = String(text || "").search(re);
  if (start < 0) return null;
  const window = String(text)
    .slice(start, start + 480)
    .replace(/(\d), (\d{3})/g, "$1,$2");
  const firstToken = window.match(/[\d,]+(?:\.\d{2})|\[[\s]*●[\s]*\]/);
  if (!firstToken) return null;
  if (/●/.test(firstToken[0])) return null;
  const n = parseAmount(firstToken[0]);
  if (n == null || n <= 1) return null;
  // Plain 20xx.00 without a thousands separator is a fiscal year, not an object amount.
  if (!firstToken[0].includes(",") && n >= 1900 && n <= 2100) return null;
  return n;
}

function parseObjectsOfOffer(text, freshCrore = null) {
  const blob = String(text || "");
  const intro = blob.match(
    /(?:proposes to utili[sz]e|intend to utili[sz]e|propose to utili[sz]e) the Net Proceeds[\s\S]{0,120}?following objects:([\s\S]{0,1800}?)(?:collectively|Utili[sz]ation of Net Proceeds|Requirement of funds)/i
  );
  const purposes = [];
  if (intro) {
    const body = intro[1];
    const chunks = body.split(/\d+\.\s+/).map((part) => cleanText(part)
      .replace(/[.;]+\s*and$/i, "")
      .replace(/\s+and$/i, "")
      .replace(/[.;]+$/, "")
      .replace(/\($/, "")
    ).filter(Boolean);
    for (const purpose of chunks) {
      if (purpose.length < 12 || purpose.length > 220) continue;
      if (/^we intend|^this issue|^in addition/i.test(purpose)) continue;
      purposes.push({ purpose: purpose.trim(), amountCrore: null, amountLabel: null, pct: null });
    }
  }
  if (!purposes.length) return null;

  const tableIdx = blob.search(/Utili[sz]ation of Net Proceeds|Requirement of funds/i);
  const table = tableIdx >= 0 ? blob.slice(tableIdx, tableIdx + 8000) : blob;
  const unit = detectUnit(tableIdx >= 0 ? table : blob);
  const fitRaw = decimalPairAfter("capital expenditure for Fit|Fit Outs towards setting", table)
    || decimalPairAfter("Fit Outs", table)
    || decimalPairAfter("setting up of new manufacturing facility", table)
    || decimalPairAfter("Gautam Buddha Nagar", table)
    || decimalPairAfter("purchase of equipment", table)
    || decimalPairAfter("capital expenditure", table);
  const repayRaw = decimalPairAfter("outstanding borrowings", table)
    || decimalPairAfter("Repayment/prepayment", table);
  const wcRaw = decimalPairAfter("working capital requirements", table);
  const gcpRaw = decimalPairAfter("General Corporate Purposes", table);

  const applyAmount = (row, raw) => {
    if (raw == null) return;
    const crore = toCrore(raw, unit);
    if (crore == null) return;
    row.amountCrore = crore;
    row.amountLabel = croreLabel(crore);
  };
  for (const row of purposes) {
    if (/repayment|prepayment|redemption/i.test(row.purpose) && repayRaw != null) applyAmount(row, repayRaw);
    else if (/fit.?out|manufacturing facility|capital expenditure|Gautam Buddha|purchase of equipment/i.test(row.purpose) && fitRaw != null) applyAmount(row, fitRaw);
    else if (/working capital/i.test(row.purpose) && wcRaw != null) applyAmount(row, wcRaw);
    else if (/general corporate|inorganic growth/i.test(row.purpose)) {
      if (gcpRaw != null) applyAmount(row, gcpRaw);
      else row.amountLabel = "To be finalised in the prospectus";
    }
  }

  const denom = freshCrore != null && freshCrore > 0 ? freshCrore : null;
  if (denom) {
    for (const row of purposes) {
      if (row.amountCrore != null) {
        row.pct = Number(((row.amountCrore / denom) * 100).toFixed(2));
      }
    }
  }

  const anyAmount = purposes.some((row) => row.amountCrore != null);
  return {
    items: purposes,
    note: anyAmount
      ? "Amounts are from the RHP objects table, converted to ₹ crore. General corporate purpose is left blank when the RHP still prints [●] — it is not back-solved from the residual."
      : "RHP still prints object amounts as [●]. Purposes are listed from the official objects chapter; rupee split is not invented.",
    source: "NSE-hosted Red Herring Prospectus — Objects of the Offer",
  };
}

function parseRhptSections({ coverText = "", riskText = "", financialText = "", objectsText = "", businessText = "" } = {}) {
  const about = parseAbout(`${coverText}\n${businessText}`);
  const operations = parseOperations(businessText);
  const strengths = parseStrengths(businessText);
  const risks = parseRiskTitles(riskText);
  const financials = parseFinancialSummary(`${financialText}\n${businessText}`);
  const issueBreakdown = parseIssueComposition(`${coverText}\n${objectsText}\n${financialText}`);
  const objects = parseObjectsOfOffer(objectsText, issueBreakdown?.freshCrore);
  const available = Boolean(about || operations || strengths.length || risks.length || financials || objects);
  return {
    available,
    about,
    operations,
    strengths,
    risks,
    financials,
    objects,
    issueBreakdown,
    source: available ? "NSE-hosted Red Herring Prospectus" : null,
  };
}

function mainBookRows(categories = []) {
  return (categories || []).filter((row) => {
    const sr = String(row.srNo ?? "");
    if (/\(|\./.test(sr)) return false;
    const offered = row.sharesOffered;
    if (offered != null && offered <= 0) return false;
    const cat = row.category || "";
    if (/^Total$/i.test(cat)) return true;
    if (/Qualified Institutional/i.test(cat)) return true;
    if (/^Non Institutional Investors$/i.test(cat)) return true;
    if (/Retail Individual/i.test(cat)) return true;
    if (/^Employees?$/i.test(cat)) return true;
    return false;
  }).map((row) => {
    const offered = row.sharesOffered;
    const bid = row.sharesBid;
    const times = row.times;
    let label = row.category;
    if (/Qualified Institutional/i.test(label)) label = "Institutional (QIB)";
    else if (/^Non Institutional Investors$/i.test(label)) label = "NII";
    else if (/Retail Individual/i.test(label)) label = "Retail";
    else if (/Employees?/i.test(label)) label = "Employees";
    return {
      label,
      reservedLakhs: offered != null ? Number((offered / 1e5).toFixed(2)) : null,
      appliedLakhs: bid != null ? Number((bid / 1e5).toFixed(2)) : null,
      times: times != null && offered != null && offered > 0 ? Number(times) : null,
    };
  });
}

module.exports = {
  parseIssueComposition,
  mergeIssueBreakdown,
  parseFinancialSummary,
  parseAbout,
  parseOperations,
  parseStrengths,
  parseRiskTitles,
  parseObjectsOfOffer,
  parseRhptSections,
  mainBookRows,
  millionToCrore,
  croreLabel,
  detectUnit,
};
