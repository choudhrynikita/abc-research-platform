/**
 * Shared entry gate.
 * A long is not a buy while price is still under a nearby 20-day high,
 * or after a dark cloud / bearish engulfing.
 * A short is not a sell while price is still above a nearby 20-day low,
 * or after a piercing / bullish engulfing.
 * A close already through the level is a breakout or breakdown — it stays eligible.
 * Neutral structures are not directional and are not blocked by this rule.
 */

function candleBody(c) {
  if (!c || c.open == null || c.close == null) return null;
  return {
    open: Number(c.open),
    close: Number(c.close),
    high: c.high != null ? Number(c.high) : Math.max(Number(c.open), Number(c.close)),
    bull: Number(c.close) > Number(c.open),
    bear: Number(c.close) < Number(c.open),
    mid: (Number(c.open) + Number(c.close)) / 2,
  };
}

function pairBearishReversal(prev, curr) {
  const a = candleBody(prev);
  const b = candleBody(curr);
  if (!a || !b || !a.bull || !b.bear) return null;
  const darkCloud = b.open > a.close && b.close < a.mid && b.close > a.open;
  if (darkCloud) return "Dark Cloud";
  const engulf = b.open >= a.close && b.close <= a.open;
  if (engulf) return "Bearish Engulfing";
  return null;
}

function pairBullishReversal(prev, curr) {
  const a = candleBody(prev);
  const b = candleBody(curr);
  if (!a || !b || !a.bear || !b.bull) return null;
  const piercing = b.open < a.close && b.close > a.mid && b.close < a.open;
  if (piercing) return "Piercing";
  const engulf = b.open <= a.close && b.close >= a.open;
  if (engulf) return "Bullish Engulfing";
  return null;
}

function detectRecentPattern(candles, pairFn) {
  if (!Array.isArray(candles) || candles.length < 2) return null;
  const recent = candles.slice(-4);
  for (let i = recent.length - 1; i >= 1; i -= 1) {
    const name = pairFn(recent[i - 1], recent[i]);
    if (name) return name;
  }
  return null;
}

function detectRecentBearishReversal(candles) {
  return detectRecentPattern(candles, pairBearishReversal);
}

function detectRecentBullishReversal(candles) {
  return detectRecentPattern(candles, pairBullishReversal);
}

function roomToLevel(price, level, direction) {
  if (price == null || level == null || !(price > 0)) return null;
  if (direction === "up") {
    if (!(level > price)) return null;
    return (level - price) / price;
  }
  if (!(price > level)) return null;
  return (price - level) / price;
}

function tradeBlockers({ price, resistance, reversal, buyScore }) {
  const blockers = [];
  const room = roomToLevel(price, resistance, "up");
  if (room != null) {
    const positional = buyScore >= 75;
    const minRoom = positional ? 0.08 : 0.04;
    if (room < minRoom) {
      const pct = (room * 100).toFixed(1);
      blockers.push(
        positional
          ? `Only ${pct}% to the 20-day high (₹${resistance}) — too little room for a 3–12 week buy. Needs a close above that high first.`
          : `Only ${pct}% to the 20-day high (₹${resistance}) — breakout not confirmed.`
      );
    }
  }
  if (reversal) {
    blockers.push(`${reversal} on the latest bars — bearish reversal, stand aside until it fails.`);
  }
  return blockers;
}

function minRoomForStrategy(strategy) {
  const tag = `${strategy?.expiryType || ""} ${strategy?.horizon || ""} ${strategy?.horizonLabel || ""}`;
  return /monthly/i.test(tag) ? 0.08 : 0.04;
}

function strategyEntryBlockers(strategy, ctx) {
  const bias = strategy?.bias;
  if (bias !== "Bullish" && bias !== "Bearish") return [];
  const price = ctx?.price;
  const minRoom = minRoomForStrategy(strategy);
  const positional = minRoom >= 0.08;
  const blockers = [];

  if (bias === "Bullish") {
    const room = roomToLevel(price, ctx?.resistance, "up");
    if (room != null && room < minRoom) {
      const pct = (room * 100).toFixed(1);
      blockers.push(
        positional
          ? `Only ${pct}% to the 20-day high (₹${ctx.resistance}) — too little room for a monthly bullish structure. Needs a close above that high first.`
          : `Only ${pct}% to the 20-day high (₹${ctx.resistance}) — breakout not confirmed.`
      );
    }
    const reversal = detectRecentBearishReversal(ctx?.candles);
    if (reversal) {
      blockers.push(`${reversal} on the latest bars — bearish reversal, stand aside until it fails.`);
    }
  }

  if (bias === "Bearish") {
    const room = roomToLevel(price, ctx?.support, "down");
    if (room != null && room < minRoom) {
      const pct = (room * 100).toFixed(1);
      blockers.push(
        positional
          ? `Only ${pct}% to the 20-day low (₹${ctx.support}) — too little room for a monthly bearish structure. Needs a close below that low first.`
          : `Only ${pct}% to the 20-day low (₹${ctx.support}) — breakdown not confirmed.`
      );
    }
    const reversal = detectRecentBullishReversal(ctx?.candles);
    if (reversal) {
      blockers.push(`${reversal} on the latest bars — bullish reversal, do not short into it.`);
    }
  }

  return blockers;
}

function applyStructureGate(strategy, ctx) {
  const blockers = strategyEntryBlockers(strategy, ctx);
  if (!blockers.length) return { ...strategy, entryBlockers: [] };
  const why = Array.isArray(strategy.why) ? strategy.why : [];
  const objectStyle = why.some((item) => item && typeof item === "object");
  const notes = objectStyle ? blockers.map((text) => ({ category: "Technical", text })) : blockers.slice();
  return {
    ...strategy,
    status: strategy.status === "Defer" ? "Defer" : "Wait",
    entryBlockers: blockers,
    why: [...notes, ...why].slice(0, 8),
  };
}

function prefersUnblocked(a, b) {
  const gate = (a?.entryBlockers?.length ? 1 : 0) - (b?.entryBlockers?.length ? 1 : 0);
  if (gate !== 0) return gate;
  return (b?.confidenceScore || 0) - (a?.confidenceScore || 0);
}

/**
 * IPO has no chart. Do not print a listing-gains buy on an unconfirmed book:
 * an SME issue with no published QIB split, or any book with QIB below 1x.
 */
function listingDemandBlockers({ isSme, qib }) {
  if (isSme && !qib?.available) {
    return ["SME book has no published QIB split — listing-gains buy is not confirmed."];
  }
  if (qib?.available && Number(qib.value) < 1) {
    const shown = qib.display || `${qib.value}x`;
    return [`QIB is ${shown} — below 1x, so this is not a listing-gains buy.`];
  }
  return [];
}

module.exports = {
  candleBody,
  detectRecentBearishReversal,
  detectRecentBullishReversal,
  tradeBlockers,
  strategyEntryBlockers,
  applyStructureGate,
  prefersUnblocked,
  listingDemandBlockers,
  minRoomForStrategy,
};
