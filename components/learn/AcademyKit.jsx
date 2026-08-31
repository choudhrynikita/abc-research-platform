"use client";

import { useMemo, useState } from "react";

function download(name, type, body) {
  const blob = new Blob([body], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

const FILES = {
  journal: {
    name: "abc-trade-journal.csv",
    type: "text/csv;charset=utf-8",
    label: "Trade journal (CSV)",
    body: "date,setup,direction,entry,invalidation,r_rupees,size,result_r,process_grade,emotion_1_to_5,followed_plan,notes\n",
  },
  sizing: {
    name: "abc-position-size.txt",
    type: "text/plain;charset=utf-8",
    label: "Position-size sheet",
    body: "ABC Knowledge Centre — Position size\nEquity:\n1R % of equity:\nEntry:\nInvalidation:\nSize = 1R rupees / |entry − invalidation|\nOptions: size = 1R / max loss per defined structure\n",
  },
  policy: {
    name: "abc-risk-policy.txt",
    type: "text/plain;charset=utf-8",
    label: "One-page risk policy",
    body: "ABC Knowledge Centre — One-page risk policy\nUniverse:\nForbidden products:\nSeat:\n1R as % of equity:\nMax open heat (R):\nDaily / weekly loss caps:\nDrawdown protocol:\nNo adding to losers: YES\nKill switch:\nReview cadence:\nAccountability:\nSigned:\nDate:\n",
  },
  watchlist: {
    name: "abc-watchlist.csv",
    type: "text/csv;charset=utf-8",
    label: "Watchlist (CSV)",
    body: "ticker,thesis_12_words,ruin_driver,invalidation,liquidity_note,next_event,last_review\n",
  },
};

export default function AcademyKit() {
  return (
    <div className="academy-kit glass-card">
      <div>
        <p className="academy-kicker">Field kit</p>
        <h3>Worksheets you can actually fill</h3>
        <p className="panel-sub">Original ABC templates — CSV and text, not pirated files.</p>
      </div>
      <div className="academy-kit-actions">
        {Object.entries(FILES).map(([key, file]) => (
          <button
            key={key}
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => download(file.name, file.type, file.body)}
          >
            {file.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function PositionSizer() {
  const [equity, setEquity] = useState("500000");
  const [rPct, setRPct] = useState("0.5");
  const [entry, setEntry] = useState("24100");
  const [stop, setStop] = useState("23980");
  const result = useMemo(() => {
    const eq = Number(equity);
    const pct = Number(rPct);
    const e = Number(entry);
    const s = Number(stop);
    if (![eq, pct, e, s].every(Number.isFinite) || eq <= 0 || pct <= 0) return null;
    const r = eq * (pct / 100);
    const per = Math.abs(e - s);
    if (per === 0) return null;
    return { r, size: r / per };
  }, [equity, rPct, entry, stop]);

  return (
    <form className="academy-sizer glass-card" onSubmit={(event) => event.preventDefault()}>
      <p className="academy-kicker">Position size</p>
      <h3>Size from the stop</h3>
      <div className="academy-sizer-grid">
        <label>
          Equity (₹)
          <input value={equity} onChange={(e) => setEquity(e.target.value)} inputMode="decimal" />
        </label>
        <label>
          1R %
          <input value={rPct} onChange={(e) => setRPct(e.target.value)} inputMode="decimal" />
        </label>
        <label>
          Entry
          <input value={entry} onChange={(e) => setEntry(e.target.value)} inputMode="decimal" />
        </label>
        <label>
          Invalidation
          <input value={stop} onChange={(e) => setStop(e.target.value)} inputMode="decimal" />
        </label>
      </div>
      <p className="academy-sizer-out">
        {result
          ? `1R is ₹${Math.round(result.r).toLocaleString("en-IN")} · size ${result.size.toLocaleString("en-IN", { maximumFractionDigits: 2 })} units`
          : "Enter numbers to size from the stop, not the dream."}
      </p>
    </form>
  );
}
