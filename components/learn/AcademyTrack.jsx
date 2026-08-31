"use client";

import Link from "next/link";
import useAcademyProgress from "./useAcademyProgress";

const academy = require("../../lib/academy");

export default function AcademyTrack({ trackId }) {
  const track = academy.getTrack(trackId);
  const lessons = academy.lessonsForTrack(trackId);
  const progress = useAcademyProgress();

  if (!track) {
    return (
      <div className="academy-shell">
        <p>That track is not in the course.</p>
        <Link href="/learn">Back</Link>
      </div>
    );
  }

  const done = lessons.filter((l) => progress.completed[l.id]).length;
  const next = lessons.find((l) => !progress.completed[l.id]) || lessons[0];

  return (
    <div className="academy-shell">
      <nav className="academy-crumb">
        <Link href="/learn">Knowledge Centre</Link>
        <span>/</span>
        <span>{track.title}</span>
      </nav>
      <header className="academy-track-head">
        <small>
          {track.level} · Track {String(track.no).padStart(2, "0")} · {done}/{lessons.length} done
        </small>
        <h1>{track.title}</h1>
        <p>{track.blurb}</p>
        {next ? (
          <Link href={`/learn/${track.id}/${next.id}`} className="academy-continue">
            <span>
              <small>{done ? "Next lesson" : "Lesson 01"}</small>
              <strong>{next.title}</strong>
              <em>{next.minutes} min</em>
            </span>
            <span className="academy-continue-go">Start</span>
          </Link>
        ) : null}
      </header>
      <ol className="academy-lesson-index">
        {lessons.map((lesson) => {
          const complete = Boolean(progress.completed[lesson.id]);
          return (
            <li key={lesson.id}>
              <Link href={`/learn/${track.id}/${lesson.id}`} className={`academy-lesson-row${complete ? " done" : ""}`}>
                <span className={`academy-check${complete ? " on" : ""}`} aria-hidden>
                  {complete ? "✓" : String(lesson.number).padStart(2, "0")}
                </span>
                <div>
                  <h3>{lesson.title}</h3>
                  <p>
                    {lesson.minutes} min
                    {complete ? " · Completed" : ""}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
