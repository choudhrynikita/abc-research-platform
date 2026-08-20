const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

describe("authoritative theme contract", () => {
  const css = fs.readFileSync(path.join(__dirname, "..", "app", "globals.css"), "utf8");
  const topBar = fs.readFileSync(path.join(__dirname, "..", "components", "TopBar.jsx"), "utf8");
  const layout = fs.readFileSync(path.join(__dirname, "..", "app", "layout.jsx"), "utf8");
  const assistant = fs.readFileSync(path.join(__dirname, "..", "components", "strategy", "StrategyAssistant.jsx"), "utf8");

  it("defines the requested light and dark tokens exactly once at root", () => {
    assert.equal((css.match(/^html\[data-theme="light"\] \{\n  --bg:/gm) || []).length, 1);
    assert.equal((css.match(/^html\[data-theme="dark"\] \{\n  --bg:/gm) || []).length, 1);
    for (const token of ["--bg", "--surface", "--ink", "--muted", "--border", "--accent"]) {
      assert.match(css, new RegExp(`${token}:`));
    }
    assert.match(css, /html\[data-theme="light"\][^\n]*\.news-card/);
    assert.match(css, /html\[data-theme="dark"\][^\n]*\.news-card/);
  });

  it("removes the known legacy crossover palette literals", () => {
    for (const legacy of ["#0b0f14", "#f4f6fa", "rgba(18, 24, 32, 0.72)", "rgba(255, 255, 255, 0.85)"]) {
      assert.equal(css.includes(legacy), false, `legacy color remains: ${legacy}`);
    }
    assert.match(css, /background:\s*var\(--surface\)/);
    assert.match(css, /border-color:\s*var\(--border\)/);
  });

  it("normalizes stored themes and synchronizes storage events", () => {
    assert.match(topBar, /const THEME_KEY = "abc-theme"/);
    assert.match(topBar, /value === "dark" \? "dark" : DEFAULT_THEME/);
    assert.match(topBar, /addEventListener\("storage"/);
    assert.match(topBar, /event\.key === THEME_KEY/);
    assert.match(layout, /<html lang="en" data-theme="light">/);
  });

  it("labels the strategist input and keeps assistant subsections at h4", () => {
    assert.match(assistant, /aria-label="Ask the derivatives strategist a question"/);
    assert.doesNotMatch(assistant, /<h5>\{title\}<\/h5>/);
  });
});
