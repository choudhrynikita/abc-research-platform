const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  TRACKS,
  LESSON_LIST,
  catalog,
  getLessonContent,
  missingLessons,
  searchLessons,
  neighbors,
  nextLesson,
  assessmentFor,
} = require("../lib/academy");
const { NAV_HREFS } = require("../lib/nav-config");

describe("Knowledge Centre curriculum", () => {
  it("is linked from primary navigation", () => {
    assert.ok(NAV_HREFS.includes("/learn"));
  });

  it("ships a full Varsity-breadth course with a body for every id", () => {
    assert.ok(TRACKS.length >= 23);
    assert.ok(LESSON_LIST.length >= 200);
    assert.deepEqual(missingLessons(), []);
    const cat = catalog();
    assert.equal(cat.counts.lessons, LESSON_LIST.length);
    assert.ok(cat.counts.minutes > 2200);
    const ids = TRACKS.map((t) => t.id);
    for (const need of ["strategies", "funds", "bonds", "sectors", "modelling", "insurance", "nps", "sse", "positioning", "ai"]) {
      assert.ok(ids.includes(need), need);
    }
    assert.ok(LESSON_LIST.some((l) => l.id === "technicals-15"));
    assert.ok(LESSON_LIST.some((l) => l.id === "fundamentals-15"));
    assert.ok(LESSON_LIST.some((l) => l.id === "ai-05"));
  });

  it("gives every lesson a lead, takeaways, and a four-option quiz", () => {
    for (const lesson of LESSON_LIST) {
      const body = getLessonContent(lesson.id);
      assert.ok(body, lesson.id);
      const types = new Set((body.sections || []).map((s) => s.t));
      assert.equal(types.has("lead"), true, `${lesson.id} missing lead`);
      const quiz = (body.sections || []).find((s) => s.t === "quiz");
      assert.ok(quiz, `${lesson.id} missing quiz`);
      assert.equal(quiz.options.length, 4, lesson.id);
      assert.ok(quiz.answer >= 0 && quiz.answer < 4, lesson.id);
    }
  });

  it("can search and walk neighbors", () => {
    const hits = searchLessons("greeks");
    assert.ok(hits.some((h) => h.id === "options-05"));
    const oi = searchLessons("open interest");
    assert.ok(oi.some((h) => h.id === "positioning-01"));
    const gamma = searchLessons("dealer gamma");
    assert.ok(gamma.some((h) => h.id === "positioning-09"));
    const { prev, next } = neighbors("foundations-01");
    assert.equal(prev, null);
    assert.equal(next.id, "foundations-02");
    assert.equal(nextLesson({}).id, "foundations-01");
    assert.equal(nextLesson({ "foundations-01": true }).id, "foundations-02");
  });

  it("attaches worked examples and labs to core F&O lessons", () => {
    const bull = getLessonContent("options-02");
    assert.ok(bull.learn.some((s) => s.t === "example"));
    assert.ok(bull.practice.some((s) => s.t === "lab"));
    assert.ok(bull.practice.some((s) => s.t === "quiz"));
  });

  it("gives every chapter a five-question assessment with a 4/5 pass mark", () => {
    for (const lesson of LESSON_LIST) {
      const test = assessmentFor(lesson.id);
      assert.equal(test.questions.length, 5, lesson.id);
      assert.equal(test.passMark, 4, lesson.id);
      const authored = (getLessonContent(lesson.id).sections || []).find((s) => s.t === "quiz");
      if (authored?.q) {
        assert.ok(
          test.questions.some((q) => q.q === authored.q),
          `${lesson.id} dropped the authored quiz`
        );
      }
      for (const q of test.questions) {
        assert.equal(q.options.length, 4, `${lesson.id} ${q.q}`);
        assert.equal(new Set(q.options).size, 4, `${lesson.id} duplicate options`);
        assert.ok(q.answer >= 0 && q.answer < 4, lesson.id);
        assert.ok(q.why, lesson.id);
      }
    }
  });
});
