const BASE = process.env.ABC_BASE || "http://localhost:4000";

const probes = [
  { name: "gen-ipo-invalid", method: "GET", path: "/api/reports/generate/ipo/FAKESYMBOL123", expect: 404 },
  { name: "strategies-post-bad", method: "POST", path: "/api/strategies", body: { name: "x" }, expect: 400 },
  { name: "copilot-empty", method: "POST", path: "/api/copilot", body: { query: "" }, expect: 400 },
  { name: "chart-bad-symbol", method: "GET", path: "/api/chart/NOTAREALSYM999?range=1y", expect: 502 },
  { name: "export-missing", method: "GET", path: "/api/report-center/rpt-nonexistent/export/pdf", expect: 404 },
];

async function probe(p) {
  const opts = { method: p.method, headers: { "Content-Type": "application/json" } };
  if (p.body) opts.body = JSON.stringify(p.body);
  const res = await fetch(`${BASE}${p.path}`, opts);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { /* */ }
  const pass = res.status === p.expect;
  console.log(`${pass ? "PASS" : "FAIL"} ${p.name} ${res.status} (exp ${p.expect}) ${json?.error || json?.message || ""}`);
  return pass;
}

async function main() {
  let ok = true;
  for (const p of probes) ok = (await probe(p)) && ok;

  const rc = await fetch(`${BASE}/api/report-center`).then((r) => r.json());
  const id = rc.reports?.[0]?.id;
  if (rc.reports?.length) {
    for (const rep of rc.reports) {
      for (const fmt of ["pdf", "xlsx", "csv"]) {
        const res = await fetch(`${BASE}/api/report-center/${rep.id}/export/${fmt}`);
        const pass = res.ok;
        console.log(`${pass ? "PASS" : "FAIL"} export-${fmt}-${rep.type} ${res.status}`);
        ok = pass && ok;
      }
    }
  }

  const ipo = await fetch(`${BASE}/api/ipo/dashboard`).then((r) => r.json());
  const sym = ipo.dashboard?.open?.[0]?.symbol || ipo.dashboard?.upcoming?.[0]?.symbol;
  if (sym) {
    for (const [label, path] of [
      ["ipo-valid", `/api/ipo/${encodeURIComponent(sym)}`],
      ["gen-ipo-valid", `/api/reports/generate/ipo/${encodeURIComponent(sym)}`],
    ]) {
      const res = await fetch(`${BASE}${path}`);
      console.log(`${res.ok ? "PASS" : "FAIL"} ${label} ${sym} ${res.status}`);
      ok = res.ok && ok;
    }
  } else {
    console.log("SKIP ipo-valid — no symbols in NSE feed");
  }

  const bare = [
    ["/api/quotes", "_meta"],
    ["/api/nifty500/dashboard", "_meta"],
    ["/api/fii-dii", "date"],
    ["/api/reports/generate/fiidii", "_meta"],
  ];
  for (const [path, key] of bare) {
    const j = await fetch(`${BASE}${path}`).then((r) => r.json());
    const has = key === "_meta" ? Boolean(j._meta?.source) : j[key] != null;
    console.log(`${has ? "PASS" : "FAIL"} contract ${path} has ${key}`);
    ok = has && ok;
  }

  const unwrapped = ["/api/health", "/api/defaults", "/api/strategies", "/api/nifty/history"];
  for (const path of unwrapped) {
    const j = await fetch(`${BASE}${path}`).then((r) => r.json());
    const documented = path === "/api/health" || path === "/api/defaults" || !j._meta;
    console.log(`${documented ? "INFO" : "WARN"} envelope ${path} _meta=${Boolean(j._meta)}`);
  }

  if (!ok) process.exit(1);
  console.log("\nEdge probes complete.");
}

main().catch((e) => { console.error(e); process.exit(1); });