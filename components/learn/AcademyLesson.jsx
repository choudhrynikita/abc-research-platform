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
        <p>That brief is not on this floor.</p>
        <Link href="/learn">Back to the floor</Link>
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
        <Link href="/learn">The floor</Link>
        <span>/</span>
        <Link href={`/learn/${track.id}`}>{track.title}</Link>
        <span>/</span>
        <span>Brief {String(meta.number).padStart(2, "0")}</span>
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
            {track.title} · brief {String(meta.number).padStart(2, "0")} of {siblings.length}
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
              {track.level} · {meta.minutes} min on this desk
            </small>
            <h1>{meta.title}</h1>
            <div className="academy-tabs" role="tablist">
              <button type="button" className={tab === "lesson" ? "on" : ""} onClick={() => setTab("lesson")}>
                Brief
              </button>
              <button type="button" className={tab === "practice" ? "on" : ""} onClick={() => setTab("practice")}>
                Can you still send it?{passed ? " · seated" : ""}
              </button>
              <button type="button" className={tab === "desk" ? "on" : ""} onClick={() => setTab("desk")}>
                Desk card
              </button>
            </div>
          </header>

          {tab === "lesson" && (
            <>
              <AcademyLessonBody blocks={learn} quizState={progress.quiz[meta.id]} onGrade={(ok) => progress.markQuiz(meta.id, ok)} />
              <button type="button" className="academy-assess-cta" onClick={() => setTab("practice")}>
                <strong>Five shots · keep the seat</strong>
                <span>{passed ? `Seated ${assessStored.score}/${assessStored.total}` : "Pass 4/5 and this brief is yours"}</span>
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
              blocks={desk.length ? desk : [{ t: "p", text: "No extra desk card on this brief. The takeaways live here once you pass the five shots." }]}
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
              {done ? "Sat" : passed ? "Mark sat" : "Pass 4/5 to keep the seat"}
            </button>
            {next ? (
              <Link href={`/learn/${next.trackId}/${next.id}`} className="btn btn-ghost">
                Next brief
              </Link>
            ) : (
              <Link href="/learn" className="btn btn-ghost">
                Back to the floor
              </Link>
            )}
          </div>
        </article>
      </div>

      <nav className="academy-pager">
        {prev ? (
          <Link href={`/learn/${prev.trackId}/${prev.id}`}>
            <small>Previous brief</small>
            <strong>{prev.title}</strong>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/learn/${next.trackId}/${next.id}`}>
            <small>Next brief</small>
            <strong>{next.title}</strong>
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}
