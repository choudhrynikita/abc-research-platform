const fs = require("fs");
const path = require("path");

const { dataPath } = require("./data-path");
const STORE_PATH = dataPath("report-center.json");

function readStore() {
  try {
    return JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
  } catch {
    return [];
  }
}

function writeStore(reports) {
  fs.writeFileSync(STORE_PATH, JSON.stringify(reports.slice(0, 200), null, 2));
}

function saveReport(report) {
  const entry = {
    id: `rpt-${Date.now()}`,
    name: report.title,
    type: report.type,
    createdAt: new Date().toISOString(),
    source: report.source,
    confidence: report.confidence ?? null,
    data: report,
  };
  const store = readStore();
  store.unshift(entry);
  writeStore(store);
  return entry;
}

function getReport(id) {
  return readStore().find((r) => r.id === id) || null;
}

function listReports() {
  return readStore().map(({ id, name, type, createdAt, source, confidence }) => ({
    id,
    name,
    type,
    createdAt,
    source,
    confidence,
  }));
}

module.exports = { saveReport, getReport, listReports, readStore };