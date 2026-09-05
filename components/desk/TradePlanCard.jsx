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
  if (typeof a === "string" || typeof b === "string") return a === b ? String(a) : `${a} – ${b}`;
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

function sheetRows(plan) {
  const sheet = plan.fillSheet || {};
  const stop =
    sheet.stop ??
    (typeof plan.stopLoss === "number" ? `₹${fmt(plan.stopLoss)}` : plan.stopLoss);
  const t1 =
    sheet.target ??
    (typeof plan.targets?.t1 === "number" ? `₹${fmt(plan.targets.t1)}` : plan.targets?.t1);
  const qty =
    sheet.qty ||
    (plan.action === "SIP" && plan.lots
      ? `SIP ₹${fmt(plan.lots, 0)}`
      : plan.lots != null
        ? `${plan.lots} × ${plan.lotSpec || "unit"}`
        : plan.lotSpec);
  const rows = [
    ["Where", sheet.venue || null],
    ["Product", sheet.product || plan.contract],
    ["Side", sheet.side || plan.action],
    ["Qty", qty],
    ["Order", sheet.orderType || null],
    ["Limit / NAV", sheet.limit || (typeof plan.entryZone === "string" ? plan.entryZone : zone(plan.entryZone))],
    ["Stop", stop],
    ["Target", t1],
    ["When", sheet.when || plan.holdingPeriod],
    ["Native last", sheet.nativeLast || plan.nativeLastLabel || null],
    ["USDINR", sheet.usdinr || (plan.usdinr != null ? String(plan.usdinr) : null)],
    ["MCX estimate", sheet.mcxEstimate || null],
    ["Conversion", sheet.formula || plan.formula || null],
    ["BeES check", sheet.beesCheck || plan.beesCheck || null],
    ["SMA 20 / 50", sheet.sma || null],
    ["ADX / RSI", sheet.adxRsi || null],
    ["1-lot notional", sheet.notional || null],
    ["Expiry", sheet.expiry || null],
    ["Skip if", sheet.skip || null],
    ["Broker path", sheet.path || null],
  ];
  return rows.filter(([, v]) => v != null && v !== "" && v !== "—");
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
  const rows = sheetRows(plan);

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
        <span className="fill-kicker">Instruction</span>
        <strong className="fill-action">{plan.tradeLine || `${action} ${plan.contract || ""}`}</strong>
      </div>

      <div className="strategy-metrics-row strategy-metrics-risk">
        <Metric label="Entry / limit" value={typeof plan.entryZone === "string" ? plan.entryZone : zone(plan.entryZone)} />
        <Metric label="Stop" value={stop} className="risk" />
        <Metric label="Target 1" value={t1} className="reward" />
        <Metric label="Hold" value={plan.holdingPeriod || "—"} />
        {plan.heat != null ? <Metric label="Heat / 1 lot" value={`₹${fmt(plan.heat, 0)}`} className="risk" /> : null}
      </div>

      {plan.tapeMetrics?.length ? (
        <div className="strategy-metrics-row strategy-metrics-tape">
          {plan.tapeMetrics.map((m) => (
            <Metric key={m.label} label={m.label} value={m.value} />
          ))}
        </div>
      ) : null}

      {rows.length ? (
        <div className="legs-table-wrap" onClick={(e) => e.stopPropagation()}>
          <table className="legs-table fill-sheet">
            <thead>
              <tr>
                <th>Fill sheet</th>
                <th>Do this</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([k, v]) => (
                <tr key={k}>
                  <td>{k}</td>
                  <td>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {plan.tradeTicket?.steps?.length ? (
        <div className="strategy-ticket-wrap" onClick={(e) => e.stopPropagation()}>
          <small>How to put it on</small>
          <ol className="strategy-ticket">
            {plan.tradeTicket.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      ) : null}

      {t2 ? <p className="panel-sub">Target 2 / management: {t2}</p> : null}

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
