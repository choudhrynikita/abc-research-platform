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

const CONTENT = { ...partA, ...partB, ...partC, ...partD, ...partE, ...partF, ...partG, ...partH, ...partI };

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
  return { ...base, sections, ...split };
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

module.exports = {
  ...curriculum,
  getLessonContent,
  catalog,
  missingLessons,
  nextLesson,
  splitSections,
};
