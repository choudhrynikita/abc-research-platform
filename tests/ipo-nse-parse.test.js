const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const {
  parseIssueSnapshot,
  parseIssueSizeCrore,
  parsePriceBand,
  parseSubscriptionCategories,
  extractDocumentLinks,
  nseNumber,
} = require("../lib/nse-ipo");

const luminoIssueInfo = {
  dataList: [
    { title: "Lumino Industries Limited", value: "" },
    { title: "Symbol", value: "LUMINO" },
    { title: "Issue Period", value: "27-Aug-2026 to 31-Aug-2026" },
    { title: "Issue Size", value: '"Initial Public Offer of Fresh Issue of Aggregating up to Rs. 5000 million and Offer for sale up to Rs. 2000 million"' },
    { title: "Issue Type", value: "Book Building" },
    { title: "Price Range", value: "Rs. 78/- to Rs. 82/- per Equity Share" },
    { title: "Face Value", value: "Rs. 5 per Equity Share" },
    { title: "Bid Lot", value: "182 Equity Shares and in multiples thereof" },
    { title: "Minimum Order Quantity", value: "182 Equity Shares" },
    { title: "Book Running Lead Managers", value: '"Motilal Oswal Investment Advisors Limited, JM Financial Limited"' },
    { title: "Name of the Registrar", value: "Bigshare Services Private Limited" },
    { title: "Sponsor Bank", value: "Axis Bank Limited and HDFC Bank Limited" },
    { title: "Red Herring Prospectus", value: "https://nsearchives.nseindia.com/content/ipo/RHP_LUMINO.zip" },
    { title: "Ratios / Basis of Issue Price", value: "https://nsearchives.nseindia.com/content/ipo/RATIOS_LUMINO.zip" },
  ],
};

const bidDetails = [
  { category: "Qualified Institutional Buyers(QIBs)", noOfSharesOffered: "17692307", noOfTime: "0.42", noOfsharesBid: "7477834", srNo: "1" },
  { category: "Non Institutional Investors", noOfSharesOffered: "13269231", noOfTime: "68.32", noOfsharesBid: "906603880", srNo: "2" },
  { category: "Non Institutional Investors(Bid amount of more than Ten Lakh Rupees)", noOfSharesOffered: "8846154", noOfTime: "75.93", noOfsharesBid: "671769462", srNo: "2.1" },
  { category: "Retail Individual Investors(RIIs)", noOfSharesOffered: "30961538", noOfTime: "12.55", noOfsharesBid: "388584378", srNo: "3" },
  { category: "Employees", noOfSharesOffered: "1282051", noOfTime: "3.47", noOfsharesBid: "4451174", srNo: "4" },
  { category: "Total", noOfSharesOffered: "6.3205127E7", noOfTime: "20.68", noOfsharesBid: "1.307117266E9", srNo: null },
];

describe("NSE IPO issueInfo + bid book parsing", () => {
  it("reads lot size, face value, BRLMs and rupee issue size from issueInfo", () => {
    const snap = parseIssueSnapshot({ companyName: "LUMINO", issueInfo: luminoIssueInfo }, { symbol: "LUMINO" });
    assert.equal(snap.lotSize, 182);
    assert.equal(snap.faceValue, 5);
    assert.equal(snap.priceLow, 78);
    assert.equal(snap.priceHigh, 82);
    assert.equal(snap.issueSizeCrore, 700);
    assert.match(snap.issueSizeDisplay, /700/);
    assert.match(snap.leadManagers, /Motilal Oswal/);
    assert.equal(snap.registrar, "Bigshare Services Private Limited");
    assert.equal(snap.minInvestment, 182 * 82);
    assert.equal(snap.issueStartDate, "27-Aug-2026");
    assert.equal(snap.issueEndDate, "31-Aug-2026");
    assert.match(snap.companyName, /Lumino/i);
  });

  it("sums fresh + OFS million amounts into crore", () => {
    assert.equal(
      parseIssueSizeCrore("Fresh Issue aggregating up to Rs. 7200 million (including Anchor)"),
      720
    );
    assert.equal(parseIssueSizeCrore("Rs. 6,200 million and Offer for Sale aggregating up to Rs. 2,050 million"), 825);
  });

  it("parses the official bid book including Total scientific-notation shares", () => {
    const sub = parseSubscriptionCategories(bidDetails);
    assert.equal(sub.overall.available, true);
    assert.equal(sub.overall.value, 20.68);
    assert.equal(sub.overall.display, "20.68x");
    assert.equal(sub.overall.sharesOffered, 63205127);
    assert.equal(sub.retail.available, true);
    assert.equal(sub.qib.available, true);
    assert.equal(sub.nii.available, true);
    assert.equal(sub.employee.available, true);
    assert.ok(sub.categories.length >= 6);
  });

  it("extracts RHP and ratio document links", () => {
    const docs = extractDocumentLinks(luminoIssueInfo.dataList);
    assert.ok(docs.some((d) => d.key === "rhp" && d.url.includes("RHP_LUMINO")));
    assert.ok(docs.some((d) => d.key === "ratios"));
  });

  it("parses price bands and scientific share counts", () => {
    const band = parsePriceBand("Rs. 546/- to Rs. 575/- per Equity Share");
    assert.equal(band.low, 546);
    assert.equal(band.high, 575);
    assert.equal(nseNumber("6.3205127E7"), 63205127);
  });
});
