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
} = require("../lib/academy");
const { NAV_HREFS } = require("../lib/nav-config");

describe("Knowledge Centre curriculum", () => {
  it("is linked from primary navigation", () => {
    assert.ok(NAV_HREFS.includes("/learn"));
  });

  it("ships thirteen tracks and a full lesson body for every id", () => {
    assert.equal(TRACKS.length, 13);
    assert.equal(LESSON_LIST.length, 100);
    assert.deepEqual(missingLessons(), []);
    const cat = catalog();
    assert.equal(cat.counts.lessons, 100);
    assert.ok(cat.counts.minutes > 1000);
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
    const { prev, next } = neighbors("foundations-01");
    assert.equal(prev, null);
    assert.equal(next.id, "foundations-02");
  });
});
