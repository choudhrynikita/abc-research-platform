const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  parseAbout,
  parseOperations,
  parseStrengths,
  parseRiskTitles,
  parseFinancialSummary,
  parseObjectsOfOffer,
  parseIssueComposition,
  parseRhptSections,
  mergeIssueBreakdown,
  mainBookRows,
  detectUnit,
} = require("../lib/ipo-prospectus");
const { nseRhpArchiveUrl, extractDocumentLinks } = require("../lib/nse-ipo");
const { bundledProspectus } = require("../lib/ipo-rhp");

const KHERIA_BUSINESS = `
BUSINESS OVERVIEW The following information is qualified in its entirety by, and should be read together with, the more detailed financial and other information.
OVERVIEW Our Company is an auto ancillary unit engaged in the business of plastic injection moulding. We specialise in the manufacture of plastic injection moulding sub- assembly operations and supplying primarily to the automotive sector. In earlier years, the Company also catered to the white goods segment.
We operate as a Tier-II supplier, producing moulded plastic components in accordance with the specifications of Tier-I vendors, who in turn supply to original equipment manufacturers.
OUR COMPETITIVE STRENGTHS Experience-Driven Manufacturing Excellence Our Company, incorporated in 2009 has developed over a decade of operational experience in the field of plastic injection moulding components. As an auto ancillary we supply to Tier-I vendors.
Strategically located manufacturing facilities Our Company operates a manufacturing facility at the Tata Vendor Park in Sanand, Gujarat. This location offers logistical advantages due to its proximity to OEM plants.
Efficient Raw Material Sourcing and Inventory Management We source raw materials from a network of established and approved suppliers, including vendors nominated by customers.
`;

const KHERIA_FIN = `
57 SUMMARY OF FINANCIAL INFORMATION Financial Statements of Assets & Liabilities as Restated ( ₹ IN LAKHS )
S. N PARTICULARS FOR THE YEAR ENDED 31/03/2026 FOR THE YEAR ENDED 31/03/2025 FOR THE YEAR ENDED 31/03/2024
TOTAL(A+B) 10,623.17 8,178.56 5,313.87
I Revenue from Operations 12,001.47 9,207.17 6,231.93
FINANCIAL KPIs OF OUR COMPANY Particulars For the period ended March 31, 2026 March 31, 2025 March 31, 2024
Revenue from Operations (₹ in Lakhs) 12,001.47 9,207.17 6,231.93
Profit After Tax (₹ in Lakhs) 1,142.33 824.49 330.65
`;

const KHERIA_RISK = `
21 SECTION II – RISK FACTORS An investment in our Equity Shares involves a high degree of financial risk.
Some events may have material impact quantitatively; 2. Some events may not be material individually but may be found material collectively; 3. Some events may not be material at present but may be having material impact in future.
1. We are dependent on Tier-I vendors, whose demand is directly linked to OEM procurement cycles. Any reduction or discontinuance of their demand may adversely affect our business, financial condition and results of operations. We are engaged in the manufacturing of plastic injection moulding.
3. A substantial portion of our revenue is derived from customers located in the state of Gujarat. Any adverse developments in this region may materially and adversely affect our business and results of operations.
`;

const KHERIA_OBJECTS = `
OBJECT OF THE ISSUE This issue includes a Fresh Issue of upto 45,98,400 Equity Shares of our Company.
We intend to utilize the Net Proceeds of the Issue to meet the following objects:
1. Part funding of capital expenditure for setting up of new manufacturing facility for plastic moulded auto components at GIDC Sanand Industrial Park; and
2. General Corporate Purposes
(Collectively, referred as the “ Objects ”)
`;

const KHERIA_COVER = `
KHERIA AUTOCOMP LIMITED DETAILS OF THE ISSUE TYPE FRESH ISSUE SIZE OFS SIZE TOTAL ISSUE SIZE
Fresh Issue Upto 45,98,400 Equity Shares of face value of ₹ 10 each aggregating up to ₹ [●] Lakhs
NIL
DETAILS OF OFFER FOR SALE, SELLING SHAREHOLDERS AND THEIR WEIGHTED AVERAGE COST OF ACQUISITION – NOT APPLICABLE AS THIS IS A FRESH ISSUE OF EQUITY SHARES
`;

describe("RHP prospectus extractors", () => {
  it("reads Kheria about / operations from BUSINESS OVERVIEW, not the incorporation paragraph", () => {
    const about = parseAbout(KHERIA_BUSINESS);
    assert.match(about, /auto ancillary/i);
    assert.match(about, /plastic injection moulding/i);
    assert.doesNotMatch(about, /Company Limited by Shares/);
    const ops = parseOperations(KHERIA_BUSINESS);
    assert.match(ops, /Tier-II/i);
  });

  it("converts restated ₹ lakh rows into crore and does not treat lakhs as million", () => {
    const fin = parseFinancialSummary(KHERIA_FIN);
    assert.ok(fin);
    const y0 = fin.years.find((y) => y.label === "March 2026");
    assert.equal(y0.revenue, 120.01);
    assert.equal(y0.pat, 11.42);
    assert.equal(y0.assets, 106.23);
    assert.ok(fin.analysis.some((a) => /Revenue up 30\.3%/i.test(a)));
  });

  it("skips the materiality preamble and keeps real risk titles", () => {
    const risks = parseRiskTitles(KHERIA_RISK);
    assert.ok(risks.some((r) => /Tier-I vendors/i.test(r)));
    assert.ok(risks.some((r) => /Gujarat/i.test(r)));
    assert.ok(!risks.some((r) => /material impact quantitatively/i.test(r)));
  });

  it("reads objects of the issue even when amounts are still [●]", () => {
    const objects = parseObjectsOfOffer(KHERIA_OBJECTS);
    assert.ok(objects);
    assert.ok(objects.items.some((i) => /manufacturing facility/i.test(i.purpose)));
    assert.ok(objects.items.some((i) => /General Corporate/i.test(i.purpose)));
  });

  it("marks a fresh-only SME cover as OFS nil", () => {
    const issue = parseIssueComposition(KHERIA_COVER, 33.21);
    assert.equal(issue.ofsCrore, 0);
    assert.match(issue.ofsLabel, /Nil/i);
  });

  it("packs a dossier from mixed RHP sections", () => {
    const d = parseRhptSections({
      coverText: KHERIA_COVER,
      businessText: KHERIA_BUSINESS,
      financialText: KHERIA_FIN,
      riskText: KHERIA_RISK,
      objectsText: KHERIA_OBJECTS,
    });
    assert.equal(d.available, true);
    assert.match(d.about, /auto ancillary/i);
    assert.equal(d.financials.years[0].revenue, 120.01);
    assert.ok(d.risks.length >= 2);
    assert.ok(d.objects.items.length >= 2);
  });

  it("drops bid-book rows with 0 shares offered so a 0.00x print is not shown as a book", () => {
    const rows = mainBookRows([
      { srNo: "1", category: "Qualified Institutional Buyers(QIBs)", sharesOffered: 0, sharesBid: 198000, times: 0 },
      { srNo: "3", category: "Retail Individual Investors(RIIs)", sharesOffered: 1528800, sharesBid: 640800, times: 0.42 },
      { srNo: null, category: "Total", sharesOffered: 0, sharesBid: 595200, times: 0 },
    ]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].label, "Retail");
    assert.equal(rows[0].times, 0.42);
  });

  it("points SME empty issue pages at the NSE RHP zip naming convention", () => {
    assert.equal(nseRhpArchiveUrl("KHERIAAUTO"), "https://nsearchives.nseindia.com/content/ipo/RHP_KHERIAAUTO.zip");
    assert.equal(nseRhpArchiveUrl("../etc"), null);
    const docs = extractDocumentLinks([
      { title: "Prospectus", value: "https://nsearchives.nseindia.com/content/ipo/RHP_DEMO.zip" },
    ]);
    assert.equal(docs[0].key, "rhp");
  });

  it("still reads a mainboard Our Strengths / We are a overview", () => {
    const about = parseAbout("Overview We are a multi-brand retail chain selling mobile phones, pre-owned devices, and accessories. The company operates stores.");
    assert.match(about, /multi-brand retail/i);
    const strengths = parseStrengths("Our Strengths Established multi-brand retail presence across tier II and III markets. We operate company-owned and franchisee stores. Scalable franchise-led retail store expansion model. We primarily focus on the COFO network.");
    assert.ok(strengths.length >= 1);
  });

  it("does not treat a TOC page as million when the restated table is in lakhs", () => {
    const tocThenTable = `
TABLE OF CONTENTS SUMMARY OF FINANCIAL INFORMATION ........................ 57 BUSINESS OVERVIEW ........................ 136
${KHERIA_FIN}
`;
    assert.equal(detectUnit(tocThenTable), "lakh");
    const fin = parseFinancialSummary(tocThenTable);
    assert.equal(fin.years[0].revenue, 120.01);
    assert.ok(fin.analysis.some((a) => /PAT margin 9\.5%/i.test(a)));
  });

  it("reads OUR COMPETITIVE STRENGTHS headings instead of the TOC BUSINESS OVERVIEW line", () => {
    const tocPlusBiz = `
TABLE OF CONTENTS BUSINESS OVERVIEW ............................................................................. 136
${KHERIA_BUSINESS}
`;
    const strengths = parseStrengths(tocPlusBiz);
    assert.ok(strengths.some((s) => /Experience-Driven Manufacturing Excellence/i.test(s)));
    assert.ok(strengths.some((s) => /Strategically located manufacturing facilities/i.test(s)));
    assert.ok(strengths.some((s) => /Raw Material Sourcing/i.test(s)));
  });

  it("merges NSE live book size with an RHP fresh-only OFS nil cover", () => {
    const fromNse = parseIssueComposition("", 33.21);
    const fromRhp = parseIssueComposition(KHERIA_COVER);
    const merged = mergeIssueBreakdown(fromNse, fromRhp);
    assert.equal(merged.totalCrore, 33.21);
    assert.equal(merged.freshCrore, 33.21);
    assert.equal(merged.ofsCrore, 0);
    assert.match(merged.ofsLabel, /Nil/i);
  });

  it("strips a trailing '; and' from numbered objects", () => {
    const objects = parseObjectsOfOffer(KHERIA_OBJECTS);
    const capex = objects.items.find((i) => /manufacturing facility/i.test(i.purpose));
    assert.ok(capex);
    assert.doesNotMatch(capex.purpose, /;\s*and$/i);
    assert.match(objects.note, /\[●\]/);
  });

  it("ships a Kheria RHP extract so the company page is not empty when the live zip cannot be parsed", () => {
    const bundled = bundledProspectus("KHERIAAUTO");
    assert.equal(bundled.available, true);
    assert.match(bundled.about, /auto ancillary/i);
    assert.equal(bundled.financials.years[0].revenue, 120.01);
    assert.ok(bundled.strengths.some((s) => /Strategically located/i.test(s)));
    assert.ok(bundled.risks.some((r) => /Tier-I vendors/i.test(r)));
    assert.equal(bundledProspectus("../etc"), null);
  });
});
