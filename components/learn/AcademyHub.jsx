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
  const last = academy.getLesson(progress.lastId);
  const continueLesson =
    last && !progress.completed[last.id] ? last : academy.nextLesson(progress.completed);
  const continueTrack = continueLesson ? academy.getTrack(continueLesson.trackId) : null;

  const hits = useMemo(() => academy.searchLessons(query), [query]);
  const tracks = catalog.tracks.filter((t) => level === "All" || t.level === level);

  return (
    <div className="academy-shell">
      <section className="academy-hero">
        <p className="academy-kicker">Knowledge Centre</p>
        <h1>Learn markets like a desk — not like a feed.</h1>
        <p className="academy-hero-lead">
          {catalog.counts.tracks} modules, {catalog.counts.lessons} chapters — from T+1
          to dealer gamma, India VIX, cash-and-carry, RBI corridor, forensic cameras,
          and a trader ITR. Intermediate through desk. Original lessons. Every chapter
          ends with a 5-question assessment (pass 4/5).
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
            placeholder="India VIX, cash-and-carry, pledge, STT, opening range…"
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
            {hits.length === 0 ? <li>No matches. Try “VIX” or “basis”.</li> : null}
          </ul>
        ) : null}
      </section>

      <section>
        <div className="academy-section-head">
          <h2>If you already trade</h2>
          <p>Six doors into the intermediate and desk layers — not a beginner tour.</p>
        </div>
        <div className="academy-path-grid">
          {[
            ["I trade Nifty F&O", "Greeks, OI, named structures, vol, expiry Thursday.", "options-05"],
            ["I sit an advanced desk", "Microstructure, basis, hedges, systems, India VIX.", "microstructure-01"],
            ["I day-trade the session", "Opening range, VWAP, 9:20 protocol, kill switch.", "intraday-01"],
            ["I invest in names", "Statements, forensic cameras, one-page notes.", "forensic-01"],
            ["I watch RBI and the rupee", "Corridor, USDINR bosses, oil–rupee–Nifty.", "rates-01"],
            ["I file a trader ITR", "F&O as business income, STT 0.15%, March desk.", "tradertax-01"],
          ].map(([title, blurb, lessonId]) => {
            const first = academy.getLesson(lessonId);
            return (
              <article key={lessonId} className="academy-path-card">
                <h3>{title}</h3>
                <p>{blurb}</p>
                <Link
                  className="academy-inline"
                  href={first ? `/learn/${first.trackId}/${first.id}` : "/learn"}
                >
                  Open
                </Link>
              </article>
            );
          })}
        </div>
      </section>

      <section>
        <div className="academy-section-head">
          <h2>Pick a lane</h2>
          <p>{catalog.paths.length} short paths if you do not want to browse all {catalog.tracks.length} modules.</p>
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
