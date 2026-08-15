"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

const BIAS_LABEL = {
  bullish: "Constructive",
  bearish: "Defensive",
  mixed: "Two-way",
  watch: "Watch",
};

function timeAgo(iso) {
  if (!iso) return "Time unavailable";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "Time unavailable";
  const mins = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleString();
}

function LoadingSkeleton() {
  return (
    <div className="terminal-loading">
      <div className="terminal-spinner" />
      <p>Fetching latest India share-market headlines…</p>
      <small>Google News (India) + Yahoo Finance search. Impact notes are interpretations, never invented prices.</small>
      <div className="skeleton-stack" aria-hidden>
        <div className="skeleton-line" />
        <div className="skeleton-line short" />
        <div className="skeleton-block" />
      </div>
    </div>
  );
}

function NewsCard({ item, selected, onSelect }) {
  const bias = item.analysis?.bias || "watch";
  return (
    <button
      type="button"
      className={`news-card glass-card${selected ? " selected" : ""}`}
      onClick={() => onSelect(item)}
    >
      <div className="news-card-meta">
        <span className="news-source">{item.publisher || "Publisher unavailable"}</span>
        <span className="news-time">{timeAgo(item.publishedAt)}</span>
      </div>
      <h3>{item.title}</h3>
      <div className="news-card-tags">
        <span className={`news-bias ${bias}`}>{BIAS_LABEL[bias] || bias}</span>
        <span className="news-theme">{item.analysis?.themeLabel}</span>
        {(item.analysis?.relatedSymbols || []).slice(0, 2).map((s) => (
          <span key={s.symbol} className="news-ticker">
            {s.symbol.replace(/\.NS$/i, "")}
          </span>
        ))}
      </div>
    </button>
  );
}

function DetailPanel({ item }) {
  if (!item) {
    return (
      <section className="news-detail glass-card">
        <p className="panel-sub">Select a headline to see market impact and the recommended desk action.</p>
      </section>
    );
  }

  const a = item.analysis || {};
  const bias = a.bias || "watch";

  return (
    <article className="news-detail glass-card">
      <header className="news-detail-head">
        <p className="terminal-eyebrow">
          {item.publisher} · {timeAgo(item.publishedAt)}
        </p>
        <h2>{item.title}</h2>
        <div className="news-card-tags">
          <span className={`news-bias ${bias}`}>{BIAS_LABEL[bias] || bias}</span>
          <span className="news-theme">{a.themeLabel}</span>
          <span className="news-theme">{a.scope === "stock" ? "Stock-specific" : "Market-wide"}</span>
        </div>
      </header>

      <section className="news-block">
        <h3>How this can affect the share market</h3>
        <p>{a.marketImpact?.summary || "Impact unavailable — headline only."}</p>
      </section>

      <section className="news-block">
        <h3>How this can affect specific shares</h3>
        {a.stockImpact?.available ? (
          <>
            <p>{a.stockImpact.summary}</p>
            <div className="news-symbol-row">
              {(a.stockImpact.researchLinks || []).map((l) => (
                <Link key={l.symbol} href={l.href} className="btn btn-secondary btn-sm">
                  Research {l.symbol.replace(/\.NS$/i, "")}
                </Link>
              ))}
            </div>
          </>
        ) : (
          <p className="panel-sub">{a.stockImpact?.message || "No listed name identified in this headline."}</p>
        )}
      </section>

      <section className="news-block news-action">
        <h3>What you should do</h3>
        <p className="news-action-label">{a.action?.label}</p>
        <ol>
          {(a.action?.steps || []).map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <footer className="news-detail-foot">
        <a className="btn btn-primary btn-sm" href={item.url} target="_blank" rel="noopener noreferrer">
          Read original source
        </a>
        <p className="panel-sub">{a.disclaimer}</p>
      </footer>
    </article>
  );
}

export default function NewsTerminal() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  const load = useCallback((refresh = false) => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (refresh) params.set("refresh", "true");
    if (typeof window !== "undefined") {
      const symbol = new URLSearchParams(window.location.search).get("symbol");
      if (symbol) params.set("symbol", symbol);
    }
    const qs = params.toString();
    fetch(`/api/news${qs ? `?${qs}` : ""}`)
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!ok && !j.available) {
          setData(j);
          return;
        }
        if (!ok) throw new Error(j.message || j.error || "News feed unavailable");
        setData(j);
        const first = j.items?.[0];
        setSelectedId((prev) => prev || first?.id || null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const items = useMemo(() => {
    const list = data?.items || [];
    const q = query.trim().toLowerCase();
    return list.filter((item) => {
      if (filter === "market" && item.analysis?.scope === "stock") return false;
      if (filter === "stock" && item.analysis?.scope !== "stock") return false;
      if (["rbi_policy", "fii_dii", "earnings", "ipo"].includes(filter) && item.analysis?.theme !== filter) {
        return false;
      }
      if (!q) return true;
      const blob = `${item.title} ${item.publisher} ${(item.analysis?.relatedSymbols || [])
        .map((s) => s.symbol)
        .join(" ")}`.toLowerCase();
      return blob.includes(q);
    });
  }, [data, filter, query]);

  const selected = items.find((i) => i.id === selectedId) || items[0] || null;
  const summary = data?.summary;

  if (loading && !data) return <LoadingSkeleton />;

  if (error && !data) {
    return (
      <div className="strategy-error glass-card">
        <p>Market news is currently unavailable.</p>
        <p className="error-detail">{error}</p>
        <button className="btn btn-primary" type="button" onClick={() => load(true)}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="news-terminal">
      <header className="news-hero glass-card">
        <div>
          <p className="terminal-eyebrow">Market News Desk</p>
          <h2>Latest share-market headlines</h2>
          <p className="panel-sub">
            {data?.message} · {summary?.tone || "—"}
          </p>
        </div>
        <div className="news-hero-actions">
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => load(true)} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>

      {summary && (
        <div className="news-kpi-strip">
          <div className="glass-card news-kpi">
            <small>Headlines</small>
            <strong>{summary.total ?? 0}</strong>
          </div>
          <div className="glass-card news-kpi bullish">
            <small>Constructive</small>
            <strong>{summary.bullish ?? 0}</strong>
          </div>
          <div className="glass-card news-kpi bearish">
            <small>Defensive</small>
            <strong>{summary.bearish ?? 0}</strong>
          </div>
          <div className="glass-card news-kpi">
            <small>Watch</small>
            <strong>{summary.watch ?? 0}</strong>
          </div>
        </div>
      )}

      <div className="news-toolbar">
        <div className="news-filters" role="tablist" aria-label="News filters">
          {(data?.filters || [{ id: "all", label: "All" }]).map((f) => (
            <button
              key={f.id}
              type="button"
              className={`chip${filter === f.id ? " active" : ""}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          className="news-search"
          type="search"
          placeholder="Filter by stock, source, or words…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Filter headlines"
        />
      </div>

      <div className="news-layout">
        <div className="news-list" role="list">
          {items.length === 0 ? (
            <p className="glass-card panel-sub" style={{ padding: 16 }}>
              No headlines match this filter. Feeds may be quiet on exchange holidays.
            </p>
          ) : (
            items.map((item) => (
              <NewsCard
                key={item.id}
                item={item}
                selected={selected?.id === item.id}
                onSelect={(it) => setSelectedId(it.id)}
              />
            ))
          )}
        </div>
        <DetailPanel item={selected} />
      </div>
    </div>
  );
}
