"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const KEY = "abc-learn-progress-v1";

function empty() {
  return { completed: {}, quiz: {}, lastId: null };
}

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw);
    return {
      completed: parsed.completed && typeof parsed.completed === "object" ? parsed.completed : {},
      quiz: parsed.quiz && typeof parsed.quiz === "object" ? parsed.quiz : {},
      lastId: parsed.lastId || null,
    };
  } catch {
    return empty();
  }
}

export default function useAcademyProgress() {
  const [state, setState] = useState(empty);

  useEffect(() => {
    setState(read());
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  const markComplete = useCallback((id) => {
    if (!id) return;
    setState((prev) => ({
      ...prev,
      lastId: id,
      completed: { ...prev.completed, [id]: new Date().toISOString() },
    }));
  }, []);

  const markQuiz = useCallback((id, correct) => {
    if (!id) return;
    setState((prev) => ({
      ...prev,
      lastId: id,
      quiz: { ...prev.quiz, [id]: correct ? "pass" : "fail" },
      completed: correct ? { ...prev.completed, [id]: prev.completed[id] || new Date().toISOString() } : prev.completed,
    }));
  }, []);

  const touch = useCallback((id) => {
    if (!id) return;
    setState((prev) => ({ ...prev, lastId: id }));
  }, []);

  const reset = useCallback(() => setState(empty()), []);

  const completedCount = useMemo(() => Object.keys(state.completed).length, [state.completed]);

  return { ...state, markComplete, markQuiz, touch, reset, completedCount };
}
