let selectedIpo = null;
let ipoDashboard = null;
let subChart = null;

function ipoCell(v) {
  if (v == null || v === "") return "Verified IPO data unavailable.";
  return v;
}

function subCell(metric) {
  if (!metric) return "Verified IPO data unavailable.";
  return metric.available ? metric.display : metric.display || "Verified IPO data unavailable.";
}

function renderIpoTable(title, rows, cols) {
  if (!rows?.length) {
    return `<h3>${title}</h3><p class="hint-block">Verified IPO data unavailable. No ${title.toLowerCase()} in NSE feed.</p>`;
  }
  const colMap = {
    Company: (r) => r.companyName,
    Symbol: (r) => r.symbol,
    Industry: (r) => ipoCell(r.industry),
    "Issue Size": (r) => ipoCell(r.issueSize),
    "Price Band": (r) => ipoCell(r.issuePrice),
    "Lot Size": (r) => ipoCell(r.lotSize),
    Open: (r) => ipoCell(r.issueStartDate),
    Close: (r) => ipoCell(r.issueEndDate),
    Listing: (r) => ipoCell(r.listingDate),
    Exchange: (r) => ipoCell(r.exchange),
    "Lead Managers": (r) => ipoCell(r.leadManagers),
    Registrar: (r) => ipoCell(r.registrar),
    "Overall Sub": (r) =>
      r.overallSubscription != null ? `${r.overallSubscription}x` : subCell(r.subscription?.overall),
    Retail: (r) => subCell(r.subscription?.retail),
    HNI: (r) => subCell(r.subscription?.hni),
    QIB: (r) => subCell(r.subscription?.qib),
    Employee: (r) => subCell(r.subscription?.employee),
    "Issue Price": (r) => ipoCell(r.issuePrice),
    "Current Price": (r) =>
      r.currentMarketPrice?.display ?? r.currentMarketPrice ?? "Verified IPO data unavailable.",
    "Gain/Loss": (r) =>
      r.listingGainLoss?.display ?? r.listingGainLoss ?? "Verified IPO data unavailable.",
  };
  return `
    <h3>${title}</h3>
    <div class="table-wrap"><table>
      <thead><tr>${cols.map((c) => `<th>${c}</th>`).join("")}</tr></thead>
      <tbody>
        ${rows.map((r) => `
          <tr class="ipo-row" data-symbol="${r.symbol}" style="cursor:pointer">
            ${cols.map((col) => `<td>${(colMap[col] ? colMap[col](r) : ipoCell(r[col]))}</td>`).join("")}
          </tr>
        `).join("")}
      </tbody>
    </table></div>
  `;
}

function renderAlerts(alerts) {
  if (!alerts?.length) return "";
  return `
    <section class="alerts-strip">
      <strong>IPO Alerts</strong>
      <ul>${alerts.slice(0, 8).map((a) => `<li>[${a.type}] ${a.message}</li>`).join("")}</ul>
    </section>
  `;
}

function renderSubscriptionChart(history) {
  const canvas = document.getElementById("ipoSubChart");
  if (!canvas || !history?.length) return;
  if (subChart) subChart.destroy();
  subChart = new Chart(canvas.getContext("2d"), {
    type: "line",
    data: {
      labels: history.map((h) => new Date(h.recordedAt).toLocaleString()),
      datasets: [{
        label: "Overall Subscription (x)",
        data: history.map((h) => h.overall),
        borderColor: "#3b82f6",
        tension: 0.2,
      }],
    },
    options: { responsive: true, scales: { y: { beginAtZero: true } } },
  });
}

async function loadIpoReport(symbol) {
  selectedIpo = symbol;
  const detail = document.getElementById("ipoReportContent");
  const meta = document.getElementById("ipoReportMeta");
  if (!detail) return;
  detail.innerHTML = `<p class="loading">Generating institutional IPO research for ${symbol}...</p>`;

  try {
    const res = await fetch(`/api/reports/generate/ipo/${encodeURIComponent(symbol)}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || json.error || "Verified IPO data unavailable.");
    renderFullReport(detail, json, meta);
    renderSubscriptionChart(json.report.subscriptionHistory);
  } catch (e) {
    detail.innerHTML = `<div class="error-panel"><p>${e.message}</p><button class="btn btn-secondary" onclick="loadIpoReport('${symbol}')">Retry</button></div>`;
  }
}

async function initIpoModule() {
  const root = document.getElementById("ipoContent");
  const meta = document.getElementById("ipoMeta");
  root.innerHTML = `<p class="loading">Fetching verified IPO data from NSE...</p>`;

  try {
    const res = await fetch("/api/ipo/dashboard");
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || json.error || "Verified IPO data unavailable.");

    ipoDashboard = json.dashboard;
    renderMeta(meta, json._meta, { dataFreshness: { fetchedAt: ipoDashboard.fetchedAt } });

    const listed = ipoDashboard.listedEnriched || ipoDashboard.listed;

    root.innerHTML = `
      ${renderAlerts(json.alerts)}
      <section class="executive-dashboard">
        <h3>IPO Market Snapshot</h3>
        <section class="overview-grid">
          <div class="metric-card"><div class="label">Open IPOs</div><div class="value">${ipoDashboard.counts.open}</div></div>
          <div class="metric-card"><div class="label">Upcoming</div><div class="value">${ipoDashboard.counts.upcoming}</div></div>
          <div class="metric-card"><div class="label">Recently Listed</div><div class="value">${ipoDashboard.counts.listed}</div></div>
          <div class="metric-card"><div class="label">Data Freshness</div><div class="value">${new Date(ipoDashboard.fetchedAt).toLocaleString()}</div></div>
        </section>
        <p class="hint-block">Source: NSE India IPO APIs. GMP never displayed without verified source. Financials require DRHP feed.</p>
      </section>
      ${renderIpoTable("Open IPOs", ipoDashboard.open, ["Company", "Symbol", "Price Band", "Close", "Retail", "HNI", "QIB", "Employee", "Overall Sub"])}
      ${renderIpoTable("Upcoming IPOs", ipoDashboard.upcoming, ["Company", "Symbol", "Industry", "Issue Size", "Price Band", "Lot Size", "Open", "Close", "Listing", "Exchange"])}
      ${renderIpoTable("Recently Listed IPOs", listed, ["Company", "Symbol", "Issue Price", "Listing", "Current Price", "Gain/Loss"])}
      <section class="ipo-alerts-panel">
        <h3>IPO Alert Preferences</h3>
        <p class="hint-block">Alerts fire only on verified NSE feed changes — never on estimated data. GMP alerts disabled (no verified GMP source).</p>
        <label class="toggle"><input type="checkbox" id="alertNewIpo" checked /> New IPO announcements</label>
        <label class="toggle"><input type="checkbox" id="alertOpening" checked /> IPO opening</label>
        <label class="toggle"><input type="checkbox" id="alertClosing" checked /> IPO closing</label>
        <label class="toggle"><input type="checkbox" id="alertSubscription" checked /> Subscription updates</label>
        <label class="toggle"><input type="checkbox" id="alertListing" checked /> Listing day updates</label>
        <button class="btn btn-secondary btn-sm" id="saveIpoAlerts">Save Preferences</button>
      </section>
    `;

    root.querySelectorAll(".ipo-row").forEach((row) => {
      row.addEventListener("click", () => loadIpoReport(row.dataset.symbol));
    });

    document.getElementById("saveIpoAlerts")?.addEventListener("click", async () => {
      await fetch("/api/ipo-alerts/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newIpo: document.getElementById("alertNewIpo")?.checked,
          opening: document.getElementById("alertOpening")?.checked,
          closing: document.getElementById("alertClosing")?.checked,
          subscription: document.getElementById("alertSubscription")?.checked,
          listing: document.getElementById("alertListing")?.checked,
          gmp: false,
        }),
      });
    });

    if (ipoDashboard.open[0]) loadIpoReport(ipoDashboard.open[0].symbol);
  } catch (e) {
    root.innerHTML = `<div class="error-panel"><h3>IPO data unavailable</h3><p>${e.message}</p><button class="btn btn-secondary" onclick="initIpoModule()">Retry</button></div>`;
  }
}

window.initIpoModule = initIpoModule;
window.loadIpoReport = loadIpoReport;