const { readJson, writeJson } = require("./json-store");

const LOG_FILE = "audit-log.json";

async function readLog() {
  return readJson(LOG_FILE, []);
}

function entryKey(entry) {
  return `${entry.type}|${entry.symbol || ""}|${entry.query || ""}|${entry.module || ""}`;
}

function isRecentDuplicate(log, entry, withinMs = 5 * 60 * 1000) {
  const key = entryKey(entry);
  const cutoff = Date.now() - withinMs;
  return (log || []).some((row) => entryKey(row) === key && new Date(row.timestamp).getTime() > cutoff);
}

async function logRecommendation(entry) {
  const log = await readLog();
  if (isRecentDuplicate(log, entry)) return log[0] || null;

  const row = {
    id: `audit-${Date.now()}`,
    timestamp: new Date().toISOString(),
    ...entry,
  };
  log.unshift(row);
  await writeJson(LOG_FILE, log.slice(0, 500));
  return row;
}

module.exports = { logRecommendation, readLog };