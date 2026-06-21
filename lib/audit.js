const fs = require("fs");
const { dataPath } = require("./data-path");

const LOG_PATH = dataPath("audit-log.json");

function readLog() {
  try {
    return JSON.parse(fs.readFileSync(LOG_PATH, "utf8"));
  } catch {
    return [];
  }
}

function logRecommendation(entry) {
  const log = readLog();
  log.unshift({
    id: `audit-${Date.now()}`,
    timestamp: new Date().toISOString(),
    ...entry,
  });
  fs.writeFileSync(LOG_PATH, JSON.stringify(log.slice(0, 500), null, 2));
  return log[0];
}

module.exports = { logRecommendation, readLog };