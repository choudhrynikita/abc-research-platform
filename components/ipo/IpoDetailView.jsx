"use client";

import IpoExecutiveSummary from "./IpoExecutiveSummary";
import IpoScorecard from "./IpoScorecard";
import IpoSubscriptionPanel from "./IpoSubscriptionPanel";
import IpoCompanyPanel from "./IpoCompanyPanel";

function ExpandBlock({ title, children }) {
  return (
    <section className="ipo-expand glass-card">
      <h3>{title}</h3>
      <div className="expand-body always-open">{children}</div>
    </section>
  );
}

function Kv({ label, value, wide = false }) {
  if (value == null || value === "") return null;
  return (
    <div className={wide ? "ipo-kv ipo-kv-wide" : "ipo-kv"}>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
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
  const intermediariesInSnap = snap.some((row) => /lead manager|registrar/i.test(row.label));
  const showProspectusKpis = Boolean(data.prospectus?.available) && !intermediariesInSnap;
  const showProspectus = showProspectusKpis || docs.length > 0 || data.prospectus?.message;

  return (
    <div className="ipo-detail">
      <IpoExecutiveSummary summary={data.executiveSummary} companyName={data.card?.companyName} />

      <IpoCompanyPanel company={data.company} fundamentals={data.fundamentals} />

      {snap.length > 0 && (
        <ExpandBlock title="Issue Snapshot">
          <div className="ipo-snapshot-grid">
            {snap.map((row) => (
              <Kv key={row.label} label={row.label} value={row.value} wide={Boolean(row.wide)} />
            ))}
          </div>
        </ExpandBlock>
      )}

      <IpoSubscriptionPanel subscription={data.subscription} />

      {demand.length > 0 && (
        <ExpandBlock title="Demand by Price">
          <p className="panel-sub">NSE cumulative quantity at each price. Updated {data.demand?.updatedAt || "during the live book"}.</p>
          <div className="ipo-table-wrap">
            <table className="ipo-demand-table ipo-num-table">
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

      {data.valuation?.available && (data.valuation.ratiosUrl || data.valuation.message) && (
        <ExpandBlock title="Issue Terms / Valuation Context">
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
              <Kv key={m.label} label={m.label} value={m.value} />
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

      {data.risks?.bullets?.length > 0 && !data.company?.risks?.length && (
        <ExpandBlock title="Risk Analysis">
          <ul className="risk-list">{data.risks.bullets.map((b) => <li key={b}>{b}</li>)}</ul>
        </ExpandBlock>
      )}

      {showProspectus && (
        <ExpandBlock title="Prospectus & Intermediaries">
          {showProspectusKpis ? (
            <div className="prospectus-grid">
              <Kv label="Lead Managers" value={data.prospectus?.leadManagers || "—"} wide />
              <Kv label="Registrar" value={data.prospectus?.registrar || "—"} />
              <Kv label="Sponsor Bank" value={data.prospectus?.sponsorBank || "—"} />
            </div>
          ) : null}
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