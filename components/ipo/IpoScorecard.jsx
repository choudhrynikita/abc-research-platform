"use client";

export default function IpoScorecard({ scorecard }) {
  if (!scorecard?.dimensions?.length) return null;

  return (
    <section className="ipo-scorecard glass-card">
      <h3>Investment Scorecard</h3>
      <p className="panel-sub">{scorecard.methodology}</p>
      {scorecard.overallScore != null && (
        <div className="ipo-overall-score">
          <span>Overall</span>
          <strong>{scorecard.overallScore}</strong>
        </div>
      )}
      <div className="scorecard-bars">
        {scorecard.dimensions.map((d) => (
          <div key={d.key} className="scorecard-row">
            <div className="scorecard-label">
              <span>{d.label}</span>
              <strong>{d.available && d.score != null ? d.score : "—"}</strong>
            </div>
            <div className="gauge-bar">
              <div
                className="gauge-fill"
                style={{
                  width: d.available && d.score != null ? `${d.score}%` : "0%",
                  opacity: d.available ? 1 : 0.25,
                }}
              />
            </div>
            {!d.available && <small className="score-note">{d.note}</small>}
          </div>
        ))}
      </div>
    </section>
  );
}