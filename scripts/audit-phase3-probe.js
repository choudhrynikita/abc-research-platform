const BASE = process.env.ABC_BASE || "http://localhost:4000";

const probes = [
  { name: "health", method: "GET", path: "/api/health", expect: 200 },
  { name: "api-index", method: "GET", path: "/api", expect: 200 },
  { name: "defaults", method: "GET", path: "/api/defaults", expect: 200 },
  { name: "quotes", method: "GET", path: "/api/quotes?symbols=RELIANCE.NS,TCS.NS", expect: 200 },
  { name: "nifty-history", method: "GET", path: "/api/nifty/history", expect: 200 },
  { name: "nifty-prediction", method: "GET", path: "/api/nifty/prediction", expect: 200 },
  { name: "strategies-list", method: "GET", path: "/api/strategies", expect: 200 },
  { name: "strategies-alignment", method: "GET", path: "/api/strategies/alignment", expect: 200 },
  { name: "nifty500-dashboard", method: "GET", path: "/api/nifty500/dashboard", expect: 200 },
  { name: "chart-nifty", method: "GET", path: "/api/chart/%5ENSEI?range=1y", expect: 200 },
  { name: "chart-reliance", method: "GET", path: "/api/chart/RELIANCE.NS?range=3mo", expect: 200 },
  { name: "fii-dii", method: "GET", path: "/api/fii-dii", expect: 200 },
  { name: "research-reliance", method: "GET", path: "/api/research/RELIANCE", expect: 200 },
  { name: "csv-nifty500", method: "GET", path: "/api/reports/csv/nifty500", expect: 200 },
  { name: "csv-strategies", method: "GET", path: "/api/reports/csv/strategies", expect: 200 },
  { name: "csv-fii-dii", method: "GET", path: "/api/reports/csv/fii-dii", expect: 200 },
  { name: "audit-log", method: "GET", path: "/api/audit", expect: 200 },
  { name: "ipo-dashboard", method: "GET", path: "/api/ipo/dashboard", expect: 200 },
  { name: "ipo-alerts", method: "GET", path: "/api/ipo-alerts", expect: 200 },
  { name: "ipo-invalid", method: "GET", path: "/api/ipo/FAKESYMBOL123", expect: 404 },
  { name: "report-center", method: "GET", path: "/api/report-center", expect: 200 },
  { name: "gen-nifty500", method: "GET", path: "/api/reports/generate/nifty500", expect: 200 },
  { name: "gen-fiidii", method: "GET", path: "/api/reports/generate/fiidii", expect: 200 },
  { name: "gen-nifty-strategy", method: "GET", path: "/api/reports/generate/nifty-strategy", expect: 200 },
  { name: "gen-fno", method: "GET", path: "/api/reports/generate/fno", expect: 200 },
  { name: "gen-research", method: "GET", path: "/api/reports/generate/research/RELIANCE", expect: 200 },
  { name: "copilot", method: "POST", path: "/api/copilot", body: { query: "nifty outlook" }, expect: 200 },
  { name: "strategies-post-noauth", method: "POST", path: "/api/strategies", body: { name: "audit-probe", date: "2026-06-22" }, expect: 201 },
  { name: "not-found", method: "GET", path: "/api/does-not-exist", expect: 404 },
];

async function runProbe(probe) {
  const started = Date.now();
  const opts = { method: probe.method, headers: { "Content-Type": "application/json" } };
  if (probe.body) opts.body = JSON.stringify(probe.body);
  try {
    const res = await fetch(`${BASE}${probe.path}`, opts);
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* non-json */ }
    const pass = res.status === probe.expect;
    const note = [];
    if (json?.error) note.push(`error=${json.error}`);
    if (json?.message) note.push(`msg=${String(json.message).slice(0, 80)}`);
    if (json?.report?.type) note.push(`report=${json.report.type}`);
    if (json?.candles?.length) note.push(`candles=${json.candles.length}`);
    if (json?.quotes?.length) note.push(`quotes=${json.quotes.length}`);
    if (json?.strategies?.length != null) note.push(`strategies=${json.strategies.length}`);
    if (json?.reports?.length != null) note.push(`reports=${json.reports.length}`);
    if (json?.entries?.length != null) note.push(`entries=${json.entries.length}`);
    if (json?.storage) note.push(`storage=${json.storage}`);
    return {
      name: probe.name,
      path: probe.path,
      expect: probe.expect,
      status: res.status,
      pass,
      ms: Date.now() - started,
      note: note.join("; ") || (text.startsWith("<") ? "HTML response" : text.slice(0, 60)),
    };
  } catch (err) {
    return {
      name: probe.name,
      path: probe.path,
      expect: probe.expect,
      status: 0,
      pass: false,
      ms: Date.now() - started,
      note: err.message,
    };
  }
}

async function main() {
  console.log(`Phase 3 API probe @ ${BASE}\n`);
  const results = [];
  for (const probe of probes) {
    const r = await runProbe(probe);
    results.push(r);
    const mark = r.pass ? "PASS" : "FAIL";
    console.log(`${mark} ${r.name} ${r.status} (exp ${r.expect}) ${r.ms}ms ${r.note}`);
  }
  const failed = results.filter((r) => !r.pass);
  console.log(`\nSummary: ${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    console.log("Failures:");
    failed.forEach((f) => console.log(`  - ${f.name}: got ${f.status}, expected ${f.expect} — ${f.note}`));
    process.exit(1);
  }
}

main();