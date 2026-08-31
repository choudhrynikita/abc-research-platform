"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import AcademyKit from "./AcademyKit";
import { PayoffLab, SizerLab } from "./AcademyLabs";
import useAcademyProgress from "./useAcademyProgress";

const academy = require("../../lib/academy");

export default function AcademyHub() {
  const catalog = useMemo(() => academy.catalog(), []);
  const progress = useAcademyProgress();
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("All");
  const [lab, setLab] = useState("payoff");

  const total = catalog.counts.lessons;
  const done = Math.min(progress.completedCount, total);
  const pct = total ? Math.round((done / total) * 100) : 0;
  const continueLesson = academy.getLesson(progress.lastId) || academy.nextLesson(progress.completed);
  const continueTrack = continueLesson ? academy.getTrack(continueLesson.trackId) : null;

  const hits = useMemo(() => academy.searchLessons(query), [query]);
  const tracks = catalog.tracks.filter((t) => level === "All" || t.level === level);

  return (
    <div className="academy-shell">
      <section className="academy-hero">
        <p className="academy-kicker">Knowledge Centre</p>
        <h1>Learn markets like a desk — not like a feed.</h1>
        <p className="academy-hero-lead">
          21 modules, {catalog.counts.lessons} chapters — Indian markets, funds, bonds,
          options, tax, insurance, NPS. Original lessons. Tap Continue, finish one
          chapter, come back tomorrow.
        </p>
        <div className="academy-hero-stats">
          <span>{done}/{total} done</span>
          <span>{pct}%</span>
          <span>~{catalog.counts.minutes} min total</span>
        </div>
        <div className="academy-progress-line" aria-hidden>
          <span style={{ width: `${pct}%` }} />
        </div>
        {continueLesson && continueTrack && (
          <Link
            href={`/learn/${continueTrack.id}/${continueLesson.id}`}
            className="academy-continue"
          >
            <span>
              <small>{done === 0 ? "Start here" : "Continue"}</small>
              <strong>{continueLesson.title}</strong>
              <em>
                {continueTrack.title} · {continueLesson.minutes} min
              </em>
            </span>
            <span className="academy-continue-go">Open</span>
          </Link>
        )}
        <form className="academy-search" onSubmit={(e) => e.preventDefault()}>
          <label className="sr-only" htmlFor="academy-q">
            Search lessons
          </label>
          <input
            id="academy-q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Greeks, T+1, iron condor, revenge trading…"
          />
        </form>
        {query.trim() ? (
          <ul className="academy-search-hits">
            {hits.slice(0, 8).map((lesson) => (
              <li key={lesson.id}>
                <Link href={`/learn/${lesson.trackId}/${lesson.id}`}>{lesson.title}</Link>
                <span>{academy.getTrack(lesson.trackId)?.title}</span>
              </li>
            ))}
            {hits.length === 0 ? <li>No matches. Try “options” or “risk”.</li> : null}
          </ul>
        ) : null}
      </section>

      <section>
        <div className="academy-section-head">
          <h2>Pick a lane</h2>
          <p>Four short paths if you do not want to browse 13 tracks.</p>
        </div>
        <div className="academy-path-grid">
          {catalog.paths.map((path) => (
            <article key={path.id} className="academy-path-card">
              <h3>{path.title}</h3>
              <p>{path.blurb}</p>
              <Link
                className="academy-inline"
                href={(() => {
                  const first = academy.getLesson(path.lessons[0]);
                  return first ? `/learn/${first.trackId}/${first.id}` : "/learn";
                })()}
              >
                Begin path
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section>
        <div className="academy-section-head">
          <h2>Modules</h2>
          <p>Numbered chapters. Open one, finish it, go to the next.</p>
          <div className="academy-level-row">
            {["All", "Foundation", "Intermediate", "Advanced", "Desk"].map((item) => (
              <button
                key={item}
                type="button"
                className={`academy-level${level === item ? " on" : ""}`}
                onClick={() => setLevel(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <ol className="academy-curriculum">
          {tracks.map((track) => {
            const finished = track.lessons.filter((l) => progress.completed[l.id]).length;
            const next = track.lessons.find((l) => !progress.completed[l.id]) || track.lessons[0];
            const frac = track.lessons.length ? finished / track.lessons.length : 0;
            return (
              <li key={track.id}>
                <Link href={`/learn/${track.id}`} className="academy-curr-row">
                  <span className="academy-curr-no">{String(track.no).padStart(2, "0")}</span>
                  <div className="academy-curr-main">
                    <div className="academy-curr-top">
                      <h3>{track.title}</h3>
                      <small>{track.level}</small>
                    </div>
                    <p className="academy-chapters">{track.lessons.length} chapters</p>
                    <p>{track.blurb}</p>
                    <div className="academy-mini-line" aria-hidden>
                      <span style={{ width: `${Math.round(frac * 100)}%` }} />
                    </div>
                    <span className="academy-track-meta">
                      {finished}/{track.lessons.length} complete · {track.minutes} min
                    </span>
                  </div>
                  {next ? (
                    <span className="academy-curr-next">View module</span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ol>
      </section>

      <section>
        <div className="academy-section-head">
          <h2>Practice labs</h2>
          <div className="academy-level-row">
            <button type="button" className={`academy-level${lab === "payoff" ? " on" : ""}`} onClick={() => setLab("payoff")}>
              Option payoff
            </button>
            <button type="button" className={`academy-level${lab === "sizer" ? " on" : ""}`} onClick={() => setLab("sizer")}>
              Position size
            </button>
          </div>
        </div>
        {lab === "payoff" ? <PayoffLab /> : <SizerLab />}
        <AcademyKit />
      </section>

      <p className="academy-legal">
        Education only — not personal advice. Confirm live product, tax and margin rules with SEBI,
        NSE, MCX, NISM and a CA. Official links live in the Library track.
      </p>
    </div>
  );
}
