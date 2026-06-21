async function initNifty500Module() {
  const root = document.getElementById("nifty500Content");
  const meta = document.getElementById("nifty500Meta");
  root.innerHTML = `<p class="loading">Fetching live NIFTY 500 data and generating report...</p>`;

  try {
    const res = await fetch("/api/reports/generate/nifty500");
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || json.error || "Verified market data unavailable. Report generation paused until fresh data is received.");

    renderFullReport(root, json, meta);

    const d = json.report.dashboard;
    const gainers = d.constituents.filter((c) => c.changePercent != null).sort((a, b) => b.changePercent - a.changePercent).slice(0, 5);
    const losers = d.constituents.filter((c) => c.changePercent != null).sort((a, b) => a.changePercent - b.changePercent).slice(0, 5);

    root.innerHTML += `
      <h3>Live Snapshot</h3>
      <section class="overview-grid">
        <div class="metric-card"><div class="label">Index</div><div class="value">${fmt(d.marketOverview.price)}</div></div>
        <div class="metric-card"><div class="label">Daily %</div><div class="value ${d.marketOverview.dailyChangePercent >= 0 ? "positive" : "negative"}">${fmt(d.marketOverview.dailyChangePercent)}%</div></div>
        <div class="metric-card"><div class="label">Advances</div><div class="value positive">${d.marketBreadth.advances}</div></div>
        <div class="metric-card"><div class="label">Declines</div><div class="value negative">${d.marketBreadth.declines}</div></div>
      </section>
      <h3>Volume Leaders</h3>
      <div class="table-wrap"><table><thead><tr><th>Symbol</th><th>Volume</th><th>Change%</th></tr></thead><tbody>
        ${d.marketBreadth.volumeLeaders.map((v) => `<tr><td>${v.symbol}</td><td>${fmt(v.volume, 0)}</td><td>${fmt(v.changePercent)}%</td></tr>`).join("")}
      </tbody></table></div>
    `;
  } catch (e) {
    root.innerHTML = `<div class="error-panel"><h3>Data unavailable</h3><p>${e.message}</p><button class="btn btn-secondary" onclick="initNifty500Module()">Retry</button></div>`;
  }
}

window.initNifty500Module = initNifty500Module;