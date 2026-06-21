const biasClass = {
  BULLISH: "positive",
  BEARISH: "negative",
  NEUTRAL: "neutral",
};

let allStrategies = [];
let currentFilter = "all";
let searchQuery = "";
let editingId = null;

function formatLevel(value) {
  if (value == null || Number.isNaN(value)) return "—";
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function parseLevelInput(id) {
  const raw = document.getElementById(id).value.trim();
  if (!raw) return null;
  const num = Number(raw);
  return Number.isFinite(num) && num > 0 ? num : null;
}

function renderStrategyStats(data) {
  const el = document.getElementById("strategyStats");
  if (!el) return;

  el.innerHTML = `
    <div class="summary-card">
      <div class="label">Total</div>
      <div class="value">${data.count}</div>
    </div>
    <div class="summary-card">
      <div class="label">Active</div>
      <div class="value positive">${data.active}</div>
    </div>
    <div class="summary-card">
      <div class="label">Closed</div>
      <div class="value">${data.count - data.active}</div>
    </div>
  `;
}

function getFilteredStrategies() {
  let list = allStrategies;
  if (currentFilter === "active") list = list.filter((s) => s.status === "active");
  if (currentFilter === "closed") list = list.filter((s) => s.status === "closed");
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.notes.toLowerCase().includes(q) ||
        s.expiry.toLowerCase().includes(q) ||
        s.bias.toLowerCase().includes(q)
    );
  }
  return list;
}

function renderStrategies() {
  const body = document.getElementById("strategiesBody");
  if (!body) return;

  const strategies = getFilteredStrategies();

  if (strategies.length === 0) {
    body.innerHTML = `<tr class="loading-row"><td colspan="10">No strategies match this filter.</td></tr>`;
    return;
  }

  body.innerHTML = strategies
    .map(
      (s) => `
      <tr>
        <td class="name-cell">${s.name}</td>
        <td>${s.date}</td>
        <td>${s.expiry}</td>
        <td><span class="signal-badge ${biasClass[s.bias] || "neutral"}">${s.bias}</span></td>
        <td class="num">${formatLevel(s.entry)}</td>
        <td class="num">${formatLevel(s.target)}</td>
        <td class="num">${formatLevel(s.stopLoss)}</td>
        <td><span class="badge ${s.status === "active" ? "" : "closed"}">${s.status}</span></td>
        <td class="name-cell" title="${s.notes || ""}">${s.notes || "—"}</td>
        <td class="action-cell">
          <button class="action-btn" data-action="edit" data-id="${s.id}">Edit</button>
          <button class="action-btn" data-action="duplicate" data-id="${s.id}">Copy</button>
          <button class="action-btn" data-action="toggle" data-id="${s.id}">${s.status === "active" ? "Close" : "Reopen"}</button>
          <button class="action-btn danger" data-action="delete" data-id="${s.id}">Delete</button>
        </td>
      </tr>
    `
    )
    .join("");

  body.querySelectorAll(".action-btn").forEach((btn) => {
    btn.addEventListener("click", () => handleAction(btn.dataset.action, btn.dataset.id));
  });
}

function resetForm() {
  editingId = null;
  document.getElementById("strategyEditId").value = "";
  document.getElementById("strategyFormTitle").textContent = "Add Strategy";
  document.getElementById("strategyName").value = "";
  document.getElementById("strategyDate").value = "";
  document.getElementById("strategyExpiry").value = "Weekly";
  document.getElementById("strategyBias").value = "BULLISH";
  document.getElementById("strategyEntry").value = "";
  document.getElementById("strategyTarget").value = "";
  document.getElementById("strategyStopLoss").value = "";
  document.getElementById("strategyNotes").value = "";
  document.getElementById("cancelStrategyBtn").hidden = true;
}

function populateForm(strategy) {
  editingId = strategy.id;
  document.getElementById("strategyEditId").value = strategy.id;
  document.getElementById("strategyFormTitle").textContent = "Edit Strategy";
  document.getElementById("strategyName").value = strategy.name;
  document.getElementById("strategyDate").value = strategy.date;
  document.getElementById("strategyExpiry").value = strategy.expiry;
  document.getElementById("strategyBias").value = strategy.bias;
  document.getElementById("strategyEntry").value = strategy.entry ?? "";
  document.getElementById("strategyTarget").value = strategy.target ?? "";
  document.getElementById("strategyStopLoss").value = strategy.stopLoss ?? "";
  document.getElementById("strategyNotes").value = strategy.notes || "";
  document.getElementById("cancelStrategyBtn").hidden = false;
  document.querySelector('[data-tab="strategies"]')?.click();
  document.getElementById("strategyName")?.focus();
}

async function fetchStrategies() {
  const response = await fetch("/api/strategies");
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to load strategies");
  allStrategies = data.strategies;
  renderStrategyStats(data);
  renderStrategies();
}

function getFormPayload() {
  const name = document.getElementById("strategyName").value.trim();
  const date = document.getElementById("strategyDate").value;
  const entry = parseLevelInput("strategyEntry");
  const target = parseLevelInput("strategyTarget");
  const stopLoss = parseLevelInput("strategyStopLoss");

  if (!name || !date) {
    alert("Name and date are required.");
    return null;
  }

  const rawEntry = document.getElementById("strategyEntry").value.trim();
  const rawTarget = document.getElementById("strategyTarget").value.trim();
  const rawStop = document.getElementById("strategyStopLoss").value.trim();

  if ((rawEntry && entry == null) || (rawTarget && target == null) || (rawStop && stopLoss == null)) {
    alert("Entry, target, and stop loss must be positive numbers.");
    return null;
  }

  return {
    name,
    date,
    expiry: document.getElementById("strategyExpiry").value,
    bias: document.getElementById("strategyBias").value,
    entry,
    target,
    stopLoss,
    notes: document.getElementById("strategyNotes").value.trim(),
  };
}

async function saveStrategy() {
  const payload = getFormPayload();
  if (!payload) return;

  const isEdit = Boolean(editingId);
  const response = await fetch(isEdit ? `/api/strategies/${editingId}` : "/api/strategies", {
    method: isEdit ? "PATCH" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    alert(data.error || "Failed to save strategy");
    return;
  }

  resetForm();
  await fetchStrategies();
  if (typeof window.refreshAlignment === "function") {
    window.refreshAlignment();
  }
}

async function handleAction(action, id) {
  const strategy = allStrategies.find((s) => s.id === id);
  if (!strategy) return;

  if (action === "edit") {
    populateForm(strategy);
    return;
  }

  if (action === "duplicate") {
    const response = await fetch(`/api/strategies/${id}/duplicate`, { method: "POST" });
    if (!response.ok) {
      const data = await response.json();
      alert(data.error || "Failed to duplicate strategy");
      return;
    }
    await fetchStrategies();
    if (typeof window.refreshAlignment === "function") window.refreshAlignment();
    return;
  }

  if (action === "toggle") {
    const response = await fetch(`/api/strategies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: strategy.status === "active" ? "closed" : "active" }),
    });
    if (!response.ok) {
      const data = await response.json();
      alert(data.error || "Failed to update status");
      return;
    }
    await fetchStrategies();
    if (typeof window.refreshAlignment === "function") window.refreshAlignment();
    return;
  }

  if (action === "delete") {
    if (!confirm(`Delete "${strategy.name}"?`)) return;
    const response = await fetch(`/api/strategies/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json();
      alert(data.error || "Failed to delete strategy");
      return;
    }
    if (editingId === id) resetForm();
    await fetchStrategies();
    if (typeof window.refreshAlignment === "function") window.refreshAlignment();
  }
}

document.getElementById("saveStrategyBtn")?.addEventListener("click", saveStrategy);
document.getElementById("cancelStrategyBtn")?.addEventListener("click", resetForm);

document.querySelectorAll("#strategyFilters .filter-pill").forEach((pill) => {
  pill.addEventListener("click", () => {
    document.querySelectorAll("#strategyFilters .filter-pill").forEach((p) => p.classList.remove("active"));
    pill.classList.add("active");
    currentFilter = pill.dataset.filter;
    renderStrategies();
  });
});

document.getElementById("strategySearch")?.addEventListener("input", (event) => {
  searchQuery = event.target.value.trim();
  renderStrategies();
});

fetchStrategies();