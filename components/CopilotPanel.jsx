"use client";

import { useCallback, useState } from "react";

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
    return "The AI service configuration was incomplete on the server. This has been fixed for research queries — please retry. If the issue persists, contact the administrator.";
  }
  if (status === 401 || status === 403) {
    return "You are not authorized for this action. Research Copilot should be available without a token — please refresh and try again.";
  }
  if (status === 503 || status >= 500) {
    return "Live financial data could not be retrieved at this time. Please try again later.";
  }
  if (status === 400) {
    return msg || "Please enter a valid research question.";
  }
  return msg || "AI service is temporarily unavailable. Please try again later.";
}

/**
 * Institutional AI Copilot search panel (sidebar + expandable).
 */
export default function CopilotPanel({ compact = false }) {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState(null);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(!compact);

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

      let lastErr = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await fetch("/api/copilot", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: q }),
          });
          const json = await res.json();
          if (!res.ok) {
            throw Object.assign(new Error(friendlyError(json, res.status)), {
              status: res.status,
              payload: json,
            });
          }
          const text = json.answer || json.message;
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
          });
          setExpanded(true);
          setLoading(false);
          return;
        } catch (e) {
          lastErr = e;
          if (attempt === 0) await new Promise((r) => setTimeout(r, 600));
        }
      }
      setError(lastErr?.message || friendlyError(null, 503));
      setLoading(false);
    },
    [query]
  );

  const suggestions = meta?.suggestions?.length ? meta.suggestions : FALLBACK_SUGGESTIONS;

  return (
    <div className={`copilot-panel${expanded ? " expanded" : ""}${compact ? " compact" : ""}`}>
      <div className="copilot-panel-head">
        <div>
          <h4>AI Research Copilot</h4>
          <p className="copilot-sub">Verified market data only · never fabricates numbers</p>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm copilot-expand-btn"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded ? "▾" : "▸"}
        </button>
      </div>

      <div className="copilot-search-row">
        <input
          type="search"
          className="copilot-input"
          placeholder="Ask: Analyze TCS, NIFTY outlook, FII/DII…"
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

      {expanded && (
        <div className="copilot-suggestions" aria-label="Suggested queries">
          {suggestions.slice(0, 4).map((s) => (
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
          <p>Fetching verified data &amp; building answer…</p>
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
              {meta.confidence != null && (
                <span>Confidence {meta.confidence}%</span>
              )}
              {meta.dataType && <span>{meta.dataType}</span>}
              {meta.llm?.used && <span>xAI polish</span>}
              {meta.fetchedAt && (
                <span>{new Date(meta.fetchedAt).toLocaleString()}</span>
              )}
              {meta.symbol && <span>{meta.symbol}</span>}
            </footer>
          )}
          {meta?.sources?.length > 0 && (
            <p className="copilot-sources">
              Sources: {meta.sources.join(" · ")}
            </p>
          )}
        </div>
      )}

      {!answer && !loading && !error && expanded && (
        <p className="copilot-empty">
          Ask about a stock, NIFTY outlook, FII/DII flows, sectors, or financial definitions.
          Missing data shows as Data Unavailable — never invented.
        </p>
      )}
    </div>
  );
}
