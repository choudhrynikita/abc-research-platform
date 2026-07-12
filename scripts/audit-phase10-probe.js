const fs = require("fs");
const path = require("path");

const BASE = process.env.ABC_BASE || "http://localhost:4000";
const ROOT = path.join(__dirname, "..");

async function request(method, urlPath, { body, headers } = {}) {
  const opts = { method, headers: { "Content-Type": "application/json", ...headers } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${urlPath}`, opts);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = null; }
  return { status: res.status, json, text };
}

function extractPrefixes(filePath) {
  const src = fs.readFileSync(path.join(ROOT, filePath), "utf8");
  const match = src.match(/MUTATION_PREFIXES\s*=\s*\[([\s\S]*?)\];/);
  if (!match) return [];
  return [...match[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

function testMiddlewareHandlerParity() {
  const mw = extractPrefixes("middleware.js");
  const auth = extractPrefixes("lib/api-auth.js");
  const same = mw.length === auth.length && mw.every((p, i) => p === auth[i]);
  console.log(`${same ? "PASS" : "FAIL"} middleware/api-auth MUTATION_PREFIXES parity (${mw.join(", ")})`);
  return same;
}

function testAuthModule() {
  const { checkApiAuth, requiresMutationAuth } = require("../lib/api-auth");
  const prevSecret = process.env.API_SECRET;
  const prevNode = process.env.NODE_ENV;
  process.env.API_SECRET = "phase10-secret";
  process.env.NODE_ENV = "production";

  let ok = true;
  const cases = [
    ["POST", "/api/strategies", null, 401],
    ["POST", "/api/strategies/abc/duplicate", null, 401],
    ["PATCH", "/api/strategies/abc", null, 401],
    ["DELETE", "/api/strategies/abc", null, 401],
    // Copilot is public research Q&A — auth module must allow without Bearer
    ["POST", "/api/copilot", null, null],
    ["GET", "/api/reports/generate/nifty500", null, null],
  ];

  for (const [method, pathname, token, expect] of cases) {
    const err = checkApiAuth({
      method,
      pathname,
      authHeader: token ? `Bearer ${token}` : null,
    });
    const status = err?.status ?? null;
    const pass = expect === null ? err === null : status === expect;
    console.log(`${pass ? "PASS" : "FAIL"} auth ${method} ${pathname} => ${status ?? "allow"}`);
    ok = pass && ok;
  }

  process.env.API_SECRET = "";
  const disabled = checkApiAuth({ method: "POST", pathname: "/api/strategies", authHeader: null });
  const pass503 = disabled?.status === 503;
  console.log(`${pass503 ? "PASS" : "FAIL"} auth prod-no-secret => 503`);
  ok = pass503 && ok;

  const mutations = [
    ["POST", "/api/strategies"],
    ["POST", "/api/strategies/x/duplicate"],
    ["PATCH", "/api/strategies/x"],
    ["DELETE", "/api/strategies/x"],
    ["POST", "/api/ipo-alerts/preferences"],
  ];
  for (const [method, pathname] of mutations) {
    const needs = requiresMutationAuth(method, pathname);
    console.log(`${needs ? "PASS" : "FAIL"} requiresMutationAuth ${method} ${pathname}`);
    ok = needs && ok;
  }
  const copilotPublic = !requiresMutationAuth("POST", "/api/copilot");
  console.log(`${copilotPublic ? "PASS" : "FAIL"} copilot is public (no mutation auth)`);
  ok = copilotPublic && ok;
  const strategyAssistantPublic = !requiresMutationAuth("POST", "/api/strategy-assistant");
  console.log(`${strategyAssistantPublic ? "PASS" : "FAIL"} strategy-assistant is public (no mutation auth)`);
  ok = strategyAssistantPublic && ok;

  process.env.API_SECRET = prevSecret;
  process.env.NODE_ENV = prevNode;
  return ok;
}

async function testInputValidation() {
  let ok = true;
  const cases = [
    {
      name: "strategies-missing-date",
      method: "POST",
      path: "/api/strategies",
      body: { name: "bad" },
      expect: 400,
    },
    {
      name: "strategies-negative-entry",
      method: "POST",
      path: "/api/strategies",
      body: { name: "bad", date: "2026-06-22", entry: -1, target: 2, stopLoss: 1 },
      expect: 400,
    },
    {
      name: "copilot-empty",
      method: "POST",
      path: "/api/copilot",
      body: { query: "" },
      expect: 400,
    },
    {
      name: "copilot-oversized",
      method: "POST",
      path: "/api/copilot",
      body: { query: "x".repeat(5000) },
      expect: 400,
    },
    {
      name: "export-bad-format",
      method: "GET",
      path: "/api/report-center/rpt-test/export/exe",
      expect: [400, 404],
    },
  ];

  for (const c of cases) {
    const res = await request(c.method, c.path, { body: c.body });
    const expects = Array.isArray(c.expect) ? c.expect : [c.expect];
    const pass = expects.includes(res.status);
    console.log(`${pass ? "PASS" : "FAIL"} validate ${c.name} => ${res.status}`);
    ok = pass && ok;
  }

  const longName = await request("POST", "/api/strategies", {
    body: { name: "n".repeat(300), date: "2026-06-22", entry: 1, target: 2, stopLoss: 0.5 },
  });
  const namePass = longName.status === 400;
  console.log(`${namePass ? "PASS" : "FAIL"} validate strategy-name-length => ${longName.status}`);
  ok = namePass && ok;

  return ok;
}

async function testInjectionAndTraversal() {
  let ok = true;
  const probes = [
    ["chart-traversal", "/api/chart/..%2F..%2Fetc%2Fpasswd?range=1y", [400, 404, 502]],
    ["research-xss-symbol", "/api/research/%3Cscript%3Ealert(1)%3C%2Fscript%3E", [200, 404, 502]],
    ["export-traversal", "/api/report-center/..%2F..%2Fetc%2Fpasswd/export/pdf", [400, 404]],
    ["ipo-injection", "/api/ipo/%3Cimg%20onerror%3Dalert(1)%3E", [404]],
  ];

  for (const [name, urlPath, expectStatuses] of probes) {
    const res = await request("GET", urlPath);
    const pass = expectStatuses.includes(res.status);
    const noStack = !/at\s+\w+\s+\(/.test(res.text);
    console.log(`${pass && noStack ? "PASS" : "FAIL"} injection ${name} => ${res.status} stack=${!noStack}`);
    ok = pass && noStack && ok;
  }

  return ok;
}

async function testSecretHygiene() {
  let ok = true;
  const paths = ["/api/health", "/api", "/api/defaults", "/api/nifty/prediction", "/api/audit"];
  for (const p of paths) {
    const res = await request("GET", p);
    const leak = /API_SECRET|KV_REST_API_TOKEN|password\s*[:=]/i.test(res.text);
    console.log(`${!leak ? "PASS" : "FAIL"} no-secret-leak ${p}`);
    ok = !leak && ok;
  }
  return ok;
}

async function testLiveMutationPolicy() {
  const health = await request("GET", "/api/health");
  const authMode = health.json?.mutationAuth || "bearer";
  const devOpen = authMode === "dev-open";
  const expectBlocked = authMode === "disabled" ? 503 : 401;

  let ok = true;
  const del = await request("DELETE", "/api/strategies/strategy-nonexistent");
  const delPass = devOpen ? del.status === 404 : del.status === expectBlocked;
  console.log(`${delPass ? "PASS" : "FAIL"} live DELETE unauth => ${del.status} (${authMode})`);
  ok = delPass && ok;

  const dup = await request("POST", "/api/strategies/strategy-nonexistent/duplicate");
  const dupPass = devOpen ? [201, 404].includes(dup.status) : dup.status === expectBlocked;
  console.log(`${dupPass ? "PASS" : "FAIL"} live duplicate POST unauth => ${dup.status}`);
  ok = dupPass && ok;

  return ok;
}

async function testFiiPollution() {
  const { readHistory } = require("../lib/fii-history");
  const before = (await readHistory()).length;
  for (let i = 0; i < 3; i += 1) await request("GET", "/api/fii-dii");
  const after = (await readHistory()).length;
  const pass = after <= before + 1;
  console.log(`${pass ? "PASS" : "FAIL"} fii-dii polling history ${before} -> ${after}`);
  return pass;
}

async function main() {
  console.log(`Phase 10 Security Review @ ${BASE}\n`);
  let ok = testMiddlewareHandlerParity();
  ok = testAuthModule() && ok;
  ok = (await testInputValidation()) && ok;
  ok = (await testInjectionAndTraversal()) && ok;
  ok = (await testSecretHygiene()) && ok;
  ok = (await testLiveMutationPolicy()) && ok;
  ok = (await testFiiPollution()) && ok;

  console.log(`\nSummary: ${ok ? "PASS" : "FAIL"}`);
  if (!ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});