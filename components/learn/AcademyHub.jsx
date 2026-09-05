"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppIcon from "../AppIcon";
import AcademyKit from "./AcademyKit";
import { PayoffLab, SizerLab } from "./AcademyLabs";
import useAcademyProgress from "./useAcademyProgress";

const academy = require("../../lib/academy");

const DOORS = [
  {
    title: "I trade Nifty F&O",
    dare: "Expiry is a job, not a vibe.",
    blurb: "Greeks, OI, named structures, vol. Nifty weekly expires Tuesday — confirm the live contract.",
    lessonId: "options-05",
  },
  {
    title: "I sit an advanced desk",
    dare: "Name the leftover risk.",
    blurb: "Microstructure, basis, hedges, systems, India VIX.",
    lessonId: "microstructure-01",
  },
  {
    title: "I day-trade the session",
    dare: "One session. One plan. One kill switch.",
    blurb: "Opening range, VWAP, 9:20 protocol. Expiry day is a named session.",
    lessonId: "intraday-01",
  },
  {
    title: "I invest in names",
    dare: "Read the cash, not the story.",
    blurb: "Statements, forensic cameras, one-page notes.",
    lessonId: "forensic-01",
  },
  {
    title: "I watch RBI and the rupee",
    dare: "The corridor is the weather.",
    blurb: "USDINR bosses, oil–rupee–Nifty, a four-minute rates sheet.",
    lessonId: "rates-01",
  },
  {
    title: "I file a trader ITR",
    dare: "F&O is a business, not a hobby box.",
    blurb: "STT 0.15% of option premium sold from Apr 2026. Confirm with a CA.",
    lessonId: "tradertax-01",
  },
];

const FLOORS = [
  { key: "Foundation", label: "Ground floor", hint: "How the building actually works" },
  { key: "Intermediate", label: "The book", hint: "Statements, charts, funds, macro" },
  { key: "Advanced", label: "The pit", hint: "Options, vol, commodities, specials" },
  { key: "Desk", label: "The desk", hint: "Risk, tax, systems, research craft" },
  { key: "All levels", label: "Library", hint: "Official doors and the field kit" },
];

const HOT = [
  { id: "foundations-01", line: "Price is a print. Value is a guess. Don't mix the two." },
  { id: "options-05", line: "Delta is a speedometer. It is not a crystal ball." },
  { id: "intraday-02", line: "The first 15 minutes are a job. Write them before 9:15." },
  { id: "forensic-01", line: "If profit and cash disagree, believe cash." },
  { id: "relval-02", line: "Cash-and-carry has a name. 'Cheap future' is not it." },
  { id: "commodities-02", line: "COMEX is dollars per ounce. GOLDMINI is rupees per 10g." },
  { id: "tradertax-05", line: "STT is a cost, not a footnote. Price the ticket with it in." },
  { id: "indices-06", line: "India VIX is a thermometer. It does not tell you the side." },
];

function istParts(date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value;
  return { weekday: get("weekday"), hour: Number(get("hour")), minute: Number(get("minute")) };
}

function floorClock(now = new Date()) {
  const { weekday, hour, minute } = istParts(now);
  const mins = hour * 60 + minute;
  if (weekday === "Sat" || weekday === "Sun") {
    return {
      kicker: "Weekend · India",
      line: "Cash is shut. This is the only time a desk reads without a gun to its head.",
    };
  }
  if (mins < 9 * 60 + 15) {
    return { kicker: "Pre-open", line: "The cash open hasn't printed. Sit one brief before 9:15." };
  }
  if (mins < 15 * 60 + 30) {
    return { kicker: "Session live", line: "Don't open a textbook. Steal twelve minutes between orders." };
  }
  return { kicker: "After the close", line: "The tape is done. Debrief with a brief — that's the job." };
}

function hrefFor(lessonId) {
  const lesson = academy.getLesson(lessonId);
  return lesson ? `/learn/${lesson.trackId}/${lesson.id}` : "/learn";
}

export default function AcademyHub() {
  const catalog = useMemo(() => academy.catalog(), []);
  const progress = useAcademyProgress();
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("All");
  const [lab, setLab] = useState("payoff");
  const [clock, setClock] = useState(null);
  const [hot, setHot] = useState(() => HOT.slice(0, 3));

  useEffect(() => {
    setClock(floorClock());
    const { weekday } = istParts(new Date());
    const shift = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
    setHot([0, 1, 2].map((i) => HOT[(Math.max(shift, 0) + i) % HOT.length]));
  }, []);

  const total = catalog.counts.lessons;
  const done = Math.min(progress.completedCount, total);
  const pct = total ? Math.round((done / total) * 100) : 0;
  const last = academy.getLesson(progress.lastId);
  const continueLesson =
    last && !progress.completed[last.id] ? last : academy.nextLesson(progress.completed);
  const continueTrack = continueLesson ? academy.getTrack(continueLesson.trackId) : null;

  const hits = useMemo(() => academy.searchLessons(query), [query]);
  const tracks = catalog.tracks.filter((t) => level === "All" || t.level === level);
  const grouped = FLOORS.map((floor) => ({
    ...floor,
    tracks: tracks.filter((t) => t.level === floor.key),
  })).filter((floor) => floor.tracks.length);

  return (
    <div className="academy-shell">
      <section className="academy-hero academy-hero-floor">
        <p className="academy-kicker">{clock?.kicker || "Knowledge Centre · the floor"}</p>
        <h1>Don't sit a class. Sit the next twelve minutes.</h1>
        <p className="academy-hero-lead">
          {clock?.line || "Forty desks. Named tickets, not lectures."} You walk in, run a
          brief, try it in a lab, and leave with a card you could actually send.
        </p>

        <ul className="academy-hero-pills" aria-label="Floor snapshot">
          <li>
            <strong>{done === 0 ? "Fresh seat" : `${done} on the board`}</strong>
            <span>{done === 0 ? "First brief is 12 minutes" : `${pct}% of the floor`}</span>
          </li>
          <li>
            <strong>{catalog.counts.tracks} desks</strong>
            <span>{catalog.counts.lessons} briefs</span>
          </li>
          <li>
            <strong>Pass 4/5</strong>
            <span>to keep the seat</span>
          </li>
        </ul>

        <div className="academy-progress-line" aria-hidden>
          <span style={{ width: `${pct}%` }} />
        </div>

        {continueLesson && continueTrack ? (
          <Link href={`/learn/${continueTrack.id}/${continueLesson.id}`} className="academy-continue academy-continue-hero">
            <span>
              <small>{done === 0 ? "Your first brief" : "Pick up where you left the tape"}</small>
              <strong>{continueLesson.title}</strong>
              <em>
                {continueTrack.title} · {continueLesson.minutes} min
              </em>
            </span>
            <span className="academy-continue-go">{done === 0 ? "Sit it" : "Back in"}</span>
          </Link>
        ) : null}

        <form className="academy-search" onSubmit={(e) => e.preventDefault()}>
          <label htmlFor="academy-q">Find a brief</label>
          <div className="academy-search-box">
            <AppIcon name="research" size={18} />
            <input
              id="academy-q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="India VIX, cash-and-carry, pledge, STT, opening range…"
              autoComplete="off"
            />
          </div>
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
          <h2>How a desk actually uses this</h2>
          <p>Three moves. No homework pile.</p>
        </div>
        <ol className="academy-loop">
          <li>
            <span>01</span>
            <div>
              <strong>Sit a brief</strong>
              <p>Twelve minutes. One idea you can put on a ticket.</p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <strong>Five shots</strong>
              <p>Closed-book. Pass 4/5 and the seat stays yours.</p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <strong>Keep the card</strong>
              <p>A desk note you can reread on a red day.</p>
            </div>
          </li>
        </ol>
      </section>

      <section>
        <div className="academy-section-head">
          <h2>On the tape today</h2>
          <p>Three doors. Not a syllabus.</p>
        </div>
        <div className="academy-hot">
          {hot.map((item) => {
            const lesson = academy.getLesson(item.id);
            if (!lesson) return null;
            return (
              <Link key={item.id} href={hrefFor(item.id)} className="academy-hot-card">
                <small>{academy.getTrack(lesson.trackId)?.title}</small>
                <p>{item.line}</p>
                <span>Sit this brief</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <div className="academy-section-head">
          <h2>Walk in as you actually are</h2>
          <p>Six doors into the pit — not a beginner tour.</p>
        </div>
        <div className="academy-door-grid">
          {DOORS.map((door) => (
            <Link key={door.lessonId} href={hrefFor(door.lessonId)} className="academy-door">
              <h3>{door.title}</h3>
              <p className="academy-door-dare">{door.dare}</p>
              <p>{door.blurb}</p>
              <span className="academy-door-go">Walk in</span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="academy-section-head">
          <h2>Short shifts</h2>
          <p>{catalog.paths.length} paths if you do not want to wander all {catalog.tracks.length} desks.</p>
        </div>
        <div className="academy-shift-row">
          {catalog.paths.map((path) => {
            const first = academy.getLesson(path.lessons[0]);
            return (
              <Link
                key={path.id}
                className="academy-shift"
                href={first ? `/learn/${first.trackId}/${first.id}` : "/learn"}
              >
                <strong>{path.title}</strong>
                <span>{path.lessons.length} briefs</span>
                <p>{path.blurb}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <div className="academy-section-head">
          <h2>The floor map</h2>
          <p>Every desk is still here. Open one, finish the brief, take the next.</p>
          <div className="academy-level-row" role="group" aria-label="Filter desks by floor">
            {["All", "Foundation", "Intermediate", "Advanced", "Desk"].map((item) => (
              <button
                key={item}
                type="button"
                className={`academy-level${level === item ? " on" : ""}`}
                onClick={() => setLevel(item)}
              >
                {item === "All" ? "Whole floor" : item}
              </button>
            ))}
          </div>
        </div>
        {grouped.map((floor) => (
          <div key={floor.key} className="academy-floor-block">
            {level === "All" ? (
              <p className="academy-floor-label">
                <strong>{floor.label}</strong>
                <span>{floor.hint}</span>
              </p>
            ) : null}
            <ol className="academy-curriculum">
              {floor.tracks.map((track) => {
                const finished = track.lessons.filter((l) => progress.completed[l.id]).length;
                const next = track.lessons.find((l) => !progress.completed[l.id]) || track.lessons[0];
                const frac = track.lessons.length ? finished / track.lessons.length : 0;
                return (
                  <li key={track.id}>
                    <Link href={`/learn/${track.id}`} className="academy-curr-row" data-color={track.color}>
                      <span className="academy-curr-no">{String(track.no).padStart(2, "0")}</span>
                      <div className="academy-curr-main">
                        <div className="academy-curr-top">
                          <h3>{track.title}</h3>
                          <small>{track.level}</small>
                        </div>
                        <p className="academy-chapters">
                          {track.lessons.length} briefs
                          {next ? ` · next: ${next.title}` : ""}
                        </p>
                        <p>{track.blurb}</p>
                        <div className="academy-mini-line" aria-hidden>
                          <span style={{ width: `${Math.round(frac * 100)}%` }} />
                        </div>
                        <span className="academy-track-meta">
                          {finished}/{track.lessons.length} sat · {track.minutes} min on this desk
                        </span>
                      </div>
                      {next ? <span className="academy-curr-next">Open desk</span> : null}
                    </Link>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </section>

      <section>
        <div className="academy-section-head">
          <h2>Practice pit</h2>
          <p>Numbers you can twist. Not a quiz show.</p>
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
        NSE, BSE, MCX, NISM and a CA. Nifty weekly expiry is Tuesday as of Nov 2024; exchanges can
        reassign the weekday. Official links live in the Library desk.
      </p>
    </div>
  );
}
