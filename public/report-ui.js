function fmt(n, d = 2) {
  if (n == null || Number.isNaN(n)) return "—";
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: d });
}

function dataTypeTag(type) {
  const map = {
    verified: '<span class="tag factual">Verified Data</span>',
    "model-opinion": '<span class="tag opinion">AI / Model Opinion</span>',
    unavailable: '<span class="tag unavailable">Data Unavailable</span>',
  };
  return map[type] || "";
}

function exportButtons(reportId) {
  if (!reportId) return "";
  return `
    <div class="export-toolbar">
      <span class="export-label">Export report:</span>
      <a href="/api/report-center/${reportId}/export/csv" class="btn btn-secondary btn-sm">CSV</a>
      <a href="/api/report-center/${reportId}/export/xlsx" class="btn btn-secondary btn-sm">Excel</a>
      <a href="/api/report-center/${reportId}/export/pdf" class="btn btn-secondary btn-sm">PDF</a>
    </div>
  `;
}

function renderReportSections(sections) {
  return (sections || [])
    .map((s) => {
      let body = "";
      if (s.content) body += `<p>${s.content}</p>`;
      if (s.bullets?.length)
        body += `<ul>${s.bullets.map((b) => `<li>${b}</li>`).join("")}</ul>`;
      if (s.table) {
        body += `<div class="table-wrap"><table>
          <thead><tr>${s.table.headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
          <tbody>${s.table.rows.map((r) => `<tr>${r.map((c) => `<td>${c ?? "Unavailable"}</td>`).join("")}</tr>`).join("")}</tbody>
        </table></div>`;
      }
      const tag = s.dataType ? dataTypeTag(s.dataType) : "";
      return `<section class="report-section"><h3>${s.title} ${tag}</h3>${body}</section>`;
    })
    .join("");
}

function renderStrategyCards(strategies) {
  if (!strategies?.length) return "";
  return `
    <h3>Strategy Specifications</h3>
    ${strategies.map((s) => `
      <div class="strategy-detail-card">
        <h4>${s.strategyName} <span class="tag ${s.marketBias === "Bullish" ? "factual" : s.marketBias === "Bearish" ? "unavailable" : "opinion"}">${s.marketBias}</span></h4>
        <div class="strategy-metrics">
          <span>Entry: <strong>${fmt(s.entryLevel)}</strong></span>
          <span>Exit: <strong>${fmt(s.exitLevel)}</strong></span>
          <span>Stop: <strong>${fmt(s.stopLoss)}</strong></span>
          <span>Target: <strong>${fmt(s.targetLevels)}</strong></span>
          <span>R:R: <strong>${fmt(s.riskRewardRatio)}</strong></span>
          <span>Exp. Profit: <strong>${s.expectedProfitPotentialPct != null ? fmt(s.expectedProfitPotentialPct) + "%" : "—"}</strong></span>
          <span>Max DD Est: <strong>${s.maxDrawdownEstimatePct != null ? fmt(s.maxDrawdownEstimatePct) + "%" : "—"}</strong></span>
          <span>Horizon: <strong>${s.timeHorizon || "—"}</strong></span>
        </div>
        ${s.backtest ? `<p class="hint-block">Backtest: ${s.backtest.sampleSize} samples, win rate ${s.backtest.historicalWinRate ?? "N/A"}%, avg return ${s.backtest.averageReturn ?? "N/A"}%. Source: ${s.backtest.source}</p>` : ""}
      </div>
    `).join("")}
  `;
}

function renderFullReport(container, payload, metaEl) {
  const { reportId, report } = payload;
  if (metaEl && payload._meta) renderMeta(metaEl, payload._meta, report);

  const freshness = report.dataFreshness?.fetchedAt
    ? `<span class="tag factual">Data: ${new Date(report.dataFreshness.fetchedAt).toLocaleString()}</span>`
    : "";

  container.innerHTML = `
    <div class="report-header">
      <h2>${report.title}</h2>
      <p class="report-ts">Generated: ${new Date(report.generatedAt).toLocaleString()} ${freshness}</p>
      ${report.confidence != null ? `<span class="confidence-badge">Confidence: ${report.confidence}% (computed from data completeness)</span>` : ""}
      ${exportButtons(reportId)}
    </div>
    ${renderReportSections(report.sections)}
    ${report.strategies ? renderStrategyCards(report.strategies) : ""}
    <p class="hint-block">${report.disclaimer || ""}</p>
  `;
}

window.renderFullReport = renderFullReport;
window.exportButtons = exportButtons;
window.renderStrategyCards = renderStrategyCards;
window.fmt = fmt;