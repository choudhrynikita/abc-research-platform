const { readJson, writeJson } = require("./json-store");

const LOG_FILE = "audit-log.json";

async function readLog() {
  return readJson(LOG_FILE, []);
}

async function logRecommendation(entry) {
  const log = await readLog();
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