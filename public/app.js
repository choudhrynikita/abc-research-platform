const STORAGE_KEY = "abc-symbols";
const REFRESH_INTERVAL_MS = 30000;

let symbols = [];
let quotes = [];
let sortKey = "symbol";
let sortDir = "asc";
let refreshTimer = null;

const INDEX_SYMBOLS = ["^NSEI", "^BSESN"];
let activeStrategyCount = 0;

const els = {
  body: document.getElementById("quotesBody"),
  summary: document.getElementById("summary"),
  indexStrip: document.getElementById("indexStrip"),
  statusPill: document.getElementById("statusPill"),
  statusText: document.getElementById("statusText"),
  lastUpdated: document.getElementById("lastUpdated"),
  dataSource: document.getElementById("dataSource"),
  symbolInput: document.getElementById("symbolInput"),
  addBtn: document.getElementById("addBtn"),
  refreshBtn: document.getElementById("refreshBtn"),
  resetBtn: document.getElementById("resetBtn"),
  autoRefresh: document.getElementById("autoRefresh"),
};

window.updateSummaryWithAlignment = function updateSummaryWithAlignment(count) {
  activeStrategyCount = count;
  if (quotes.length) renderSummary(quotes);
};

function formatNumber(value, decimals = 2) {
  if (value == null || Number.isNaN(value)) return "—";
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatCompact(value) {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

function changeClass(value) {
  if (value == null || value === 0) return "change-neutral";
  return value > 0 ? "change-positive" : "change-negative";
}

function marketBadge(state) {
  if (!state || state === "NOT_FOUND") {
    return '<span class="badge error">Not found</span>';
  }
  if (state === "REGULAR" || state === "PRE" || state === "POST") {
    return `<span class="badge">${state}</span>`;
  }
  return `<span class="badge closed">${state}</span>`;
}

async function loadDefaultSymbols() {
  const response = await fetch("/api/defaults");
  const data = await response.json();
  return data.symbols;
}

function loadSymbols() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  }
  return null;
}

function saveSymbols() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(symbols));
}

function setStatus(state, text) {
  els.statusPill.className = `status-pill ${state}`;
  els.statusText.textContent = text;
}

function sortQuotes(data) {
  return [...data].sort((a, b) => {
    const left = a[sortKey];
    const right = b[sortKey];

    if (left == null && right == null) return 0;
    if (left == null) return 1;
    if (right == null) return -1;

    if (typeof left === "number" && typeof right === "number") {
      return sortDir === "asc" ? left - right : right - left;
    }

    const leftStr = String(left).toLowerCase();
    const rightStr = String(right).toLowerCase();
    if (leftStr < rightStr) return sortDir === "asc" ? -1 : 1;
    if (leftStr > rightStr) return sortDir === "asc" ? 1 : -1;
    return 0;
  });
}

function renderIndexStrip(data) {
  if (!els.indexStrip) return;

  const indices = INDEX_SYMBOLS.map((symbol) => data.find((q) => q.symbol === symbol)).filter(Boolean);

  if (!indices.length) {
    els.indexStrip.innerHTML = "";
    return;
  }

  els.indexStrip.innerHTML = indices
    .map((quote) => {
      const label = quote.symbol === "^NSEI" ? "Nifty 50" : "Sensex";
      return `
        <div class="index-card">
          <div class="index-label">${label}</div>
          <div class="index-price">${formatNumber(quote.price)}</div>
          <div class="index-change ${changeClass(quote.changePercent)}">
            ${quote.changePercent != null ? `${quote.changePercent > 0 ? "+" : ""}${formatNumber(quote.changePercent)}%` : "—"}
          </div>
        </div>
      `;
    })
    .join("");
}

function renderSummary(data) {
  const valid = data.filter((q) => q.price != null);
  const gainers = valid.filter((q) => (q.changePercent ?? 0) > 0).length;
  const losers = valid.filter((q) => (q.changePercent ?? 0) < 0).length;
  const avgChange =
    valid.length > 0
      ? valid.reduce((sum, q) => sum + (q.changePercent ?? 0), 0) / valid.length
      : 0;

  els.summary.innerHTML = `
    <div class="summary-card">
      <div class="label">Tracked Symbols</div>
      <div class="value">${data.length}</div>
    </div>
    <div class="summary-card">
      <div class="label">Active Strategies</div>
      <div class="value">${activeStrategyCount}</div>
    </div>
    <div class="summary-card">
      <div class="label">Gainers</div>
      <div class="value positive">${gainers}</div>
    </div>
    <div class="summary-card">
      <div class="label">Losers</div>
      <div class="value negative">${losers}</div>
    </div>
    <div class="summary-card">
      <div class="label">Avg Change %</div>
      <div class="value ${avgChange >= 0 ? "positive" : "negative"}">${formatNumber(avgChange)}%</div>
    </div>
  `;
}

function renderTable(data) {
  if (data.length === 0) {
    els.body.innerHTML = `<tr class="loading-row"><td colspan="12">No symbols in watchlist. Add one above.</td></tr>`;
    return;
  }

  const sorted = sortQuotes(data);
  els.body.innerHTML = sorted
    .map((quote) => {
      const changePct = quote.changePercent;
      const change = quote.change;
      const currency = quote.currency ? `${quote.currency} ` : "";

      return `
        <tr>
          <td class="symbol-cell">${quote.symbol}</td>
          <td class="name-cell" title="${quote.name}">${quote.name}</td>
          <td class="num">${quote.price != null ? `${currency}${formatNumber(quote.price)}` : "—"}</td>
          <td class="num ${changeClass(change)}">${change != null ? `${change > 0 ? "+" : ""}${formatNumber(change)}` : "—"}</td>
          <td class="num ${changeClass(changePct)}">${changePct != null ? `${changePct > 0 ? "+" : ""}${formatNumber(changePct)}%` : "—"}</td>
          <td class="num">${formatCompact(quote.volume)}</td>
          <td class="num">${formatCompact(quote.marketCap)}</td>
          <td class="num">${quote.dayHigh != null ? formatNumber(quote.dayHigh) : "—"}</td>
          <td class="num">${quote.dayLow != null ? formatNumber(quote.dayLow) : "—"}</td>
          <td>${quote.exchange || "—"}</td>
          <td>${marketBadge(quote.marketState)}</td>
          <td><button class="remove-btn" data-symbol="${quote.symbol}" title="Remove">×</button></td>
        </tr>
      `;
    })
    .join("");

  els.body.querySelectorAll(".remove-btn").forEach((btn) => {
    btn.addEventListener("click", () => removeSymbol(btn.dataset.symbol));
  });
}

async function fetchQuotes() {
  setStatus("", "Refreshing...");
  try {
    const response = await fetch(`/api/quotes?symbols=${encodeURIComponent(symbols.join(","))}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch quotes");
    }

    quotes = data.quotes;
    renderIndexStrip(quotes);
    renderSummary(quotes);
    renderTable(quotes);
    els.lastUpdated.textContent = `Updated ${formatTime(data.fetchedAt)}`;
    els.dataSource.textContent = data.source;
    setStatus("live", "Live");
  } catch (error) {
    setStatus("error", "Error");
    els.body.innerHTML = `<tr class="error-row"><td colspan="12">${error.message}</td></tr>`;
  }
}

function addSymbol(raw) {
  const symbol = raw.trim().toUpperCase();
  if (!symbol) return;
  if (symbols.includes(symbol)) {
    els.symbolInput.value = "";
    return;
  }
  symbols.push(symbol);
  saveSymbols();
  els.symbolInput.value = "";
  fetchQuotes();
}

function removeSymbol(symbol) {
  symbols = symbols.filter((s) => s !== symbol);
  saveSymbols();
  fetchQuotes();
}

function setupAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
  if (els.autoRefresh.checked) {
    refreshTimer = setInterval(fetchQuotes, REFRESH_INTERVAL_MS);
  }
}

async function resetDefaults() {
  symbols = await loadDefaultSymbols();
  saveSymbols();
  fetchQuotes();
}

document.querySelectorAll("th[data-sort]").forEach((th) => {
  th.addEventListener("click", () => {
    const key = th.dataset.sort;
    if (sortKey === key) {
      sortDir = sortDir === "asc" ? "desc" : "asc";
    } else {
      sortKey = key;
      sortDir = "asc";
    }
    renderTable(quotes);
  });
});

els.addBtn.addEventListener("click", () => addSymbol(els.symbolInput.value));
els.symbolInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") addSymbol(els.symbolInput.value);
});
els.refreshBtn.addEventListener("click", fetchQuotes);
els.resetBtn.addEventListener("click", resetDefaults);
els.autoRefresh.addEventListener("change", setupAutoRefresh);

async function init() {
  symbols = loadSymbols() || (await loadDefaultSymbols());
  saveSymbols();
  if (typeof window.initAlignmentPanel === "function") {
    window.initAlignmentPanel();
  }
  if (typeof window.initNiftyPanel === "function") {
    window.initNiftyPanel();
  }
  await fetchQuotes();
  setupAutoRefresh();
}

// Initialized via NIFTY Strategy Center module