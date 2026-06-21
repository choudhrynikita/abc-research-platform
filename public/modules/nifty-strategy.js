let strategyInit = false;

async function loadStrategyReport() {
  const el = document.getElementById("strategyReportContent");
  if (!el) return;
  el.innerHTML = `<p class="loading">Generating NIFTY strategy report with backtest evidence...</p>`;

  try {
    const res = await fetch("/api/reports/generate/nifty-strategy");
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || json.error || "Failed");
    renderFullReport(el, json, document.getElementById("strategyReportMeta"));
  } catch (e) {
    el.innerHTML = `<div class="error-panel"><p>${e.message}</p><button class="btn btn-secondary" onclick="loadStrategyReport()">Retry</button></div>`;
  }
}

function initNiftyStrategyModule() {
  loadStrategyReport();

  if (!strategyInit) {
    strategyInit = true;
    if (typeof window.initAlignmentPanel === "function") window.initAlignmentPanel();
    if (typeof window.initNiftyPanel === "function") window.initNiftyPanel();
    if (typeof init === "function") init();
  }
}

window.initNiftyStrategyModule = initNiftyStrategyModule;
window.loadStrategyReport = loadStrategyReport;