function buildAuditTrail(entries) {
  return {
    title: "Audit & Traceability",
    table: {
      headers: ["Metric", "Value", "Source", "Collected At", "Derivation"],
      rows: entries.map((e) => [
        e.metric,
        e.value ?? "Unavailable",
        e.source,
        e.collectedAt ? new Date(e.collectedAt).toISOString() : "—",
        e.derivation,
      ]),
    },
  };
}

function dataSourcesSection(sources) {
  return {
    title: "Data Sources",
    bullets: sources.map(
      (s) => `${s.name}: ${s.url || s.provider} — last fetch ${s.fetchedAt ? new Date(s.fetchedAt).toLocaleString() : "—"}`
    ),
  };
}

function assumptionsSection(items) {
  return { title: "Assumptions Used", bullets: items };
}

function aiSection(title, content, bullets) {
  return {
    title,
    content,
    bullets,
    dataType: "model-opinion",
  };
}

function verifiedSection(title, content, table, bullets) {
  return {
    title,
    content,
    table,
    bullets,
    dataType: "verified",
  };
}

module.exports = {
  buildAuditTrail,
  dataSourcesSection,
  assumptionsSection,
  aiSection,
  verifiedSection,
};