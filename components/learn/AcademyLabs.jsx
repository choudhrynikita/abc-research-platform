"use client";

import { useMemo, useState } from "react";

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function PayoffLab() {
  const [spot, setSpot] = useState("24100");
  const [strike, setStrike] = useState("24100");
  const [premium, setPremium] = useState("62.5");
  const [side, setSide] = useState("CE");
  const [lots, setLots] = useState("1");
  const [lot, setLot] = useState("65");
  const [expirySpot, setExpirySpot] = useState("24300");

  const out = useMemo(() => {
    const S = num(spot);
    const K = num(strike);
    const p = num(premium);
    const n = Math.max(1, num(lots, 1));
    const ls = Math.max(1, num(lot, 65));
    const E = num(expirySpot);
    const intrinsic = side === "CE" ? Math.max(E - K, 0) : Math.max(K - E, 0);
    const plUnit = intrinsic - p;
    const be = side === "CE" ? K + p : K - p;
    return {
      intrinsic,
      plUnit,
      plLot: plUnit * ls * n,
      debit: p * ls * n,
      be,
      S,
    };
  }, [spot, strike, premium, side, lots, lot, expirySpot]);

  return (
    <div className="academy-lab">
      <p className="academy-kicker">Lab</p>
      <h4>Expiry payoff — long option</h4>
      <p className="panel-sub">Change the numbers. This is a long {side} only — add the short wing on paper if you are spreading.</p>
      <div className="academy-lab-grid">
        <label>Spot now<input value={spot} onChange={(e) => setSpot(e.target.value)} inputMode="decimal" /></label>
        <label>Strike<input value={strike} onChange={(e) => setStrike(e.target.value)} inputMode="decimal" /></label>
        <label>Premium paid<input value={premium} onChange={(e) => setPremium(e.target.value)} inputMode="decimal" /></label>
        <label>
          Type
          <select value={side} onChange={(e) => setSide(e.target.value)}>
            <option value="CE">Call (CE)</option>
            <option value="PE">Put (PE)</option>
          </select>
        </label>
        <label>Lots<input value={lots} onChange={(e) => setLots(e.target.value)} inputMode="numeric" /></label>
        <label>Lot size<input value={lot} onChange={(e) => setLot(e.target.value)} inputMode="numeric" /></label>
        <label>Spot at expiry<input value={expirySpot} onChange={(e) => setExpirySpot(e.target.value)} inputMode="decimal" /></label>
      </div>
      <ul className="academy-lab-out">
        <li>Break-even at expiry: <strong>{out.be.toLocaleString("en-IN", { maximumFractionDigits: 1 })}</strong></li>
        <li>Intrinsic at your expiry spot: <strong>₹{out.intrinsic.toLocaleString("en-IN", { maximumFractionDigits: 1 })}</strong></li>
        <li>P/L per unit: <strong>{out.plUnit >= 0 ? "+" : ""}{out.plUnit.toLocaleString("en-IN", { maximumFractionDigits: 1 })}</strong></li>
        <li>P/L for the book: <strong>{out.plLot >= 0 ? "+" : ""}₹{Math.round(out.plLot).toLocaleString("en-IN")}</strong></li>
        <li>Debit at entry: <strong>₹{Math.round(out.debit).toLocaleString("en-IN")}</strong></li>
      </ul>
    </div>
  );
}

export function SizerLab() {
  const [equity, setEquity] = useState("500000");
  const [rPct, setRPct] = useState("0.5");
  const [entry, setEntry] = useState("24100");
  const [stop, setStop] = useState("23980");
  const [maxLoss, setMaxLoss] = useState("");

  const result = useMemo(() => {
    const eq = num(equity);
    const pct = num(rPct);
    if (eq <= 0 || pct <= 0) return null;
    const r = eq * (pct / 100);
    const defined = num(maxLoss);
    if (defined > 0) {
      return { r, label: "spreads", size: r / defined, unit: "lots (max loss per lot)" };
    }
    const per = Math.abs(num(entry) - num(stop));
    if (per === 0) return null;
    return { r, label: "cash / futures points", size: r / per, unit: "units" };
  }, [equity, rPct, entry, stop, maxLoss]);

  return (
    <div className="academy-lab">
      <p className="academy-kicker">Lab</p>
      <h4>Size from 1R</h4>
      <div className="academy-lab-grid">
        <label>Equity ₹<input value={equity} onChange={(e) => setEquity(e.target.value)} inputMode="decimal" /></label>
        <label>1R %<input value={rPct} onChange={(e) => setRPct(e.target.value)} inputMode="decimal" /></label>
        <label>Entry<input value={entry} onChange={(e) => setEntry(e.target.value)} inputMode="decimal" /></label>
        <label>Invalidation<input value={stop} onChange={(e) => setStop(e.target.value)} inputMode="decimal" /></label>
        <label>Options: max loss ₹ / lot<input value={maxLoss} onChange={(e) => setMaxLoss(e.target.value)} inputMode="decimal" placeholder="leave blank for cash" /></label>
      </div>
      <p className="academy-lab-out">
        {result
          ? `1R is ₹${Math.round(result.r).toLocaleString("en-IN")} · size ${result.size.toLocaleString("en-IN", { maximumFractionDigits: 2 })} ${result.unit}`
          : "Fill equity and 1R."}
      </p>
    </div>
  );
}

export default function AcademyLab({ name }) {
  if (name === "payoff") return <PayoffLab />;
  if (name === "sizer") return <SizerLab />;
  return null;
}
