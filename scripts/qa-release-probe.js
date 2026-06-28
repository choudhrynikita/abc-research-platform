/**
 * Release QA probe — pages, APIs, exports
 */
const http = require("http");
const https = require("https");
const { URL } = require("url");

const BASE = process.env.QA_BASE || "http://localhost:4000";
const TIMEOUT_MS = 120000;

const PAGES = [
  "/",
  "/nifty500",
  "/fiidii",
  "/research",
  "/nifty-strategy",
  "/fno",
  "/ipo",
];

const APIS = [
  { path: "/api/health", expect: 200 },
  { path: "/api/nifty500/top50", expect: 200, maxMs: 120000 },
  { path: "/api/fiidii/dashboard", expect: 200, maxMs: 60000 },
  { path: "/api/research/terminal/RELIANCE", expect: 200, maxMs: 90000 },
  { path: "/api/nifty-strategy/dashboard", expect: 200, maxMs: 120000 },
  { path: "/api/equity-fno/dashboard", expect: 200, maxMs: 120000 },
  { path: "/api/ipo/terminal", expect: 200, maxMs: 60000 },
  { path: "/api/ipo/terminal/CSM", expect: [200, 404] },
];

const EXPORTS = [
  "/api/export/nifty500/pdf",
  "/api/export/fiidii/xlsx",
  "/api/export/ipo/pdf",
];

function get(path) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const url = new URL(path, BASE);
    const client = url.protocol === "https:" ? https : http;
    const req = client.get(url, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks),
          ms: Date.now() - start,
        });
      });
    });
    req.setTimeout(TIMEOUT_MS, () => {
      req.destroy();
      reject(new Error(`Timeout: ${path}`));
    });
    req.on("error", reject);
  });
}

async function main() {
  const issues = [];
  const passed = [];

  console.log(`QA probe → ${BASE}\n`);

  for (const p of PAGES) {
    try {
      const r = await get(p);
      const ok = (r.status === 200 || (p === "/" && r.status === 307)) && r.body.length > 100;
      if (ok) passed.push(`PAGE ${p} (${r.ms}ms)`);
      else issues.push(`PAGE ${p}: status=${r.status} size=${r.body.length}`);
    } catch (e) {
      issues.push(`PAGE ${p}: ${e.message}`);
    }
  }

  for (const api of APIS) {
    try {
      const r = await get(api.path);
      const expects = Array.isArray(api.expect) ? api.expect : [api.expect];
      const ok = expects.includes(r.status);
      const slow = api.maxMs && r.ms > api.maxMs;
      if (ok && !slow) passed.push(`API ${api.path} ${r.status} (${r.ms}ms)`);
      else if (ok && slow) issues.push(`API ${api.path}: slow ${r.ms}ms > ${api.maxMs}ms`);
      else issues.push(`API ${api.path}: expected ${expects.join("|")} got ${r.status}`);
    } catch (e) {
      issues.push(`API ${api.path}: ${e.message}`);
    }
  }

  for (const exp of EXPORTS) {
    try {
      const r = await get(exp);
      const ct = r.headers["content-type"] || "";
      const ok = r.status === 200 && (ct.includes("pdf") || ct.includes("spreadsheet") || ct.includes("octet"));
      if (ok) passed.push(`EXPORT ${exp} (${ct}, ${r.body.length}b)`);
      else issues.push(`EXPORT ${exp}: status=${r.status} type=${ct}`);
    } catch (e) {
      issues.push(`EXPORT ${exp}: ${e.message}`);
    }
  }

  console.log(`PASSED (${passed.length}):`);
  passed.forEach((p) => console.log(`  ✓ ${p}`));
  console.log(`\nISSUES (${issues.length}):`);
  issues.forEach((i) => console.log(`  ✗ ${i}`));

  process.exit(issues.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});