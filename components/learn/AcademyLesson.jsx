"use client";

import Link from "next/link";
import AcademyLessonBody from "./AcademyLessonBody";
import useAcademyProgress from "./useAcademyProgress";

const academy = require("../../lib/academy");

export default function AcademyLesson({ trackId, lessonId }) {
  const meta = academy.getLesson(lessonId);
  const track = academy.getTrack(meta?.trackId || trackId);
  const content = academy.getLessonContent(lessonId);
  const { prev, next } = academy.neighbors(lessonId);
  const progress = useAcademyProgress();

  if (!meta || !track) {
    return (
      <div className="academy-shell">
        <p>That lesson is not in the course.</p>
        <Link href="/learn">Back to Knowledge Centre</Link>
      </div>
    );
  }

  const done = Boolean(progress.completed[meta.id]);

  return (
    <div className="academy-shell academy-lesson-shell">
      <nav className="academy-crumb">
        <Link href="/learn">Knowledge Centre</Link>
        <span>/</span>
        <Link href={`/learn/${track.id}`}>{track.title}</Link>
        <span>/</span>
        <span>{meta.title}</span>
      </nav>

      <article className="academy-lesson glass-card">
        <p className="academy-kicker">
          {track.title} · Lesson {String(meta.number).padStart(2, "0")} · {meta.minutes} min
        </p>
        <h1>{meta.title}</h1>
        <div className="academy-format-row">
          {meta.formats.map((f) => (
            <span key={f} className="academy-format">
              {f}
            </span>
          ))}
        </div>
        <AcademyLessonBody
          content={content}
          lessonId={meta.id}
          quizState={progress.quiz[meta.id]}
          onGrade={(ok) => progress.markQuiz(meta.id, ok)}
        />
        <div className="academy-lesson-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => progress.markComplete(meta.id)}
            disabled={done}
          >
            {done ? "Marked complete" : "Mark complete"}
          </button>
        </div>
      </article>

      <nav className="academy-pager">
        {prev ? (
          <Link href={`/learn/${prev.trackId}/${prev.id}`} className="glass-card">
            <small>Previous</small>
            <strong>{prev.title}</strong>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/learn/${next.trackId}/${next.id}`} className="glass-card">
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
