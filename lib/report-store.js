const { readJson, writeJson } = require("./json-store");

const STORE_FILE = "report-center.json";

async function readStore() {
  return readJson(STORE_FILE, []);
}

async function writeStore(reports) {
  await writeJson(STORE_FILE, reports.slice(0, 200));
}

async function saveReport(report) {
  const entry = {
    id: `rpt-${Date.now()}`,
    name: report.title,
    type: report.type,
    createdAt: new Date().toISOString(),
    source: report.source,
    confidence: report.confidence ?? null,
    data: report,
  };
  const store = await readStore();
  store.unshift(entry);
  await writeStore(store);
  return entry;
}

async function getReport(id) {
  const store = await readStore();
  return store.find((r) => r.id === id) || null;
}

async function listReports() {
  const store = await readStore();
  return store.map(({ id, name, type, createdAt, source, confidence }) => ({
    id,
    name,
    type,
    createdAt,
    source,
    confidence,
  }));
}

module.exports = { saveReport, getReport, listReports, readStore };