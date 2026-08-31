const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { NAV_GROUPS, NAV_HREFS, SIDEBAR_LAYOUT, isActivePath } = require("../lib/nav-config");

const CSS_PATH = path.join(__dirname, "..", "app", "globals.css");

describe("nav-config", () => {
  it("exposes nine primary modules, including Knowledge Centre", () => {
    assert.equal(NAV_HREFS.length, 9);
    assert.deepEqual(NAV_HREFS, [
      "/nifty500",
      "/news",
      "/fiidii",
      "/ipo",
      "/research",
      "/nifty-strategy",
      "/fno",
      "/learn",
      "/reports",
    ]);
    const labels = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.label)).join(" ");
    assert.equal(/research brief/i.test(labels), false);
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

describe("interactive price chart shell", () => {
  const css = fs.readFileSync(CSS_PATH, "utf8");

  it("lets the NIFTY OHLCV chart grow instead of clipping into Market Movers", () => {
    assert.match(
      css,
      /\.interactive-price-chart\.chart-panel\s*\{[^}]*height:\s*auto/s
    );
    assert.match(
      css,
      /\.interactive-price-chart\.chart-panel\s*\{[^}]*overflow:\s*visible/s
    );
  });
});

describe("signal provenance strip", () => {
  const css = fs.readFileSync(CSS_PATH, "utf8");
  const dashboard = fs.readFileSync(
    path.join(__dirname, "..", "components/nifty500/Nifty500Dashboard.jsx"),
    "utf8"
  );

  it("labels the three live sources so the strip is not an unexplained card", () => {
    assert.match(dashboard, /Data sources/);
    assert.match(dashboard, /NSE universe/);
    assert.match(dashboard, /Yahoo Finance/);
    assert.match(dashboard, /ABC scoring layer/);
  });

  it("uses theme tokens instead of a hardcoded white panel", () => {
    const block = css.match(/\.signal-provenance-strip\s*\{[^}]+\}/);
    assert.ok(block, "provenance strip rule missing");
    assert.match(block[0], /var\(--text\)/);
    assert.equal(block[0].includes("rgba(249,251,255"), false);
    assert.equal(block[0].includes("rgba(255,255,255"), false);
    assert.match(css, /\.provenance-item strong\s*\{[^}]*color:\s*var\(--text\)/s);
    assert.match(css, /\.provenance-item\s*\{[^}]*background:\s*var\(--tint-04\)/s);
  });
});

describe("fluid Top 50 layout", () => {
  const css = fs.readFileSync(CSS_PATH, "utf8");
  const layout = fs.readFileSync(path.join(__dirname, "..", "app/layout.jsx"), "utf8");
  const chart = fs.readFileSync(
    path.join(__dirname, "..", "components/charts/InteractivePriceChart.jsx"),
    "utf8"
  );

  it("sizes stock cards from the content column so 320px phones do not overflow", () => {
    assert.match(
      css,
      /\.stock-grid\s*\{[^}]*minmax\(\s*min\(\s*100%\s*,\s*280px\s*\)/s
    );
  });

  it("follows the content column with container queries", () => {
    assert.match(css, /container-name:\s*terminal/);
    assert.match(css, /@container terminal \(min-width:\s*960px\)/);
    assert.match(css, /@container terminal \(max-width:\s*639px\)/);
  });

  it("lets chart range chips scroll instead of stacking off-screen on phones", () => {
    assert.match(
      css,
      /\.interactive-price-chart \.chart-panel-actions\s*\{[^}]*overflow-x:\s*auto/s
    );
  });

  it("allows pinch-zoom and covers the notch", () => {
    assert.match(layout, /maximumScale:\s*5/);
    assert.match(layout, /viewportFit:\s*"cover"/);
  });

  it("exposes pressed state on chart range chips", () => {
    assert.match(chart, /aria-pressed=\{range === r\.value\}/);
  });
});

describe("fluid IPO layout", () => {
  const css = fs.readFileSync(CSS_PATH, "utf8");

  it("sizes IPO grids from the content column so phones do not clip labels", () => {
    assert.match(css, /\.ipo-terminal\s*\{[^}]*container-name:\s*ipo/s);
    assert.match(css, /\.ipo-facts[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
    assert.match(css, /\.ipo-snapshot-grid\s*\{[^}]*minmax\(0,\s*1fr\)/s);
    assert.match(css, /\.ipo-rec-badge\s*\{[^}]*white-space:\s*normal/s);
    assert.match(css, /\.ipo-exec h2[\s\S]*?overflow-wrap:\s*anywhere/);
  });

  it("uses a stacked list then a two-pane layout as the terminal widens", () => {
    assert.match(css, /@container ipo \(min-width:\s*980px\)/);
    assert.match(css, /@container ipo \(max-width:\s*639px\)/);
    assert.match(
      css,
      /@container ipo \(min-width:\s*980px\)[\s\S]*?grid-template-columns:\s*minmax\(280px,\s*340px\)\s+minmax\(0,\s*1fr\)/
    );
  });
});
