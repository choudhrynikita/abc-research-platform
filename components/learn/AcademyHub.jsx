"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import AcademyKit, { PositionSizer } from "./AcademyKit";
import useAcademyProgress from "./useAcademyProgress";

const academy = require("../../lib/academy");

export default function AcademyHub() {
  const catalog = useMemo(() => academy.catalog(), []);
  const progress = useAcademyProgress();
  const [query, setQuery] = useState("");
  const hits = useMemo(() => academy.searchLessons(query), [query]);
  const total = catalog.counts.lessons;
  const done = Math.min(progress.completedCount, total);
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="academy-shell">
      <section className="academy-hero glass-card">
        <p className="terminal-eyebrow">Knowledge Centre</p>
        <h1>The ABC market course</h1>
        <p className="academy-hero-lead">
          Thirteen tracks, {catalog.counts.lessons} lessons, from how a print happens to how a desk
          survives. Original teaching. Official Indian sources. No pirated books, zips, or miracle
          recoveries.
        </p>
        <div className="academy-progress-line" aria-label={`${pct} percent complete`}>
          <span style={{ width: `${pct}%` }} />
        </div>
        <p className="panel-sub">
          {done} / {total} lessons marked · ~{catalog.counts.minutes} minutes of reading
        </p>
        <form className="academy-search" onSubmit={(e) => e.preventDefault()}>
          <label className="sr-only" htmlFor="academy-q">
            Search lessons
          </label>
          <input
            id="academy-q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Greeks, T+1, revenge trading, MWPL…"
          />
        </form>
        {query.trim() && (
          <ul className="academy-search-hits">
            {hits.slice(0, 8).map((lesson) => (
              <li key={lesson.id}>
                <Link href={`/learn/${lesson.trackId}/${lesson.id}`}>{lesson.title}</Link>
                <span>{academy.getTrack(lesson.trackId)?.title}</span>
              </li>
            ))}
            {hits.length === 0 ? <li>No lesson titles match that yet.</li> : null}
          </ul>
        )}
      </section>

      <section className="academy-paths">
        <p className="academy-kicker">Guided paths</p>
        <div className="academy-path-grid">
          {catalog.paths.map((path) => (
            <article key={path.id} className="glass-card academy-path-card">
              <h3>{path.title}</h3>
              <p>{path.blurb}</p>
              <ol>
                {path.lessons.map((id) => {
                  const lesson = academy.getLesson(id);
                  if (!lesson) return null;
                  return (
                    <li key={id}>
                      <Link href={`/learn/${lesson.trackId}/${lesson.id}`}>{lesson.title}</Link>
                    </li>
                  );
                })}
              </ol>
            </article>
          ))}
        </div>
      </section>

      <section>
        <p className="academy-kicker">All tracks</p>
        <div className="academy-track-grid">
          {catalog.tracks.map((track) => {
            const finished = track.lessons.filter((l) => progress.completed[l.id]).length;
            return (
              <Link
                key={track.id}
                href={`/learn/${track.id}`}
                className={`glass-card academy-track-card tone-${track.color}`}
              >
                <span className="academy-track-no">{String(track.no).padStart(2, "0")}</span>
                <small>{track.level}</small>
                <h3>{track.title}</h3>
                <p>{track.blurb}</p>
                <span className="academy-track-meta">
                  {track.lessons.length} lessons · {track.minutes} min · {finished} done
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="academy-tools-row">
        <AcademyKit />
        <PositionSizer />
      </div>

      <p className="academy-legal">
        Education, not personal advice. Indian tax, margin and product rules change — confirm at
        SEBI, NSE, MCX, NISM and the Income Tax Department. We do not host copyrighted books or
        leaked PDFs.
      </p>
    </div>
  );
}
