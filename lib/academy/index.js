const curriculum = require("./curriculum");
const partA = require("./content-part-a");
const partB = require("./content-part-b");
const partC = require("./content-part-c");
const partD = require("./content-part-d");

const CONTENT = { ...partA, ...partB, ...partC, ...partD };

function getLessonContent(id) {
  return CONTENT[id] || null;
}

function catalog() {
  const { TRACKS, PATHS, LESSON_LIST } = curriculum;
  return {
    tracks: TRACKS.map((track) => ({
      ...track,
      lessons: curriculum.lessonsForTrack(track.id),
    })),
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

module.exports = {
  ...curriculum,
  getLessonContent,
  catalog,
  missingLessons,
};
