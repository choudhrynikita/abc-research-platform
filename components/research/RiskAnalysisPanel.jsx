"use client";

export default function RiskAnalysisPanel({ risk }) {
  if (!risk) {
    return (
      <section id="section-risk" className="research-section glass-card muted-section">
        <h3>Risk Analysis</h3>
        <p className="metric-na">Data Unavailable</p>
      </section>
    );
  }

  return (
    <section id="section-risk" className="research-section glass-card">
      <header className="research-section-head">
        <div>
          <h3>Risk Analysis</h3>
          <p className="panel-sub">
            Factual risks cite verified metrics; framework items are generic categories — not invented events
          </p>
        </div>
      </header>

      <div className="risk-columns">
        <div>
          <h4>Verified / Metric-Based</h4>
          {(risk.factualRisks || []).length ? (
            <ul className="risk-list-structured">
              {risk.factualRisks.map((r, i) => (
                <li key={i}>
                  <span className="tag-fact">{r.category || "Fact"}</span>
                  <p>{r.text}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="panel-sub">No metric-based risks flagged from available verified data.</p>
          )}
        </div>

        <div>
          <h4>Analytical Interpretations</h4>
          {(risk.analyticalRisks || []).length ? (
            <ul className="risk-list-structured">
              {risk.analyticalRisks.map((r, i) => (
                <li key={i}>
                  <span className="tag-interp">{r.category || "Interpretation"}</span>
                  <p>{r.text}</p>
                  {r.inputs?.length > 0 && (
                    <small className="panel-sub">Inputs: {r.inputs.join(", ")}</small>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="panel-sub">No additional analytical risk flags.</p>
          )}
        </div>

        <div>
          <h4>Framework Categories</h4>
          <ul className="risk-list-structured">
            {(risk.frameworkRisks || []).map((r, i) => (
              <li key={i}>
                <span className="tag-framework">{r.category}</span>
                <p>{r.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="panel-sub">{risk.note}</p>
    </section>
  );
}
