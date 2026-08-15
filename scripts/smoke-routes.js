/**
 * HTTP smoke: every module route + health API after production start.
 * Usage: node scripts/smoke-routes.js [baseUrl]
 * Default baseUrl: http://127.0.0.1:4000
 */
const { NAV_HREFS } = require("../lib/nav-config");

const BASE = process.argv[2] || process.env.ABC_BASE || "http://127.0.0.1:4000";

const PATHS = [
  "/api/health",
  "/api/persistence",
  ...NAV_HREFS,
  "/watchlist", // must 404
  "/portfolio", // must 404
];

async function check(path) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, { redirect: "manual" });
  return { path, status: res.status, ok: res.ok };
}

async function main() {
  const results = [];
  for (const p of PATHS) {
    try {
      results.push(await check(p));
    } catch (e) {
      console.error(`FAIL ${p}: ${e.message}`);
      process.exitCode = 1;
      return;
    }
  }

  let failed = 0;
  for (const r of results) {
    const expect404 = r.path === "/watchlist" || r.path === "/portfolio";
    const pass = expect404 ? r.status === 404 : r.status >= 200 && r.status < 400;
    const mark = pass ? "OK  " : "FAIL";
    console.log(`${mark} ${r.status} ${r.path}`);
    if (!pass) failed += 1;
  }

  // Nav structure in HTML
  const htmlRes = await fetch(`${BASE}/nifty500`);
  const html = await htmlRes.text();
  for (const href of NAV_HREFS) {
    if (!html.includes(`href="${href}"`)) {
      console.error(`FAIL missing nav href ${href}`);
      failed += 1;
    }
  }
  if (html.includes("Watchlists") || html.includes("Portfolio Analysis")) {
    console.error("FAIL removed modules still in HTML");
    failed += 1;
  }
  if (!html.includes("app-sidebar") || !html.includes("nav-item-icon")) {
    console.error("FAIL sidebar structure missing");
    failed += 1;
  }
  if (!html.includes("Skip to main content")) {
    console.error("FAIL skip link missing");
    failed += 1;
  }

  if (failed) {
    console.error(`\nSmoke failed: ${failed} issue(s)`);
    process.exitCode = 1;
  } else {
    console.log(`\nSmoke passed against ${BASE}`);
  }
}

main();
