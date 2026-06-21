const ALIGNMENT_REFRESH_MS = 5 * 60 * 1000;

let alignmentTimer = null;

const biasClass = {
  BULLISH: "positive",
  BEARISH: "negative",
  NEUTRAL: "neutral",
};

const alignmentClass = {
  aligned: "positive",
  conflict: "negative",
  neutral: "neutral",
};

const alignmentLabel = {
  aligned: "Aligned",
  conflict: "Conflict",
  neutral: "Neutral",
};

const levelStatusLabel = {
  stop_hit: "Stop hit",
  target_hit: "Target hit",
  near_stop: "Near stop",
  near_target: "Near target",
  in_range: "In range",
  tracking: "Tracking",
  no_levels: "No levels",
  unknown: "—",
};

const levelStatusClass = {
  stop_hit: "negative",
  target_hit: "positive",
  near_stop: "negative",
  near_target: "positive",
  near_target_hit: "positive",
};

function formatNumber(value, decimals = 2) {
  if (value == null || Number.isNaN(value)) return "—";
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatDistance(value) {
  if (value == null) return "";
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatNumber(value)}%`;
}

function renderAlerts(data) {
  const el = document.getElementById("alertsStrip");
  if (!el) return;

  if (!data.alertCount) {
    el.hidden = true;
    el.innerHTML = "";
    return;
  }

  el.hidden = false;
  el.innerHTML = data.alerts
    .map(
      (a) => `
      <div class="alert-chip ${a.type.includes("stop") ? "alert-danger" : "alert-success"}">
        <strong>${a.strategyName}</strong> — ${a.message}
      </div>
    `
    )
    .join("");
}

function renderAlignmentSummary(data) {
  const el = document.getElementById("alignmentSummary");
  if (!el) return;

  if (!data.activeCount) {
    el.innerHTML = `<p class="alignment-empty">No active strategies. <button class="link-btn" id="addStrategyLink">Add one</button> to track alignment.</p>`;
    document.getElementById("addStrategyLink")?.addEventListener("click", () => {
      document.querySelector('[data-tab="strategies"]')?.click();
    });
    return;
  }

  el.innerHTML = `
    <div class="summary-card">
      <div class="label">Active</div>
      <div class="value">${data.activeCount}</div>
    </div>
    <div class="summary-card">
      <div class="label">Aligned</div>
      <div class="value positive">${data.aligned}</div>
    </div>
    <div class="summary-card">
      <div class="label">Conflict</div>
      <div class="value negative">${data.conflict}</div>
    </div>
    <div class="summary-card">
      <div class="label">Alerts</div>
      <div class="value ${data.alertCount ? "negative" : ""}">${data.alertCount}</div>
    </div>
  `;
}

function renderLevelRow(label, value, distance) {
  if (value == null) return "";
  return `
    <div class="level-row">
      <span class="level-label">${label}</span>
      <span class="level-value">${formatNumber(value)}</span>
      ${distance != null ? `<span class="level-dist">${formatDistance(distance)}</span>` : ""}
    </div>
  `;
}

function renderAlignmentCards(data) {
  const el = document.getElementById("alignmentCards");
  if (!el) return;

  if (!data.activeCount) {
    el.innerHTML = "";
    return;
  }

  el.innerHTML = data.strategies
    .map((s) => {
      const hasLevels = s.entry != null || s.target != null || s.stopLoss != null;
      const statusClass = levelStatusClass[s.levelStatus] || "neutral";

      return `
      <div class="alignment-card">
        <div class="alignment-card-top">
          <span class="name-cell">${s.name}</span>
          <span class="align-badge ${alignmentClass[s.alignment]}">${alignmentLabel[s.alignment]}</span>
        </div>
        <div class="alignment-card-meta">
          <span class="signal-badge ${biasClass[s.bias] || "neutral"}">${s.bias}</span>
          <span>${s.expiry}</span>
          <span class="level-badge ${statusClass}">${levelStatusLabel[s.levelStatus] || s.levelStatus}</span>
        </div>
        ${
          hasLevels
            ? `<div class="level-grid">
                ${renderLevelRow("Entry", s.entry, s.distances?.toEntry)}
                ${renderLevelRow("Target", s.target, s.distances?.toTarget)}
                ${renderLevelRow("Stop", s.stopLoss, s.distances?.toStop)}
              </div>`
            : `<p class="level-hint">Add entry/target/stop in Strategies tab</p>`
        }
      </div>
    `;
    })
    .join("");
}

function renderAlignment(data) {
  window.alignmentData = data;

  const signalEl = document.getElementById("alignNiftySignal");
  const priceEl = document.getElementById("alignNiftyPrice");

  if (signalEl) {
    signalEl.textContent = data.niftySignal;
    signalEl.className = `ensemble-signal ${biasClass[data.niftySignal] || "neutral"}`;
  }
  if (priceEl) {
    priceEl.textContent =
      data.currentPrice != null ? `Nifty ${formatNumber(data.currentPrice)}` : "Nifty —";
  }

  renderAlerts(data);
  renderAlignmentSummary(data);
  renderAlignmentCards(data);

  if (typeof window.updateSummaryWithAlignment === "function") {
    window.updateSummaryWithAlignment(data.activeCount);
  }
  if (typeof window.refreshNiftyChart === "function") {
    window.refreshNiftyChart();
  }
}

async function fetchAlignment() {
  try {
    const response = await fetch("/api/strategies/alignment");
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed to load alignment");
    renderAlignment(data);
  } catch (error) {
    const el = document.getElementById("alignmentSummary");
    if (el) el.innerHTML = `<p class="alignment-empty">${error.message}</p>`;
  }
}

function setupAlignmentRefresh() {
  if (alignmentTimer) clearInterval(alignmentTimer);
  alignmentTimer = setInterval(fetchAlignment, ALIGNMENT_REFRESH_MS);
}

document.getElementById("manageStrategiesBtn")?.addEventListener("click", () => {
  if (typeof window.navigate === "function") window.navigate("nifty-strategy");
  setTimeout(() => document.querySelector('#strategySubTabs [data-tab="strategies"]')?.click(), 50);
});

window.initAlignmentPanel = function initAlignmentPanel() {
  fetchAlignment();
  setupAlignmentRefresh();
};

window.refreshAlignment = fetchAlignment;