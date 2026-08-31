/**
 * OI / chain snapshot and a one-lot trade ticket for strategy cards.
 * Numbers come from the verified NSE chain already attached to the plan.
 */

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function wallsFromChain(chain) {
  if (!chain || typeof chain !== "object") return null;
  const pcr = num(chain.putCallRatio);
  const callOi = num(chain.callOi);
  const putOi = num(chain.putOi);
  const callCh = num(chain.callOiChange);
  const putCh = num(chain.putOiChange);
  let quadrant = null;
  if (callCh != null && putCh != null) {
    if (putCh > 0 && callCh <= 0) quadrant = "Put build-up";
    else if (callCh > 0 && putCh <= 0) quadrant = "Call build-up";
    else if (putCh < 0 && callCh < 0) quadrant = "OI unwinding";
    else if (putCh > 0 && callCh > 0) quadrant = "Both sides adding";
  }
  const hasAny =
    pcr != null ||
    chain.maxPain != null ||
    chain.atmIv != null ||
    chain.highestCallOi != null ||
    chain.highestPutOi != null;
  if (!hasAny) return null;
  return {
    pcr,
    maxPain: num(chain.maxPain),
    atmIv: num(chain.atmIv ?? chain.impliedVolatility),
    atmStrike: num(chain.atmStrike),
    callWall: num(chain.highestCallOi),
    putWall: num(chain.highestPutOi),
    callOi,
    putOi,
    callOiChange: callCh,
    putOiChange: putCh,
    quadrant,
    expiry: chain.expiry || null,
    lotSize: num(chain.lotSize),
  };
}

function tradeTicket(strategy) {
  const legs = Array.isArray(strategy?.strikes) ? strategy.strikes : [];
  const liveLegs = legs.filter((leg) => leg && leg.action && leg.action !== "WATCH");
  if (!liveLegs.length) return null;
  const expiry = strategy.expiry || null;
  const lot = num(strategy.positionSizing?.lotSize ?? strategy.lotSize ?? strategy.payoff?.lotSize);
  const steps = liveLegs.map((leg, i) => {
    const strike = leg.strike != null ? Number(leg.strike).toLocaleString("en-IN") : "—";
    const prem = leg.premium != null ? ` @ ₹${Number(leg.premium).toFixed(2)}` : "";
    const lotBit = lot ? " 1 lot" : "";
    const exp = expiry ? ` ${expiry}` : "";
    return `${i + 1}. ${leg.action}${lotBit} ${strike} ${leg.type || ""}${exp}${prem}`.replace(/\s+/g, " ").trim();
  });
  return {
    steps,
    lot,
    expiry,
    note: "Place as one combo if the broker allows it. Confirm live LTP — these premiums are last verified prints.",
  };
}

function enrichLegs(strategy, chain) {
  const legs = Array.isArray(strategy?.strikes) ? strategy.strikes : [];
  if (!legs.length) return legs;
  const rows = chain?.strikes || [];
  return legs.map((leg) => {
    const row = rows.find((s) => Number(s.strike) === Number(leg.strike));
    const full = String(leg.type || "").toUpperCase() === "CE" ? row?.ce : row?.pe;
    return {
      ...leg,
      openInterest: leg.openInterest ?? full?.openInterest ?? null,
      iv: leg.iv ?? full?.impliedVolatility ?? full?.iv ?? null,
      expiry: leg.expiry || chain?.expiry || strategy.expiry || null,
    };
  });
}

function attachPositioning(strategy, chain) {
  if (!strategy) return strategy;
  const positioning = wallsFromChain(chain) || strategy.positioning || null;
  const strikes = enrichLegs(strategy, chain);
  const next = { ...strategy, strikes, positioning };
  const ticket = tradeTicket({ ...next, lotSize: next.lotSize ?? positioning?.lotSize });
  return { ...next, tradeTicket: ticket };
}

module.exports = { wallsFromChain, tradeTicket, attachPositioning, enrichLegs };
