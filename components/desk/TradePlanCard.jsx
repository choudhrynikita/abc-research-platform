"use client";

function fmt(v, d = 2) {
  if (v == null || Number.isNaN(Number(v))) return "—";
  if (typeof v === "string") return v;
  return Number(v).toLocaleString("en-IN", { maximumFractionDigits: d });
}

function zone(z, prefix = "₹") {
  if (!z) return "—";
  if (typeof z === "string") return z;
  if (z.low == null && z.high == null) return "—";
  const a = z.low ?? z.high;
  const b = z.high ?? z.low;
  if (a === b) return `${prefix}${fmt(a)}`;
  return `${prefix}${fmt(a)} – ${prefix}${fmt(b)}`;
}

function statusClass(status, action) {
  if (status === "Pass" || action === "WAIT" || action === "NO TRADE") return "defer";
  if (action === "SELL") return "wait";
  if (action === "SIP") return "planning";
  return "active";
}

function Metric({ label, value, className = "" }) {
  return (
    <div>
      <small>{label}</small>
      <strong className={className}>{value}</strong>
    </div>
  );
}

export default function TradePlanCard({ plan, selected, onSelect }) {
  if (!plan) return null;
  const action = plan.action || plan.tradeTicket?.action || "PLAN";
  const stop =
    plan.stopLoss == null
      ? "—"
      : typeof plan.stopLoss === "number"
        ? `₹${fmt(plan.stopLoss)}`
        : plan.stopLoss;
  const t1 =
    plan.targets?.t1 == null
      ? "—"
      : typeof plan.targets.t1 === "number"
        ? `₹${fmt(plan.targets.t1)}`
        : plan.targets.t1;
  const t2 =
    plan.targets?.t2 == null
      ? null
      : typeof plan.targets.t2 === "number"
        ? `₹${fmt(plan.targets.t2)}`
        : plan.targets.t2;
  const sizeLabel =
    plan.lots != null && plan.contract && plan.action && plan.action !== "WAIT" && plan.action !== "NO TRADE"
      ? plan.action === "SIP"
        ? plan.tradeLine
        : `${action} ${plan.lots} ${plan.lotSpec?.includes("lot") ? "lot" : plan.lotSpec || "unit"} ${plan.contract}`
      : `${action}${plan.contract ? ` · ${plan.contract}` : ""}`;

  return (
    <article
      className={`strategy-card glass-card trade-plan-card${selected ? " selected" : ""}`}
      onClick={() => onSelect?.(plan)}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={onSelect ? (e) => e.key === "Enter" && onSelect(plan) : undefined}
    >
      <header className="strategy-card-head">
        <div className="strategy-rank">#{plan.rank ?? "—"}</div>
        <div className="strategy-identity">
          <h4>{plan.name}</h4>
          <div className="strategy-identity-pills">
            {plan.structure ? <span className="strategy-horizon-pill">{plan.structure}</span> : null}
            {plan.contract ? <span className="strategy-horizon-pill">{plan.contract}</span> : null}
            {plan.lotSpec ? <span className="strategy-horizon-pill">{plan.lotSpec}</span> : null}
          </div>
        </div>
        <span className={`strategy-status ${statusClass(plan.status, action)}`}>
          {action}
          {plan.bias ? ` · ${plan.bias}` : ""}
        </span>
      </header>

      <div className="trade-plan-fill">
        <span className="fill-kicker">Proper trade</span>
        <strong className="fill-action">{plan.tradeLine || sizeLabel}</strong>
      </div>

      <div className="strategy-metrics-row strategy-metrics-risk">
        <Metric label="Entry" value={zone(plan.entryZone)} />
        <Metric label="Stop / rule" value={stop} className="risk" />
        <Metric label="T1" value={t1} className="reward" />
        <Metric label="Hold" value={plan.holdingPeriod || "—"} />
        {plan.heat != null ? <Metric label="Heat / 1 lot" value={`₹${fmt(plan.heat, 0)}`} className="risk" /> : null}
      </div>

      {plan.tradeTicket?.steps?.length ? (
        <div className="strategy-ticket-wrap">
          <small>Do this, in order</small>
          <ol className="strategy-ticket">
            {plan.tradeTicket.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      ) : null}

      {t2 ? <p className="panel-sub">T2 / management: {t2}</p> : null}

      {plan.why?.length ? (
        <ul className="why-rationale">
          {plan.why.map((w) => (
            <li key={w.text}>
              {w.category ? (
                <span className={`why-tag why-${String(w.category).toLowerCase()}`}>{w.category}</span>
              ) : null}
              <span>{w.text}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {plan.invalidation ? (
        <p className="trade-plan-invalidation">
          <strong>Invalidation.</strong> {plan.invalidation}
        </p>
      ) : null}
      {plan.caution ? <p className="strategy-defer-note">{plan.caution}</p> : null}
    </article>
  );
}
