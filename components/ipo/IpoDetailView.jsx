"use client";

import { useState } from "react";
import IpoExecutiveSummary from "./IpoExecutiveSummary";
import IpoScorecard from "./IpoScorecard";
import IpoSubscriptionPanel from "./IpoSubscriptionPanel";


function ExpandBlock({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="ipo-expand glass-card">
      <button type="button" className="expand-head" onClick={() => setOpen((v) => !v)}>
        <h3>{title}</h3>
        <span>{open ? "▾" : "▸"}</span>
      </button>
      {open && <div className="expand-body">{children}</div>}
    </section>
  );
}

function UnavailBlock({ message }) {
  return <p className="ipo-unavail">{message || "Awaiting official verified data."}</p>;
}

export default function IpoDetailView({ data, loading }) {
  if (loading) {
    return (
      <div className="terminal-loading compact">
        <div className="terminal-spinner" />
        <p>Loading verified IPO analysis…</p>
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

  return (
    <div className="ipo-detail">
      <IpoExecutiveSummary summary={data.executiveSummary} companyName={data.card?.companyName} />

      <IpoSubscriptionPanel subscription={data.subscription} />
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

      <ExpandBlock title="Fundamental Analysis">
        {data.fundamentals?.available ? (
          <ul>{data.fundamentals.bullets?.map((b) => <li key={b}>{b}</li>)}</ul>
        ) : (
          <>
            <UnavailBlock message={data.fundamentals?.message} />
            <ul>{data.fundamentals?.bullets?.map((b) => <li key={b}>{b}</li>)}</ul>
          </>
        )}
      </ExpandBlock>

      <ExpandBlock title="Financial Charts">
        <UnavailBlock message={data.financialCharts?.message} />
      </ExpandBlock>

      <ExpandBlock title="Valuation Analysis">
        <UnavailBlock message={data.valuation?.message} />
        {data.valuation?.ipoPrice != null && (
          <p className="ipo-note">IPO mid-price (from band): ₹{data.valuation.ipoPrice}</p>
        )}
      </ExpandBlock>

      <ExpandBlock title="Peer Comparison">
        <UnavailBlock message={data.peers?.message} />
      </ExpandBlock>

      <ExpandBlock title="Industry Outlook">
        {data.industryOutlook?.available ? (
          <ul>
            {data.industryOutlook.bullets?.map((b) => <li key={b}>{b}</li>)}
            <li><strong>Outlook:</strong> {data.industryOutlook.outlook}</li>
          </ul>
        ) : (
          <UnavailBlock />
        )}
      </ExpandBlock>

      <ExpandBlock title="Risk Analysis">
        <ul className="risk-list">{data.risks?.bullets?.map((b) => <li key={b}>{b}</li>)}</ul>
      </ExpandBlock>

      <ExpandBlock title="Prospectus Information">
        <div className="prospectus-grid">
          <div><small>Lead Managers</small><strong>{data.prospectus?.leadManagers || "—"}</strong></div>
          <div><small>Registrar</small><strong>{data.prospectus?.registrar || "—"}</strong></div>
        </div>
        <p className="ipo-note">{data.prospectus?.message}</p>
      </ExpandBlock>

    </div>
  );
}