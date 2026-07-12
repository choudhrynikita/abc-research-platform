"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

const FALLBACK_SUGGESTIONS = [
  "Analyze RELIANCE fundamentals and technicals",
  "What is the NIFTY 50 outlook?",
  "Show FII DII institutional flows",
  "Compare TCS with IT peers",
  "HDFCBANK valuation summary",
  "Explain what RSI means",
];

/**
 * Lightweight markdown-ish renderer for copilot answers.
 * Supports ## headings, ### subheads, **bold**, and lists — no raw HTML injection.
 */
function renderAnswer(text) {
  if (!text) return null;
  const blocks = String(text).split(/\n{2,}/);
  return blocks.map((block, i) => {
    const lines = block.split("\n");
    const first = lines[0] || "";

    if (first.startsWith("## ")) {
      return (
        <div key={i} className="copilot-block">
          <h5 className="copilot-h2">{first.slice(3)}</h5>
          {lines.slice(1).map((line, j) => renderLine(line, `${i}-${j}`))}
        </div>
      );
    }
    if (first.startsWith("### ")) {
      return (
        <div key={i} className="copilot-block">
          <h6 className="copilot-h3">{first.slice(4)}</h6>
          {lines.slice(1).map((line, j) => renderLine(line, `${i}-${j}`))}
        </div>
      );
    }
    if (lines.every((l) => l.startsWith("- ") || l.trim() === "")) {
      return (
        <ul key={i} className="copilot-list">
          {lines
            .filter((l) => l.startsWith("- "))
            .map((l, j) => (
              <li key={j}>{formatInline(l.slice(2))}</li>
            ))}
        </ul>
      );
    }
    return (
      <p key={i} className="copilot-p">
        {lines.map((line, j) => (
          <span key={j}>
            {j > 0 && <br />}
            {formatInline(line)}
          </span>
        ))}
      </p>
    );
  });
}

function renderLine(line, key) {
  if (!line) return null;
  if (line.startsWith("- ")) {
    return (
      <div key={key} className="copilot-li">
        {formatInline(line.slice(2))}
      </div>
    );
  }
  if (line.startsWith("---")) return <hr key={key} className="copilot-hr" />;
  return (
    <p key={key} className="copilot-p">
      {formatInline(line)}
    </p>
  );
}

function formatInline(text) {
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

function friendlyError(json, status) {
  if (!json && !status) return "AI service is temporarily unavailable. Please try again later.";
  const msg = json?.message || json?.error || "";
  if (/not configured|API_SECRET|authentication not configured/i.test(msg)) {
    return "The AI service configuration is incomplete. Verify the required environment variables and restart the application.";
  }
  if (status === 401 || status === 403) {
    return "You are not authorized for this action. Research Copilot is available without a token — please refresh and try again.";
  }
  if (status === 503 || status >= 500) {
    return "Live financial data could not be retrieved at this time. Please try again later.";
  }
  if (status === 400) {
    return msg || "Please enter a valid research question.";
  }
  if (status === 429) {
    return "Too many requests. Please wait a moment and try again.";
  }
  return msg || "AI service is temporarily unavailable. Please try again later.";
}

/**
 * Institutional AI Research Copilot.
 * @param {"sidebar"|"modal"} variant
 * @param {boolean} open - for modal: whether visible
 * @param {() => void} onClose - for modal close
 * @param {string} initialQuery - optional prefilled query when opened
 */
export default function CopilotPanel({
  compact = false,
  variant = "sidebar",
  open = true,
  onClose,
  initialQuery = "",
}) {
  const isModal = variant === "modal";
  const [query, setQuery] = useState(initialQuery);
  const [answer, setAnswer] = useState(null);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(!compact || isModal);
  const [suggestions, setSuggestions] = useState(FALLBACK_SUGGESTIONS);
  const [engineReady, setEngineReady] = useState(true);
  const inputRef = useRef(null);
  const dialogRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    if (initialQuery) setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/copilot/suggestions");
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        if (Array.isArray(json.suggestions) && json.suggestions.length) {
          setSuggestions(json.suggestions);
        }
        if (typeof json.available === "boolean") setEngineReady(json.available);
      } catch {
        /* keep fallbacks */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isModal && open) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [isModal, open]);

  useEffect(() => {
    if (!isModal || !open) return undefined;
    function onKey(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
      }
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [isModal, open, onClose]);

  const ask = useCallback(
    async (override) => {
      const q = (override ?? query).trim();
      if (!q) {
        setError("Please enter a research question.");
        return;
      }
      setQuery(q);
      setLoading(true);
      setError(null);
      setAnswer(null);
      setMeta(null);
      setExpanded(true);

      let lastErr = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 55_000);
          const res = await fetch("/api/copilot", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: q }),
            signal: controller.signal,
          });
          clearTimeout(timer);
          let json = null;
          try {
            json = await res.json();
          } catch {
            json = null;
          }
          if (!res.ok) {
            throw Object.assign(new Error(friendlyError(json, res.status)), {
              status: res.status,
              payload: json,
            });
          }
          const text = json?.answer || json?.message;
          if (!text) {
            throw new Error("Live financial data could not be retrieved at this time.");
          }
          setAnswer(text);
          setMeta({
            confidence: json.confidence ?? json._meta?.confidence,
            dataType: json.dataType || json._meta?.dataType,
            sources: json.sources || [],
            intent: json.intent,
            llm: json.llm,
            fetchedAt: json.fetchedAt || json._meta?.lastUpdated,
            suggestions: json.suggestions,
            symbol: json.symbol,
            companyName: json.companyName,
            cached: json.cached,
          });
          if (Array.isArray(json.suggestions) && json.suggestions.length) {
            setSuggestions(json.suggestions);
          }
          setLoading(false);
          return;
        } catch (e) {
          lastErr = e;
          if (e?.name === "AbortError") {
            lastErr = new Error("Request timed out. Please try a shorter query or retry shortly.");
          }
          if (attempt === 0) await new Promise((r) => setTimeout(r, 600));
        }
      }
      setError(lastErr?.message || friendlyError(null, 503));
      setLoading(false);
    },
    [query]
  );

  const chips = meta?.suggestions?.length ? meta.suggestions : suggestions;

  if (isModal && !open) return null;

  const panel = (
    <div
      className={`copilot-panel${expanded || isModal ? " expanded" : ""}${compact && !isModal ? " compact" : ""}${isModal ? " modal-variant" : ""}`}
      ref={dialogRef}
      role={isModal ? "dialog" : undefined}
      aria-modal={isModal ? true : undefined}
      aria-labelledby={isModal ? titleId : undefined}
    >
      <div className="copilot-panel-head">
        <div>
          <h4 id={titleId}>
            <span className="copilot-badge" aria-hidden>
              AI
            </span>{" "}
            Research Copilot
          </h4>
          <p className="copilot-sub">
            Verified market data only · never fabricates numbers
            {engineReady ? (
              <span className="copilot-status-dot ready" title="Engine ready" />
            ) : (
              <span className="copilot-status-dot" title="Checking status" />
            )}
          </p>
        </div>
        <div className="copilot-head-actions">
          {!isModal && (
            <button
              type="button"
              className="btn btn-ghost btn-sm copilot-expand-btn"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              aria-label={expanded ? "Collapse copilot" : "Expand copilot"}
            >
              {expanded ? "▾" : "▸"}
            </button>
          )}
          {isModal && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onClose}
              aria-label="Close AI Copilot"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="copilot-search-row">
        <label className="visually-hidden" htmlFor={isModal ? "copilot-modal-input" : "copilot-sidebar-input"}>
          Research question
        </label>
        <input
          id={isModal ? "copilot-modal-input" : "copilot-sidebar-input"}
          ref={inputRef}
          type="search"
          className="copilot-input"
          placeholder="Ask: Analyze TCS, NIFTY outlook, FII/DII, What is RSI…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              ask();
            }
          }}
          aria-label="AI Copilot question"
          disabled={loading}
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => ask()}
          disabled={loading || !query.trim()}
        >
          {loading ? "…" : "Ask"}
        </button>
      </div>

      {(expanded || isModal) && (
        <div className="copilot-suggestions" aria-label="Suggested queries">
          {chips.slice(0, isModal ? 8 : 4).map((s) => (
            <button
              key={s}
              type="button"
              className="copilot-chip"
              onClick={() => ask(s)}
              disabled={loading}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="copilot-loading" role="status" aria-live="polite">
          <div className="terminal-spinner sm" />
          <p>Fetching verified data and building answer…</p>
          <div className="copilot-skeleton" aria-hidden>
            <span />
            <span />
            <span className="short" />
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="copilot-error" role="alert">
          <p>{error}</p>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => ask()}>
            Retry
          </button>
        </div>
      )}

      {answer && !loading && (
        <div className="copilot-output" role="article" aria-label="Copilot answer">
          <div className="copilot-answer-body">{renderAnswer(answer)}</div>
          {meta && (
            <footer className="copilot-meta">
              {meta.confidence != null && <span>Confidence {meta.confidence}%</span>}
              {meta.dataType && <span className="copilot-dtype">{String(meta.dataType).replace(/_/g, " ")}</span>}
              {meta.llm?.used && <span>xAI polish</span>}
              {meta.cached && <span>Cached</span>}
              {meta.fetchedAt && <span>{new Date(meta.fetchedAt).toLocaleString()}</span>}
              {meta.symbol && <span>{meta.symbol}</span>}
            </footer>
          )}
          {meta?.sources?.length > 0 && (
            <p className="copilot-sources">Sources: {meta.sources.join(" · ")}</p>
          )}
        </div>
      )}

      {!answer && !loading && !error && (expanded || isModal) && (
        <p className="copilot-empty">
          Ask about a stock, NIFTY outlook, FII/DII flows, sectors, valuations, or financial definitions.
          Missing data shows as <strong>Data Unavailable</strong> — never invented.
          {isModal && (
            <>
              {" "}
              <kbd className="copilot-kbd">Esc</kbd> to close · <kbd className="copilot-kbd">Enter</kbd> to ask.
            </>
          )}
        </p>
      )}
    </div>
  );

  if (!isModal) return panel;

  return (
    <div className="copilot-modal-root" role="presentation">
      <button
        type="button"
        className="copilot-modal-backdrop"
        aria-label="Close AI Copilot"
        onClick={onClose}
      />
      <div className="copilot-modal-shell">{panel}</div>
    </div>
  );
}
