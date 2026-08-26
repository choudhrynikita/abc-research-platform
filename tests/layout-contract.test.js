const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { NAV_GROUPS, NAV_HREFS, SIDEBAR_LAYOUT, isActivePath } = require("../lib/nav-config");

const CSS_PATH = path.join(__dirname, "..", "app", "globals.css");

describe("nav-config", () => {
  it("exposes nine primary modules, including Research Brief, and no watchlist/portfolio", () => {
    assert.equal(NAV_HREFS.length, 9);
    assert.deepEqual(NAV_HREFS, [
      "/nifty500",
      "/news",
      "/fiidii",
      "/ipo",
      "/research",
      "/brief",
      "/nifty-strategy",
      "/fno",
      "/reports",
    ]);
    const labels = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.label)).join(" ");
    assert.equal(/watchlist/i.test(labels), false);
    assert.equal(/portfolio analysis/i.test(labels), false);
  });

  it("isActivePath matches nested stock routes", () => {
    assert.equal(isActivePath("/nifty500", "/nifty500"), true);
    assert.equal(isActivePath("/nifty500/stock/RELIANCE.NS", "/nifty500"), true);
    assert.equal(isActivePath("/fiidii", "/nifty500"), false);
  });
});

describe("sidebar CSS layout contract", () => {
  const css = fs.readFileSync(CSS_PATH, "utf8");

  it("defines sidebar width tokens used by main offset", () => {
    assert.match(css, /--sidebar-width:\s*264px/);
    assert.match(css, /--sidebar-width-lg:\s*280px/);
    assert.match(css, /\.main\s*\{[^}]*margin-left:\s*var\(--sidebar-width\)/s);
  });

  it("scrolls only the nav region — not the whole sidebar", () => {
    assert.match(css, /\.sidebar\s*\{[^}]*overflow:\s*hidden/s);
    assert.match(css, /\.sidebar-nav\s*\{[^}]*overflow-y:\s*auto/s);
  });

  it("uses grid for nav items to prevent overlap", () => {
    assert.match(css, /grid-template-columns:\s*32px\s+minmax\(0,\s*1fr\)/);
    assert.match(css, /min-height:\s*var\(--touch-min\)/);
    assert.match(css, /--touch-min:\s*44px/);
  });

  it("implements off-canvas drawer at mobile breakpoint", () => {
    assert.match(css, /@media\s*\(max-width:\s*900px\)/);
    assert.match(css, /transform:\s*translateX\(-105%\)/);
    assert.match(css, /\.sidebar\.open/);
  });

  it("keeps desktop sidebar forced visible", () => {
    assert.match(css, /@media\s*\(min-width:\s*901px\)/);
    assert.match(css, /transform:\s*translateX\(0\)\s*!important/);
  });

  it("includes skip link and reduced motion handling", () => {
    assert.match(css, /\.skip-to-content/);
    assert.match(css, /prefers-reduced-motion:\s*reduce/);
  });

  it("SIDEBAR_LAYOUT constants stay aligned with CSS", () => {
    assert.equal(SIDEBAR_LAYOUT.mobileBreakpointPx, 900);
    assert.equal(SIDEBAR_LAYOUT.defaultWidthPx, 264);
    assert.equal(SIDEBAR_LAYOUT.minTouchTargetPx, 44);
  });
});
