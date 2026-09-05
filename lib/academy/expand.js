const PASS_THROUGH = new Set([
  "h",
  "p",
  "ul",
  "callout",
  "formula",
  "table",
  "diagram",
  "quiz",
  "sources",
  "example",
  "steps",
  "lab",
  "depth",
  "card",
]);

function expandLesson(raw) {
  const sections = [];
  if (raw.lead) sections.push({ t: "lead", text: raw.lead });
  if (raw.covers?.length) {
    sections.push({ t: "h", text: "In this chapter" });
    sections.push({ t: "ul", items: raw.covers });
  }
  for (const block of raw.blocks || []) {
    if (PASS_THROUGH.has(block.t)) sections.push(block);
  }
  if (raw.example) sections.push({ t: "example", ...raw.example });
  if (raw.lab) sections.push({ t: "lab", name: raw.lab });
  if (raw.takeaways?.length) {
    sections.push({ t: "h", text: "Key takeaways" });
    sections.push({ t: "ul", items: raw.takeaways });
  }
  if (raw.quiz) sections.push({ t: "quiz", ...raw.quiz });
  if (raw.sources?.length) sections.push({ t: "sources", items: raw.sources });
  if (raw.depth?.length) {
    for (const block of raw.depth) sections.push(block);
  }
  return { minutes: raw.minutes, formats: raw.formats, sections };
}

function splitSections(sections) {
  const learn = [];
  const practice = [];
  const desk = [];
  let takeawayMode = false;
  for (const block of sections || []) {
    if (block.t === "quiz" || block.t === "lab") {
      practice.push(block);
      takeawayMode = false;
      continue;
    }
    if (block.t === "sources" || block.t === "depth") {
      desk.push(block);
      takeawayMode = false;
      continue;
    }
    if (block.t === "h" && /takeaway/i.test(block.text || "")) {
      takeawayMode = true;
      desk.push(block);
      continue;
    }
    if (takeawayMode) {
      desk.push(block);
      continue;
    }
    learn.push(block);
  }
  return { learn, practice, desk };
}

module.exports = { expandLesson, splitSections };
