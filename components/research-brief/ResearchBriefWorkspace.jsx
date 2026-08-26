"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import AppIcon from "../AppIcon";
import { clearBriefEntries, readBriefEntries, removeBriefEntry } from "./brief-store";

function formatTimestamp(value) {
  if (!value) return "Not supplied by the current feed";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not supplied by the current feed" : date.toLocaleString("en-IN");
}

function formatPrice(value) {
  return Number.isFinite(value) ? `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : "Data unavailable from current feed";
}

function EvidenceBlock({ title, tone, items, emptyText }) {
  return (
    <section className={`brief-evidence-block ${tone}`}>
      <h4>{title}</h4>
      {items?.length ? (
        <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>
      ) : (
        <p>{emptyText}</p>
      )}
    </section>
  );
}

function BriefCard({ entry, onRemove }) {
  const chg = entry.changePercent;
  const changeText = Number.isFinite(chg) ? `${chg >= 0 ? "+" : ""}${chg.toFixed(2)}%` : "Change unavailable";
  return (
    <article className="brief-card">
      <header className="brief-card-head">
        <div>
          <p className="brief-card-overline">Screened idea · browser snapshot</p>
          <h3>{entry.name}</h3>
          <p className="brief-card-symbol">{entry.symbol.replace(".NS", "")} · {entry.sector}</p>
        </div>
        <button type="button" className="brief-remove-btn" onClick={() => onRemove(entry.symbol)} aria-label={`Remove ${entry.name} from Research Brief`}>
          Remove
        </button>
      </header>

      <div className="brief-metric-row" aria-label="Captured facts and model output">
        <span><small>Captured price · Yahoo Finance</small><strong>{formatPrice(entry.price)}</strong></span>
        <span className={chg >= 0 ? "positive" : "negative"}><small>Session change · Yahoo Finance</small><strong>{changeText}</strong></span>
        <span><small>Screen state · ABC model</small><strong>{entry.facts.action}</strong></span>
        <span><small>Confidence · ABC model</small><strong>{entry.facts.confidence != null ? `${entry.facts.confidence}/100` : "Not supplied"}</strong></span>
      </div>
      <p className="brief-advisory-note">Action and confidence are captured model output, not financial advice or an instruction to trade.</p>

      <div className="brief-claim-line">
        <span className="brief-kind fact">Facts</span>
        <p>Captured {formatTimestamp(entry.addedAt)}. Market data as of {formatTimestamp(entry.asOf)}.</p>
      </div>
      <div className="brief-claim-line">
        <span className="brief-kind model">Model interpretation</span>
        <p>{entry.interpretation.thesis}</p>
      </div>

      <div className="brief-evidence-grid">
        <EvidenceBlock title="Supporting signals" tone="positive" items={entry.interpretation.reasons} emptyText="No supporting model signals supplied." />
        <EvidenceBlock title="Risks and counter-evidence" tone="warning" items={entry.interpretation.risks} emptyText="No risk factors supplied by the current model output." />
        <EvidenceBlock title="Invalidation conditions" tone="neutral" items={entry.interpretation.invalidation} emptyText="No explicit invalidation conditions supplied." />
      </div>

      <footer className="brief-source-row" aria-label="Snapshot source context">
        {entry.sources.map((source) => (
          <span key={source.label}>
            <b>{source.label}</b>
            <small>{source.detail}</small>
            <em>{source.state}</em>
          </span>
        ))}
      </footer>
    </article>
  );
}

export default function ResearchBriefWorkspace() {
  const [entries, setEntries] = useState([]);
  const [hydrated, setHydrated] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const headingRef = useRef(null);
  useEffect(() => {
    setEntries(readBriefEntries());
    setHydrated(true);
  }, []);

  const summary = useMemo(() => ({
    count: entries.length,
    sourceContext: entries.length ? entries.length * 3 : 0,
    modelNotes: entries.filter((entry) => entry.interpretation?.thesis).length,
  }), [entries]);

  function removeEntry(symbol) {
    setEntries(removeBriefEntry(symbol));
    setAnnouncement("Snapshot removed from Research Brief.");
  }
  function clearEntries() {
    setEntries(clearBriefEntries());
    setAnnouncement("Research Brief cleared from this browser.");
    window.setTimeout(() => headingRef.current?.focus(), 0);
  }

  return (
    <div className="research-brief-workspace">
      <header className="brief-hero">
        <div>
          <p className="terminal-eyebrow">Research continuity layer</p>
          <h2 ref={headingRef} tabIndex={-1}>Keep the evidence with the idea.</h2>
          <p>Save a source-linked screener snapshot, then review facts, model interpretation, risks, and invalidation conditions without mixing them together.</p>
          <p className="brief-local-note"><AppIcon name="brief" size={14} /> Stored only in this browser until you remove it or clear the brief. No portfolio data, orders, or live alerts are created.</p>
        </div>
        <div className="brief-hero-actions">
          <Link className="btn btn-primary" href="/nifty500">Browse Top 50 screen</Link>
          {entries.length > 0 && <button className="btn btn-ghost" type="button" onClick={clearEntries}>Clear brief</button>}
        </div>
      </header>

      <section className="brief-summary" aria-label="Research Brief summary">
        <div><span>Saved ideas</span><strong>{summary.count}</strong><small>Local research snapshots</small></div>
        <div><span>Source contexts</span><strong>{summary.sourceContext}</strong><small>Displayed beside each idea</small></div>
        <div><span>Model notes</span><strong>{summary.modelNotes}</strong><small>Clearly separated from facts</small></div>
        <div><span>Evidence standard</span><strong>Traceable</strong><small>Source, as-of time, and classification</small></div>
      </section>
      <p className="visually-hidden" role="status" aria-live="polite">{announcement}</p>

      {!hydrated ? (
        <div className="terminal-loading"><div className="terminal-spinner" /><p>Opening local Research Brief…</p></div>
      ) : entries.length ? (
        <div className="brief-list">
          {entries.map((entry) => <BriefCard key={entry.id} entry={entry} onRemove={removeEntry} />)}
        </div>
      ) : (
        <section className="brief-empty glass-card">
          <div className="brief-empty-icon"><AppIcon name="brief" size={25} /></div>
          <div>
            <p className="terminal-eyebrow">No saved idea yet</p>
            <h3>Start from verified screening evidence.</h3>
            <p>Use <strong>Add to Brief</strong> on a Top 50 stock card. Each saved snapshot preserves the captured value, source context, model rationale, risks, and explicit invalidation conditions available at that time.</p>
            <Link className="btn btn-primary" href="/nifty500">Open Top 50 Stocks</Link>
          </div>
        </section>
      )}
    </div>
  );
}
