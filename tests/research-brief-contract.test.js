const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

describe("Research Brief evidence workflow", () => {
  const store = fs.readFileSync(path.join(__dirname, "..", "components", "research-brief", "brief-store.js"), "utf8");
  const workspace = fs.readFileSync(path.join(__dirname, "..", "components", "research-brief", "ResearchBriefWorkspace.jsx"), "utf8");
  const card = fs.readFileSync(path.join(__dirname, "..", "components", "nifty500", "StockCard.jsx"), "utf8");

  it("stores a bounded local snapshot with distinct facts, interpretation, sources, and invalidation", () => {
    assert.match(store, /const STORAGE_KEY = "abc-research-brief-v1"/);
    assert.match(store, /const MAX_ENTRIES = 30/);
    assert.match(store, /interpretation:/);
    assert.match(store, /invalidation:/);
    assert.match(store, /Yahoo Finance/);
    assert.match(store, /ABC scoring layer/);
    assert.match(store, /current.filter\(\(item\) => item.symbol !== entry.symbol\)/);
  });

  it("keeps fact and model classifications visible in the saved-brief interface", () => {
    assert.match(workspace, /brief-kind fact/);
    assert.match(workspace, /brief-kind model/);
    assert.match(workspace, /Stored only in this browser until you remove it or clear the brief/);
    assert.match(workspace, /Invalidation conditions/);
    assert.match(workspace, /Action and confidence are captured model output/);
    assert.match(workspace, /role="status" aria-live="polite"/);
    assert.match(workspace, /Captured price · Yahoo Finance/);
  });

  it("lets a screener user create an evidence-linked brief entry", () => {
    assert.match(card, /AddToBriefButton/);
    assert.match(card, /asOf/);
    assert.match(card, /Review evidence/);
  });
});
