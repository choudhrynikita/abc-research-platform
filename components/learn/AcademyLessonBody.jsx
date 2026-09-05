"use client";

import { useState } from "react";
import AcademyDiagram from "./AcademyDiagram";
import AcademyLab from "./AcademyLabs";

function Quiz({ quiz, stored, onGrade }) {
  const [picked, setPicked] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [correct, setCorrect] = useState(stored === "pass");
  if (!quiz?.q || !quiz.options) return null;

  function submit(index) {
    setPicked(index);
    const ok = index === quiz.answer;
    setCorrect(ok);
    setSubmitted(true);
    onGrade?.(ok);
  }

  return (
    <div className="academy-quiz">
      <p className="academy-kicker">Practice</p>
      <h4>{quiz.q}</h4>
      <div className="academy-quiz-options">
        {quiz.options.map((option, index) => {
          const chosen = submitted && picked === index;
          const isAnswer = submitted && index === quiz.answer;
          return (
            <button
              key={option}
              type="button"
              className={`academy-option${isAnswer ? " answer" : ""}${chosen && !isAnswer ? " miss" : ""}`}
              onClick={() => submit(index)}
            >
              {option}
            </button>
          );
        })}
      </div>
      {submitted && (
        <p className={`academy-quiz-why ${correct ? "ok" : "bad"}`}>
          {correct ? "Correct. " : "Not this one. "}
          {quiz.why}
        </p>
      )}
      {submitted && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSubmitted(false)}>
          Try again
        </button>
      )}
    </div>
  );
}

export function Block({ block, quizState, onGrade }) {
  if (block.t === "lead") return <p className="academy-lead">{block.text}</p>;
  if (block.t === "h") return <h3>{block.text}</h3>;
  if (block.t === "p") return <p>{block.text}</p>;
  if (block.t === "ul") {
    return (
      <ul>
        {(block.items || []).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }
  if (block.t === "callout") {
    return (
      <aside className={`academy-callout ${block.kind || "idea"}`}>
        <strong>{block.title}</strong>
        <p>{block.text}</p>
      </aside>
    );
  }
  if (block.t === "formula") {
    return (
      <div className="academy-formula">
        <code>{block.expr}</code>
        {block.meaning ? <p>{block.meaning}</p> : null}
      </div>
    );
  }
  if (block.t === "table") {
    return (
      <div className="academy-table-wrap">
        {block.caption ? <p className="academy-caption">{block.caption}</p> : null}
        <table>
          <thead>
            <tr>
              {(block.headers || []).map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(block.rows || []).map((row) => (
              <tr key={row.join("|")}>
                {row.map((cell) => (
                  <td key={cell}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (block.t === "diagram") return <AcademyDiagram name={block.name} />;
  if (block.t === "example") {
    return (
      <aside className="academy-example">
        <p className="academy-kicker">Worked example</p>
        <h4>{block.title}</h4>
        <p>{block.body || block.text}</p>
      </aside>
    );
  }
  if (block.t === "depth") {
    return (
      <aside className="academy-callout desk">
        <strong>{block.title || "Desk depth"}</strong>
        <p>{block.text}</p>
      </aside>
    );
  }
  if (block.t === "lab") return <AcademyLab name={block.name} />;
  if (block.t === "quiz") {
    return <Quiz quiz={block} stored={quizState} onGrade={onGrade} />;
  }
  if (block.t === "sources") {
    return (
      <div className="academy-sources">
        <p className="academy-kicker">Official links</p>
        <ul>
          {(block.items || []).map((item) => {
            const label = item.label || item.name || item.href;
            return (
              <li key={item.href || label}>
                {item.href ? (
                  <a href={item.href} target="_blank" rel="noreferrer">
                    {label}
                  </a>
                ) : (
                  label
                )}
                {item.note ? <span className="academy-source-note"> — {item.note}</span> : null}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }
  if (block.t === "steps") {
    return (
      <ol className="academy-steps">
        {(block.items || []).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
    );
  }
  if (block.t === "card") {
    return (
      <aside className="academy-desk-card">
        <p className="academy-kicker">Desk card</p>
        <h4>{block.title}</h4>
        <dl>
          {(block.fields || []).map((field) => {
            const label = Array.isArray(field) ? field[0] : field;
            const hint = Array.isArray(field) ? field[1] : "";
            return (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{hint || "—"}</dd>
              </div>
            );
          })}
        </dl>
      </aside>
    );
  }
  return null;
}

export default function AcademyLessonBody({ blocks, quizState, onGrade }) {
  const list = blocks || [];
  if (!list.length) return <p className="academy-empty">Nothing in this tab yet — try Lesson.</p>;
  return (
    <div className="academy-prose">
      {list.map((block, index) => (
        <Block key={`${block.t}-${index}`} block={block} quizState={quizState} onGrade={onGrade} />
      ))}
    </div>
  );
}
