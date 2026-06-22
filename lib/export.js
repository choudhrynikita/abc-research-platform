const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");
const { toCsv } = require("./reports");

function reportToText(report) {
  const lines = [
    report.title,
    `Generated: ${report.generatedAt}`,
    `Source: ${report.source}`,
    "",
  ];
  (report.sections || []).forEach((s) => {
    lines.push(`## ${s.title}`);
    if (s.content) lines.push(s.content);
    if (s.bullets) s.bullets.forEach((b) => lines.push(`- ${b}`));
    if (s.table) {
      lines.push(s.table.headers.join(" | "));
      s.table.rows.forEach((r) => lines.push(r.join(" | ")));
    }
    lines.push("");
  });
  return lines.join("\n");
}

function buildPdfBuffer(report) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(22).text("INSTITUTIONAL RESEARCH REPORT", { align: "center" });
    doc.moveDown();
    doc.fontSize(18).text(report.title, { align: "center", underline: true });
    doc.moveDown();
    doc.fontSize(10).text(`Source: ${report.source}`);
    doc.text(`Generated: ${new Date(report.generatedAt).toLocaleString()}`);
    if (report.dataFreshness?.fetchedAt) {
      doc.text(`Data fetched: ${new Date(report.dataFreshness.fetchedAt).toLocaleString()}`);
    }
    if (report.confidence != null) doc.text(`Confidence: ${report.confidence}% (computed from data completeness)`);
    doc.moveDown();

    (report.sections || []).forEach((s) => {
      const label = s.dataType ? ` [${s.dataType}]` : "";
      doc.fontSize(13).text(`${s.title}${label}`, { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(10);
      if (s.content) doc.text(s.content);
      if (s.bullets) s.bullets.forEach((b) => doc.text(`• ${b}`));
      if (s.table) {
        doc.moveDown(0.3);
        doc.text(s.table.headers.join("  |  "));
        s.table.rows.slice(0, 40).forEach((r) => doc.text(r.map((c) => c ?? "Unavailable").join("  |  ")));
      }
      doc.moveDown();
    });

    doc.fontSize(8).text(report.disclaimer || "Not investment advice. Verify data with original sources.");
    doc.end();
  });
}

function sanitizeSheetName(title, index) {
  const cleaned = String(title || `Section${index}`)
    .replace(/[\\/*?:[\]]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 31);
  return cleaned || `Section${index}`;
}

async function buildExcelBuffer(report) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "ABC Research Platform";
  wb.created = new Date();
  const usedNames = new Set(["Summary"]);

  const summary = wb.addWorksheet("Summary");
  summary.addRow(["Report", report.title]);
  summary.addRow(["Source", report.source]);
  summary.addRow(["Generated", report.generatedAt]);
  summary.addRow(["Confidence", report.confidence ?? "N/A"]);

  (report.sections || []).forEach((s, i) => {
    let name = sanitizeSheetName(s.title, i);
    while (usedNames.has(name)) {
      const suffix = ` ${usedNames.size}`;
      name = sanitizeSheetName(`${s.title || `Section${i}`}${suffix}`, i).slice(0, 31);
    }
    usedNames.add(name);
    const sheet = wb.addWorksheet(name);
    sheet.addRow([s.title]);
    if (s.content) sheet.addRow([s.content]);
    if (s.bullets) s.bullets.forEach((b) => sheet.addRow([b]));
    if (s.table) {
      sheet.addRow(s.table.headers);
      s.table.rows.forEach((r) => sheet.addRow(r));
    }
  });

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function buildCsvFromReport(report) {
  const rows = [];
  (report.sections || []).forEach((s) => {
    if (s.table) {
      s.table.rows.forEach((r) => rows.push({ section: s.title, ...Object.fromEntries(s.table.headers.map((h, i) => [h, r[i]])) }));
    }
  });
  if (!rows.length) {
    return `Report,${report.title}\nSource,${report.source}\nGenerated,${report.generatedAt}\n`;
  }
  const keys = Object.keys(rows[0]);
  return toCsv(rows, keys.map((k) => ({ key: k, label: k })));
}

module.exports = { buildPdfBuffer, buildExcelBuffer, buildCsvFromReport, reportToText };