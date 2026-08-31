"use client";

import { useState } from "react";
import AcademyDiagram from "./AcademyDiagram";

function Quiz({ quiz, lessonId, stored, onGrade }) {
  const [picked, setPicked] = useState(null);
  const [submitted, setSubmitted] = useState(stored === "pass" || stored === "fail");
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
      <p className="academy-kicker">Check</p>
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
              onClick={() => !submitted && submit(index)}
              disabled={submitted}
            >
              {option}
            </button>
          );
        })}
      </div>
      {submitted && (
        <p className={`academy-quiz-why ${correct ? "ok" : "bad"}`}>
          {correct ? "Correct. " : "Not quite. "}
          {quiz.why}
        </p>
      )}
    </div>
  );
}

function Block({ block, lessonId, quizState, onGrade }) {
  if (block.t === "lead") return <p className="academy-lead">{block.text}</p>;
  if (block.t === "h") return <h3>{block.text}</h3>;
  if (block.t === "p") return <p>{block.text}</p>;
  if (block.t === "ul") {
    return (
      <ul>
        {block.items.map((item) => (
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
              <tr key={row.join("-")}>
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
  if (block.t === "quiz") {
    return <Quiz quiz={block} lessonId={lessonId} stored={quizState} onGrade={onGrade} />;
  }
  if (block.t === "sources") {
    return (
      <div className="academy-sources">
        <p className="academy-kicker">Primary sources</p>
        <ul>
          {block.items.map((item) => (
            <li key={item.href || item.label}>
              {item.href ? (
                <a href={item.href} target="_blank" rel="noreferrer">
                  {item.label}
                </a>
              ) : (
                item.label
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return null;
}

export default function AcademyLessonBody({ content, lessonId, quizState, onGrade }) {
  if (!content?.sections?.length) {
    return <p className="academy-empty">This lesson is still being typeset.</p>;
  }
  return (
    <div className="academy-prose">
      {content.sections.map((block, index) => (
        <Block
          key={`${block.t}-${index}`}
          block={block}
          lessonId={lessonId}
          quizState={quizState}
          onGrade={onGrade}
        />
      ))}
    </div>
  );
}
