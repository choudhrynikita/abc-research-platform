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
        <Link href="/learn">Back to Knowledge Centre</Link>
      </div>
    );
  }

  const done = lessons.filter((l) => progress.completed[l.id]).length;

  return (
    <div className="academy-shell">
      <nav className="academy-crumb">
        <Link href="/learn">Knowledge Centre</Link>
        <span>/</span>
        <span>{track.title}</span>
      </nav>
      <header className="academy-track-head glass-card">
        <small>{track.level} · Track {String(track.no).padStart(2, "0")}</small>
        <h1>{track.title}</h1>
        <p>{track.blurb}</p>
        <p className="panel-sub">
          {done} / {lessons.length} complete · {track.minutes} min
        </p>
      </header>
      <ol className="academy-lesson-index">
        {lessons.map((lesson) => (
          <li key={lesson.id}>
            <Link href={`/learn/${track.id}/${lesson.id}`} className="glass-card academy-lesson-row">
              <span className="academy-lesson-num">{String(lesson.number).padStart(2, "0")}</span>
              <div>
                <h3>{lesson.title}</h3>
                <p>
                  {lesson.minutes} min · {lesson.formats.join(" · ")}
                  {progress.completed[lesson.id] ? " · Done" : ""}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
