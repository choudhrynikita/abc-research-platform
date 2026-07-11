const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { buildPeriodPanels, withLiveFront } = require("../lib/fii-history");
const { formatInrCr } = require("../lib/format");
const { parseFiiDiiRows, nseNumber } = require("../lib/nse");

describe("formatInrCr", () => {
  it("formats Indian crore currency without fabricating", () => {
    assert.equal(formatInrCr(null), null);
    assert.equal(formatInrCr(Number.NaN), null);
    assert.ok(formatInrCr(2345).includes("2,345"));
    assert.ok(formatInrCr(2345).startsWith("₹"));
    assert.ok(formatInrCr(-1125, { signed: true }).includes("-"));
    assert.ok(formatInrCr(0).includes("0"));
  });
});

describe("nseNumber / parseFiiDiiRows", () => {
  it("rejects invalid numbers", () => {
    assert.equal(nseNumber("abc"), null);
    assert.equal(nseNumber(""), null);
    assert.equal(nseNumber("1,234.5"), 1234.5);
  });

  it("parses verified NSE rows without inventing zeros", () => {
    const parsed = parseFiiDiiRows([
      { category: "FII/FPI", date: "10-Jul-2026", buyValue: "100", sellValue: "40", netValue: "60" },
      { category: "DII", date: "10-Jul-2026", buyValue: "80", sellValue: "90", netValue: "-10" },
    ]);
    assert.equal(parsed.fii.netValue, 60);
    assert.equal(parsed.dii.netValue, -10);
    assert.equal(parsed.fii.buyValue, 100);
  });
});

describe("buildPeriodPanels", () => {
  const history = [
    {
      date: "10-Jul-2026",
      fiiNet: 100,
      diiNet: 50,
      fiiBuy: 300,
      fiiSell: 200,
      diiBuy: 150,
      diiSell: 100,
      recordedAt: "2026-07-10T10:00:00.000Z",
      source: "NSE India fiidiiTradeReact API",
    },
    {
      date: "09-Jul-2026",
      fiiNet: -20,
      diiNet: 30,
      fiiBuy: 100,
      fiiSell: 120,
      diiBuy: 80,
      diiSell: 50,
      recordedAt: "2026-07-09T10:00:00.000Z",
      source: "NSE India fiidiiTradeReact API",
    },
  ];

  it("builds daily inflow/outflow/net from verified sessions", () => {
    const panels = buildPeriodPanels(history, null);
    assert.equal(panels.daily.available, true);
    assert.equal(panels.daily.fii.inflow.value, 300);
    assert.equal(panels.daily.fii.outflow.value, 200);
    assert.equal(panels.daily.fii.net.value, 100);
    assert.equal(panels.daily.dii.net.value, 50);
    assert.ok(panels.daily.fii.net.display.includes("₹"));
  });

  it("sums weekly window without estimating missing days", () => {
    const panels = buildPeriodPanels(history, null);
    assert.equal(panels.weekly.available, true);
    assert.equal(panels.weekly.sessionsUsed, 2);
    assert.equal(panels.weekly.fii.net.value, 80); // 100 + (-20)
    assert.equal(panels.weekly.fii.inflow.value, 400); // 300 + 100
  });

  it("prefers live snapshot on the front without fabricating", () => {
    const live = {
      date: "11-Jul-2026",
      fii: { buyValue: 10, sellValue: 5, netValue: 5 },
      dii: { buyValue: 8, sellValue: 2, netValue: 6 },
      fetchedAt: "2026-07-11T12:00:00.000Z",
      source: "NSE India fiidiiTradeReact API",
    };
    const panels = buildPeriodPanels(history, live);
    assert.equal(panels.daily.asOf, "11-Jul-2026");
    assert.equal(panels.daily.fii.net.value, 5);
    assert.equal(panels.weekly.fii.net.value, 100 - 20 + 5);
  });

  it("marks empty history as unavailable", () => {
    const panels = buildPeriodPanels([], null);
    assert.equal(panels.daily.available, false);
    assert.equal(panels.daily.fii.net.available, false);
    assert.equal(panels.daily.fii.net.display, "Data Unavailable");
  });

  it("withLiveFront does not duplicate same date", () => {
    const live = {
      date: "10-Jul-2026",
      fii: { buyValue: 999, sellValue: 1, netValue: 998 },
      dii: { buyValue: 1, sellValue: 1, netValue: 0 },
    };
    const merged = withLiveFront(history, live);
    assert.equal(merged.filter((r) => r.date === "10-Jul-2026").length, 1);
    assert.equal(merged[0].fiiNet, 998);
  });
});
