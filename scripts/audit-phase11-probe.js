const { execSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const PROD_PORT = Number(process.env.ABC_PROD_PORT || 4012);
const PROD_BASE = process.env.ABC_PROD_BASE || `http://127.0.0.1:${PROD_PORT}`;

const REQUIRED_SEEDS = [
  "strategies.json",
  "fii-dii-history.json",
  "report-center.json",
  "audit-log.json",
  "ipo-alerts.json",
  "ipo-subscription-history.json",
  "competitors.json",
  "nifty500-constituents.json",
];

const PHASE_SCRIPTS = [
  "audit-phase3-probe.js",
  "audit-phase3-edge.js",
  "audit-phase4-probe.js",
  "audit-phase5-probe.js",
  "audit-phase6-probe.js",
  "audit-phase7-probe.js",
  "audit-phase8-probe.js",
  "audit-phase9-probe.js",
  "audit-phase10-probe.js",
  "audit-phase11-probe.js",
];

const scores = {
  platformHealth: { pass: 0, total: 0 },
  dataIntegrity: { pass: 0, total: 0 },
  apiReliability: { pass: 0, total: 0 },
  security: { pass: 0, total: 0 },
  performance: { pass: 0, total: 0 },
  productionReadiness: { pass: 0, total: 0 },
};

function mark(category, pass, label) {
  scores[category].total += 1;
  if (pass) scores[category].pass += 1;
  console.log(`${pass ? "PASS" : "FAIL"} ${label}`);
  return pass;
}

async function request(method, base, urlPath, body) {
  const opts = { method, headers: { "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${base}${urlPath}`, opts);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = null; }
  return { status: res.status, json, text };
}

function testProjectStructure() {
  let ok = true;
  const required = [
    "package.json",
    "next.config.mjs",
    "vercel.json",
    "middleware.js",
    "app/api/[[...slug]]/route.js",
    "data",
  ];
  for (const rel of required) {
    const exists = fs.existsSync(path.join(ROOT, rel));
    ok = mark("productionReadiness", exists, `structure ${rel}`) && ok;
  }

  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  ok = mark("productionReadiness", pkg.scripts?.build && pkg.scripts?.start, "package build/start scripts") && ok;
  ok = mark("productionReadiness", (pkg.engines?.node || "").includes("20"), `node engine ${pkg.engines?.node}`) && ok;

  const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, "vercel.json"), "utf8"));
  const maxDur = vercel.functions?.["app/api/[[...slug]]/route.js"]?.maxDuration;
  ok = mark("productionReadiness", maxDur >= 60, `vercel api maxDuration=${maxDur}`) && ok;

  for (const seed of REQUIRED_SEEDS) {
    const exists = fs.existsSync(path.join(ROOT, "data", seed));
    ok = mark("dataIntegrity", exists, `seed data/${seed}`) && ok;
  }

  for (const script of PHASE_SCRIPTS) {
    const exists = fs.existsSync(path.join(ROOT, "scripts", script));
    ok = mark("platformHealth", exists, `audit script ${script}`) && ok;
  }

  return ok;
}

function testBuild() {
  if (process.env.SKIP_BUILD === "1") {
    console.log("SKIP production build (SKIP_BUILD=1)");
    return true;
  }
  try {
    execSync("npm run build", { cwd: ROOT, stdio: "pipe", encoding: "utf8" });
    return mark("productionReadiness", true, "npm run build");
  } catch (err) {
    console.error(err.stdout || err.message);
    return mark("productionReadiness", false, "npm run build");
  }
}

function startProdServer() {
  const child = spawn(`npx next start -p ${PROD_PORT}`, {
    cwd: ROOT,
    stdio: "ignore",
    detached: true,
    shell: true,
    windowsHide: true,
  });
  child.unref();
  return child;
}

async function waitForServer(base, timeoutMs = 45000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(`${base}/api/health`);
      if (res.ok) return true;
    } catch { /* retry */ }
    await new Promise((r) => setTimeout(r, 750));
  }
  return false;
}

function stopProdServer(child) {
  if (!child?.pid) return;
  try {
    if (process.platform === "win32") {
      execSync(`taskkill /PID ${child.pid} /T /F`, { stdio: "ignore" });
    } else {
      process.kill(-child.pid, "SIGTERM");
    }
  } catch {
    try { process.kill(child.pid, "SIGTERM"); } catch { /* */ }
  }
}

async function testProdServerSmoke() {
  if (process.env.SKIP_PROD_START === "1") {
    console.log("SKIP prod server smoke (SKIP_PROD_START=1)");
    return true;
  }

  const useExisting = Boolean(process.env.ABC_PROD_BASE);
  const child = useExisting ? null : startProdServer();
  let ok = true;
  try {
    const ready = await waitForServer(PROD_BASE);
    ok = mark("productionReadiness", ready, `prod server ready @ ${PROD_BASE}`) && ok;
    if (!ready) return ok;

    const health = await request("GET", PROD_BASE, "/api/health");
    const h = health.json || {};
    ok = mark("platformHealth", h.status === "ok", "prod health status ok") && ok;
    ok = mark("productionReadiness", h.mutationAuth === "disabled", `prod mutationAuth=${h.mutationAuth}`) && ok;
    ok = mark("productionReadiness", h.apiSecretConfigured === false, "prod apiSecretConfigured=false") && ok;
    ok = mark("productionReadiness", typeof h.kvConfigured === "boolean", `prod kvConfigured=${h.kvConfigured}`) && ok;
    ok = mark("performance", h.cacheTtlMs === 300000, "prod cacheTtlMs exposed") && ok;

    const block = await request("POST", PROD_BASE, "/api/strategies", { name: "prod-block", date: "2026-06-22" });
    ok = mark("security", block.status === 503, `prod blocks unauth write => ${block.status}`) && ok;

    const page = await request("GET", PROD_BASE, "/nifty500");
    ok = mark("apiReliability", page.status === 200, `prod page /nifty500 => ${page.status}`) && ok;

    ok = (await testRuntimeReadiness(PROD_BASE, "prod")) && ok;
  } finally {
    if (!useExisting) stopProdServer(child);
  }
  return ok;
}

async function testRuntimeReadiness(base, label) {
  let ok = true;
  const health = await request("GET", base, "/api/health");
  const h = health.json || {};
  ok = mark("platformHealth", health.status === 200 && h.framework === "nextjs", `${label} health framework`) && ok;
  ok = mark("apiReliability", Boolean(h.storage), `${label} health storage=${h.storage}`) && ok;

  const api = await request("GET", base, "/api");
  ok = mark("apiReliability", api.status === 200 && api.json?.routes?.length >= 20, `${label} api index routes`) && ok;

  const report = await request("GET", base, "/api/reports/generate/fiidii");
  ok = mark("dataIntegrity", report.status === 200 && report.json?.report?.disclaimer, `${label} fiidii report`) && ok;

  const badChart = await request("GET", base, "/api/chart/NOTAREAL999?range=1y");
  ok = mark("apiReliability", badChart.status === 502, `${label} bad chart => 502`) && ok;

  const badIpo = await request("GET", base, "/api/ipo/FAKESYMBOL123");
  ok = mark("apiReliability", badIpo.status === 404, `${label} bad ipo => 404`) && ok;

  return ok;
}

function printScorecard() {
  console.log("\n--- Production Readiness Scorecard ---");
  let allPass = true;
  for (const [category, { pass, total }] of Object.entries(scores)) {
    const pct = total ? Math.round((pass / total) * 100) : 0;
    const status = pass === total ? "PASS" : "FAIL";
    if (pass !== total) allPass = false;
    const title = category.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
    console.log(`${status} ${title}: ${pass}/${total} (${pct}%)`);
  }
  console.log(`\nSummary: ${allPass ? "PASS" : "FAIL"}`);
  return allPass;
}

async function main() {
  console.log(`Phase 11 Production Readiness @ prodPort=${PROD_PORT}\n`);
  let ok = true;
  ok = testProjectStructure() && ok;
  ok = testBuild() && ok;
  ok = (await testProdServerSmoke()) && ok;
  ok = printScorecard() && ok;
  if (!ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});