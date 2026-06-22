const fs = require("fs");
const os = require("os");
const path = require("path");

const BASE = process.env.ABC_BASE || "http://localhost:4000";
const SEED_DIR = path.join(process.cwd(), "data");

const STORE_SCHEMAS = {
  "strategies.json": {
    kind: "array",
    validate: (rows) => rows.every((r) => r.id && r.name && r.date),
  },
  "fii-dii-history.json": {
    kind: "array",
    validate: (rows) => rows.every((r) => r.date),
  },
  "report-center.json": {
    kind: "array",
    validate: (rows) => rows.every((r) => r.id && r.type && r.data),
  },
  "audit-log.json": {
    kind: "array",
    validate: (rows) => rows.every((r) => r.id && r.timestamp),
  },
  "ipo-alerts.json": {
    kind: "object",
    validate: (o) => o.preferences != null && Array.isArray(o.log),
  },
  "ipo-subscription-history.json": {
    kind: "object",
    validate: (o) => o != null && typeof o === "object" && !Array.isArray(o),
  },
  "competitors.json": {
    kind: "object",
    validate: (o) => Object.keys(o).length > 0,
  },
  "nifty500-constituents.json": {
    kind: "array",
    validate: (rows) => rows.every((r) => r.symbol && r.name),
  },
};

const CAPS = {
  "audit-log.json": 500,
  "report-center.json": 200,
  "fii-dii-history.json": 1500,
  "strategies.json": 500,
};

function resetStoreModules() {
  const root = path.join(__dirname, "..");
  for (const file of ["lib/data-path.js", "lib/json-store.js", "lib/audit.js", "lib/report-store.js", "lib/fii-history.js", "lib/ipo-alerts.js"]) {
    try { delete require.cache[require.resolve(path.join(root, file))]; } catch { /* */ }
  }
}

function loadModule(relPath) {
  return require(path.join(__dirname, "..", relPath));
}

async function withTempDataDir(fn) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "abc-phase6-"));
  const prevDir = process.env.ABC_DATA_DIR;
  const prevVercel = process.env.VERCEL;
  const prevKvUrl = process.env.KV_REST_API_URL;
  const prevKvToken = process.env.KV_REST_API_TOKEN;
  process.env.ABC_DATA_DIR = tmp;
  delete process.env.VERCEL;
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  resetStoreModules();
  loadModule("lib/data-path").resetDataDir(null);
  loadModule("lib/json-store").clearCache();
  try {
    return await fn(tmp);
  } finally {
    process.env.ABC_DATA_DIR = prevDir;
    if (prevVercel) process.env.VERCEL = prevVercel;
    else delete process.env.VERCEL;
    if (prevKvUrl) process.env.KV_REST_API_URL = prevKvUrl;
    else delete process.env.KV_REST_API_URL;
    if (prevKvToken) process.env.KV_REST_API_TOKEN = prevKvToken;
    else delete process.env.KV_REST_API_TOKEN;
    resetStoreModules();
    loadModule("lib/data-path").resetDataDir(null);
    loadModule("lib/json-store").clearCache();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function checkSeedSchemas() {
  let ok = true;
  for (const [file, schema] of Object.entries(STORE_SCHEMAS)) {
    const seedPath = path.join(SEED_DIR, file);
    if (!fs.existsSync(seedPath)) {
      console.log(`FAIL seed missing ${file}`);
      ok = false;
      continue;
    }
    let parsed;
    try {
      parsed = JSON.parse(fs.readFileSync(seedPath, "utf8"));
    } catch (err) {
      console.log(`FAIL seed parse ${file}: ${err.message}`);
      ok = false;
      continue;
    }
    const kindOk = schema.kind === "array" ? Array.isArray(parsed) : typeof parsed === "object" && !Array.isArray(parsed);
    const valid = kindOk && schema.validate(parsed);
    console.log(`${valid ? "PASS" : "FAIL"} seed schema ${file}`);
    ok = valid && ok;
    if (!kindOk) console.log(`  - expected ${schema.kind}`);
    if (kindOk && !schema.validate(parsed)) console.log(`  - validation failed`);
    if (Array.isArray(parsed) && CAPS[file] && parsed.length > CAPS[file]) {
      console.log(`FAIL seed cap ${file} length=${parsed.length} max=${CAPS[file]}`);
      ok = false;
    }
  }
  return ok;
}

async function testRoundtrip() {
  return withTempDataDir(async (tmp) => {
    const { readJson, writeJson, getStorageMode, clearCache } = loadModule("lib/json-store");
    let ok = true;

    const mode = getStorageMode();
    const modePass = mode === "custom-dir";
    console.log(`${modePass ? "PASS" : "FAIL"} storage mode isolated => ${mode}`);
    ok = modePass && ok;

    const payload = [{ id: "probe-1", name: "phase6", date: "2026-06-22" }];
    await writeJson("phase6-probe-store.json", payload);
    clearCache("phase6-probe-store.json");
    const readBack = await readJson("phase6-probe-store.json", []);
    const rtPass = readBack.length === 1 && readBack[0].id === "probe-1";
    console.log(`${rtPass ? "PASS" : "FAIL"} write/read roundtrip custom store`);
    ok = rtPass && ok;

    const filePath = path.join(tmp, "phase6-probe-store.json");
    const fsPass = fs.existsSync(filePath);
    console.log(`${fsPass ? "PASS" : "FAIL"} persisted to ABC_DATA_DIR file`);
    ok = fsPass && ok;

    return ok;
  });
}

async function testSeedFallback() {
  return withTempDataDir(async (tmp) => {
    const seedSrc = path.join(SEED_DIR, "competitors.json");
    fs.copyFileSync(seedSrc, path.join(tmp, "competitors.json"));
    const { readJson } = loadModule("lib/json-store");
    const data = await readJson("competitors.json", {});
    const pass = data["RELIANCE.NS"]?.sector === "Energy";
    console.log(`${pass ? "PASS" : "FAIL"} read seeded competitors.json`);
    return pass;
  });
}

async function testCorruptRecovery() {
  return withTempDataDir(async (tmp) => {
    const { readJson, clearCache } = loadModule("lib/json-store");
    const filePath = path.join(tmp, "phase6-corrupt.json");
    fs.writeFileSync(filePath, "{not-json");
    clearCache("phase6-corrupt.json");
    const fallback = await readJson("phase6-corrupt.json", [{ id: "fb", name: "fallback", date: "2026-06-22" }]);
    const pass = Array.isArray(fallback) && fallback[0]?.id === "fb";
    console.log(`${pass ? "PASS" : "FAIL"} corrupt JSON falls back to default`);
    return pass;
  });
}

async function testAuditCap() {
  const { logRecommendation, readLog } = loadModule("lib/audit");
  const marker = `audit-cap-probe-${Date.now()}`;
  for (let i = 0; i < 3; i++) {
    await logRecommendation({ type: "probe", marker, i });
  }
  const log = await readLog();
  const pass = log.length <= CAPS["audit-log.json"] && log[0]?.marker === marker;
  console.log(`${pass ? "PASS" : "FAIL"} audit-log cap <= ${CAPS["audit-log.json"]} (len=${log.length})`);
  return pass;
}

async function testReportCap() {
  const { saveReport, readStore } = loadModule("lib/report-store");
  const title = `Phase6 cap probe ${Date.now()}`;
  await saveReport({
    type: "probe",
    title,
    source: "phase6-probe",
    confidence: 50,
    disclaimer: "probe",
    sections: [],
  });
  const store = await readStore();
  const pass = store.length <= CAPS["report-center.json"] && store[0]?.name === title;
  console.log(`${pass ? "PASS" : "FAIL"} report-center cap <= ${CAPS["report-center.json"]} (len=${store.length})`);
  return pass;
}

async function testFiiDedup() {
  const { appendSnapshot, readHistory } = loadModule("lib/fii-history");
  const before = (await readHistory()).length;
  const snap = {
    date: "phase6-probe-date",
    fii: { netValue: 1, buyValue: 2, sellValue: 1 },
    dii: { netValue: 2, buyValue: 3, sellValue: 1 },
  };
  await appendSnapshot(snap);
  await appendSnapshot(snap);
  const after = (await readHistory()).length;
  const pass = after <= before + 1;
  console.log(`${pass ? "PASS" : "FAIL"} fii-dii append dedup ${before} -> ${after}`);
  return pass;
}

async function request(method, path, body) {
  const opts = { method, headers: { "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = null; }
  return { status: res.status, json };
}

async function testLiveStores() {
  let ok = true;
  const health = await request("GET", "/api/health");
  const storage = health.json?.storage;
  const storagePass = ["local-fs", "vercel-tmp", "vercel-kv", "custom-dir"].includes(storage);
  console.log(`${storagePass ? "PASS" : "FAIL"} health storage=${storage}`);
  ok = storagePass && ok;

  const strategies = await request("GET", "/api/strategies");
  const stratPass = strategies.status === 200 && Array.isArray(strategies.json?.strategies);
  console.log(`${stratPass ? "PASS" : "FAIL"} live strategies list (${strategies.json?.strategies?.length ?? 0})`);
  ok = stratPass && ok;
  if (strategies.json?.strategies?.length > CAPS["strategies.json"]) {
    console.log(`FAIL strategies count exceeds cap ${CAPS["strategies.json"]}`);
    ok = false;
  }

  const reports = await request("GET", "/api/report-center");
  const rptPass = reports.status === 200 && Array.isArray(reports.json?.reports);
  console.log(`${rptPass ? "PASS" : "FAIL"} live report-center (${reports.json?.reports?.length ?? 0})`);
  ok = rptPass && ok;

  const audit = await request("GET", "/api/audit");
  const auditPass = audit.status === 200 && Array.isArray(audit.json?.entries);
  console.log(`${auditPass ? "PASS" : "FAIL"} live audit log (${audit.json?.entries?.length ?? 0})`);
  ok = auditPass && ok;

  const alerts = await request("GET", "/api/ipo-alerts");
  const alertPass = alerts.status === 200 && alerts.json?.preferences != null && Array.isArray(alerts.json?.log);
  console.log(`${alertPass ? "PASS" : "FAIL"} live ipo-alerts schema`);
  ok = alertPass && ok;

  const uniqueName = `phase6-live-${Date.now()}`;
  const created = await request("POST", "/api/strategies", {
    name: uniqueName,
    date: "2026-06-22",
    entry: 100,
    target: 110,
    stopLoss: 95,
  });
  const createPass = created.status === 201;
  console.log(`${createPass ? "PASS" : "FAIL"} live strategy write => ${created.status}`);
  ok = createPass && ok;

  if (createPass) {
    const again = await request("GET", "/api/strategies");
    const found = again.json?.strategies?.some((s) => s.name === uniqueName);
    console.log(`${found ? "PASS" : "FAIL"} live strategy persisted`);
    ok = found && ok;
  }

  return ok;
}

async function main() {
  console.log(`Phase 6 Database Validation @ ${BASE}\n`);
  let ok = checkSeedSchemas();

  ok = (await testRoundtrip()) && ok;
  ok = (await testSeedFallback()) && ok;
  ok = (await testCorruptRecovery()) && ok;
  ok = (await testAuditCap()) && ok;
  ok = (await testReportCap()) && ok;
  ok = (await testFiiDedup()) && ok;
  ok = (await testLiveStores()) && ok;

  console.log(`\nSummary: ${ok ? "PASS" : "FAIL"}`);
  if (!ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});