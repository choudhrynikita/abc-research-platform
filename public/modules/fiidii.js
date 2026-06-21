function fmtCr(v) {
  if (v == null) return "Verified data unavailable.";
  return `${Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 })} Cr`;
}

async function initFiiDiiModule() {
  const root = document.getElementById("fiidiiContent");
  const meta = document.getElementById("fiidiiMeta");
  const charts = document.getElementById("fiidiiCharts");
  root.innerHTML = `<p class="loading">Fetching verified FII/DII data from NSE...</p>`;
  if (charts) charts.innerHTML = "";

  try {
    const res = await fetch("/api/reports/generate/fiidii");
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || json.error || "Verified data unavailable. Analysis cannot be generated until fresh data is received from approved sources.");

    renderFullReport(root, json, meta);

    const report = json.report;
    const live = report.live;
    const agg = report.aggregates;

    root.innerHTML += `
      <section class="executive-dashboard">
        <h3>Executive Dashboard</h3>
        <section class="overview-grid">
          <div class="metric-card"><div class="label">FII Daily Net</div><div class="value ${live.fii?.netValue >= 0 ? "positive" : "negative"}">${fmtCr(live.fii?.netValue)}</div><small>Source: NSE · ${live.date || "—"}</small></div>
          <div class="metric-card"><div class="label">DII Daily Net</div><div class="value ${live.dii?.netValue >= 0 ? "positive" : "negative"}">${fmtCr(live.dii?.netValue)}</div></div>
          <div class="metric-card"><div class="label">FII Monthly</div><div class="value">${agg?.fii?.monthly?.display || "Verified data unavailable."}</div></div>
          <div class="metric-card"><div class="label">FII Yearly</div><div class="value">${agg?.fii?.yearly?.display || "Verified data unavailable."}</div></div>
        </section>
        ${report.dataStatus === "cached" ? `<p class="hint-block">Live NSE feed unavailable — displaying last verified stored session.</p>` : ""}
      </section>
    `;

    if (charts && typeof renderFiiDiiDashboard === "function") {
      renderFiiDiiDashboard(report, charts);
    }
  } catch (e) {
    root.innerHTML = `<div class="error-panel"><h3>Data unavailable</h3><p>${e.message}</p><button class="btn btn-secondary" onclick="initFiiDiiModule()">Retry</button></div>`;
  }
}

window.initFiiDiiModule = initFiiDiiModule;