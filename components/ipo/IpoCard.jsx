"use client";

function recClass(status) {
  if (status === "open") return "open";
  if (status === "listed") return "listed";
  return "upcoming";
}

function fmtSub(metric) {
  if (!metric?.available) return "Awaiting official verified data.";
  return metric.display;
}

export default function IpoCard({ ipo, onSelect, selected }) {
  const sub = ipo.subscription?.overall;

  return (
    <article
      className={`ipo-card glass-card${selected ? " selected" : ""}`}
      onClick={() => onSelect?.(ipo)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect?.(ipo)}
    >
      <header className="ipo-card-head">
        <div className="ipo-logo-placeholder">{ipo.companyName?.charAt(0) || "?"}</div>
        <div className="ipo-identity">
          <h4>{ipo.companyName}</h4>
          <span className="ipo-symbol">{ipo.symbol}</span>
          <span className={`ipo-type-pill ${ipo.ipoType?.toLowerCase()}`}>{ipo.ipoType || "—"}</span>
        </div>
        <span className={`ipo-status-badge ${recClass(ipo.category)}`}>
          {ipo.category === "open" ? "Open" : ipo.category === "listed" ? "Listed" : "Upcoming"}
        </span>
      </header>

      <div className="ipo-meta-grid">
        <div><small>Industry</small><strong>{ipo.industry || "—"}</strong></div>
        <div><small>Issue Size</small><strong>{ipo.issueSize || "—"}</strong></div>
        <div><small>Price Band</small><strong>{ipo.priceBand || "—"}</strong></div>
        <div><small>Lot Size</small><strong>{ipo.lotSize ?? "—"}</strong></div>
        <div><small>Min Investment</small><strong>{ipo.minInvestment != null ? `₹${ipo.minInvestment.toLocaleString()}` : "—"}</strong></div>
        <div><small>Exchange</small><strong>{ipo.exchange || "NSE"}</strong></div>
      </div>

      <div className="ipo-dates-row">
        <div><small>Open</small><strong>{ipo.openDate || "—"}</strong></div>
        <div><small>Close</small><strong>{ipo.closeDate || "—"}</strong></div>
        <div><small>Listing</small><strong>{ipo.listingDate || "—"}</strong></div>
        <div><small>Subscription</small><strong className="sub-val">{fmtSub(sub)}</strong></div>
      </div>

      {ipo.listedPerformance?.listingGainLoss?.available && (
        <div className="ipo-listed-strip">
          <span>Since listing: <strong className={ipo.listedPerformance.listingGainLoss.value >= 0 ? "up" : "down"}>{ipo.listedPerformance.listingGainLoss.display}</strong></span>
        </div>
      )}

      <footer className="ipo-card-foot">
        <span>Updated {ipo.lastUpdated ? new Date(ipo.lastUpdated).toLocaleString() : "—"}</span>
      </footer>
    </article>
  );
}