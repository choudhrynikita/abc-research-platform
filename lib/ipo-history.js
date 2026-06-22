const { readJson, writeJson } = require("./json-store");

const HISTORY_FILE = "ipo-subscription-history.json";

async function readHistory() {
  return readJson(HISTORY_FILE, {});
}

async function writeHistory(store) {
  await writeJson(HISTORY_FILE, store);
}

async function appendSubscriptionSnapshot(symbol, subscription, meta = {}) {
  const store = await readHistory();
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
  await writeHistory(store);
  return store[symbol];
}

async function getSubscriptionHistory(symbol) {
  const store = await readHistory();
  return store[symbol] || [];
}

module.exports = { appendSubscriptionSnapshot, getSubscriptionHistory, readHistory };