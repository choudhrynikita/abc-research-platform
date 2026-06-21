let fiiChart = null;
let diiChart = null;

function renderFlowHeatmap(container, heatmap) {
  if (!container || !heatmap?.length) {
    container.innerHTML = `<p class="hint-block">Verified data unavailable. Heatmap requires stored NSE session history.</p>`;
    return;
  }
  container.innerHTML = `
    <div class="flow-heatmap">
      ${heatmap.map((cell) => `
        <div class="heat-cell" title="FII ${cell.fiiNet} / DII ${cell.diiNet} — ${cell.date}">
          <span class="heat-date">${cell.date}</span>
          <span class="heat-fii ${cell.fiiDirection}" style="opacity:${0.35 + cell.fiiIntensity * 0.65}">FII ${cell.fiiNet ?? "—"}</span>
          <span class="heat-dii ${cell.diiDirection}" style="opacity:${0.35 + cell.diiIntensity * 0.65}">DII ${cell.diiNet ?? "—"}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function renderFlowChart(canvas, history, key, label, color) {
  if (!canvas || !history?.length) return;
  const ctx = canvas.getContext("2d");
  if (window[`${key}Chart`]) window[`${key}Chart`].destroy();
  const labels = history.map((h) => h.date);
  const data = history.map((h) => h[key === "fii" ? "fiiNet" : "diiNet"]);
  window[`${key}Chart`] = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label,
        data,
        borderColor: color,
        backgroundColor: color + "33",
        fill: true,
        tension: 0.25,
      }],
    },
    options: {
      responsive: true,
      interaction: { mode: "index", intersect: false },
      plugins: { legend: { labels: { color: "#8b9bb4" } } },
      scales: {
        x: { ticks: { color: "#8b9bb4", maxTicksLimit: 8 } },
        y: { ticks: { color: "#8b9bb4" } },
      },
    },
  });
}

function renderFiiDiiDashboard(report, root) {
  if (!root) return;
  const views = report.views || {};
  const viewKey = document.getElementById("fiiViewSelect")?.value || "1m";
  const history = views[viewKey]?.data || report.history || [];

  root.innerHTML = `
    <section class="chart-dashboard">
      <div class="chart-controls">
        <label>Historical View
          <select id="fiiViewSelect" class="chart-select">
            <option value="1m">1 Month</option>
            <option value="3m">3 Months</option>
            <option value="6m">6 Months</option>
            <option value="1y">1 Year</option>
            <option value="3y">3 Years</option>
            <option value="5y">5 Years</option>
          </select>
        </label>
      </div>
      <div class="chart-row">
        <div class="chart-panel-sm"><canvas id="fiiFlowChart"></canvas></div>
        <div class="chart-panel-sm"><canvas id="diiFlowChart"></canvas></div>
      </div>
      <h3>Institutional Flow Heatmap</h3>
      <div id="fiiHeatmap"></div>
      <h3>Aggregate Intelligence</h3>
      <section class="overview-grid">
        <div class="metric-card"><div class="label">Smart Money</div><div class="value">${report.intelligence?.smartMoneyDirection || "—"}</div></div>
        <div class="metric-card"><div class="label">FII Quarterly</div><div class="value">${report.aggregates?.fii?.quarterly?.display || "—"}</div></div>
        <div class="metric-card"><div class="label">DII Quarterly</div><div class="value">${report.aggregates?.dii?.quarterly?.display || "—"}</div></div>
        <div class="metric-card"><div class="label">Sessions Stored</div><div class="value">${report.history?.length || 0}</div></div>
      </section>
    </section>
  `;

  const sel = document.getElementById("fiiViewSelect");
  if (sel) sel.value = viewKey;
  sel?.addEventListener("change", () => renderFiiDiiDashboard(report, root));

  const hist = (views[sel?.value || "1m"]?.data) || history;
  renderFlowChart(document.getElementById("fiiFlowChart"), hist, "fii", "FII Net (Cr)", "#22c55e");
  renderFlowChart(document.getElementById("diiFlowChart"), hist, "dii", "DII Net (Cr)", "#3b82f6");
  renderFlowHeatmap(document.getElementById("fiiHeatmap"), report.heatmap);
}

window.renderFiiDiiDashboard = renderFiiDiiDashboard;