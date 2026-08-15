/**
 * Multi-viewport layout smoke using Playwright Chromium.
 * Verifies: no horizontal document overflow; nav items do not overlap;
 * mobile drawer works; desktop sidebar does not cover main content.
 *
 * Requires: production server running (ABC_BASE) and
 *   npx playwright install chromium
 *
 * Usage: node scripts/smoke-responsive.mjs
 */
import { createRequire } from "module";
import { chromium } from "playwright";

const require = createRequire(import.meta.url);
const { RESPONSIVE_VIEWPORTS, isMobileNavViewport } = require("../lib/focus-trap.js");
const { NAV_HREFS } = require("../lib/nav-config.js");

const BASE = process.env.ABC_BASE || "http://127.0.0.1:4000";

function rectsOverlap(a, b, pad = 0.5) {
  return !(
    a.right <= b.left + pad ||
    a.left >= b.right - pad ||
    a.bottom <= b.top + pad ||
    a.top >= b.bottom - pad
  );
}

async function assertViewport(page, vp) {
  await page.setViewportSize({ width: vp.width, height: vp.height });
  await page.goto(`${BASE}/nifty500`, { waitUntil: "domcontentloaded", timeout: 60_000 });

  const mobile = isMobileNavViewport(vp.width);

  // Open drawer on mobile so nav items are measurable
  if (mobile) {
    const menu = page.locator(".menu-btn");
    await menu.waitFor({ state: "visible", timeout: 10_000 });
    await menu.click();
    await page.locator("#app-sidebar.open").waitFor({ state: "visible", timeout: 10_000 });
  } else {
    await page.locator("#app-sidebar").waitFor({ state: "visible", timeout: 10_000 });
  }

  const metrics = await page.evaluate(() => {
    const docEl = document.documentElement;
    const body = document.body;
    const scrollWidth = Math.max(docEl.scrollWidth, body.scrollWidth);
    const clientWidth = docEl.clientWidth;
    const sidebar = document.getElementById("app-sidebar");
    const main = document.querySelector(".main");
    const items = Array.from(document.querySelectorAll("#app-sidebar a.nav-item"));
    const itemRects = items.map((el) => {
      const r = el.getBoundingClientRect();
      return {
        href: el.getAttribute("href"),
        left: r.left,
        top: r.top,
        right: r.right,
        bottom: r.bottom,
        width: r.width,
        height: r.height,
      };
    });
    const sidebarRect = sidebar ? sidebar.getBoundingClientRect() : null;
    const mainRect = main ? main.getBoundingClientRect() : null;
    return {
      scrollWidth,
      clientWidth,
      itemRects,
      sidebarRect,
      mainRect,
      overflowX: scrollWidth > clientWidth + 1,
    };
  });

  const issues = [];

  if (metrics.overflowX) {
    issues.push(
      `horizontal overflow scrollWidth=${metrics.scrollWidth} clientWidth=${metrics.clientWidth}`
    );
  }

  if (metrics.itemRects.length < NAV_HREFS.length) {
    issues.push(`expected ≥${NAV_HREFS.length} nav items, got ${metrics.itemRects.length}`);
  }

  // Pairwise overlap among nav items (same column stack — only vertical collision matters)
  for (let i = 0; i < metrics.itemRects.length; i++) {
    for (let j = i + 1; j < metrics.itemRects.length; j++) {
      if (rectsOverlap(metrics.itemRects[i], metrics.itemRects[j])) {
        issues.push(
          `nav overlap: ${metrics.itemRects[i].href} vs ${metrics.itemRects[j].href}`
        );
      }
    }
  }

  // Touch target height
  for (const r of metrics.itemRects) {
    if (r.height < 40) {
      issues.push(`nav item too short (${r.height.toFixed(1)}px): ${r.href}`);
    }
  }

  // Desktop: main should start to the right of sidebar (no cover)
  if (!mobile && metrics.sidebarRect && metrics.mainRect) {
    if (metrics.mainRect.left + 1 < metrics.sidebarRect.right) {
      issues.push(
        `main underlaps sidebar (main.left=${metrics.mainRect.left}, sidebar.right=${metrics.sidebarRect.right})`
      );
    }
  }

  // Mobile open: sidebar should be on-screen
  if (mobile && metrics.sidebarRect) {
    if (metrics.sidebarRect.left < -2 || metrics.sidebarRect.right <= 0) {
      issues.push("mobile drawer not visible after open");
    }
  }

  // Close drawer to leave clean state
  if (mobile) {
    await page.keyboard.press("Escape");
  }

  return issues;
}

async function main() {
  // Health first
  const health = await fetch(`${BASE}/api/health`).catch((e) => ({ ok: false, error: e }));
  if (!health.ok) {
    console.error(`Server not reachable at ${BASE}. Start with: npm run build && npm start`);
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  let failed = 0;
  for (const vp of RESPONSIVE_VIEWPORTS) {
    const issues = await assertViewport(page, vp);
    if (issues.length) {
      failed += issues.length;
      console.error(`FAIL ${vp.name} (${vp.width}×${vp.height})`);
      for (const i of issues) console.error(`  - ${i}`);
    } else {
      console.log(`OK   ${vp.name} (${vp.width}×${vp.height})`);
    }
  }

  await browser.close();

  if (failed) {
    console.error(`\nResponsive matrix failed: ${failed} issue(s)`);
    process.exit(1);
  }
  console.log(`\nResponsive matrix passed (${RESPONSIVE_VIEWPORTS.length} viewports) @ ${BASE}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
