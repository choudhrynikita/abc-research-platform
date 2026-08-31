function expandLesson(raw) {
  const sections = [];
  if (raw.lead) sections.push({ t: "lead", text: raw.lead });
  for (const block of raw.blocks || []) {
    if (block.t === "h") sections.push({ t: "h", text: block.text });
    else if (block.t === "p") sections.push({ t: "p", text: block.text });
    else if (block.t === "ul") sections.push({ t: "ul", items: block.items });
    else if (block.t === "callout") sections.push(block);
    else if (block.t === "formula") sections.push(block);
    else if (block.t === "table") sections.push(block);
    else if (block.t === "diagram") sections.push(block);
    else if (block.t === "quiz") sections.push(block);
    else if (block.t === "sources") sections.push(block);
  }
  if (raw.takeaways?.length) {
    sections.push({ t: "h", text: "Takeaways" });
    sections.push({ t: "ul", items: raw.takeaways });
  }
  if (raw.quiz) sections.push({ t: "quiz", ...raw.quiz });
  if (raw.sources?.length) sections.push({ t: "sources", items: raw.sources });
  return { minutes: raw.minutes, formats: raw.formats, sections };
}

module.exports = { expandLesson };
