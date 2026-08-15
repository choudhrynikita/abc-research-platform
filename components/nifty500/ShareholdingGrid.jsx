"use client";

import MetricValue, { extractValue } from "./MetricValue";

const ROWS = [
  { label: "Promoter Holdings", key: "promoter" },
  { label: "FII / FPI Holdings", key: "fii" },
  { label: "DII Holdings", key: "dii" },
  { label: "Institutional Holdings", key: "institutional" },
  { label: "Mutual Fund Holdings", key: "mutualFunds" },
  { label: "Public", key: "public" },
];

/**
 * Renders verified NSE / Yahoo shareholding fields.
 * Missing categories stay "Data Unavailable" — values are never invented.
 */
export default function ShareholdingGrid({
  shareholding,
  compact = false,
  className,
}) {
  const sh = shareholding || {};
  const hasVerified = ROWS.some((r) => extractValue(sh[r.key]) != null);
  const asOf = sh.asOf || sh.filingDate || null;
  const source = sh.source || null;

  let message;
  if (hasVerified) {
    message = sh.message || "Verified NSE shareholding filings — never estimated.";
  } else {
    message =
      sh.message ||
      "Requires NSE/BSE shareholding feed. Values are never estimated.";
  }

  const Heading = compact ? "h4" : "h3";
  const sectionClass =
    className || (compact ? "research-subcard" : "glass-card detail-section");
  const gridClass = compact ? "research-metric-grid compact" : "tech-grid";
  const tileClass = compact ? "research-metric-tile" : "tech-tile";

  return (
    <section className={sectionClass}>
      <Heading>Shareholding Pattern</Heading>
      <p className="panel-sub">
        {message}
        {source ? ` · ${source}` : ""}
        {asOf ? ` · As of ${asOf}` : ""}
      </p>
      <div className={gridClass}>
        {ROWS.map((r) => (
          <div key={r.key} className={tileClass}>
            <small>{r.label}</small>
            <strong>
              <MetricValue value={sh[r.key]} type="ratio" decimals={2} label={r.label} />
            </strong>
          </div>
        ))}
      </div>
    </section>
  );
}
