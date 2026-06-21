const fs = require("fs");
const path = require("path");

const { dataPath } = require("./data-path");
const HISTORY_PATH = dataPath("ipo-subscription-history.json");

function readHistory() {
  try {
    return JSON.parse(fs.readFileSync(HISTORY_PATH, "utf8"));
  } catch {
    return {};
  }
}

function writeHistory(store) {
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(store, null, 2));
}

function appendSubscriptionSnapshot(symbol, subscription, meta = {}) {
  const store = readHistory();
  if (!store[symbol]) store[symbol] = [];
  const entry = {
    recordedAt: new Date().toISOString(),
    overall: subscription.overall?.value ?? null,
    retail: subscription.retail?.value ?? null,
    hni: subscription.hni?.value ?? null,
    qib: subscription.qib?.value ?? null,
    employee: subscription.employee?.value ?? null,
    source: subscription.overall?.source || "NSE ipo-detail",
    ...meta,
  };
  const last = store[symbol][0];
  if (last && last.overall === entry.overall && last.retail === entry.retail) {
    return store[symbol];
  }
  store[symbol].unshift(entry);
  store[symbol] = store[symbol].slice(0, 60);
  writeHistory(store);
  return store[symbol];
}

function getSubscriptionHistory(symbol) {
  return readHistory()[symbol] || [];
}

module.exports = { appendSubscriptionSnapshot, getSubscriptionHistory, readHistory };