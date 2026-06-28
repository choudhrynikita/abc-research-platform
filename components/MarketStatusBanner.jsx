"use client";

export default function MarketStatusBanner({ marketStatus, refreshedAt, source, chainStatus }) {
  if (!marketStatus) return null;

  const isLive = marketStatus.mode === "live";
  const modeCls = isLive ? "live" : "pre-market";

  return (
    <section className={`market-status-banner glass-card ${modeCls}`} role="status" aria-live="polite">
      <div className="msb-head">
        <div className="msb-title-row">
          <span className={`msb-badge ${modeCls}`}>{marketStatus.bannerTitle}</span>
          <span className="msb-status-pill">{marketStatus.label}</span>
        </div>
        <p className="msb-subtitle">{marketStatus.bannerSubtitle}</p>
      </div>

      <div className="msb-meta-grid">
        <div>
          <small>Last Updated</small>
          <strong>{refreshedAt ? new Date(refreshedAt).toLocaleString() : "—"}</strong>
        </div>
        <div>
          <small>Market Status</small>
          <strong>{marketStatus.label}</strong>
        </div>
        <div>
          <small>Data Source</small>
          <strong>{source || marketStatus.dataContext || "—"}</strong>
        </div>
        {chainStatus?.fetchedAt && (
          <div>
            <small>Chain Data As Of</small>
            <strong>
              {new Date(chainStatus.fetchedAt).toLocaleString()}
              {chainStatus.stale ? " (last session)" : ""}
            </strong>
          </div>
        )}
      </div>

      {!isLive && (
        <p className="msb-footnote">
          Strategies labeled <em>Pre-Market</em> use the latest verified market close. Conditional triggers apply where Monday open premiums are unknown.
        </p>
      )}
    </section>
  );
}