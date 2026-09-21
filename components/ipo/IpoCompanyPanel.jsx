"use client";

function rupeeCr(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })} Cr`;
}

function FinBars({ years }) {
  if (!years?.length) return null;
  const series = [
    { key: "assets", label: "Total Assets", tone: "assets" },
    { key: "revenue", label: "Revenue", tone: "revenue" },
    { key: "pat", label: "Profit After Tax", tone: "pat" },
  ].filter((s) => years.some((y) => y[s.key] != null));
  if (!series.length) return null;
  const max = Math.max(
    1,
    ...years.flatMap((y) => series.map((s) => Math.abs(Number(y[s.key]) || 0)))
  );

  return (
    <div className="ipo-fin-chart">
      <div className="ipo-fin-legend">
        {series.map((s) => (
          <span key={s.key}><i className={`ipo-fin-swatch ${s.tone}`} />{s.label}</span>
        ))}
        <small>₹ crore</small>
      </div>
      {years.map((year) => (
        <div key={year.label} className="ipo-fin-year">
          <strong>{year.label}</strong>
          <div className="ipo-fin-bars">
            {series.map((s) => {
              const val = year[s.key];
              const pct = val == null ? 0 : Math.min(100, (Math.abs(Number(val)) / max) * 100);
              return (
                <div key={s.key} className="ipo-fin-bar-row">
                  <small>{s.label}</small>
                  <div className="ipo-fin-track">
                    <div className={`ipo-fin-fill ${s.tone}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span>{val == null ? "—" : rupeeCr(val).replace(" Cr", "")}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function IpoCompanyPanel({ company, fundamentals }) {
  if (!company && !fundamentals?.years?.length) return null;
  const financials = company?.financials || (fundamentals?.years?.length ? {
    years: fundamentals.years,
    chartYears: fundamentals.years,
    analysis: fundamentals.analysis || [],
    source: fundamentals.message,
  } : null);
  const breakdown = company?.issueBreakdown;
  const utilisation = company?.utilisation;

  return (
    <>
      <section className="ipo-expand glass-card">
        <h3>About the company</h3>
        <div className="expand-body always-open">
          {company?.about ? <p className="ipo-about">{company.about}</p> : (
            <p className="ipo-note">{company?.message || "Official business write-up is in the RHP. We do not copy unofficial IPO blogs."}</p>
          )}
          {company?.operations ? <p className="ipo-about">{company.operations}</p> : null}
          {company?.message && company?.about ? <p className="ipo-note">{company.message}</p> : null}
          {company?.rhpUrl ? (
            <p><a href={company.rhpUrl} target="_blank" rel="noreferrer">Official prospectus (NSE)</a></p>
          ) : null}
        </div>
      </section>

      {financials?.years?.length ? (
        <section className="ipo-expand glass-card">
          <h3>Financials</h3>
          <div className="expand-body always-open">
            <p className="panel-sub">Restated figures from the prospectus, shown in ₹ crore.</p>
            <FinBars years={financials.chartYears || financials.years} />
            {financials.analysis?.length ? (
              <ul className="ipo-thesis">
                {financials.analysis.map((line) => <li key={line}>{line}</li>)}
              </ul>
            ) : null}
          </div>
        </section>
      ) : null}

      {(breakdown || utilisation?.items?.length) ? (
        <section className="ipo-expand glass-card">
          <h3>Issue size & use of proceeds</h3>
          <div className="expand-body always-open">
            {breakdown ? (
              <div className="ipo-issue-split">
                <div className="ipo-kv">
                  <small>Total issue</small>
                  <strong>{breakdown.totalLabel || "—"}</strong>
                </div>
                <div className="ipo-kv">
                  <small>Fresh issue — proceeds to the company</small>
                  <strong>{breakdown.freshLabel || "—"}</strong>
                </div>
                <div className="ipo-kv">
                  <small>Offer for sale — proceeds to existing investors</small>
                  <strong>{breakdown.ofsLabel || "—"}</strong>
                </div>
              </div>
            ) : null}
            {utilisation?.items?.length ? (
              <div className="ipo-table-wrap ipo-objects-table">
                <table className="ipo-demand-table">
                  <thead>
                    <tr>
                      <th>Purpose</th>
                      <th>Amount</th>
                      <th>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {utilisation.items.map((row) => (
                      <tr key={row.purpose}>
                        <td>{row.purpose}</td>
                        <td>{row.amountLabel || "—"}</td>
                        <td>{row.pct != null ? `${row.pct}%` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {utilisation.note ? <p className="ipo-note">{utilisation.note}</p> : null}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {company?.strengths?.length ? (
        <section className="ipo-expand glass-card">
          <h3>Strengths</h3>
          <div className="expand-body always-open">
            <ul className="ipo-thesis">
              {company.strengths.map((s) => <li key={s}>{s}</li>)}
            </ul>
          </div>
        </section>
      ) : null}

      {company?.risks?.length ? (
        <section className="ipo-expand glass-card">
          <h3>Risks</h3>
          <div className="expand-body always-open">
            <ul className="risk-list">
              {company.risks.map((s) => <li key={s}>{s}</li>)}
            </ul>
            <p className="ipo-note">These titles are from the RHP risk-factor chapter. Read the full prospectus before a long-term call.</p>
          </div>
        </section>
      ) : null}

      {(company?.sector?.overview || company?.sector?.competition || company?.sector?.stand) ? (
        <section className="ipo-expand glass-card">
          <h3>Sector & competition</h3>
          <div className="expand-body always-open">
            {company.sector.overview ? <p className="ipo-about">{company.sector.overview}</p> : null}
            {company.sector.competition ? <p className="ipo-about">{company.sector.competition}</p> : null}
            {company.sector.stand ? <p className="ipo-about">{company.sector.stand}</p> : null}
            <p className="ipo-note">Industry and competitor names are from the official RHP (Credence report commissioned for the offer). Peer multiples are not invented.</p>
          </div>
        </section>
      ) : null}
    </>
  );
}
