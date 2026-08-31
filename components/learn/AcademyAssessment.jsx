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
        <p className="academy-kicker">Chapter assessment</p>
        <h3 id="academy-assess-title">Five questions. Pass {passMark}/{total}.</h3>
        <p>
          Closed-book. Answer all five, then submit. Explanations unlock after you
          commit. Passing ({passMark}/{total}) marks this chapter complete.
        </p>
        {stored?.passed && !submitted ? (
          <p className="academy-quiz-why ok">
            Already passed {stored.score}/{stored.total}. Retake any time — the first pass still counts.
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
                    disabled={submitted}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
            {submitted && item.why ? (
              <p className={`academy-quiz-why ${pick === item.answer ? "ok" : "bad"}`}>
                {pick === item.answer ? "Correct. " : "Not this one. "}
                {item.why}
              </p>
            ) : null}
          </fieldset>
        );
      })}

      <div className="academy-assess-bar">
        {!submitted ? (
          <>
            <p>
              {answered}/{total} answered
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={submit}
              disabled={answered < total}
            >
              Submit assessment
            </button>
          </>
        ) : (
          <>
            <p className={passed ? "ok" : "bad"}>
              {passed
                ? `Passed · ${score}/${total}. Chapter complete.`
                : `Not yet · ${score}/${total}. You need ${passMark}/${total}. Reread, then retake.`}
            </p>
            <button type="button" className="btn btn-ghost" onClick={retake}>
              Retake
            </button>
          </>
        )}
      </div>
    </section>
  );
}
