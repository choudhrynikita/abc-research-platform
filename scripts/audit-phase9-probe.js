const fs = require("fs");
const path = require("path");

const BASE = process.env.ABC_BASE || "http://localhost:4000";
const ROOT = path.join(__dirname, "..");

const LATENCY_BUDGETS = [
  { name: "health", path: "/api/health", maxMs: 3000 },
  { name: "defaults", path: "/api/defaults", maxMs: 3000 },
  { name: "strategies", path: "/api/strategies", maxMs: 3000 },
  { name: "report-center", path: "/api/report-center", maxMs: 8000 },
  { name: "chart-nifty", path: "/api/chart/%5ENSEI?range=1y", maxMs: 25000 },
  { name: "nifty-prediction", path: "/api/nifty/prediction", maxMs: 25000 },
  { name: "gen-nifty500", path: "/api/reports/generate/nifty500", maxMs: 60000 },
  { name: "gen-fno", path: "/api/reports/generate/fno", maxMs: 60000 },
  { name: "gen-research", path: "/api/reports/generate/research/RELIANCE", maxMs: 45000 },
  { name: "ipo-dashboard", path: "/api/ipo/dashboard", maxMs: 45000 },
];

const SOURCE_CHECKS = [
  ["lib/api-handlers.js", ["CACHE_TTL_MS", "LIVE_FEED_CACHE_MS", "getCached", "setCached", "fiiDii", "ipoDashboard"]],
  ["lib/json-store.js", ["clearCache", "cache.has", "cache.set"]],
  ["lib/fetch-utils.js", ["fetchWithTimeout", "AbortSignal.timeout"]],
  ["lib/nse.js", ["retries = 3", "fetchWithTimeout"]],
  ["lib/nse-ipo.js", ["retries = 3", "fetchWithTimeout"]],
  ["lib/nse-options.js", ["retries = 3", "fetchWithTimeout"]],
  ["lib/yahoo.js", ["fetchWithTimeout"]],
];

async function timedGet(url) {
  const started = Date.now();
  const res = await fetch(url);
  const ms = Date.now() - started;
  return { status: res.status, ms, ok: res.ok };
}

function readProjectFile(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function testSourceContracts() {
  let ok = true;
  for (const [file, needles] of SOURCE_CHECKS) {
    const src = readProjectFile(file);
    for (const needle of needles) {
      const pass = src.includes(needle);
      console.log(`${pass ? "PASS" : "FAIL"} source ${file} contains "${needle}"`);
      ok = pass && ok;
    }
  }
  return ok;
}

async function testLatencyBudgets() {
  let ok = true;
  for (const probe of LATENCY_BUDGETS) {
    const { status, ms, ok: httpOk } = await timedGet(`${BASE}${probe.path}`);
    const pass = httpOk && status === 200 && ms <= probe.maxMs;
    console.log(`${pass ? "PASS" : "FAIL"} latency ${probe.name} ${ms}ms (max ${probe.maxMs})`);
    ok = pass && ok;
  }
  return ok;
}

async function testNiftyCache() {
  const first = await timedGet(`${BASE}/api/nifty/history`);
  const second = await timedGet(`${BASE}/api/nifty/history`);
  const pass =
    first.ok &&
    second.ok &&
    second.ms <= Math.max(1500, first.ms * 0.85);
  console.log(`${pass ? "PASS" : "FAIL"} nifty history cache ${first.ms}ms -> ${second.ms}ms`);
  return pass;
}

async function testFiiPollingPerf() {
  const { readHistory } = require("../lib/fii-history");
  const before = (await readHistory()).length;
  const times = [];
  for (let i = 0; i < 3; i += 1) {
    const t = await timedGet(`${BASE}/api/fii-dii`);
    times.push(t.ms);
  }
  const after = (await readHistory()).length;
  const noGrowth = after <= before + 1;
  const cachePass = times[2] <= Math.max(500, times[0] * 0.7);
  const totalPass = times.reduce((a, b) => a + b, 0) <= 45000;
  const pass = noGrowth && cachePass && totalPass;
  console.log(`${pass ? "PASS" : "FAIL"} fii-dii polling ${times.join("ms, ")}ms history ${before}->${after}`);
  return pass;
}

async function testHealthCacheConfig() {
  const res = await fetch(`${BASE}/api/health`);
  const json = await res.json();
  const pass =
    json.cacheTtlMs === 300000 &&
    json.liveFeedCacheMs === 120000;
  console.log(`${pass ? "PASS" : "FAIL"} health exposes cache TTLs (${json.cacheTtlMs}/${json.liveFeedCacheMs})`);
  return pass;
}

async function testExportPerf() {
  const list = await fetch(`${BASE}/api/report-center`).then((r) => r.json());
  const id = list.reports?.[0]?.id;
  if (!id) {
    console.log("SKIP export perf — no archived reports");
    return true;
  }
  const { ms, ok } = await timedGet(`${BASE}/api/report-center/${id}/export/pdf`);
  const pass = ok && ms <= 30000;
  console.log(`${pass ? "PASS" : "FAIL"} pdf export ${ms}ms (max 30000)`);
  return pass;
}

async function main() {
  console.log(`Phase 9 Performance Analysis @ ${BASE}\n`);
  let ok = testSourceContracts();
  ok = (await testHealthCacheConfig()) && ok;
  ok = (await testLatencyBudgets()) && ok;
  ok = (await testNiftyCache()) && ok;
  ok = (await testFiiPollingPerf()) && ok;
  ok = (await testExportPerf()) && ok;

  console.log(`\nSummary: ${ok ? "PASS" : "FAIL"}`);
  if (!ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});