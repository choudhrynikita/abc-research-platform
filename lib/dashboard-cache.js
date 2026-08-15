const { readJson, writeJson } = require("./json-store");

const FILE = "dashboard-cache.json";
const memory = new Map();

function ageMs(savedAt) {
  if (!savedAt) return Infinity;
  const t = new Date(savedAt).getTime();
  return Number.isFinite(t) ? Date.now() - t : Infinity;
}

async function getDashboardCache(key, maxAgeMs = 15 * 60 * 1000) {
  const mem = memory.get(key);
  if (mem?.data && ageMs(mem.savedAt) <= maxAgeMs) {
    return { data: mem.data, savedAt: mem.savedAt, source: "memory" };
  }
  try {
    const store = await readJson(FILE, {});
    const row = store?.[key];
    if (row?.data && ageMs(row.savedAt) <= maxAgeMs) {
      memory.set(key, { data: row.data, savedAt: row.savedAt });
      return { data: row.data, savedAt: row.savedAt, source: "file" };
    }
  } catch {
    // ignore cache read failures
  }
  return null;
}

async function setDashboardCache(key, data) {
  if (!data) return;
  const savedAt = new Date().toISOString();
  const slim = data;
  memory.set(key, { data: slim, savedAt });
  try {
    const store = await readJson(FILE, {});
    store[key] = { savedAt, data: slim };
    await writeJson(FILE, store);
  } catch {
    // Vercel /tmp or KV may be unavailable — memory still helps warm isolates
  }
}

module.exports = { getDashboardCache, setDashboardCache };
