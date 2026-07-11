"use client";

export default function InsightCards({ insights = [] }) {
  if (!insights.length) return null;

  return (
    <section id="section-insights" className="research-section research-insights glass-card">
      <header className="research-section-head">
        <div>
          <h3>AI Insights</h3>
          <p className="panel-sub">
            Analytical interpretations grounded in verified metrics only — no speculation as fact
          </p>
        </div>
      </header>
      <div className="insight-card-grid">
        {insights.map((item, i) => (
          <div
            key={i}
            className={`insight-card insight-cat-${item.category?.toLowerCase()?.replace(/\s/g, "")}`}
          >
            <div className="insight-card-top">
              <span className="insight-cat">{item.category}</span>
              <span className={item.verified ? "tag-interp" : "tag-framework"}>
                {item.verified ? "Grounded" : "Info"}
              </span>
            </div>
            <p>{item.text}</p>
            {item.grounding && <small className="panel-sub">{item.grounding}</small>}
          </div>
        ))}
      </div>
    </section>
  );
}
