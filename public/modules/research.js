let lastSymbol = "RELIANCE";
let researchInit = false;

async function runResearch(symbol) {
  const sym = (symbol || document.getElementById("researchSymbol").value || lastSymbol).trim();
  if (!sym) return;
  lastSymbol = sym;

  const root = document.getElementById("researchContent");
  const meta = document.getElementById("researchMeta");
  root.innerHTML = `<p class="loading">Generating institutional research report for ${sym}...</p>`;

  try {
    const res = await fetch(`/api/reports/generate/research/${encodeURIComponent(sym)}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || json.error || "Verified data unavailable. Analysis cannot be generated until fresh data is received from approved sources.");

    document.getElementById("researchSymbol").value = sym;
    renderFullReport(root, json, meta);
    if (typeof loadProChart === "function") loadProChart(sym, document.getElementById("chartRangeSelect")?.value || "1y");
  } catch (e) {
    root.innerHTML = `<div class="error-panel"><h3>Report generation failed</h3><p>${e.message}</p><button class="btn btn-secondary" onclick="runResearch('${sym}')">Retry</button></div>`;
  }
}

function initResearchModule() {
  if (!researchInit) {
    researchInit = true;
    document.getElementById("runResearchBtn")?.addEventListener("click", () => runResearch());
    document.getElementById("researchSymbol")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") runResearch();
    });
  }
  runResearch(lastSymbol);
}

window.initResearchModule = initResearchModule;
window.runResearch = runResearch;