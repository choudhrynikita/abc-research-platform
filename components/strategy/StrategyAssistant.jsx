"use client";

import { useCallback, useEffect, useRef, useState } from "react";

function renderMarkdownLite(text) {
  if (!text) return null;
  return text.split("\n\n").map((block, i) => {
    const lines = block.split("\n").map((line, j) => {
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      return (
        <span key={j}>
          {parts.map((part, k) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              return <strong key={k}>{part.slice(2, -2)}</strong>;
            }
            return part;
          })}
          {j < block.split("\n").length - 1 && <br />}
        </span>
      );
    });
    return <p key={i} className="assistant-paragraph">{lines}</p>;
  });
}

function InsightList({ title, items }) {
  if (!items?.length) return null;
  return (
    <div className="assistant-insight-block">
      <h5>{title}</h5>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export default function StrategyAssistant({
  strategy,
  marketContext,
  derivativesIntel,
  module = "nifty-strategy",
  refreshedAt,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [prefetch, setPrefetch] = useState(null);
  const [openSections, setOpenSections] = useState({ insights: true, faq: false, misconceptions: false });
  const chatEndRef = useRef(null);
  const strategyKey = strategy ? `${strategy.rank}-${strategy.name || strategy.nseSymbol}-${strategy.type}` : null;

  const loadContext = useCallback(async () => {
    if (!strategy) {
      setPrefetch(null);
      setMessages([]);
      return;
    }
    try {
      const res = await fetch("/api/strategy-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prefetch: true,
          module,
          strategy,
          marketContext,
          derivativesIntel,
          refreshedAt,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || json.error || "Failed to load assistant context");
      setPrefetch(json);
      setMessages([
        {
          role: "assistant",
          content: `I'm your derivatives strategist for **${json.strategyContext?.name || "this strategy"}** (${json.strategyContext?.type || "options"}). Ask me anything about risk, Greeks, volatility, strikes, exits, or calculations — I'll use verified data only and clearly mark what's unavailable.`,
        },
      ]);
    } catch (e) {
      setError(e.message);
    }
  }, [strategy, marketContext, derivativesIntel, module, refreshedAt]);

  useEffect(() => {
    setError(null);
    setInput("");
    loadContext();
  }, [strategyKey, loadContext]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(text) {
    const query = (text || input).trim();
    if (!query || !strategy || loading) return;

    setInput("");
    setError(null);
    const userMsg = { role: "user", content: query };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setLoading(true);

    try {
      const res = await fetch("/api/strategy-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          module,
          strategy,
          marketContext,
          derivativesIntel,
          refreshedAt,
          history: nextHistory.filter((m) => m.role === "user" || m.role === "assistant"),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || json.error || "Assistant unavailable");

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: json.answer,
          meta: json.transparency,
          intent: json.intent,
          followUps: json.suggestedFollowUps,
        },
      ]);
    } catch (e) {
      setError(e.message);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Verified data is currently unavailable. ${e.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function toggleSection(key) {
    setOpenSections((s) => ({ ...s, [key]: !s[key] }));
  }

  if (!strategy) {
    return (
      <section className="strategy-assistant glass-card assistant-empty">
        <h3>Derivatives Strategist</h3>
        <p className="panel-sub">Select a strategy above to open the context-aware AI assistant.</p>
      </section>
    );
  }

  const suggestions = prefetch?.suggestedQuestions || [];
  const insights = prefetch?.educationalInsights;
  const faqs = prefetch?.faqs || [];
  const misconceptions = prefetch?.misconceptions || [];
  const transparency = prefetch?.transparency;

  return (
    <section className="strategy-assistant glass-card" aria-label="Strategy AI assistant">
      <header className="assistant-head">
        <div>
          <p className="terminal-eyebrow">Derivatives Strategist</p>
          <h3>{prefetch?.strategyContext?.name || strategy.name || strategy.companyName}</h3>
          <p className="panel-sub">
            {strategy.type} · {strategy.bias} · {strategy.expiry || "—"}
            {strategy.mode === "pre-market" && " · Pre-market reference data"}
          </p>
        </div>
        <span className="assistant-badge">Verified data only</span>
      </header>

      <div className="assistant-layout">
        <div className="assistant-chat">
          <div className="assistant-messages" role="log" aria-live="polite">
            {messages.map((msg, i) => (
              <div key={i} className={`assistant-msg assistant-msg-${msg.role}`}>
                <span className="assistant-msg-role">{msg.role === "user" ? "You" : "Strategist"}</span>
                <div className="assistant-msg-body">{renderMarkdownLite(msg.content)}</div>
                {msg.meta && (
                  <footer className="assistant-transparency">
                    <small>
                      Source: {msg.meta.sources?.join(", ") || "ABC engine"}
                      {msg.meta.lastMarketUpdate && ` · Market data ${new Date(msg.meta.lastMarketUpdate).toLocaleString()}`}
                    </small>
                  </footer>
                )}
              </div>
            ))}
            {loading && (
              <div className="assistant-msg assistant-msg-assistant">
                <span className="assistant-msg-role">Strategist</span>
                <div className="assistant-msg-body assistant-typing">Analyzing with verified context…</div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {suggestions.length > 0 && (
            <div className="assistant-suggestions">
              <small>Suggested questions</small>
              <div className="assistant-chips">
                {suggestions.slice(0, 6).map((q) => (
                  <button
                    key={q}
                    type="button"
                    className="chip sm"
                    onClick={() => sendMessage(q)}
                    disabled={loading}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form
            className="assistant-input-row"
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
          >
            <input
              type="text"
              className="assistant-input"
              placeholder="Ask about risk, Greeks, IV, strikes, exits, calculations…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              maxLength={2000}
            />
            <button className="btn btn-primary" type="submit" disabled={loading || !input.trim()}>
              {loading ? "…" : "Ask"}
            </button>
          </form>

          {error && <p className="assistant-error">{error}</p>}
        </div>

        <aside className="assistant-sidebar">
          <button type="button" className="assistant-section-toggle" onClick={() => toggleSection("insights")}>
            <span>Educational Insights</span>
            <span>{openSections.insights ? "▾" : "▸"}</span>
          </button>
          {openSections.insights && insights && (
            <div className="assistant-sidebar-body">
              <InsightList title="Risk Discussion" items={insights.riskDiscussion} />
              <InsightList title="Practical Considerations" items={insights.practicalNotes} />
              <InsightList title="Limitations" items={insights.limitations} />
              <InsightList title="Alternative Approaches" items={insights.alternatives} />
            </div>
          )}

          <button type="button" className="assistant-section-toggle" onClick={() => toggleSection("faq")}>
            <span>FAQs</span>
            <span>{openSections.faq ? "▾" : "▸"}</span>
          </button>
          {openSections.faq && (
            <div className="assistant-sidebar-body">
              {faqs.map((f) => (
                <div key={f.q} className="assistant-faq-item">
                  <strong>{f.q}</strong>
                  <p>{f.a}</p>
                </div>
              ))}
            </div>
          )}

          <button type="button" className="assistant-section-toggle" onClick={() => toggleSection("misconceptions")}>
            <span>Common Misconceptions</span>
            <span>{openSections.misconceptions ? "▾" : "▸"}</span>
          </button>
          {openSections.misconceptions && (
            <div className="assistant-sidebar-body">
              <ul>
                {misconceptions.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          )}

          {transparency && (
            <div className="assistant-meta-footer">
              <small>
                {transparency.lastMarketUpdate
                  ? `Last market update: ${new Date(transparency.lastMarketUpdate).toLocaleString()}`
                  : "Market update time not verified"}
              </small>
              <small>Calculation: {new Date(transparency.calculationTimestamp).toLocaleString()}</small>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}