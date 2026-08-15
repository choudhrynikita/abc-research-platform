const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  analyzeHeadline,
  classifyTheme,
  classifyBias,
  isMarketNews,
  parseRssItems,
  mergeAndRank,
} = require("../lib/news-engine");

describe("isMarketNews", () => {
  it("keeps Indian market headlines and drops sports/entertainment", () => {
    assert.equal(isMarketNews({ title: "NIFTY 50 ends higher as banks rally" }), true);
    assert.equal(isMarketNews({ title: "RBI holds repo rate, rupee steady" }), true);
    assert.equal(isMarketNews({ title: "Bollywood star launches new movie trailer" }), false);
    assert.equal(
      isMarketNews({ title: "Larry Fink Says Oil Could Be Cut in Half", publisher: "24/7 Wall St." }),
      false
    );
  });
});

describe("classifyTheme + bias", () => {
  it("tags RBI rate-cut headlines as policy / bullish", () => {
    const text = "RBI surprises with a 25 bps repo rate cut";
    assert.equal(classifyTheme(text).id, "rbi_policy");
    assert.equal(classifyBias(text, "rbi_policy"), "bullish");
  });

  it("tags FII selling as flow / bearish", () => {
    const text = "FIIs dump Indian shares in a heavy outflow session";
    assert.equal(classifyTheme(text).id, "fii_dii");
    assert.equal(classifyBias(text, "fii_dii"), "bearish");
  });

  it("tags holiday closures as watch, not a trade", () => {
    const text = "Indian stock markets remain closed on account of Good Friday";
    assert.equal(classifyTheme(text).id, "holiday_session");
    assert.equal(classifyBias(text, "holiday_session"), "watch");
  });
});

describe("analyzeHeadline", () => {
  it("never invents a ticker and marks impact as interpretation", () => {
    const a = analyzeHeadline({
      title: "Indian stock markets remain closed on Independence Day",
      summary: "",
    });
    assert.equal(a.bias, "watch");
    assert.equal(a.relatedSymbols.length, 0);
    assert.equal(a.stockImpact.available, false);
    assert.match(a.marketImpact.summary, /holiday|session|gap/i);
    assert.match(a.action.label, /stand down|closed/i);
    assert.match(a.disclaimer, /not investment advice/i);
  });

  it("links Reliance earnings headlines to RELIANCE.NS", () => {
    const a = analyzeHeadline({
      title: "Reliance Industries quarterly profit jumps as earnings beat estimates",
      summary: "",
    });
    assert.equal(a.theme, "earnings");
    assert.equal(a.bias, "bullish");
    assert.ok(a.relatedSymbols.some((s) => s.symbol === "RELIANCE.NS"));
    assert.equal(a.stockImpact.available, true);
    assert.match(a.action.steps.join(" "), /research terminal|do not chase|gap/i);
  });
});

describe("parseRssItems + mergeAndRank", () => {
  it("parses RSS items and drops non-market duplicates", () => {
    const xml = `
      <rss><channel>
        <item>
          <title>NIFTY 50 ends higher as banks rally</title>
          <link>https://example.com/a</link>
          <pubDate>Sat, 15 Aug 2026 10:00:00 GMT</pubDate>
          <source url="https://example.com">Example Desk</source>
        </item>
        <item>
          <title>NIFTY 50 ends higher as banks rally</title>
          <link>https://example.com/a-dup</link>
          <pubDate>Sat, 15 Aug 2026 09:00:00 GMT</pubDate>
        </item>
        <item>
          <title>Celebrity wedding photos go viral</title>
          <link>https://example.com/b</link>
          <pubDate>Sat, 15 Aug 2026 11:00:00 GMT</pubDate>
        </item>
      </channel></rss>`;
    const parsed = parseRssItems(xml, "TestFeed");
    assert.equal(parsed.length, 3);
    const merged = mergeAndRank(parsed);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].analysis.theme, "general_market");
    assert.equal(merged[0].analysis.bias, "bullish");
  });
});
