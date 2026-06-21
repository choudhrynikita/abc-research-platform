function renderMeta(container, meta, report) {
  if (!container || !meta) return;
  const freshness = report?.dataFreshness?.fetchedAt || meta.fetchedAt || meta.lastUpdated;
  const ageMs = freshness ? Date.now() - new Date(freshness).getTime() : null;
  const freshLabel = ageMs == null ? "Unknown" : ageMs < 30 * 60 * 1000 ? "Fresh" : `Stale (${Math.round(ageMs / 60000)}m)`;

  container.innerHTML = `
    <div class="compliance-bar">
      <span><strong>Source:</strong> ${meta.source}</span>
      <span><strong>As of:</strong> ${meta.asOfDate || meta.fetchedAt?.slice(0, 10) || "—"}</span>
      <span><strong>Updated:</strong> ${meta.lastUpdated ? new Date(meta.lastUpdated).toLocaleString() : "—"}</span>
      <span><strong>Freshness:</strong> ${freshLabel}</span>
      <span><strong>Type:</strong> ${meta.dataType}</span>
      ${meta.confidence != null ? `<span><strong>Confidence:</strong> ${meta.confidence}% (computed)</span>` : ""}
    </div>
  `;
}

function renderDisclaimer(el) {
  if (!el) return;
  el.innerHTML = `
    <p class="global-disclaimer">
      <strong>Risk Disclaimer:</strong> Market data is sourced from approved providers (Yahoo Finance, NSE) and may be delayed.
      AI/model outputs are probabilistic opinions separated from factual data — not investment advice.
      Past performance does not guarantee future results.
    </p>
  `;
}

window.renderMeta = renderMeta;
window.renderDisclaimer = renderDisclaimer;