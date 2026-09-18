/**
 * Pull company write-up, restated financials, objects and risk titles
 * from the NSE-hosted RHP zip. Cached. Never invents unpublished fields.
 */

const JSZip = require("jszip");
const { fetchNseBinary, nseRhpArchiveUrl } = require("./nse-ipo");
const { getDashboardCache, setDashboardCache } = require("./dashboard-cache");
const { parseRhptSections } = require("./ipo-prospectus");

const CACHE_MS = 12 * 60 * 60 * 1000;

function looksLikeToc(text) {
  return (String(text || "").match(/\.{12,}/g) || []).length >= 5;
}

function tocPrintedPage(text, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`${escaped}\\s*[.\\u2026\\u00b7•][.\\s\\u2026\\u00b7•]{2,}(\\d{1,3})`, "i");
  const m = String(text || "").match(re);
  return m ? Number(m[1]) : null;
}

function detectOffset(pages) {
  for (const page of pages) {
    if (!/SECTION I\s*[–—:\-]\s*GENERAL/i.test(page.text)) continue;
    const m = page.text.match(/(\d{1,3})\s+SECTION I\s*[–—:\-]\s*GENERAL/i)
      || page.text.match(/SECTION I\s*[–—:\-]\s*GENERAL[\s\S]{0,40}?(\d{1,3})/i);
    const printed = m ? Number(m[1]) : null;
    if (printed != null && printed < 20) return page.page - printed;
  }
  return 4;
}

function rangeAround(printed, offset, before, after, numPages) {
  if (printed == null) return [];
  const center = printed + offset;
  const start = Math.max(1, center - before);
  const end = Math.min(numPages, center + after);
  const out = [];
  for (let i = start; i <= end; i++) out.push(i);
  return out;
}

async function pdfPages(buffer, wanted) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await getDocument({
    data: new Uint8Array(buffer),
    disableWorker: true,
    isEvalSupported: false,
    useSystemFonts: true,
    verbosity: 0,
  }).promise;
  const uniq = [...new Set(wanted.filter((n) => n >= 1 && n <= doc.numPages))];
  const pages = [];
  for (const n of uniq) {
    const page = await doc.getPage(n);
    const content = await page.getTextContent();
    const text = content.items.map((item) => item.str).join(" ");
    pages.push({ page: n, text });
  }
  return { numPages: doc.numPages, pages };
}

function joinPages(pages, predicate) {
  return pages.filter(predicate).map((p) => p.text).join("\n");
}

async function unzipRhpPdf(zipBuf) {
  const zip = await JSZip.loadAsync(zipBuf);
  const pdfs = [];
  zip.forEach((name, file) => {
    if (file.dir) return;
    if (!/\.pdf$/i.test(name)) return;
    pdfs.push({ name, file });
  });
  if (!pdfs.length) throw new Error("RHP zip contained no PDF");
  const preferred = pdfs.find((p) => /rhp/i.test(p.name) && !/gid/i.test(p.name))
    || pdfs.filter((p) => !/gid/i.test(p.name)).sort((a, b) => b.name.length - a.name.length)[0]
    || pdfs[0];
  return Buffer.from(await preferred.file.async("uint8array"));
}

async function extractDossierFromPdf(pdfBuf) {
  const first = await pdfPages(pdfBuf, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  const toc = first.pages.map((p) => p.text).join("\n");
  const offset = detectOffset(first.pages);
  const finP = tocPrintedPage(toc, "SUMMARY OF FINANCIAL INFORMATION");
  const objP = tocPrintedPage(toc, "OBJECTS OF THE OFFER")
    || tocPrintedPage(toc, "OBJECTS OF THE ISSUE")
    || tocPrintedPage(toc, "OBJECT OF THE ISSUE");
  const bizP = tocPrintedPage(toc, "OUR BUSINESS")
    || tocPrintedPage(toc, "BUSINESS OVERVIEW");
  const riskP = tocPrintedPage(toc, "SECTION II: RISK FACTORS")
    || tocPrintedPage(toc, "SECTION II – RISK FACTORS")
    || tocPrintedPage(toc, "SECTION II - RISK FACTORS")
    || tocPrintedPage(toc, "RISK FACTORS");

  const wanted = new Set(first.pages.map((p) => p.page));
  for (const n of rangeAround(finP, offset, 1, 10, 800)) wanted.add(n);
  for (const n of rangeAround(objP, offset, 1, 8, 800)) wanted.add(n);
  for (const n of rangeAround(bizP, offset, 0, 20, 800)) wanted.add(n);
  for (const n of rangeAround(riskP, offset, 0, 16, 800)) wanted.add(n);

  const more = await pdfPages(pdfBuf, [...wanted]);
  const pages = more.pages;
  const coverText = joinPages(pages, (p) => p.page <= 12);
  const financialText = joinPages(pages, (p) => (
    !looksLikeToc(p.text)
    && /as Restated|TOTAL\(A\+B\)|FINANCIAL KPIs|Revenue from Operations\s/i.test(p.text)
  ));
  const objectsText = joinPages(pages, (p) => (
    !looksLikeToc(p.text)
    && /OBJECT(?:S)? OF THE (OFFER|ISSUE)|Requirement of Funds|Utilisation of Net Proceeds|intend to utilize the Net Proceeds/i.test(p.text)
  ));
  const businessText = joinPages(pages, (p) => (
    !looksLikeToc(p.text)
    && /OUR BUSINESS|BUSINESS OVERVIEW|OUR COMPETITIVE STRENGTHS|Our Strengths|Overview\s+We are|Our Company is an |We operate as|Strategically located/i.test(p.text)
  ));
  const riskText = joinPages(pages, (p) => (
    !looksLikeToc(p.text)
    && /RISK FACTORS|\d+\.\s+(?:We |Our Company|Our |A substantial)/i.test(p.text)
  ));

  return parseRhptSections({ coverText, riskText, financialText, objectsText, businessText });
}

async function loadProspectusDossier({ symbol, rhpUrl } = {}) {
  const key = `ipo-rhp-${String(symbol || "").toUpperCase()}`;
  const cached = await getDashboardCache(key, CACHE_MS);
  if (cached?.data) return cached.data;
  const url = rhpUrl || nseRhpArchiveUrl(symbol);
  if (!url || !/^https:\/\/nsearchives\.nseindia\.com\//i.test(url)) {
    return { available: false, message: "NSE has not published an RHP zip for this symbol yet." };
  }
  try {
    const zipBuf = await fetchNseBinary(url, 90_000);
    const pdfBuf = zipBuf.slice(0, 4).toString("utf8") === "%PDF" ? zipBuf : await unzipRhpPdf(zipBuf);
    const dossier = await extractDossierFromPdf(pdfBuf);
    const payload = {
      ...dossier,
      symbol,
      rhpUrl: url,
      fetchedAt: new Date().toISOString(),
    };
    if (payload.available) await setDashboardCache(key, payload);
    return payload;
  } catch (err) {
    return {
      available: false,
      symbol,
      rhpUrl: url,
      message: "Could not read the NSE RHP zip this session. Open the prospectus link instead of using unofficial write-ups.",
      error: err.message,
    };
  }
}

module.exports = { loadProspectusDossier, parseRhptSections };
