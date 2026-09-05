"use client";

import { useMemo, useState } from "react";

export default function AcademyAssessment({ assessment, stored, onResult }) {
  const questions = assessment?.questions || [];
  const passMark = assessment?.passMark || 4;
  const total = questions.length;
  const [picks, setPicks] = useState(() => questions.map(() => null));
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(null);

  const answered = useMemo(() => picks.filter((p) => p != null).length, [picks]);

  if (!total) return null;

  function choose(qi, oi) {
    if (submitted) return;
    setPicks((prev) => {
      const next = prev.slice();
      next[qi] = oi;
      return next;
    });
  }

  function submit() {
    if (answered < total) return;
    let n = 0;
    questions.forEach((q, i) => {
      if (picks[i] === q.answer) n += 1;
    });
    const passed = n >= passMark;
    setScore(n);
    setSubmitted(true);
    onResult?.({ score: n, total, passed });
  }

  function retake() {
    setPicks(questions.map(() => null));
    setSubmitted(false);
    setScore(null);
  }

  const passed = submitted && score != null && score >= passMark;

  return (
    <section className="academy-assess" aria-labelledby="academy-assess-title">
      <header className="academy-assess-head">
        <p className="academy-kicker">Can you still send it?</p>
        <h3 id="academy-assess-title">Five shots. {passMark} to keep the seat.</h3>
        <p>
          Closed-book, like a live tape. Answer all five, then submit. Why-it-is
          unlocks after you commit. Pass {passMark}/{total} and this brief is sat.
        </p>
        {stored?.passed && !submitted ? (
          <p className="academy-quiz-why ok">
            Already seated {stored.score}/{stored.total}. Retake any time — the first pass still counts.
          </p>
        ) : null}
      </header>

      {questions.map((item, qi) => {
        const pick = picks[qi];
        return (
          <fieldset key={item.q} className="academy-assess-q" disabled={false}>
            <legend>
              <span>{qi + 1}</span>
              {item.q}
            </legend>
            <div className="academy-quiz-options">
              {item.options.map((option, oi) => {
                const chosen = pick === oi;
                const isAnswer = submitted && oi === item.answer;
                const miss = submitted && chosen && !isAnswer;
                return (
                  <button
                    key={option}
                    type="button"
                    className={`academy-option${chosen && !submitted ? " picked" : ""}${isAnswer ? " answer" : ""}${miss ? " miss" : ""}`}
                    onClick={() => choose(qi, oi)}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
            {submitted ? (
              <p className={`academy-quiz-why ${pick === item.answer ? "ok" : "bad"}`}>{item.why}</p>
            ) : null}
          </fieldset>
        );
      })}

      <div className="academy-assess-bar">
        {submitted ? (
          <>
            <p className={passed ? "ok" : "bad"}>
              {passed ? `Seated ${score}/${total}. The brief is yours.` : `${score}/${total} — sit it again. Need ${passMark}.`}
            </p>
            <button type="button" className="btn btn-ghost" onClick={retake}>
              Retake
            </button>
          </>
        ) : (
          <>
            <p>
              {answered}/{total} answered
            </p>
            <button type="button" className="btn btn-primary" onClick={submit} disabled={answered < total}>
              Submit
            </button>
          </>
        )}
      </div>
    </section>
  );
}
