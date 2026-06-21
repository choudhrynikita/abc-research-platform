async function initReportsModule() {
  const root = document.getElementById("reportsContent");
  root.innerHTML = `<p class="loading">Loading report history...</p>`;

  try {
    const res = await fetch("/api/report-center");
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || json.error || "Failed");

    const reports = json.reports || [];

    root.innerHTML = `
      <p>Institutional reports include: Cover Page, Executive Summary, Market Overview, Fundamentals, Financial Statements, Technical Analysis, Competitor/Sector Benchmarking, FII/DII, Options Analysis, Scenarios, Bull/Bear Cases, Investment Thesis, Data Sources, Methodology, AI Commentary, and Disclaimer.</p>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Report</th><th>Type</th><th>Created</th><th>Source</th><th>Confidence</th><th>Export</th></tr></thead>
          <tbody>
            ${reports.length ? reports.map((r) => `
              <tr>
                <td>${r.name}</td>
                <td>${r.type}</td>
                <td>${new Date(r.createdAt).toLocaleString()}</td>
                <td>${r.source}</td>
                <td>${r.confidence ?? "—"}%</td>
                <td class="action-cell">
                  <a href="/api/report-center/${r.id}/export/csv" class="btn btn-ghost btn-sm">CSV</a>
                  <a href="/api/report-center/${r.id}/export/xlsx" class="btn btn-ghost btn-sm">Excel</a>
                  <a href="/api/report-center/${r.id}/export/pdf" class="btn btn-ghost btn-sm">PDF</a>
                </td>
              </tr>
            `).join("") : `<tr><td colspan="6">No reports yet — click any module to generate one.</td></tr>`}
          </tbody>
        </table>
      </div>
      <h3>Quick Generate</h3>
      <div class="report-cards">
        <button class="btn btn-primary" onclick="navigate('nifty500')">NIFTY 500 Report</button>
        <button class="btn btn-primary" onclick="navigate('fiidii')">FII/DII Report</button>
        <button class="btn btn-primary" onclick="navigate('research')">Research Report</button>
        <button class="btn btn-primary" onclick="navigate('nifty-strategy')">Strategy Report</button>
        <button class="btn btn-primary" onclick="navigate('fno')">F&O Report</button>
        <button class="btn btn-primary" onclick="navigate('ipo')">IPO Intelligence</button>
      </div>
    `;
  } catch (e) {
    root.innerHTML = `<div class="error-panel"><p>${e.message}</p><button class="btn btn-secondary" onclick="initReportsModule()">Retry</button></div>`;
  }
}

window.initReportsModule = initReportsModule;