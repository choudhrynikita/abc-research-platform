const fs = require("fs");
const path = require("path");

const BASE = process.env.ABC_BASE || "http://localhost:4000";
const ROOT = path.join(__dirname, "..");

const PAGE_ROUTES = [
  { path: "/nifty500", marker: "/api/reports/generate/nifty500" },
  { path: "/fiidii", marker: "/api/reports/generate/fiidii" },
  { path: "/research", marker: "ResearchModule" },
  { path: "/nifty-strategy", marker: "/api/reports/generate/nifty-strategy" },
  { path: "/fno", marker: "/api/reports/generate/fno" },
  { path: "/ipo", marker: "IpoModule" },
  { path: "/reports", marker: "ReportsModule" },
];

const SOURCE_CHECKS = [
  ["components/modules/ReportModule.jsx", ["error-panel", "Retry", "ReportViewer"]],
  ["components/modules/ResearchModule.jsx", ["error-panel", "Retry", "ProChart", "Generate Report"]],
  ["components/modules/IpoModule.jsx", ["error-panel", "MetaBar", "IpoTable"]],
  ["components/modules/ReportsModule.jsx", ["error-panel", "MetaBar", "report-center"]],
  ["components/Shell.jsx", ["sidebarOpen", "overlay", "Sidebar"]],
  ["components/TopBar.jsx", ["menu-btn", "aria-expanded", "onMenuToggle"]],
  ["components/Sidebar.jsx", ["CopilotPanel", "sidebar-close-btn"]],
  ["components/CopilotPanel.jsx", ["copilot-panel", "/api/copilot", "AI Research Copilot"]],
  ["components/MetaBar.jsx", ["compliance-bar", "Source:", "Confidence"]],
  ["components/ReportViewer.jsx", ["SampleUniverseBanner", "FiiDiiDashboard", "ProChart", "ExportButtons"]],
  ["components/charts/ProChart.jsx", ["/api/chart/", "candlestick", "chartjs-chart-financial"]],
  ["components/charts/FiiDiiDashboard.jsx", ["FlowChart", "FlowHeatmap", "chart-dashboard"]],
  ["app/globals.css", [".sidebar.open", ".menu-btn", ".error-panel", ".compliance-bar"]],
];

async function fetchText(url) {
  const res = await fetch(url);
  return { status: res.status, text: await res.text() };
}

async function fetchJson(url) {
  const res = await fetch(url);
  const json = await res.json();
  return { status: res.status, json };
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

async function testPageRoutes() {
  let ok = true;
  for (const route of PAGE_ROUTES) {
    const { status, text } = await fetchText(`${BASE}${route.path}`);
    const statusPass = status === 200;
    const titlePass = text.includes("ABC Research Platform");
    const markerPass = text.includes(route.marker);
    const pass = statusPass && titlePass && markerPass;
    console.log(`${pass ? "PASS" : "FAIL"} page ${route.path} => ${status} marker=${markerPass}`);
    ok = pass && ok;
  }

  const home = await fetchText(`${BASE}/`);
  const redirectPass = home.status === 200 && (home.text.includes("/nifty500") || home.text.includes("nifty500"));
  console.log(`${redirectPass ? "PASS" : "FAIL"} home redirects to nifty500`);
  ok = redirectPass && ok;

  return ok;
}

async function testChartFeeds() {
  let ok = true;
  const symbols = [
    ["nifty", "%5ENSEI"],
    ["reliance", "RELIANCE.NS"],
  ];

  for (const [label, sym] of symbols) {
    const { status, json } = await fetchJson(`${BASE}/api/chart/${sym}?range=1y`);
    const candles = json.candles || [];
    const pass =
      status === 200 &&
      candles.length >= 20 &&
      json.indicators?.latest?.rsi != null &&
      json._meta?.source;
    console.log(`${pass ? "PASS" : "FAIL"} chart ${label} candles=${candles.length} rsi=${json.indicators?.latest?.rsi}`);
    ok = pass && ok;
  }

  return ok;
}

async function testDashboardPayloads() {
  let ok = true;
  const checks = [
    {
      name: "nifty500",
      url: "/api/reports/generate/nifty500",
      validate: (j) =>
        j.report?.type === "nifty500" &&
        j.report.sections?.length > 0 &&
        j.report.dashboard?.marketOverview?.sampleUniverse === true &&
        j._meta?.source &&
        j.reportId,
    },
    {
      name: "fiidii",
      url: "/api/reports/generate/fiidii",
      validate: (j) =>
        j.report?.type === "fiidii" &&
        j.report.views &&
        Object.keys(j.report.views).length >= 4 &&
        j.report.heatmap != null &&
        j._meta?.source,
    },
    {
      name: "nifty-strategy",
      url: "/api/reports/generate/nifty-strategy",
      validate: (j) =>
        j.report?.type === "nifty-strategy" &&
        j.report.sections?.length > 0 &&
        (j.report.strategies?.length > 0 || j.report.sections.some((s) => s.table?.rows?.length)),
    },
    {
      name: "fno",
      url: "/api/reports/generate/fno",
      validate: (j) =>
        j.report?.type === "fno" &&
        j.report.sections?.length > 0 &&
        (j.report.watchlist?.length > 0 || j.report.sections.some((s) => s.table?.rows?.length)),
    },
    {
      name: "research",
      url: "/api/reports/generate/research/RELIANCE",
      validate: (j) =>
        j.report?.type === "research" &&
        j.report.sections?.length >= 5 &&
        j._meta?.source &&
        j.reportId,
    },
  ];

  for (const check of checks) {
    const { status, json } = await fetchJson(`${BASE}${check.url}`);
    const pass = status === 200 && check.validate(json);
    console.log(`${pass ? "PASS" : "FAIL"} dashboard payload ${check.name}`);
    ok = pass && ok;
  }

  const ipoDash = await fetchJson(`${BASE}/api/ipo/dashboard`);
  const ipoPass =
    ipoDash.status === 200 &&
    ipoDash.json.dashboard?.counts != null &&
    ipoDash.json._meta?.source &&
    Array.isArray(ipoDash.json.dashboard?.open);
  console.log(`${ipoPass ? "PASS" : "FAIL"} ipo dashboard payload`);
  ok = ipoPass && ok;

  const reports = await fetchJson(`${BASE}/api/report-center`);
  const archivePass = reports.status === 200 && Array.isArray(reports.json.reports);
  console.log(`${archivePass ? "PASS" : "FAIL"} reports archive payload (${reports.json.reports?.length ?? 0})`);
  ok = archivePass && ok;

  if (reports.json.reports?.length) {
    const id = reports.json.reports[0].id;
    for (const fmt of ["pdf", "xlsx", "csv"]) {
      const res = await fetch(`${BASE}/api/report-center/${id}/export/${fmt}`);
      console.log(`${res.ok ? "PASS" : "FAIL"} export link ${fmt} for archive`);
      ok = res.ok && ok;
    }
  }

  return ok;
}

async function testCopilotAndMeta() {
  let ok = true;
  const copilot = await fetchJson(`${BASE}/api/copilot`);
  const post = await fetch(`${BASE}/api/copilot`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: "nifty outlook" }),
  }).then((r) => r.json());

  const copilotPass = Boolean(post.answer || post._meta);
  console.log(`${copilotPass ? "PASS" : "FAIL"} copilot sidebar API returns answer`);
  ok = copilotPass && ok;

  const n500 = await fetchJson(`${BASE}/api/nifty500/dashboard`);
  const metaPass = n500.json._meta?.source && n500.json._meta?.lastUpdated;
  console.log(`${metaPass ? "PASS" : "FAIL"} nifty500 dashboard MetaBar contract`);
  ok = metaPass && ok;

  return ok;
}

async function main() {
  console.log(`Phase 8 Dashboard & Visualization @ ${BASE}\n`);
  let ok = testSourceContracts();
  ok = (await testPageRoutes()) && ok;
  ok = (await testChartFeeds()) && ok;
  ok = (await testDashboardPayloads()) && ok;
  ok = (await testCopilotAndMeta()) && ok;

  console.log(`\nSummary: ${ok ? "PASS" : "FAIL"}`);
  if (!ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});