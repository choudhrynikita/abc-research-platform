function toCsv(rows, columns) {
  const header = columns.map((c) => c.label).join(",");
  const lines = rows.map((row) =>
    columns
      .map((c) => {
        const val = row[c.key];
        const str = val == null ? "" : String(val);
        return str.includes(",") ? `"${str.replace(/"/g, '""')}"` : str;
      })
      .join(",")
  );
  return [header, ...lines].join("\n");
}

function buildExecutiveReport(data) {
  return {
    title: "ABC Research Platform — Executive Report",
    generatedAt: new Date().toISOString(),
    sections: data,
  };
}

module.exports = { toCsv, buildExecutiveReport };