"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AcademyLessonBody from "./AcademyLessonBody";
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
    if (meta?.id) progress.touch(meta.id);
    setTab("lesson");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

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
  const practice = content?.practice || [];
  const desk = content?.desk || [];

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
                Practice{practice.length ? "" : ""}
              </button>
              <button type="button" className={tab === "desk" ? "on" : ""} onClick={() => setTab("desk")}>
                Notes
              </button>
            </div>
          </header>

          {tab === "lesson" && (
            <AcademyLessonBody blocks={learn} quizState={progress.quiz[meta.id]} onGrade={(ok) => progress.markQuiz(meta.id, ok)} />
          )}
          {tab === "practice" && (
            <AcademyLessonBody
              blocks={practice.length ? practice : [{ t: "p", text: "No drill on this one — mark it complete and go to the next lesson." }]}
              quizState={progress.quiz[meta.id]}
              onGrade={(ok) => progress.markQuiz(meta.id, ok)}
            />
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
              onClick={() => progress.markComplete(meta.id)}
              disabled={done}
            >
              {done ? "Completed" : "Mark complete"}
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
