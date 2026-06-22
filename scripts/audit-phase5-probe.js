const BASE = process.env.ABC_BASE || "http://localhost:4000";

async function request(method, path, { body, headers } = {}) {
  const opts = { method, headers: { "Content-Type": "application/json", ...headers } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = null; }
  return { status: res.status, json, text };
}

function testAuthModule() {
  const { checkApiAuth, requiresMutationAuth } = require("../lib/api-auth");
  const cases = [
    { method: "POST", path: "/api/strategies", secret: "test-secret", token: null, expect: 401 },
    { method: "POST", path: "/api/strategies", secret: "test-secret", token: "wrong", expect: 401 },
    { method: "POST", path: "/api/strategies", secret: "test-secret", token: "test-secret", expect: null },
    { method: "GET", path: "/api/strategies", secret: "test-secret", token: null, expect: null },
    { method: "POST", path: "/api/ipo-alerts/preferences", secret: "test-secret", token: null, expect: 401 },
    { method: "POST", path: "/api/copilot", secret: "test-secret", token: null, expect: 401 },
    { method: "GET", path: "/api/copilot", secret: "test-secret", token: null, expect: null },
  ];

  const prev = process.env.API_SECRET;
  const prevNode = process.env.NODE_ENV;
  process.env.API_SECRET = "test-secret";
  process.env.NODE_ENV = "production";

  let ok = true;
  for (const c of cases) {
    const err = checkApiAuth({
      method: c.method,
      pathname: c.path,
      authHeader: c.token ? `Bearer ${c.token}` : null,
    });
    const status = err?.status ?? null;
    const pass = c.expect === null ? err === null : status === c.expect;
    console.log(`${pass ? "PASS" : "FAIL"} auth-module ${c.method} ${c.path} token=${c.token ? "set" : "none"} => ${status ?? "allow"}`);
    if (!pass) ok = false;
  }

  process.env.API_SECRET = "";
  process.env.NODE_ENV = "production";
  const noSecret = checkApiAuth({ method: "POST", pathname: "/api/strategies", authHeader: null });
  const pass503 = noSecret?.status === 503;
  console.log(`${pass503 ? "PASS" : "FAIL"} auth-module prod-no-secret => ${noSecret?.status}`);
  ok = pass503 && ok;

  process.env.API_SECRET = prev;
  process.env.NODE_ENV = prevNode;
  return ok;
}

async function countHistory() {
  const { readHistory } = require("../lib/fii-history");
  return (await readHistory()).length;
}

async function main() {
  console.log(`Phase 5 Security & Auth @ ${BASE}\n`);
  let ok = testAuthModule();

  const health = await request("GET", "/api/health");
  const authMode = health.json?.mutationAuth || "bearer";
  const devAllowsWrite = authMode === "dev-open";

  const stratNoAuth = await request("POST", "/api/strategies", {
    body: { name: "sec-probe-unauth", date: "2026-06-22", entry: 1, target: 2, stopLoss: 0.5 },
  });
  const expectBlocked = authMode === "disabled" ? 503 : 401;
  const stratPass = devAllowsWrite ? stratNoAuth.status === 201 : stratNoAuth.status === expectBlocked;
  console.log(`${stratPass ? "PASS" : "FAIL"} live POST /api/strategies unauth => ${stratNoAuth.status} (mutationAuth=${authMode})`);
  ok = stratPass && ok;

  const copilotNoAuth = await request("POST", "/api/copilot", { body: { query: "nifty outlook" } });
  const copilotPass = devAllowsWrite ? copilotNoAuth.status === 200 : copilotNoAuth.status === expectBlocked;
  console.log(`${copilotPass ? "PASS" : "FAIL"} live POST /api/copilot unauth => ${copilotNoAuth.status}`);
  ok = copilotPass && ok;

  const prefsNoAuth = await request("POST", "/api/ipo-alerts/preferences", { body: { newIpo: false } });
  const prefsPass = devAllowsWrite ? prefsNoAuth.status === 200 : prefsNoAuth.status === expectBlocked;
  console.log(`${prefsPass ? "PASS" : "FAIL"} live POST /api/ipo-alerts/preferences unauth => ${prefsNoAuth.status}`);
  ok = prefsPass && ok;

  const before = await countHistory();
  await request("GET", "/api/fii-dii");
  await request("GET", "/api/fii-dii");
  await request("GET", "/api/fii-dii");
  const after = await countHistory();
  const noPollution = after <= before + 1;
  console.log(`${noPollution ? "PASS" : "FAIL"} fii-dii GET polling history ${before} -> ${after} (max +1 per session date)`);
  ok = noPollution && ok;

  const noSecretLeak = !JSON.stringify(health.json || {}).match(/API_SECRET|password|token/i);
  console.log(`${noSecretLeak ? "PASS" : "FAIL"} health response leaks no secrets`);
  ok = noSecretLeak && ok;

  const { requiresMutationAuth } = require("../lib/api-auth");
  const protectedWrites = [
    ["POST", "/api/strategies"],
    ["PATCH", "/api/strategies/abc"],
    ["DELETE", "/api/strategies/abc"],
    ["POST", "/api/ipo-alerts/preferences"],
    ["POST", "/api/copilot"],
  ];
  for (const [method, path] of protectedWrites) {
    const needs = requiresMutationAuth(method, path);
    console.log(`${needs ? "PASS" : "FAIL"} requiresMutationAuth ${method} ${path}`);
    ok = needs && ok;
  }

  const readOnly = [
    ["GET", "/api/fii-dii"],
    ["GET", "/api/reports/generate/fiidii"],
    ["GET", "/api/health"],
  ];
  for (const [method, path] of readOnly) {
    const needs = requiresMutationAuth(method, path);
    console.log(`${!needs ? "PASS" : "FAIL"} read-only ${method} ${path}`);
    ok = !needs && ok;
  }

  console.log(`\nSummary: ${ok ? "PASS" : "FAIL"}`);
  if (!ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});