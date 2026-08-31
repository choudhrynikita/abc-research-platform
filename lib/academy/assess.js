/**
 * Five-question chapter assessment for every Knowledge Centre lesson.
 * Always includes the authored quiz item, then four more from this chapter's
 * lead, takeaways, covers, formula and cautions — with distractors from the
 * rest of the track so the test is about THIS chapter, not a coin flip.
 */

const GENERIC_WRONG = [
  "SEBI publishes tomorrow's Nifty close before the open",
  "Lot size is optional if you feel strongly about the trade",
  "Max pain is a legal duty for spot to tag that strike",
  "A Telegram recap is a primary source",
  "Stops are for beginners; skip them on event days",
  "The last traded price is the company's official intrinsic value",
  "IV crush only happens to option sellers, never to buyers",
  "Open interest tells you exactly who is long",
  "A model confidence score replaces a rupee max-loss",
  "Delivery volume and F&O volume are the same camera",
  "You can hold a short weekly option like a delivery share",
  "RSI at 70 is a mandatory short even in a strong trend",
  "EBITDA is always free cash to the owner",
  "Shuffling daily bars into train/test is best practice",
  "If data feed drops, keep trading on the last stale feature",
];

function firstSentence(text) {
  const raw = String(text || "").replace(/\s+/g, " ").trim();
  if (!raw) return "";
  const m = raw.match(/^[^.!?]+[.!?]/);
  const cut = (m ? m[0] : raw).trim();
  return cut.length > 200 ? `${cut.slice(0, 197)}…` : cut;
}

function ulAfter(sections, headingRe) {
  for (let i = 0; i < sections.length; i += 1) {
    const block = sections[i];
    if (block.t === "h" && headingRe.test(block.text || "") && sections[i + 1]?.t === "ul") {
      return (sections[i + 1].items || []).map((x) => String(x).trim()).filter(Boolean);
    }
  }
  return [];
}

function unique(list) {
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const s = String(item || "").trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

function seedFrom(id) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function pick(list, n, rand, exclude) {
  const ban = new Set((exclude || []).map((x) => String(x)));
  const pool = unique(list).filter((x) => !ban.has(x));
  const copy = pool.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

function shuffleOptions(correct, wrongs, rand) {
  const options = unique([correct, ...wrongs]).slice(0, 4);
  while (options.length < 4) {
    const pad = GENERIC_WRONG.find((g) => !options.includes(g));
    if (!pad) break;
    options.push(pad);
  }
  for (let i = options.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  const answer = options.indexOf(correct);
  return { options, answer: answer < 0 ? 0 : answer };
}

function extract(sections) {
  const list = sections || [];
  return {
    lead: list.find((s) => s.t === "lead")?.text || "",
    quiz: list.find((s) => s.t === "quiz") || null,
    formula: list.find((s) => s.t === "formula") || null,
    example: list.find((s) => s.t === "example") || null,
    caution: list.find((s) => s.t === "callout" && s.kind === "caution") || null,
    idea: list.find((s) => s.t === "callout" && (s.kind === "idea" || s.kind === "india")) || null,
    covers: ulAfter(list, /in this chapter/i),
    takeaways: ulAfter(list, /takeaway/i),
  };
}

function makeAssessmentBuilder({ CONTENT, LESSON_LIST, getLesson }) {
  function pack(id) {
    const sections = CONTENT[id]?.sections || [];
    const bits = extract(sections);
    const meta = getLesson(id) || { id, title: id, trackId: "" };
    return { id, meta, bits };
  }

  function trackPool(trackId, exceptId) {
    const leads = [];
    const takes = [];
    const covers = [];
    for (const row of LESSON_LIST) {
      if (row.trackId !== trackId || row.id === exceptId) continue;
      const bits = extract(CONTENT[row.id]?.sections || []);
      if (bits.lead) leads.push(firstSentence(bits.lead));
      takes.push(...bits.takeaways);
      covers.push(...bits.covers);
    }
    return { leads, takes, covers };
  }

  function questionFromQuiz(quiz) {
    if (!quiz?.q || !Array.isArray(quiz.options) || quiz.options.length < 4) return null;
    return {
      q: quiz.q,
      options: quiz.options.slice(0, 4),
      answer: quiz.answer,
      why: quiz.why || "From the chapter quiz.",
    };
  }

  function build(id) {
    const { meta, bits } = pack(id);
    const rand = rng(seedFrom(id));
    const others = trackPool(meta.trackId, id);
    const questions = [];

    const authored = questionFromQuiz(bits.quiz);
    if (authored) questions.push(authored);

    const lead = firstSentence(bits.lead);
    if (lead) {
      const { options, answer } = shuffleOptions(
        lead,
        pick([...others.leads, ...GENERIC_WRONG], 6, rand, [lead]),
        rand
      );
      questions.push({
        q: `Which sentence is closest to this chapter's core claim?`,
        options,
        answer,
        why: "The lead states the claim the rest of the chapter unpacks.",
      });
    }

    if (bits.takeaways[0]) {
      const right = bits.takeaways[0];
      const { options, answer } = shuffleOptions(
        right,
        pick([...others.takes, ...GENERIC_WRONG], 6, rand, bits.takeaways),
        rand
      );
      questions.push({
        q: "Which of these is a takeaway of this chapter?",
        options,
        answer,
        why: `From this chapter: ${right}`,
      });
    }

    if (bits.takeaways[1] || bits.caution) {
      const rejected = bits.caution
        ? firstSentence(bits.caution.text)
        : null;
      if (rejected) {
        const { options, answer } = shuffleOptions(
          rejected,
          pick(
            [
              "Ignore cautions and size up into the event",
              "Primary sources are optional if the chart is pretty",
              "If a number is missing, invent it from a group chat",
              ...GENERIC_WRONG,
            ],
            6,
            rand,
            [rejected]
          ),
          rand
        );
        questions.push({
          q: "Which warning does this chapter actually make?",
          options,
          answer,
          why: bits.caution.title ? `${bits.caution.title}: ${rejected}` : rejected,
        });
      } else {
        const right = bits.takeaways[1];
        const { options, answer } = shuffleOptions(
          right,
          pick([...others.takes, ...GENERIC_WRONG], 6, rand, bits.takeaways),
          rand
        );
        questions.push({
          q: "Which other statement belongs to this chapter?",
          options,
          answer,
          why: `From this chapter: ${right}`,
        });
      }
    }

    if (bits.formula?.expr) {
      const meaning = bits.formula.meaning || "It is the formula this chapter actually uses.";
      const { options, answer } = shuffleOptions(
        meaning,
        pick(
          [
            "It is SEBI's official fair-value formula for every stock",
            "It predicts tomorrow's Nifty close",
            "It replaces the need for a stop",
            "It is the lot-size equation for gold",
            ...GENERIC_WRONG,
          ],
          6,
          rand,
          [meaning]
        ),
        rand
      );
      questions.push({
        q: `In this chapter, ${bits.formula.expr} is best read as:`,
        options,
        answer,
        why: meaning,
      });
    } else if (bits.covers[0]) {
      const right = bits.covers[0];
      const { options, answer } = shuffleOptions(
        right,
        pick([...others.covers, ...GENERIC_WRONG], 6, rand, bits.covers),
        rand
      );
      questions.push({
        q: "This chapter is mainly training you to:",
        options,
        answer,
        why: `Listed under “In this chapter”: ${right}`,
      });
    } else if (bits.example?.title) {
      const right = `${bits.example.title}: a worked desk example, not a live order.`;
      const { options, answer } = shuffleOptions(
        right,
        pick(
          [
            "A guaranteed trade you should copy with full size",
            "Proof that backtests never lie",
            "A SEBI circular",
            ...GENERIC_WRONG,
          ],
          6,
          rand,
          [right]
        ),
        rand
      );
      questions.push({
        q: "The worked example in this chapter is:",
        options,
        answer,
        why: "Examples teach the arithmetic. They are not a signal to click buy.",
      });
    }

    if (bits.takeaways.length && others.takes.length) {
      const intruder = pick(others.takes, 1, rand, bits.takeaways)[0] || GENERIC_WRONG[0];
      const { options, answer } = shuffleOptions(
        intruder,
        pick(bits.takeaways, 3, rand, [intruder]),
        rand
      );
      questions.push({
        q: "Which statement does NOT belong to this chapter?",
        options,
        answer,
        why: "The other three are takeaways from this chapter. That one is from a different lesson — or is a trap.",
      });
    }

    const seenQ = new Set();
    const cleaned = [];
    for (const item of questions) {
      if (!item?.q || item.options?.length < 4) continue;
      if (seenQ.has(item.q)) continue;
      if (item.answer < 0 || item.answer >= 4) continue;
      if (unique(item.options).length < 4) continue;
      seenQ.add(item.q);
      cleaned.push({ ...item, options: item.options.slice(0, 4) });
    }

    const rank = (q) => {
      if (authored && q.q === authored.q) return 0;
      if (q.q.startsWith("Which of these is a takeaway")) return 1;
      if (q.q.startsWith("Which statement does NOT")) return 2;
      if (q.q.startsWith("Which sentence is closest")) return 3;
      if (q.q.startsWith("In this chapter,")) return 4;
      if (q.q.startsWith("Which warning")) return 5;
      return 6;
    };
    cleaned.sort((a, b) => rank(a) - rank(b));
    const out = cleaned.slice(0, 5);

    while (out.length < 5) {
      const right = bits.takeaways[out.length] || lead || `${meta.title} is a chapter you actually have to read.`;
      const { options, answer } = shuffleOptions(
        right,
        pick([...GENERIC_WRONG, ...others.takes], 6, rand, [right]),
        rand
      );
      const q = `Chapter check ${out.length + 1}: which statement fits “${meta.title}”?`;
      if (seenQ.has(q)) break;
      seenQ.add(q);
      out.push({
        q,
        options,
        answer,
        why: "If this felt easy, reread the takeaways — they are the chapter in four lines.",
      });
    }

    return {
      id,
      title: meta.title,
      questions: out.slice(0, 5),
      total: Math.min(5, out.length),
      passMark: 4,
    };
  }

  const memo = new Map();
  return function assessmentFor(id) {
    if (!memo.has(id)) memo.set(id, build(id));
    return memo.get(id);
  };
}

module.exports = { makeAssessmentBuilder, GENERIC_WRONG };
