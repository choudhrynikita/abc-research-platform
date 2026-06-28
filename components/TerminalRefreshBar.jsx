"use client";

export default function TerminalRefreshBar({
  onRefresh,
  refreshing,
  refreshedAt,
  marketStatus,
  disabled,
}) {
  const mode = marketStatus?.mode === "live" ? "live" : "pre-market";

  return (
    <div className="terminal-refresh-bar glass-card" role="toolbar" aria-label="Data refresh controls">
      <div className="trb-meta">
        <span className={`msb-badge ${mode}`}>{marketStatus?.bannerTitle || marketStatus?.label || "Market"}</span>
        <span className={`msb-status-pill ${mode}`}>{marketStatus?.label || "—"}</span>
        <span className="trb-timestamp">
          Last updated: {refreshedAt ? new Date(refreshedAt).toLocaleString() : "—"}
        </span>
      </div>
      <button
        type="button"
        className="btn btn-primary btn-sm trb-btn"
        onClick={onRefresh}
        disabled={disabled || refreshing}
        aria-busy={refreshing}
      >
        {refreshing ? (
          <>
            <span className="terminal-spinner sm" aria-hidden="true" />
            Refreshing…
          </>
        ) : (
          "Refresh Data"
        )}
      </button>
    </div>
  );
}