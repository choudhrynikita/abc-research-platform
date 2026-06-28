/**
 * Smoke test for NIFTY Strategy + Equity F&O terminals (API layer).
 */
const BASE = process.env.BASE || "http://localhost:4000";

async function fetchJson(path, timeoutMs = 120000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}${path}`, { signal: ctrl.signal });
    const json = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok, json };
  } finally {
    clearTimeout(t);
  }
}

function check(name, pass, detail = "") {
  console.log(`${pass ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  return pass;
}

function assertDerivativesIntel(d) {
  const di = d?.derivativesIntelligence;
  if (!di) return false;
  const sections = ["marketFlow", "risk", "volatility", "marketStrength"];
  return sections.every((k) => di[k] != null);
}

function assertNoAutoRefreshInSource() {
  const fs = require("fs");
  const path = require("path");
  const files = [
    "components/nifty-strategy/StrategyTerminal.jsx",
    "components/equity-fno/FnoTerminal.jsx",
  ];
  return files.every((f) => !fs.readFileSync(path.join(__dirname, "..", f), "utf8").includes("setInterval"));
}

async function main() {
  console.log(`Smoke test @ ${BASE}\n`);

  let passed = 0;
  let total = 0;
  const tally = (ok) => { total += 1; if (ok) passed += 1; };

  tally(check("no setInterval in terminal components", assertNoAutoRefreshInSource()));

  const nifty = await fetchJson("/api/nifty-strategy/dashboard");
  tally(check("nifty-strategy API", nifty.ok, `status ${nifty.status}`));
  if (nifty.ok) {
    const d = nifty.json?.data ?? nifty.json;
    tally(check("nifty refreshedAt", Boolean(d.refreshedAt)));
    tally(check("nifty derivativesIntelligence", assertDerivativesIntel(d)));
    tally(check("nifty confidence on strategies", (d.top10 || []).every((s) => s.confidenceScore != null || d.top10?.length === 0), `${d.top10?.length || 0} strategies`));
    tally(check("nifty marketStatus", Boolean(d.marketStatus?.label)));
    const pcr = d.derivativesIntelligence?.marketFlow?.putCallRatio;
    if (pcr != null) tally(check("nifty PCR verified", typeof pcr === "number", `PCR=${pcr}`));
    else tally(check("nifty PCR absent (graceful)", true, "chain may be offline"));
  }

  const fno = await fetchJson("/api/equity-fno/dashboard", 180000);
  tally(check("equity-fno API", fno.ok, `status ${fno.status}`));
  if (fno.ok) {
    const d = fno.json?.data ?? fno.json;
    tally(check("fno refreshedAt", Boolean(d.refreshedAt)));
    tally(check("fno derivativesIntelligence", assertDerivativesIntel(d)));
    tally(check("fno backtest unavailable message", Boolean(d.backtest?.note)));
    tally(check("fno confidence on strategies", (d.top10 || []).every((s) => s.confidenceScore != null || d.top10?.length === 0), `${d.top10?.length || 0} strategies`));
  }

  const chart = await fetchJson("/api/chart/%5ENSEI?range=3mo", 30000);
  tally(check("chart API", chart.ok, `status ${chart.status}`));
  if (chart.ok) {
    const d = chart.json?.data ?? chart.json;
    tally(check("chart sma100 series", Boolean(d.indicators?.series?.sma100)));
    tally(check("chart sma200 series", Boolean(d.indicators?.series?.sma200)));
    tally(check("chart candles", (d.candles?.length || 0) > 0, `${d.candles?.length} bars`));
  }

  const niftyPage = await fetch(`${BASE}/nifty-strategy`);
  const fnoPage = await fetch(`${BASE}/fno`);
  tally(check("nifty-strategy page", niftyPage.ok, `status ${niftyPage.status}`));
  tally(check("fno page", fnoPage.ok, `status ${fnoPage.status}`));

  if (niftyPage.ok) {
    const html = await niftyPage.text();
    tally(check("nifty page has Refresh Data", html.includes("Refresh Data") || html.includes("terminal-refresh")));
    tally(check("nifty page no setInterval", !html.includes("setInterval")));
  }

  console.log(`\n${passed}/${total} checks passed`);
  process.exit(passed === total ? 0 : 1);
}

main().catch((e) => {
  console.error("Smoke test error:", e.message);
  process.exit(1);
});