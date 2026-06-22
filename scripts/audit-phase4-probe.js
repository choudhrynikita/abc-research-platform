const BASE = process.env.ABC_BASE || "http://localhost:4000";

const FORBIDDEN_TABLE = new Set(["null", "undefined", "NaN", "Infinity", "-Infinity"]);
const UNAVAILABLE_OK = new Set([
  "Unavailable",
  "Verified data unavailable.",
  "—",
  "-",
  "N/A",
  "Verified IPO data unavailable.",
]);

function walkTables(report, issues, path = "report") {
  for (const section of report.sections || []) {
    if (!section.table?.rows) continue;
    for (const [ri, row] of section.table.rows.entries()) {
      for (const [ci, cell] of row.entries()) {
        const s = String(cell ?? "").trim();
        if (FORBIDDEN_TABLE.has(s)) {
          issues.push(`${path}.sections[${section.title}].row${ri}[${ci}]=${s}`);
        }
        if (cell === null || cell === undefined) {
          issues.push(`${path}.sections[${section.title}].row${ri}[${ci}] is null`);
        }
      }
    }
  }
}

function checkReportIntegrity(name, payload) {
  const issues = [];
  const report = payload.report || payload;
  if (!report.type) issues.push(`${name}: missing report.type`);
  if (!report.source) issues.push(`${name}: missing report.source`);
  if (report.confidence == null) issues.push(`${name}: missing confidence`);
  if (!report.disclaimer) issues.push(`${name}: missing disclaimer`);
  if (payload._meta && !payload._meta.source) issues.push(`${name}: missing _meta.source`);

  walkTables(report, issues, name);

  if (report.type === "nifty500") {
    const b = report.dashboard?.marketBreadth;
    if (!report.dashboard?.marketOverview?.sampleUniverse) {
      issues.push("nifty500: sampleUniverse flag not set");
    }
    if (b && b.sampleSize >= b.totalTracked && b.totalTracked < 100) {
      issues.push(`nifty500: sampleSize ${b.sampleSize} may misrepresent full index`);
    }
    if (!String(report.title).toLowerCase().includes("sample")) {
      issues.push("nifty500: title should disclose sample universe");
    }
    if (!String(report.disclaimer).toLowerCase().includes("sample")) {
      issues.push("nifty500: disclaimer should mention sample");
    }
  }

  if (report.type === "research") {
    const fundSection = (report.sections || []).find((s) => s.title === "Fundamental Analysis");
    if (fundSection?.dataType === "verified" && !report.fundamentals?.available) {
      issues.push("research: Fundamental Analysis marked verified but fundamentals unavailable");
    }
    const valSection = (report.sections || []).find((s) => s.title?.includes("Valuation"));
    if (valSection) {
      const text = JSON.stringify(valSection);
      if (/intrinsic|dcf/i.test(text) && !/unavailable/i.test(text)) {
        issues.push("research: valuation may claim DCF without unavailable guard");
      }
    }
  }

  if (report.type === "ipo") {
    const text = JSON.stringify(report);
    if (/gmp/i.test(text) && !/unavailable|disclaimer|never/i.test(text)) {
      issues.push("ipo: GMP mentioned without unavailable/disclaimer guard");
    }
    for (const section of report.sections || []) {
      if (section.title === "GMP Intelligence" && section.dataType !== "unavailable") {
        issues.push("ipo: GMP Intelligence should be unavailable without verified feed");
      }
    }
  }

  if (report.type === "fiidii") {
    const agg = report.aggregates || report.trends?.aggregates;
    if (agg?.fii?.quarterly?.available && (agg.fii.quarterly.sessions ?? 0) < 5) {
      issues.push("fiidii: quarterly aggregate available with too few sessions");
    }
    const exec = (report.sections || []).find((s) => s.title === "Executive Summary");
    if (exec && !/unavailable|verified|stored/i.test(exec.content || "")) {
      issues.push("fiidii: executive summary lacks data status language");
    }
  }

  if (report.type === "fno") {
    const text = JSON.stringify(report);
    if (/max pain|pcr|open interest/i.test(text) && !/unavailable|model-estimated|verified/i.test(text)) {
      issues.push("fno: options metrics may lack provenance label");
    }
  }

  return issues;
}

async function fetchJson(path) {
  const res = await fetch(`${BASE}${path}`);
  const json = await res.json();
  return { status: res.status, json };
}

async function main() {
  console.log(`Phase 4 Data Integrity @ ${BASE}\n`);
  const allIssues = [];

  const reports = [
    ["nifty500", "/api/reports/generate/nifty500"],
    ["fiidii", "/api/reports/generate/fiidii"],
    ["nifty-strategy", "/api/reports/generate/nifty-strategy"],
    ["fno", "/api/reports/generate/fno"],
    ["research", "/api/reports/generate/research/RELIANCE"],
  ];

  for (const [name, path] of reports) {
    const { status, json } = await fetchJson(path);
    if (status !== 200) {
      allIssues.push(`${name}: HTTP ${status} ${json.error || json.message || ""}`);
      console.log(`FAIL ${name} HTTP ${status}`);
      continue;
    }
    const issues = checkReportIntegrity(name, json);
    if (issues.length) {
      allIssues.push(...issues);
      console.log(`FAIL ${name} ${issues.length} issue(s)`);
      issues.forEach((i) => console.log(`  - ${i}`));
    } else {
      console.log(`PASS ${name} integrity checks`);
    }
  }

  const ipoDash = await fetchJson("/api/ipo/dashboard");
  if (ipoDash.status === 200) {
    const sym = ipoDash.json.dashboard?.open?.[0]?.symbol;
    if (sym) {
      const ipo = await fetchJson(`/api/reports/generate/ipo/${encodeURIComponent(sym)}`);
      const issues = checkReportIntegrity(`ipo-${sym}`, ipo.json);
      if (issues.length) {
        allIssues.push(...issues);
        console.log(`FAIL ipo-${sym} ${issues.length} issue(s)`);
        issues.forEach((i) => console.log(`  - ${i}`));
      } else {
        console.log(`PASS ipo-${sym} integrity checks`);
      }
    } else {
      console.log("SKIP ipo report — no open IPO in feed");
    }
  }

  const fii = await fetchJson("/api/fii-dii");
  if (fii.status === 200) {
    const hist = fii.json.history || [];
    const hasNullNet = hist.some((h) => h.fiiNet === undefined && h.diiNet === undefined);
    if (hasNullNet) allIssues.push("fii-dii live: history row missing net values structure");
    else console.log("PASS fii-dii history structure");
    if (!fii.json.date) allIssues.push("fii-dii: missing session date");
    else console.log("PASS fii-dii session date present");
  }

  const n500 = await fetchJson("/api/nifty500/dashboard");
  if (n500.status === 200) {
    const d = n500.json;
    if (!d.marketOverview?.sampleUniverse) allIssues.push("dashboard: sampleUniverse missing");
    else console.log("PASS dashboard sampleUniverse=true");
    if (!d.marketBreadth?.sampleSize) allIssues.push("dashboard: sampleSize missing");
    else console.log(`PASS dashboard sampleSize=${d.marketBreadth.sampleSize}/${d.marketBreadth.totalTracked}`);
  }

  const researchRaw = await fetchJson("/api/research/RELIANCE");
  if (researchRaw.status === 200) {
    const r = researchRaw.json;
    if (r.fundamentals?.available && !r.fundamentals?.source) {
      allIssues.push("research raw: fundamentals available without source");
    }
    const unavailableFund = !r.fundamentals?.available;
    if (unavailableFund) console.log("PASS research fundamentals correctly unavailable (no licensed feed)");
    else console.log("INFO research fundamentals available from Yahoo");
  }

  console.log(`\nSummary: ${allIssues.length ? "FAIL" : "PASS"} (${allIssues.length} issues)`);
  if (allIssues.length) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});