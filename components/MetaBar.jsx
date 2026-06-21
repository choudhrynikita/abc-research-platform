"use client";

export default function MetaBar({ meta, report }) {
  if (!meta) return null;
  const freshness = report?.dataFreshness?.fetchedAt || meta.fetchedAt || meta.lastUpdated;
  const ageMs = freshness ? Date.now() - new Date(freshness).getTime() : null;
  const freshLabel =
    ageMs == null ? "Unknown" : ageMs < 30 * 60 * 1000 ? "Fresh" : `Stale (${Math.round(ageMs / 60000)}m)`;

  return (
    <div className="compliance-bar">
      <span><strong>Source:</strong> {meta.source}</span>
      <span><strong>As of:</strong> {meta.asOfDate || meta.fetchedAt?.slice?.(0, 10) || "—"}</span>
      <span><strong>Updated:</strong> {meta.lastUpdated ? new Date(meta.lastUpdated).toLocaleString() : "—"}</span>
      <span><strong>Freshness:</strong> {freshLabel}</span>
      <span><strong>Type:</strong> {meta.dataType}</span>
      {meta.confidence != null && <span><strong>Confidence:</strong> {meta.confidence}% (computed)</span>}
    </div>
  );
}