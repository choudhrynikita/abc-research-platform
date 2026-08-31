"use client";

import IpoExecutiveSummary from "./IpoExecutiveSummary";
import IpoScorecard from "./IpoScorecard";
import IpoSubscriptionPanel from "./IpoSubscriptionPanel";

function ExpandBlock({ title, children, defaultOpen = false }) {
  return (
    <section className="ipo-expand glass-card">
      <h3>{title}</h3>
      <div className="expand-body always-open">{children}</div>
    </section>
  );
}

function money(value) {
  if (value == null || value === "") return "—";
  if (typeof value === "number" && Number.isFinite(value)) {
    return `₹${value.toLocaleString("en-IN")}`;
  }
  return String(value);
}

export default function IpoDetailView({ data, loading }) {
  if (loading) {
    return (
      <div className="terminal-loading compact">
        <div className="terminal-spinner" />
        <p>Loading NSE issue info and bid book…</p>
      </div>
    );
  }

  if (!data?.available) {
    return (
      <div className="ipo-unavail-panel glass-card">
        <p>{data?.message || "IPO analysis unavailable."}</p>
      </div>
    );
  }

  const snap = data.snapshot?.fields || [];
  const demand = data.demand?.levels || data.financialCharts?.series || [];
  const docs = data.documents || [];
  const subCats = (data.subscription?.categories || []).filter((c) => c.times != null);

  return (
    <div className="ipo-detail">
      <IpoExecutiveSummary summary={data.executiveSummary} companyName={data.card?.companyName} />

      {snap.length > 0 && (
        <ExpandBlock title="Issue Snapshot" defaultOpen>
          <div className="ipo-snapshot-grid">
            {snap.map((row) => (
              <div key={row.label}>
                <small>{row.label}</small>
                <strong>{row.value}</strong>
              </div>
            ))}
          </div>
        </ExpandBlock>
      )}

      <IpoSubscriptionPanel subscription={data.subscription} />

      {subCats.length > 0 && (
        <ExpandBlock title="Category Bid Book">
          <div className="ipo-table-wrap">
            <table className="ipo-demand-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Offered</th>
                  <th>Bid</th>
                  <th>Times</th>
                </tr>
              </thead>
              <tbody>
                {subCats.map((row) => (
                  <tr key={`${row.srNo}-${row.category}`}>
                    <td>{row.category}</td>
                    <td>{row.sharesOffered != null ? Number(row.sharesOffered).toLocaleString("en-IN") : "—"}</td>
                    <td>{row.sharesBid != null ? Number(row.sharesBid).toLocaleString("en-IN") : "—"}</td>
                    <td>{row.times != null ? `${Number(row.times).toFixed(row.times < 0.01 ? 4 : 2)}x` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ExpandBlock>
      )}

      {demand.length > 0 && (
        <ExpandBlock title="Demand by Price">
          <p className="panel-sub">NSE cumulative quantity at each price. Updated {data.demand?.updatedAt || "during the live book"}.</p>
          <div className="ipo-table-wrap">
            <table className="ipo-demand-table">
              <thead>
                <tr>
                  <th>Price</th>
                  <th>Cumulative qty</th>
                </tr>
              </thead>
              <tbody>
                {demand.map((row) => (
                  <tr key={`${row.price}-${row.cumulativeQty}`}>
                    <td>{row.price}</td>
                    <td>{row.cumulativeQty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ExpandBlock>
      )}

      <IpoScorecard scorecard={data.scorecard} />

      {data.recommendation?.evidence?.length > 0 && (
        <section className="ipo-rec-panel glass-card">
          <h3>Recommendation Evidence</h3>
          <ul className="ipo-evidence">
            {data.recommendation.evidence.map((e) => <li key={e}>{e}</li>)}
          </ul>
          {data.recommendation?.longTermNote && (
            <p className="ipo-note">{data.recommendation.longTermNote}</p>
          )}
        </section>
      )}

      {data.valuation?.available && (
        <ExpandBlock title="Issue Terms / Valuation Context">
          <div className="ipo-snapshot-grid">
            <div><small>Price band</small><strong>{data.valuation.priceBand || "—"}</strong></div>
            <div><small>IPO mid</small><strong>{money(data.valuation.ipoPrice)}</strong></div>
            <div><small>Face value</small><strong>{data.valuation.faceValue != null ? `₹${data.valuation.faceValue}` : "—"}</strong></div>
            <div><small>Min. investment</small><strong>{money(data.valuation.minInvestment)}</strong></div>
            <div><small>Issue size</small><strong>{data.valuation.issueSize || "—"}</strong></div>
          </div>
          <p className="ipo-note">{data.valuation.message}</p>
          {data.valuation.ratiosUrl && (
            <p><a href={data.valuation.ratiosUrl} target="_blank" rel="noreferrer">NSE basis of issue price</a></p>
          )}
        </ExpandBlock>
      )}

      {data.fundamentals?.metrics?.length > 0 && (
        <ExpandBlock title="Post-listing Financials">
          <div className="ipo-snapshot-grid">
            {data.fundamentals.metrics.map((m) => (
              <div key={m.label}>
                <small>{m.label}</small>
                <strong>{m.value}</strong>
              </div>
            ))}
          </div>
          <p className="ipo-note">{data.fundamentals.message}</p>
        </ExpandBlock>
      )}

      {data.industryOutlook?.available && (
        <ExpandBlock title="Industry">
          <ul>
            {data.industryOutlook.bullets?.map((b) => <li key={b}>{b}</li>)}
          </ul>
        </ExpandBlock>
      )}

      {data.risks?.bullets?.length > 0 && (
        <ExpandBlock title="Risk Analysis">
          <ul className="risk-list">{data.risks.bullets.map((b) => <li key={b}>{b}</li>)}</ul>
        </ExpandBlock>
      )}

      {(data.prospectus?.available || docs.length > 0) && (
        <ExpandBlock title="Prospectus & Intermediaries">
          <div className="prospectus-grid">
            <div><small>Lead Managers</small><strong>{data.prospectus?.leadManagers || "—"}</strong></div>
            <div><small>Registrar</small><strong>{data.prospectus?.registrar || "—"}</strong></div>
            <div><small>Sponsor Bank</small><strong>{data.prospectus?.sponsorBank || "—"}</strong></div>
          </div>
          {docs.length > 0 && (
            <ul className="ipo-doc-list">
              {docs.map((doc) => (
                <li key={doc.key}>
                  <a href={doc.url} target="_blank" rel="noreferrer">{doc.title}</a>
                </li>
              ))}
            </ul>
          )}
          {data.prospectus?.message && <p className="ipo-note">{data.prospectus.message}</p>}
        </ExpandBlock>
      )}
    </div>
  );
}
