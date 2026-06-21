async function initFnoModule() {
  const root = document.getElementById("fnoContent");
  root.innerHTML = `<p class="loading">Analyzing live equity data and generating F&O strategy report...</p>`;

  try {
    const res = await fetch("/api/reports/generate/fno");
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || json.error || "Failed");

    renderFullReport(root, json, document.getElementById("fnoMeta"));

    const strategies = json.report.strategies || [];
    root.innerHTML += `
      <h3>Live Strategy Details</h3>
      ${strategies.slice(0, 8).map((s) => `
        <div class="strategy-detail-card">
          <h4>${s.stockName} — ${s.name}</h4>
          <div class="strategy-metrics">
            <span>Entry: <strong>${s.entry}</strong></span>
            <span>Stop: <strong>${s.stopLoss}</strong></span>
            <span>Exit: <strong>${s.exit}</strong></span>
            <span>R:R: <strong>${s.riskReward ?? "—"}</strong></span>
            <span>Capital: <strong>${s.capitalRequired}</strong></span>
            <span>Break-even: <strong>${s.breakEven ?? "—"}</strong></span>
            <span>Hist Vol: <strong>${s.histVol ?? "—"}%</strong></span>
          </div>
          <p class="hint-block">${s.greeks?.note || ""} · ${s.volatilityAnalysis}</p>
          ${s.optionsChain?.available === false ? `<p class="hint-block">Options chain: ${s.optionsChain.reason}</p>` : ""}
        </div>
      `).join("")}
    `;
  } catch (e) {
    root.innerHTML = `<div class="error-panel"><h3>Analysis failed</h3><p>${e.message}</p><button class="btn btn-secondary" onclick="initFnoModule()">Retry</button></div>`;
  }
}

window.initFnoModule = initFnoModule;