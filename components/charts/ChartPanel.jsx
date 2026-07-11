"use client";

/**
 * Shared institutional chart shell: loading / empty / error / footer metadata.
 * Never fabricates data — only presents children when datasets are valid.
 */

const DATA_UNAVAILABLE = "Data Unavailable";

export function ChartLoading({ label = "Loading verified chart data…" }) {
  return (
    <div className="chart-loading-block" role="status" aria-live="polite">
      <div className="terminal-spinner" />
      <p>{label}</p>
      <div className="chart-skeleton" style={{ height: 120 }} aria-hidden>
        <div className="chart-skeleton-bars">
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}

export function ChartEmpty({
  message,
  reason,
  onRetry,
  source,
}) {
  return (
    <div className="chart-empty-state" role="status">
      <p className="metric-na">{DATA_UNAVAILABLE}</p>
      <p>{message || "Live Data Currently Unavailable"}</p>
      {reason && <p className="panel-sub">{reason}</p>}
      {source && <p className="panel-sub">Expected source: {source}</p>}
      {onRetry && (
        <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

export function ChartFooter({ meta, extra }) {
  if (!meta && !extra) return null;
  return (
    <p className="chart-footnote">
      {meta?.candleCount != null && `${meta.candleCount} verified candles`}
      {meta?.range && ` · Range ${meta.range}`}
      {meta?.lastUpdated && ` · Updated ${new Date(meta.lastUpdated).toLocaleString()}`}
      {meta?.provider && ` · ${meta.provider}`}
      {meta?.source && !meta?.provider && ` · ${meta.source}`}
      {meta?.rejectedPoints > 0 && ` · ${meta.rejectedPoints} invalid points rejected`}
      {extra ? ` · ${extra}` : ""}
    </p>
  );
}

export default function ChartPanel({
  title,
  subtitle,
  actions,
  loading,
  error,
  empty,
  onRetry,
  meta,
  children,
  className = "",
  fullscreen,
  source = "Yahoo Finance Chart API",
}) {
  return (
    <section className={`chart-panel glass-card${fullscreen ? " fullscreen" : ""} ${className}`.trim()}>
      {(title || actions) && (
        <div className="chart-panel-head">
          <div>
            {title && <h3>{title}</h3>}
            {subtitle && <p className="panel-sub">{subtitle}</p>}
          </div>
          {actions && <div className="chart-panel-actions">{actions}</div>}
        </div>
      )}

      {loading && <ChartLoading />}

      {!loading && error && (
        <ChartEmpty message={error} onRetry={onRetry} source={source} />
      )}

      {!loading && !error && empty && (
        <ChartEmpty
          message={typeof empty === "string" ? empty : "Awaiting Latest Market Data"}
          onRetry={onRetry}
          source={source}
        />
      )}

      {!loading && !error && !empty && children}

      {!loading && !error && !empty && <ChartFooter meta={meta} />}
    </section>
  );
}
