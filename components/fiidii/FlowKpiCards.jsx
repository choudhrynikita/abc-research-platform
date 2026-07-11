"use client";

import { useEffect, useMemo, useState } from "react";

const PERIODS = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
];

const DATA_UNAVAILABLE = "Data Unavailable";

const METRIC_HELP = {
  inflow: {
    title: "Inflow (Buy Value)",
    definition: "Total value of equities purchased by the investor category during the selected period.",
    formula: "Σ NSE buyValue across verified sessions in the window",
    interpretation: "Higher inflow indicates stronger institutional demand for cash equities.",
    importance: "Tracks fresh capital deployment into the market.",
  },
  outflow: {
    title: "Outflow (Sell Value)",
    definition: "Total value of equities sold by the investor category during the selected period.",
    formula: "Σ NSE sellValue across verified sessions in the window",
    interpretation: "Elevated outflow can signal risk reduction or profit-taking.",
    importance: "Measures institutional supply into the market.",
  },
  net: {
    title: "Net Flow",
    definition: "Net institutional activity: buy value minus sell value for the category.",
    formula: "Σ NSE netValue across verified sessions in the window",
    interpretation: "Positive = net buyer; negative = net seller.",
    importance: "Primary signal of institutional participation direction.",
  },
};

function MetricHelp({ metricKey }) {
  const help = METRIC_HELP[metricKey];
  if (!help) return null;
  const tip = [
    help.definition,
    help.formula ? `Formula: ${help.formula}` : null,
    help.interpretation ? `Interpretation: ${help.interpretation}` : null,
    help.importance ? `Why it matters: ${help.importance}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <span className="metric-info" title={tip} aria-label={help.title}>
      i
    </span>
  );
}

function formatCrClient(value, { signed = false } = {}) {
  if (value == null || Number.isNaN(Number(value)) || !Number.isFinite(Number(value))) return null;
  const n = Number(value);
  const abs = Math.abs(n);
  const body = abs.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
  });
  if (n < 0) return `₹ -${body} Cr`;
  if (signed && n > 0) return `₹ +${body} Cr`;
  return `₹ ${body} Cr`;
}

function FlowValue({ metric, signed = false }) {
  const available = metric?.available === true && metric?.value != null && Number.isFinite(Number(metric.value));
  if (!available) {
    return (
      <strong className="flow-value metric-na" title={metric?.reason || "Source does not provide this information"}>
        {DATA_UNAVAILABLE}
      </strong>
    );
  }
  const n = Number(metric.value);
  const cls = n > 0 ? "up" : n < 0 ? "down" : "flat";
  const text = metric.display || formatCrClient(n, { signed }) || DATA_UNAVAILABLE;
  const arrow = n > 0 ? "▲" : n < 0 ? "▼" : "●";
  return (
    <strong className={`flow-value ${cls}`}>
      <span className="flow-arrow" aria-hidden>
        {arrow}
      </span>
      {text}
    </strong>
  );
}

function FlowMetricCard({ label, metricKey, metric, signed = false, accent }) {
  return (
    <div className={`flow-metric-card ${accent || ""}`}>
      <div className="flow-metric-label">
        <small>{label}</small>
        <MetricHelp metricKey={metricKey} />
      </div>
      <FlowValue metric={metric} signed={signed} />
    </div>
  );
}

function CategoryPanel({ title, subtitle, flow, change, accent }) {
  return (
    <article className={`flow-category-panel glass-card ${accent}`}>
      <header className="flow-category-head">
        <div>
          <h4>{title}</h4>
          {subtitle && <p className="panel-sub">{subtitle}</p>}
        </div>
        {change?.available && (
          <div className={`flow-change-pill ${change.value >= 0 ? "up" : "down"}`} title="Change vs prior comparable window (verified history only)">
            <span>vs prior</span>
            <strong>
              {change.display || formatCrClient(change.value, { signed: true }) || DATA_UNAVAILABLE}
            </strong>
            {change.pctDisplay && change.pctDisplay !== DATA_UNAVAILABLE && (
              <small>{change.pctDisplay}</small>
            )}
          </div>
        )}
      </header>
      <div className="flow-metric-row">
        <FlowMetricCard label="Inflow" metricKey="inflow" metric={flow?.inflow} />
        <FlowMetricCard label="Outflow" metricKey="outflow" metric={flow?.outflow} />
        <FlowMetricCard label="Net Flow" metricKey="net" metric={flow?.net} signed accent="net" />
      </div>
    </article>
  );
}

/**
 * Primary FII/DII period switcher — Daily | Weekly | Monthly
 * Instant client-side switch using precomputed period panels from the API.
 */
export default function FlowKpiCards({ periods, glossary, onPeriodChange, defaultPeriod = "daily" }) {
  const [period, setPeriod] = useState(defaultPeriod);
  const [animKey, setAnimKey] = useState(0);

  const active = useMemo(() => periods?.[period] || null, [periods, period]);

  useEffect(() => {
    if (onPeriodChange) onPeriodChange(period);
  }, [period, onPeriodChange]);

  if (!periods) {
    return (
      <section className="flow-period-dashboard glass-card">
        <p className="metric-na">{DATA_UNAVAILABLE}</p>
        <p className="panel-sub">Awaiting latest market data from NSE India.</p>
      </section>
    );
  }

  const switchPeriod = (id) => {
    if (id === period) return;
    setPeriod(id);
    setAnimKey((k) => k + 1);
  };

  return (
    <section className="flow-period-dashboard">
      <div className="flow-period-toolbar glass-card">
        <div className="flow-period-intro">
          <h3>Institutional Cash Market Flows</h3>
          <p className="panel-sub">
            Switch period to view verified Inflow, Outflow, and Net Flow — never estimated
          </p>
        </div>
        <div className="period-segment" role="tablist" aria-label="Flow period">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={period === p.id}
              className={`period-seg-btn${period === p.id ? " active" : ""}`}
              onClick={() => switchPeriod(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div key={animKey} className="flow-period-body flow-fade-in">
        {!active?.available ? (
          <div className="flow-period-empty glass-card">
            <p className="metric-na">{DATA_UNAVAILABLE}</p>
            <p className="panel-sub">
              {active?.message || "Awaiting latest market data for this period."}
            </p>
          </div>
        ) : (
          <>
            <div className="flow-period-meta glass-card">
              <div>
                <small>Period</small>
                <strong>{active.label}</strong>
              </div>
              <div>
                <small>As of</small>
                <strong>{active.asOf || DATA_UNAVAILABLE}</strong>
              </div>
              <div>
                <small>Sessions used</small>
                <strong>
                  {active.sessionsUsed}
                  {active.windowSize ? ` / ${active.windowSize}` : ""}
                </strong>
              </div>
              <div>
                <small>Range</small>
                <strong>
                  {active.fromDate && active.toDate && active.fromDate !== active.toDate
                    ? `${active.fromDate} → ${active.toDate}`
                    : active.asOf || DATA_UNAVAILABLE}
                </strong>
              </div>
              <div className="flow-period-note">
                <small>Method</small>
                <strong title={active.note}>{active.note || active.description}</strong>
              </div>
            </div>

            <div className="flow-category-grid">
              <CategoryPanel
                title="Foreign Institutional Investors (FII / FPI)"
                subtitle="NSE cash market FII/FPI activity"
                flow={active.fii}
                change={active.change?.fiiNet}
                accent="fii"
              />
              <CategoryPanel
                title="Domestic Institutional Investors (DII)"
                subtitle="NSE cash market DII activity"
                flow={active.dii}
                change={active.change?.diiNet}
                accent="dii"
              />
            </div>

            <article className="flow-combined-panel glass-card">
              <header className="flow-category-head">
                <div>
                  <h4>Combined Institutional (FII + DII)</h4>
                  <p className="panel-sub">
                    Only shown when both FII and DII values are verified for the window
                  </p>
                </div>
                {active.change?.combinedNet?.available && (
                  <div
                    className={`flow-change-pill ${active.change.combinedNet.value >= 0 ? "up" : "down"}`}
                  >
                    <span>vs prior</span>
                    <strong>{active.change.combinedNet.display}</strong>
                  </div>
                )}
              </header>
              <div className="flow-metric-row three">
                <FlowMetricCard label="Inflow" metricKey="inflow" metric={active.combined?.inflow} />
                <FlowMetricCard label="Outflow" metricKey="outflow" metric={active.combined?.outflow} />
                <FlowMetricCard
                  label="Net Flow"
                  metricKey="net"
                  metric={active.combined?.net}
                  signed
                  accent="net"
                />
              </div>
            </article>

            {glossary && (
              <details className="flow-glossary glass-card">
                <summary>Metric definitions (for investors)</summary>
                <div className="flow-glossary-grid">
                  {Object.entries(glossary).map(([key, g]) => (
                    <div key={key}>
                      <h5>{g.label}</h5>
                      <p>{g.definition}</p>
                      {g.formula && <p className="panel-sub">Formula: {g.formula}</p>}
                      {g.interpretation && <p className="panel-sub">{g.interpretation}</p>}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </>
        )}
      </div>
    </section>
  );
}

export { formatCrClient, DATA_UNAVAILABLE, PERIODS };
