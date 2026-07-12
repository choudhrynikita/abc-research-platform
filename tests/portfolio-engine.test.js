const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const {
  normalizeSymbol,
  loadWatchlists,
  loadPortfolios,
  getWatchlistDashboard,
  getPortfolioAnalysis,
  addWatchlistSymbol,
  removeWatchlistSymbol,
  upsertHolding,
  removeHolding,
} = require("../lib/portfolio-engine");
const { mapPool } = require("../lib/async-pool");

describe("normalizeSymbol", () => {
  it("appends .NS for bare NSE tickers", () => {
    assert.equal(normalizeSymbol("reliance"), "RELIANCE.NS");
    assert.equal(normalizeSymbol("TCS.NS"), "TCS.NS");
    assert.equal(normalizeSymbol("  infy  "), "INFY.NS");
  });

  it("rejects empty", () => {
    assert.equal(normalizeSymbol(""), null);
    assert.equal(normalizeSymbol(null), null);
  });
});

describe("mapPool", () => {
  it("preserves order with bounded concurrency", async () => {
    const out = await mapPool([1, 2, 3, 4, 5], 2, async (n) => n * 10);
    assert.deepEqual(out, [10, 20, 30, 40, 50]);
  });
});

describe("watchlist store", () => {
  it("loads default watchlist seed", async () => {
    const store = await loadWatchlists();
    assert.ok(Array.isArray(store.lists));
    assert.ok(store.lists.length >= 1);
    assert.ok(store.lists[0].symbols.length >= 1);
  });

  it("add and remove symbol round-trip", async () => {
    const add = await addWatchlistSymbol("default", "WIPRO");
    assert.equal(add.ok, true);
    assert.ok(add.list.symbols.includes("WIPRO.NS"));
    const rem = await removeWatchlistSymbol("default", "WIPRO.NS");
    assert.equal(rem.ok, true);
    assert.ok(!rem.list.symbols.includes("WIPRO.NS"));
  });
});

describe("portfolio store", () => {
  it("loads default portfolio", async () => {
    const store = await loadPortfolios();
    assert.ok(store.portfolios.length >= 1);
  });

  it("rejects invalid holding", async () => {
    const bad = await upsertHolding("default", { symbol: "X", quantity: -1, avgCost: 10 });
    assert.ok(bad.error);
  });

  it("upserts holding with verified cost fields only", async () => {
    const ok = await upsertHolding("default", {
      symbol: "TECHM",
      quantity: 2,
      avgCost: 1500,
    });
    assert.equal(ok.ok, true);
    const hit = ok.portfolio.holdings.find((h) => h.symbol === "TECHM.NS");
    assert.ok(hit);
    assert.equal(hit.quantity, 2);
    assert.equal(hit.avgCost, 1500);
    await removeHolding("default", "TECHM.NS");
  });
});

describe("constituents universe", () => {
  it("has full NIFTY 500 reference (~500 names)", () => {
    const p = path.join(__dirname, "..", "data", "nifty500-constituents.json");
    const data = JSON.parse(fs.readFileSync(p, "utf8"));
    assert.ok(data.length >= 450, `expected >=450 constituents, got ${data.length}`);
    assert.ok(data.every((r) => r.symbol && r.name && r.sector));
    assert.ok(data.some((r) => r.symbol === "RELIANCE.NS"));
  });
});

describe("live analysis (network)", () => {
  it("watchlist dashboard returns items without inventing prices", async () => {
    const dash = await getWatchlistDashboard("default");
    assert.equal(dash.available, true);
    assert.ok(Array.isArray(dash.items));
    for (const item of dash.items) {
      if (!item.available) {
        assert.equal(item.price, null);
      } else {
        assert.ok(typeof item.price === "number" && Number.isFinite(item.price));
      }
    }
  });

  it("portfolio analysis never fabricates market value without price", async () => {
    const analysis = await getPortfolioAnalysis("default");
    assert.equal(analysis.available, true);
    for (const h of analysis.holdings) {
      if (h.lastPrice == null) {
        assert.equal(h.marketValue, null);
        assert.equal(h.unrealizedPnl, null);
      }
    }
    assert.ok(analysis.policy.zeroHallucination);
  });
});
