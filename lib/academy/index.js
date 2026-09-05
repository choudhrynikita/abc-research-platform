const curriculum = require("./curriculum");
const { splitSections } = require("./expand");
const { extra } = require("./depth");
const partA = require("./content-part-a");
const partB = require("./content-part-b");
const partC = require("./content-part-c");
const partD = require("./content-part-d");
const partE = require("./content-part-e");
const partF = require("./content-part-f");
const partG = require("./content-part-g");
const partH = require("./content-part-h");
const partI = require("./content-part-i");
const partJ = require("./content-part-j");
const partK = require("./content-part-k");
const partL = require("./content-part-l");
const partM = require("./content-part-m");
const partN = require("./content-part-n");

const { makeAssessmentBuilder } = require("./assess");

const CONTENT = { ...partA, ...partB, ...partC, ...partD, ...partE, ...partF, ...partG, ...partH, ...partI, ...partJ, ...partK, ...partL, ...partM, ...partN };

const assessmentFor = makeAssessmentBuilder({
  CONTENT,
  LESSON_LIST: curriculum.LESSON_LIST,
  getLesson: curriculum.getLesson,
});

const LABS_BY_LESSON = {
  "options-01": "payoff",
  "options-02": "payoff",
  "options-06": "payoff",
  "options-12": "payoff",
  "strategies-02": "payoff",
  "strategies-05": "payoff",
  "strategies-06": "payoff",
  "futures-03": "sizer",
  "options-08": "sizer",
  "positioning-08": "payoff",
  "positioning-12": "payoff",
};

function getLessonContent(id) {
  const base = CONTENT[id];
  if (!base) return null;
  const sections = [...(base.sections || []), ...extra(id)];
  if (LABS_BY_LESSON[id] && !sections.some((s) => s.t === "lab" && s.name === LABS_BY_LESSON[id])) {
    sections.push({ t: "lab", name: LABS_BY_LESSON[id] });
  }
  const split = splitSections(sections);
  const assessment = assessmentFor(id);
  return { ...base, sections, ...split, assessment };
}

function catalog() {
  const { TRACKS, PATHS, LESSON_LIST } = curriculum;
  return {
    tracks: TRACKS.map((track) => {
      const lessons = curriculum.lessonsForTrack(track.id);
      return {
        ...track,
        lessons,
        minutes: lessons.reduce((sum, lesson) => sum + (lesson.minutes || 0), 0),
        chapters: lessons.length,
      };
    }),
    paths: PATHS,
    lessons: LESSON_LIST,
    counts: {
      tracks: TRACKS.length,
      lessons: LESSON_LIST.length,
      minutes: LESSON_LIST.reduce((sum, lesson) => sum + (lesson.minutes || 0), 0),
    },
  };
}

function missingLessons() {
  return curriculum.LESSON_LIST.filter((lesson) => !CONTENT[lesson.id]).map((lesson) => lesson.id);
}

function nextLesson(completed) {
  const done = completed && typeof completed === "object" ? completed : {};
  return curriculum.LESSON_LIST.find((lesson) => !done[lesson.id]) || curriculum.LESSON_LIST[0];
}

function searchLessons(query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return curriculum.LESSON_LIST;
  return curriculum.LESSON_LIST.filter((lesson) => {
    const track = curriculum.getTrack(lesson.trackId);
    const body = CONTENT[lesson.id];
    const bits = [lesson.title, lesson.id, track?.title, track?.blurb, (lesson.formats || []).join(" ")];
    for (const section of body?.sections || []) {
      if (section.t === "lead" || section.t === "h") bits.push(section.text);
      if (section.t === "ul" && section.items) bits.push(section.items.join(" "));
      if (section.t === "p") bits.push(section.text);
      if (section.t === "card") bits.push(section.title);
    }
    return bits.join(" ").toLowerCase().includes(q);
  });
}

module.exports = {
  ...curriculum,
  getLessonContent,
  catalog,
  missingLessons,
  nextLesson,
  splitSections,
  assessmentFor,
  searchLessons,
};
