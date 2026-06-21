const { saveReport } = require("./report-store");
const { wrapResponse } = require("./compliance");
const { buildNifty500Report } = require("./report-nifty500");
const { buildFiiDiiReport } = require("./report-fiidii");
const { buildNiftyStrategyReport } = require("./report-nifty-strategy");
const { buildFnoReport } = require("./report-fno");
const { buildResearchReportDocument } = require("./research");
const { buildIpoResearchReport, buildIpoDashboardReport } = require("./report-ipo");

async function generateAndStore(type, options = {}) {
  let report;

  switch (type) {
    case "nifty500":
      report = await buildNifty500Report();
      break;
    case "fiidii":
      report = await buildFiiDiiReport();
      break;
    case "nifty-strategy":
      report = await buildNiftyStrategyReport();
      break;
    case "fno":
      report = await buildFnoReport();
      break;
    case "research":
      if (!options.symbol) throw new Error("symbol required for research report");
      report = await buildResearchReportDocument(options.symbol);
      break;
    case "ipo":
      if (!options.symbol) throw new Error("symbol required for IPO report");
      report = await buildIpoResearchReport(options.symbol);
      break;
    case "ipo-dashboard":
      report = await buildIpoDashboardReport();
      break;
    default:
      throw new Error(`Unknown report type: ${type}`);
  }

  const entry = saveReport(report);
  return wrapResponse(
    { reportId: entry.id, report },
    {
      source: report.source,
      dataType: type === "research" ? "mixed" : "factual",
      confidence: report.confidence,
      lastUpdated: report.generatedAt,
    }
  );
}

module.exports = { generateAndStore };