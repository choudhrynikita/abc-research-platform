"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AcademyLessonBody from "./AcademyLessonBody";
import AcademyAssessment from "./AcademyAssessment";
import useAcademyProgress from "./useAcademyProgress";

const academy = require("../../lib/academy");

export default function AcademyLesson({ trackId, lessonId }) {
  const meta = academy.getLesson(lessonId);
  const track = academy.getTrack(meta?.trackId || trackId);
  const content = academy.getLessonContent(lessonId);
  const { prev, next } = academy.neighbors(lessonId);
  const siblings = academy.lessonsForTrack(meta?.trackId || trackId);
  const progress = useAcademyProgress();
  const [tab, setTab] = useState("lesson");

  useEffect(() => {
    setTab("lesson");
  }, [lessonId]);

  useEffect(() => {
    if (meta?.id && progress.ready) progress.touch(meta.id);
  }, [lessonId, progress.ready, meta?.id, progress.touch]);

  if (!meta || !track) {
    return (
      <div className="academy-shell">
        <p>That lesson is not in the course.</p>
        <Link href="/learn">Back</Link>
      </div>
    );
  }

  const done = Boolean(progress.completed[meta.id]);
  const learn = content?.learn || content?.sections || [];
  const practice = (content?.practice || []).filter((b) => b.t !== "quiz");
  const desk = content?.desk || [];
  const assessment = content?.assessment;
  const assessStored = progress.assess?.[meta.id];
  const passed = Boolean(assessStored?.passed);

  return (
    <div className="academy-player">
      <nav className="academy-crumb">
        <Link href="/learn">Course</Link>
        <span>/</span>
        <Link href={`/learn/${track.id}`}>{track.title}</Link>
        <span>/</span>
        <span>
          {String(meta.number).padStart(2, "0")}
        </span>
      </nav>

      <div className="academy-player-grid">
        <aside className="academy-outline">
          <p className="academy-kicker">{track.title}</p>
          <ol>
            {siblings.map((lesson) => (
              <li key={lesson.id}>
                <Link
                  href={`/learn/${track.id}/${lesson.id}`}
                  className={`${lesson.id === meta.id ? "on" : ""}${progress.completed[lesson.id] ? " done" : ""}`}
                >
                  <span>{String(lesson.number).padStart(2, "0")}</span>
                  {lesson.title}
                </Link>
              </li>
            ))}
          </ol>
        </aside>

        <details className="academy-outline-mobile">
          <summary>
            {track.title} · lesson {String(meta.number).padStart(2, "0")} of {siblings.length}
          </summary>
          <ol>
            {siblings.map((lesson) => (
              <li key={`m-${lesson.id}`}>
                <Link
                  href={`/learn/${track.id}/${lesson.id}`}
                  className={`${lesson.id === meta.id ? "on" : ""}${progress.completed[lesson.id] ? " done" : ""}`}
                >
                  <span>{String(lesson.number).padStart(2, "0")}</span>
                  {lesson.title}
                </Link>
              </li>
            ))}
          </ol>
        </details>

        <article className="academy-lesson">
          <header className="academy-lesson-head">
            <small>
              {track.level} · {meta.minutes} min read
            </small>
            <h1>{meta.title}</h1>
            <div className="academy-tabs" role="tablist">
              <button type="button" className={tab === "lesson" ? "on" : ""} onClick={() => setTab("lesson")}>
                Lesson
              </button>
              <button type="button" className={tab === "practice" ? "on" : ""} onClick={() => setTab("practice")}>
                Assessment{passed ? " · passed" : ""}
              </button>
              <button type="button" className={tab === "desk" ? "on" : ""} onClick={() => setTab("desk")}>
                Notes
              </button>
            </div>
          </header>

          {tab === "lesson" && (
            <>
              <AcademyLessonBody blocks={learn} quizState={progress.quiz[meta.id]} onGrade={(ok) => progress.markQuiz(meta.id, ok)} />
              <button type="button" className="academy-assess-cta" onClick={() => setTab("practice")}>
                <strong>Chapter assessment</strong>
                <span>{passed ? `Passed ${assessStored.score}/${assessStored.total}` : "5 questions · pass 4/5 to complete"}</span>
              </button>
            </>
          )}
          {tab === "practice" && (
            <>
              {practice.length ? (
                <AcademyLessonBody
                  blocks={practice}
                  quizState={progress.quiz[meta.id]}
                  onGrade={(ok) => progress.markQuiz(meta.id, ok)}
                />
              ) : null}
              <AcademyAssessment
                key={meta.id}
                assessment={assessment}
                stored={assessStored}
                onResult={(result) => progress.markAssess(meta.id, result)}
              />
            </>
          )}
          {tab === "desk" && (
            <AcademyLessonBody
              blocks={desk.length ? desk : [{ t: "p", text: "No extra desk note on this lesson. The takeaways live here when the quiz is done." }]}
              quizState={progress.quiz[meta.id]}
              onGrade={(ok) => progress.markQuiz(meta.id, ok)}
            />
          )}

          <div className="academy-lesson-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => (passed || done ? progress.markComplete(meta.id) : setTab("practice"))}
              disabled={done}
            >
              {done ? "Completed" : passed ? "Mark complete" : "Pass assessment to complete"}
            </button>
            {next ? (
              <Link href={`/learn/${next.trackId}/${next.id}`} className="btn btn-ghost">
                Next lesson
              </Link>
            ) : (
              <Link href="/learn" className="btn btn-ghost">
                Back to course
              </Link>
            )}
          </div>
        </article>
      </div>

      <nav className="academy-pager">
        {prev ? (
          <Link href={`/learn/${prev.trackId}/${prev.id}`}>
            <small>Previous</small>
            <strong>{prev.title}</strong>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/learn/${next.trackId}/${next.id}`}>
            <small>Next</small>
            <strong>{next.title}</strong>
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}
