"use client";

function recClass(status) {
  if (status === "open") return "open";
  if (status === "listed") return "listed";
  return "upcoming";
}

function fmtSub(metric) {
  if (!metric?.available || metric.display == null || metric.display === "") return null;
  return metric.display;
}

function displayAmount(value) {
  if (typeof value === "number" && Number.isFinite(value)) return `₹${value.toLocaleString("en-IN")}`;
  return null;
}

function Fact({ label, value, secondary = false }) {
  if (value == null || value === "") return null;
  return (
    <div className={`ipo-fact${secondary ? " ipo-fact-secondary" : ""}`}>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

export default function IpoCard({ ipo, onSelect, selected }) {
  const sub = fmtSub(ipo.subscription?.overall);

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
          <p className="ipo-identity-meta">
            <span className="ipo-symbol">{ipo.symbol}</span>
            {ipo.ipoType ? <span className={`ipo-type-pill ${ipo.ipoType.toLowerCase()}`}>{ipo.ipoType}</span> : null}
          </p>
        </div>
        <span className={`ipo-status-badge ${recClass(ipo.category)}`}>
          {ipo.category === "open" ? "Open" : ipo.category === "listed" ? "Listed" : "Upcoming"}
        </span>
      </header>

      <div className="ipo-facts">
        <Fact label="Price band" value={ipo.priceBand} />
        <Fact label="Lot" value={ipo.lotSize != null ? Number(ipo.lotSize).toLocaleString("en-IN") : null} />
        <Fact label="Min. investment" value={displayAmount(ipo.minInvestment)} />
        <Fact label="Issue size" value={ipo.issueSize} />
        <Fact label="Open" value={ipo.openDate} />
        <Fact label="Close" value={ipo.closeDate} />
        <Fact label="Subscription" value={sub} />
        <Fact label="Listing" value={ipo.listingDate} secondary />
        <Fact label="Industry" value={ipo.industry} secondary />
      </div>

      {ipo.listedPerformance?.listingGainLoss?.available && (
        <div className="ipo-listed-strip">
          <span>Since listing: <strong className={ipo.listedPerformance.listingGainLoss.value >= 0 ? "up" : "down"}>{ipo.listedPerformance.listingGainLoss.display}</strong></span>
        </div>
      )}
    </article>
  );
}
