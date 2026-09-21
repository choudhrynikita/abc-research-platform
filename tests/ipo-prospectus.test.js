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

  it("converts Hero restated ₹ million assets/revenue/PAT into crore", () => {
    const fin = parseFinancialSummary(`
SUMMARY OF FINANCIAL INFORMATION
RESTATED STATEMENT OF ASSETS AND LIABILITIES ( in ₹ million, except for share data )
Particulars As at March 31, 2026 As at March 31, 2025 As at March 31, 2024
Total assets   13,718.28   11,646.20   10,598.55
Revenue from operations (I)   11,883.51   10,895.93   10,643.86
Restated profit for the year attributable to : Equity holder of parent   435.68   252.02   134.17
`);
    assert.equal(detectUnit(`RESTATED STATEMENT OF ASSETS AND LIABILITIES ( in ₹ million )`), "million");
    assert.equal(fin.years[0].assets, 1371.83);
    assert.equal(fin.years[0].revenue, 1188.35);
    assert.equal(fin.years[0].pat, 43.57);
    assert.ok(fin.analysis.some((a) => /Revenue up 9\.1%/i.test(a)));
  });

  it("reads Hero objects in American utilize spelling and keeps GCP as unpublished", () => {
    const objects = parseObjectsOfOffer(`
OBJECTS OF THE OFFER
Our Company proposes to utilize the Net Proceeds from the Fresh Issue towards funding the following objects:
1. Repayment/prepayment/redemption, in full or in part, of certain outstanding borrowings availed by our Company; and
2. Capital expenditure of our Company through purchase of equipment required for expansion in capacity of our Gautam Buddha Nagar, Uttar Pradesh facility; and
3. Funding inorganic growth through unidentified acquisitions and other strategic initiatives and general corporate purposes.
(collectively, the “Objects”)
Requirement of funds and Utilization of Net Proceeds
Particulars Estimated Amount (₹ million)
Repayment/prepayment/redemption in full or in part, of certain outstanding borrowings availed by our Company; 1,900.00
Capital expenditure of our Company through purchase of equipment required for expansion in capacity of our Gautam Buddha Nagar, Uttar Pradesh facility 2,000.00
Funding inorganic growth through unidentified acquisitions and other strategic initiatives and general corporate purposes [●]
Net Proceeds [●]
`, 600);
    assert.ok(objects);
    const repay = objects.items.find((i) => /repayment/i.test(i.purpose));
    const capex = objects.items.find((i) => /Gautam Buddha/i.test(i.purpose));
    const gcp = objects.items.find((i) => /inorganic growth/i.test(i.purpose));
    assert.equal(repay.amountCrore, 190);
    assert.equal(capex.amountCrore, 200);
    assert.equal(gcp.amountCrore, null);
    assert.match(gcp.amountLabel, /finalis/i);
    assert.doesNotMatch(objects.note, /still prints object amounts as \[●\]/);
  });

  it("reads Hero competitive-strength bullets and keeps the Europe 33.59% risk intact", () => {
    const strengths = parseStrengths(`
OUR COMPETITIVE STRENGTHS We believe that we are well positioned to take advantage of changing powertrain dynamics globally basis our strengths:
• Among India’s Leading Solutions Provider to Global E -Mobility Industry backed by Diversified Product and Service Offerings;
• Growing Market Presence in the Electric-Bikes and Premium Two-Wheelers Segments;
• Longstanding Relationships with Premier Global Original Equipment Manufacturers and Expertise in Delivering Solutions;
OUR STRATEGIES
`);
    assert.ok(strengths.some((s) => /E-Mobility/i.test(s)));
    assert.ok(strengths.some((s) => /Electric-Bikes/i.test(s)));
    assert.ok(!strengths.some((s) => /inorganic growth/i.test(s)));
    const about = parseAbout(`
OUR BUSINESS Overview We are one of India’s leading automotive technology companies engaged in designing, developing, manufacturing and supplying highly engineered powertrain solutions catering to automotive original equipment manufacturers.
Our Company is not related to such suppliers of equipment from whom quotations have been received.
We are a fully integrated powertrain systems provider offering comprehensive solutions including services for designing, prototyping, validating, developing, and delivering system-level and component-level powertrain solutions.
`);
    assert.match(about, /powertrain/i);
    assert.doesNotMatch(about, /quotations have been received/i);
    const ops = parseOperations("In India, our manufacturing facilities are situated at Gautam Buddha Nagar, Uttar Pradesh and Ludhiana, Punjab. In addition, we operate two technology centers.");
    assert.match(ops, /Gautam Buddha Nagar/i);
    assert.match(ops, /Ludhiana/i);
    const risks = parseRiskTitles(`
SECTION II: RISK FACTORS An investment in our Equity Shares involves a high degree of risk.
Internal Risk Factors
1. We generate a portion of our revenue from operations from jurisdictions outside India, in particular, from Europe which contributed 33.59%, 28.45% and 29.33%, of our revenue from operations, in Fiscal 2026, 2025 and 2024, respectively. Any adverse events affecting these jurisdictions could have an adverse impact on our revenue from operations.
2. Our business is dependent on the performance of certain industries particularly e-bikes and two wheelers, both in the Indian and overseas markets. Any adverse changes in the conditions affecting these industries can adversely impact our business.
`);
    assert.ok(risks.some((r) => /Europe which contributed 33\.59%/i.test(r)));
    assert.ok(!risks.some((r) => /Europe which contributed 33$/i.test(r)));
  });

  it("ships a Hero Motors RHP extract so the company page is not empty when the live zip cannot be parsed", () => {
    const bundled = bundledProspectus("HEROMOTORS");
    assert.equal(bundled.available, true);
    assert.match(bundled.about, /powertrain/i);
    assert.equal(bundled.financials.years[0].revenue, 1188.35);
    assert.equal(bundled.financials.years[0].assets, 1371.83);
    assert.equal(bundled.financials.years[0].pat, 43.57);
    assert.ok(bundled.strengths.some((s) => /E-Mobility|e-mobility|OEM/i.test(s)));
    assert.ok(bundled.risks.some((r) => /Europe which contributed 33\.59%/i.test(r)));
    const repay = bundled.objects.items.find((i) => /repayment/i.test(i.purpose));
    const capex = bundled.objects.items.find((i) => /Gautam Buddha|equipment/i.test(i.purpose));
    const gcp = bundled.objects.items.find((i) => /inorganic|general corporate/i.test(i.purpose));
    assert.equal(repay.amountCrore, 190);
    assert.equal(capex.amountCrore, 200);
    assert.equal(gcp.amountCrore, null);
  });
});

const SPECTRAA_FIN = `
SUMMARY OF RESTATED CONSOLIDATED FINANCIAL STATEMENTS
The following tables provide the summary of financial information of our Company derived from the Restated Consolidated Financial Statements for the financial years ended March 31, 2026, March 31, 2025 and March 31, 2024.
(Amount in INR lakhs)
Particulars Note No. As at 31 March, 2026 As at 31 March, 2025 As at 31 March, 2024
EQUITY AND LIABILITIES
Total Outstanding dues of micro enterprises and small enterprises; and 84.06 893.96 1,032.11
Total Outstanding dues of creditors other than micro enterprises and small enterprises 3,336.53 1,935.46 1,414.35
Total 10,628.84 9,999.74 6,664.47
ASSETS
(e) Other Current Assets 18 19.14 25.81 22.64
Total 10,628.84 9,999.74 6,664.47
Revenue From Operations 19 10,116.21 7,516.62 8,896.17
Other Income 20 188.29 36.44 71.73
Total Income 10,304.50 7,553.06 8,967.90
Profit for the period 1,155.71 491.43 200.45
`;

const SPECTRAA_COVER = `
INITIAL PUBLIC OFFER OF UPTO 36,03,600 EQUITY SHARES OF FACE VALUE OF ₹ 10/- EACH OF SPECTRAA TECHNOLOGY SOLUTIONS LIMITED
COMPRISING OF A FRESH ISSUE OF UPTO 32,55,600 EQUITY SHARES OF FACE VALUE OF ₹ 10/- EACH AGGREGATING TO ₹ [●] LAKHS (THE “FRESH ISSUE”) AND AN OFFER FOR SALE OF UPTO 3,48,000 EQUITY SHARES OF FACE VALUE OF ₹ 10/- EACH
`;

const SPECTRAA_OBJECTS = `
OBJECTS OF THE OFFER
The Offer comprises Fresh Issue of up to 32,55,600 * Equity Shares aggregating up to ₹ [●] lakhs by our Company and Offer for Sale of up to 3,48,000 * Equity Shares aggregating up to ₹ [●] lakhs by the Promoter Selling Shareholders.
Our Company proposes to utilise the Net Proceeds towards funding of the following objects:
1. Capital Expenditure at Jaipur manufacturing facility
2. Repayment of Term Loans availed by our Company ;
3. Meet the Working Capital requirements;
4. General Corporate Purposes; and
5. Offer Expenses.
(Collectively referred as the “ Objects ”)
Utilization of Net Proceeds
The Net Proceeds are proposed to be used in accordance with the details as set forth below:
(₹ in lakhs)
Sr. No Particulars Estimated Amount % of Net Proceeds
1. Capital Expenditure at Jaipur manufacturing facility Up to 1,100.00 # [●]
2. Repayment of Term Loans availed by our Company Up to 647.72 [●]
3. Working Capital requirements Up to 950.00 [●]
4. General Corporate Purposes (1)(2) [●] [●]
Net issue Proceeds [●] [●]
`;

const SPECTRAA_BUSINESS = `
OUR BUSINESS
OVERVIEW Our Company, SpectraA Technology Solutions Limited, was incorporated as a private company on January 20, 2009 in Bengaluru and converted to a public limited company on February 01, 2021. We provide engineering, designing, fabrication, installation, commissioning and decommissioning greenfield and brownfield projects across various industries which include, Breweries (Craft and Microbreweries), Distilleries, Food and Beverages, Malt Spirit and Blending, Extraction Plants, FMCG (Fast Moving Consumer Goods) and Pharmaceuticals. We undertake projects with full responsibility from design to handover, build key equipment in-house, use standardized modules and appropriate designs, and deploy project teams across client sites, which helps us deliver on schedule, cut rework, and control costs.
We have two manufacturing facilities located at Bengaluru and Jaipur with an aggregate built up area of 33,214.75 square feet.
Commercial Brewery Equipment 6,893.43 68.14% 4,117.70 54.78% 6,260.47 70.37%
Our export revenue was 29.38% of total revenue from operations and the top ten customers accounted for 65.60% of total revenue from operations in the financial year ended March 31, 2026.
As on August 25, 2026, our order book (exclusing GST) stands at ₹ 8,129.61 lakhs.
STRENGTHS
1. Geographical Advantage of two manufacturing facilities
We operate two manufacturing facilities – one in Bengaluru and one in Jaipur.
2. In-house Product Fabrication
We fabricate all our equipment in house from design to final assembly.
3. Diversified and Sustainable Order Book
Our order pipeline is anchored by existing and repeat customers.
4. Quality Control and Compliance
We apply quality checks across the production lifecycle.
5. Experienced Leadership and Skilled Team
A L Arun Kumar, our Promoter and Chairman and Managing Director, has an experience of 21 in this industry.
STRATEGIES
COMPETITION
We operate in a fragmented and highly competitive market that includes large domestic OEMs, international suppliers (often via imports), and numerous regional fabricators. Competitive intensity is elevated by buyers’ strong bargaining power, modular equipment options, and active upgrading by breweries and malt-spirit producers and the players differentiate themselves by technology, efficiency, service coverage, and lifecycle support. Key domestic competitors include Praj Industries (largest share among domestic players), along with Alfa Laval India, GEA, and Prodeb. (Key competitors identified as per the Credence Report)
`;

const SPECTRAA_INDUSTRY = `
INDUSTRY OVERVIEW
The India beer and malt spirit equipment market was valued at USD 165.09 million in 2018, grew to USD 204.08 million in 2024, and is projected to reach USD 302.28 million by 2032. This steady growth highlights the combined impact of rising beer consumption, the expansion of microbreweries, and the increasing demand for premium malt spirits.
The India Beer and Malt-Spirit Equipment Market is witnessing robust growth, driven by evolving consumer preferences, premiumization trends, expanding raw material capacity, and government policy support for the broader alcoholic beverages industry.
`;

const SPECTRAA_RISK = `
SECTION II – RISK FACTORS An investment in Equity Shares involves a high degree of risk.
INTERNAL RISK FACTORS
1. We derive a significant portion of our revenue from limited number of customers. The loss of any customer, the deterioration of their financial condition or prospects, or a reduction in their demand for our products could adversely affect our business, results of operations, financial condition and cash flows.
2. We depend on a limited number of suppliers for our raw materials, and any disruption in supply or adverse change in supply terms it may materially affect our business. For the Fiscals 2026, 2025, and 2024 the cost of raw materials sourced from our top 10 suppliers accounted for 43.35%.
4. We are unable to locate the Consent to Establish for our manufacturing unit at Jaipur and any inability to comply with applicable environmental laws may expose us to regulatory action and could adversely affect our business, financial condition and results of operations. The Jaipur unit is leased.
5. Our revenues are significantly dependent on certain geographical regions, and any adverse developments in these regions could adversely impact our business, financial condition and results of operations. Concentration of revenue is set out below.
6. Our revenues have been on a decreasing trend for the financial year ended March 31, 2025 and March 31, 2024. This is due to a strategic shift towards higher-margin products by our Company. If we are unable to secure sufficient high-margin orders our revenues may continue to be adversely impacted.
`;

describe("SpectraA official RHP extract", () => {
  it("converts restated ₹ lakh totals into crore from Revenue From Operations, not Total Income", () => {
    const { detectUnit, parseFinancialSummary } = require("../lib/ipo-prospectus");
    assert.equal(detectUnit(SPECTRAA_FIN), "lakh");
    const fin = parseFinancialSummary(SPECTRAA_FIN);
    assert.ok(fin);
    const y0 = fin.years.find((y) => y.label === "March 2026");
    assert.equal(y0.assets, 106.29);
    assert.equal(y0.revenue, 101.16);
    assert.equal(y0.pat, 11.56);
    assert.ok(y0.revenue !== 103.05);
    assert.ok(fin.analysis.some((a) => /Revenue up 34\.6%/i.test(a)));
    assert.ok(fin.analysis.some((a) => /PAT margin 11\.4%/i.test(a)));
  });

  it("sizes the offer from RHP share counts × cap ₹118 and does not invent GCP rupees", () => {
    const { parseIssueComposition, parseObjectsOfOffer, parseShareCounts } = require("../lib/ipo-prospectus");
    const shares = parseShareCounts(SPECTRAA_COVER);
    assert.equal(shares.freshShares, 3255600);
    assert.equal(shares.ofsShares, 348000);
    assert.equal(shares.totalShares, 3603600);
    const issue = parseIssueComposition(SPECTRAA_COVER, null, 118);
    assert.equal(issue.totalCrore, 42.52);
    assert.equal(issue.freshCrore, 38.42);
    assert.equal(issue.ofsCrore, 4.11);
    const objects = parseObjectsOfOffer(SPECTRAA_OBJECTS, 38.42);
    const jaipur = objects.items.find((i) => /Jaipur/i.test(i.purpose));
    const repay = objects.items.find((i) => /Term Loans/i.test(i.purpose));
    const wc = objects.items.find((i) => /Working Capital/i.test(i.purpose));
    const gcp = objects.items.find((i) => /General Corporate/i.test(i.purpose));
    assert.equal(jaipur.amountCrore, 11);
    assert.equal(repay.amountCrore, 6.48);
    assert.equal(wc.amountCrore, 9.5);
    assert.equal(gcp.amountCrore, null);
    assert.match(gcp.amountLabel, /finalis/i);
    assert.ok(!objects.items.some((i) => /offer expenses/i.test(i.purpose)));
    assert.ok(!objects.items.some((i) => i.amountCrore === 11.44));
  });

  it("reads SpectraA about, plants, numbered strengths, risks, and Credence competition", () => {
    const {
      parseAbout,
      parseOperations,
      parseStrengths,
      parseRiskTitles,
      parseCompetition,
      parseSector,
      parseStand,
      parseRhptSections,
    } = require("../lib/ipo-prospectus");
    const about = parseAbout(SPECTRAA_BUSINESS);
    assert.match(about, /engineering, designing, fabrication/i);
    assert.match(about, /Breweries/i);
    const ops = parseOperations(SPECTRAA_BUSINESS);
    assert.match(ops, /Bengaluru and Jaipur/i);
    const strengths = parseStrengths(SPECTRAA_BUSINESS);
    assert.ok(strengths.some((s) => /Geographical Advantage/i.test(s)));
    assert.ok(strengths.some((s) => /In-house Product Fabrication/i.test(s)));
    const risks = parseRiskTitles(SPECTRAA_RISK);
    assert.ok(risks.some((r) => /limited number of customers/i.test(r)));
    assert.ok(risks.some((r) => /Consent to Establish/i.test(r)));
    assert.match(parseCompetition(SPECTRAA_BUSINESS), /Praj Industries/i);
    assert.match(parseSector(SPECTRAA_INDUSTRY), /USD 204\.08 million in 2024/i);
    assert.match(parseStand(SPECTRAA_BUSINESS), /68\.14%/);
    const d = parseRhptSections({
      coverText: SPECTRAA_COVER,
      businessText: SPECTRAA_BUSINESS,
      financialText: SPECTRAA_FIN,
      objectsText: SPECTRAA_OBJECTS,
      riskText: SPECTRAA_RISK,
      industryText: SPECTRAA_INDUSTRY,
    });
    assert.equal(d.available, true);
    assert.equal(d.financials.years[0].revenue, 101.16);
    assert.match(d.sector.competition, /Alfa Laval India/i);
  });

  it("prefers RHP share-count issue size over an NSE net-of-anchor book print", () => {
    const { parseIssueComposition, mergeIssueBreakdown } = require("../lib/ipo-prospectus");
    const fromNse = parseIssueComposition("", 30.43);
    const fromRhp = parseIssueComposition(SPECTRAA_COVER, null, 118);
    const merged = mergeIssueBreakdown(fromRhp, fromNse);
    assert.equal(merged.totalCrore, 42.52);
    assert.equal(merged.freshCrore, 38.42);
    assert.equal(merged.ofsCrore, 4.11);
  });

  it("ships a SpectraA RHP extract so the company page is not empty when the live zip cannot be parsed", () => {
    const bundled = bundledProspectus("SPECTRAA");
    assert.equal(bundled.available, true);
    assert.match(bundled.about, /Breweries/i);
    assert.match(bundled.operations, /Bengaluru and Jaipur/i);
    assert.equal(bundled.financials.years[0].assets, 106.29);
    assert.equal(bundled.financials.years[0].revenue, 101.16);
    assert.equal(bundled.financials.years[0].pat, 11.56);
    assert.equal(bundled.issueBreakdown.totalCrore, 42.52);
    assert.equal(bundled.issueBreakdown.freshCrore, 38.42);
    assert.equal(bundled.issueBreakdown.ofsCrore, 4.11);
    const jaipur = bundled.objects.items.find((i) => /Jaipur/i.test(i.purpose));
    const gcp = bundled.objects.items.find((i) => /General Corporate/i.test(i.purpose));
    assert.equal(jaipur.amountCrore, 11);
    assert.equal(gcp.amountCrore, null);
    assert.match(bundled.sector.competition, /Praj Industries/i);
    assert.match(bundled.sector.stand, /68\.14%/);
  });
});
