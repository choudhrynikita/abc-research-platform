/**
 * Commodities desk — specific MCX / NSE tickets from COMEX/NYMEX + USDINR.
 * Plans name the contract, lot, entry, stop and targets. Confirm MCX LTP
 * before sending — dollar futures and rupee lots are not the same print.
 *
 * If the dollar tape 403s, the desk still ships named tickets (NO TRADE /
 * confirm LTP / BeES overlay). An empty strategy list is a bug.
 */

const { fetchChart } = require("./yahoo");
const { fetchWithTimeout } = require("./fetch-utils");
const { computeIndicators, technicalSignal } = require("./indicators");
const { mapPool } = require("./async-pool");

const OZ_G = 31.1034768;

const UNIVERSE = [
  { id: "gold", symbol: "GC=F", name: "Gold", venue: "COMEX", unit: "USD/oz", proxy: "GOLDBEES.NS", proxyName: "Gold BeES", mcx: "MCX Gold Mini", kind: "metal" },
  { id: "silver", symbol: "SI=F", name: "Silver", venue: "COMEX", unit: "USD/oz", proxy: "SILVERBEES.NS", proxyName: "Silver BeES", mcx: "MCX Silver Mini", kind: "metal" },
  { id: "crude", symbol: "CL=F", name: "Crude oil (WTI)", venue: "NYMEX", unit: "USD/bbl", proxy: null, proxyName: null, mcx: "MCX Crude Oil", kind: "energy" },
  { id: "natgas", symbol: "NG=F", name: "Natural gas", venue: "NYMEX", unit: "USD/mmBtu", proxy: null, proxyName: null, mcx: "MCX Natural Gas", kind: "energy" },
  { id: "copper", symbol: "HG=F", name: "Copper", venue: "COMEX", unit: "USD/lb", proxy: null, proxyName: null, mcx: "MCX Copper", kind: "metal" },
  { id: "usdinr", symbol: "INR=X", name: "USD / INR", venue: "FX", unit: "INR per USD", proxy: null, proxyName: null, mcx: "NSE USDINR", kind: "fx" },
];

const SPECS = {
  gold: { code: "GOLDMINI", name: "MCX Gold Mini", lot: "100 g", quote: "INR / 10 g", multiplier: 10, expiry: "Front-month Gold Mini (MCX, usually the 5th)" },
  silver: { code: "SILVERM", name: "MCX Silver Mini", lot: "5 kg", quote: "INR / kg", multiplier: 5, expiry: "Front-month Silver Mini" },
  crude: { code: "CRUDEOIL", name: "MCX Crude Oil", lot: "100 barrels", quote: "INR / barrel", multiplier: 100, expiry: "Front-month Crude (MCX, typically the 19th)" },
  natgas: { code: "NATURALGAS", name: "MCX Natural Gas", lot: "1,250 mmBtu", quote: "INR / mmBtu", multiplier: 1250, expiry: "Front-month Natural Gas" },
  copper: { code: "COPPER", name: "MCX Copper", lot: "2,500 kg", quote: "INR / kg", multiplier: 2500, expiry: "Front-month Copper" },
  usdinr: { code: "USDINR", name: "NSE USDINR futures", lot: "USD 1,000", quote: "INR per USD", multiplier: 1000, expiry: "Near-month NSE USDINR" },
};

function round(n, d = 2) {
  if (n == null || !Number.isFinite(Number(n))) return null;
  return Number(Number(n).toFixed(d));
}

function inr(n) {
  if (n == null || !Number.isFinite(Number(n))) return null;
  return Math.round(Number(n)).toLocaleString("en-IN");
}

function proxyCode(row) {
  if (typeof row.proxy === "string") return row.proxy.replace(/\.NS$/i, "");
  if (row.proxy?.symbol) return String(row.proxy.symbol).replace(/\.NS$/i, "");
  if (row.proxyName) return String(row.proxyName).replace(/\s+/g, "").toUpperCase();
  return "BEES";
}

function changePct(candles) {
  if (!candles || candles.length < 2) return null;
  const a = candles[candles.length - 1]?.close;
  const b = candles[candles.length - 2]?.close;
  if (a == null || b == null || b === 0) return null;
  return round(((a - b) / b) * 100);
}

function ret(candles, days) {
  if (!candles || candles.length < 5) return null;
  const last = candles[candles.length - 1];
  if (!last?.close || !last.date) return null;
  const target = new Date(`${last.date}T00:00:00Z`);
  target.setUTCDate(target.getUTCDate() - days);
  let prior = candles[0];
  for (const c of candles) {
    if (c.date && new Date(`${c.date}T00:00:00Z`) <= target) prior = c;
  }
  if (!prior?.close) return null;
  return round(((last.close - prior.close) / prior.close) * 100);
}

function toMcx(id, usd, usdinr) {
  if (usd == null || usdinr == null) return null;
  if (id === "gold") return round(usd * usdinr * (10 / OZ_G), 0);
  if (id === "silver") return round(usd * usdinr * (1000 / OZ_G), 0);
  if (id === "crude") return round(usd * usdinr, 1);
  if (id === "natgas") return round(usd * usdinr, 2);
  if (id === "copper") return round(usd * 2.20462 * usdinr, 0);
  if (id === "usdinr") return round(usd, 4);
  return null;
}

/** Gold BeES ≈ 0.01 g/unit → 10 g ≈ ×1000. Silver BeES ≈ 1 g/unit → 1 kg ≈ ×1000. */
function beesToMcx(id, beesPrice) {
  if (beesPrice == null || !Number.isFinite(Number(beesPrice))) return null;
  if (id === "gold" || id === "silver") return round(Number(beesPrice) * 1000, 0);
  return null;
}

function atrPct(price, atr) {
  if (price == null || atr == null || price === 0) return null;
  return round((atr / price) * 100, 2);
}

function formatNative(row, value, digits = 2) {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  const n = Number(value);
  if (row.id === "usdinr") return n.toFixed(4);
  const unit = String(row.unit || "");
  if (unit.startsWith("USD/")) {
    return `$${n.toLocaleString("en-US", { maximumFractionDigits: digits })}/${unit.slice(4)}`;
  }
  return String(round(n, digits));
}

function smaGap(sma20, sma50) {
  if (sma20 == null || sma50 == null || sma50 === 0) return { dir: null, pct: null };
  const pct = round(((sma20 - sma50) / Math.abs(sma50)) * 100, 2);
  if (pct >= 0.35) return { dir: "up", pct };
  if (pct <= -0.35) return { dir: "down", pct };
  return { dir: "flat", pct };
}

function dipZone(price, atr, side) {
  if (price == null) return null;
  if (side === "buy") {
    const low = atr != null ? price - 0.8 * atr : price * 0.992;
    return { low: round(Math.min(low, price)), high: round(price) };
  }
  if (side === "sell") {
    const high = atr != null ? price + 0.8 * atr : price * 1.008;
    return { low: round(price), high: round(Math.max(high, price)) };
  }
  return { low: round(price), high: round(price) };
}

function conversionLine(row, price, usdinr, mcxLast) {
  if (price == null || usdinr == null || mcxLast == null) return null;
  if (row.id === "gold") {
    return `${formatNative(row, price)} × USDINR ${round(usdinr, 4)} × 10 / 31.1034768 = ₹${inr(mcxLast)} / 10g`;
  }
  if (row.id === "silver") {
    return `${formatNative(row, price)} × USDINR ${round(usdinr, 4)} × 1000 / 31.1034768 = ₹${inr(mcxLast)} / kg`;
  }
  if (row.id === "crude" || row.id === "natgas") {
    return `${formatNative(row, price)} × USDINR ${round(usdinr, 4)} = ₹${Number(mcxLast).toLocaleString("en-IN")} / ${row.unit.replace("USD/", "")}`;
  }
  if (row.id === "copper") {
    return `${formatNative(row, price)} × 2.20462 × USDINR ${round(usdinr, 4)} = ₹${inr(mcxLast)} / kg`;
  }
  if (row.id === "usdinr") return `NSE USDINR ≈ ${round(price, 4)} (same units)`;
  return null;
}

function beesCheckLine(row, mcxLast, beesPrice) {
  if (beesPrice == null || !Number.isFinite(Number(beesPrice))) return null;
  const fromBees = beesToMcx(row.id, beesPrice);
  const unit = row.id === "gold" ? "10g" : row.id === "silver" ? "1 kg" : "";
  const px = `₹${Number(beesPrice).toLocaleString("en-IN")}`;
  if (fromBees == null) return `${row.proxyName || "BeES"} ${px}`;
  const gap = mcxLast ? round(((fromBees - mcxLast) / mcxLast) * 100, 2) : null;
  const gapTxt = gap == null ? "" : ` (${gap > 0 ? "+" : ""}${gap}% vs COMEX × USDINR)`;
  return `${row.proxyName || "BeES"} ${px} ⇒ ${unit} ≈ ₹${inr(fromBees)}${gapTxt}`;
}

function lotNotional(id, mcxLast) {
  const spec = SPECS[id];
  if (!spec || mcxLast == null) return null;
  return `1 lot (${spec.lot}) notional ≈ ₹${inr(round(mcxLast * spec.multiplier, 0))}. SPAN is a fraction — confirm with the broker.`;
}

function decideSide(row, spec, { trend, sma20, sma50, adx, rsi, price }) {
  const sma = smaGap(sma20, sma50);
  const smaTxt = `SMA20 ${formatNative(row, sma20)} vs SMA50 ${formatNative(row, sma50)}`;
  const adxTxt = adx != null ? `ADX ${round(adx, 1)}` : "ADX n/a";
  const rsiTxt = rsi != null ? `RSI ${round(rsi, 1)}` : "RSI n/a";

  if (row.id === "natgas") {
    return {
      side: "pass",
      structure: "No new gas",
      name: "NO TRADE NATURALGAS — specialist book only",
      status: "Pass",
      reason: "Natural gas gaps several percent. Default is no new lot. Do not try one lot because crude is moving.",
      invalidation: "Stay flat unless this is a documented energy-specialist book.",
    };
  }
  if (price == null) {
    return {
      side: "pass",
      structure: "Confirm LTP",
      name: `NO TRADE ${spec.code} — tape missed, confirm ${spec.name} LTP`,
      status: "Pass",
      reason: "No live dollar print to convert. Open the Indian contract, read LTP, then rewrite this card. Do not invent a limit.",
      invalidation: "Do not invent a limit from a blank tape.",
    };
  }

  const stretchedUp = rsi != null && rsi >= 72;
  const stretchedDn = rsi != null && rsi <= 28;
  const adxOk = adx == null || adx >= 18;
  const stackedUp = sma.dir === "up" && adxOk && !stretchedUp;
  const stackedDown = sma.dir === "down" && adxOk && !stretchedDn;
  const up = stackedUp || (trend === "BULLISH" && !stretchedUp && sma.dir !== "down");
  const down = stackedDown || (trend === "BEARISH" && !stretchedDn && sma.dir !== "up");

  if (row.id === "usdinr" && up) {
    return {
      side: "buy",
      structure: "Importer hedge",
      name: "BUY 1 lot USDINR — rupee weakening, importers hedge",
      status: "Plan",
      reason: `USDINR is rising (rupee weaker). ${smaTxt}. ${adxTxt}. ${rsiTxt}. This is an importer hedge, not a Nifty substitute.`,
      invalidation: "Lift the hedge when the invoice is paid, or flatten if USDINR closes back under SMA50.",
    };
  }
  if (row.id === "usdinr" && down) {
    return {
      side: "sell",
      structure: "Exporter hedge",
      name: "SELL 1 lot USDINR — rupee strengthening, exporters hedge",
      status: "Plan",
      reason: `USDINR is falling (rupee stronger). ${smaTxt}. ${adxTxt}. ${rsiTxt}. Exporters sell dollars forward. Speculators size 1R, not the invoice.`,
      invalidation: "Lift the hedge when the receivable lands, or flatten if USDINR closes back above SMA20.",
    };
  }
  if (up) {
    return {
      side: "buy",
      structure: `${spec.code} pullback`,
      name: `BUY 1 lot ${spec.code} — dip in an uptrend`,
      status: "Plan",
      reason: `${smaTxt}${sma.pct != null ? ` (${sma.pct}% apart, already stacked up)` : ""}. ${adxTxt}. ${rsiTxt}. Buy a dip; do not chase the high of the day.`,
      invalidation: "Flatten on a daily close back under SMA50 or through the ATR stop.",
    };
  }
  if (down) {
    return {
      side: "sell",
      structure: `${spec.code} rally fade`,
      name: `SELL 1 lot ${spec.code} — fade in a downtrend`,
      status: "Plan",
      reason: `${smaTxt}${sma.pct != null ? ` (${sma.pct}% apart, already stacked down)` : ""}. ${adxTxt}. ${rsiTxt}. Sell a bounce; do not short a waterfall.`,
      invalidation: "Flatten on a daily close back above SMA20 or through the ATR stop.",
    };
  }
  if (sma.dir === "up" && stretchedUp) {
    return {
      side: "pass",
      structure: "Stretched uptrend",
      name: `NO TRADE ${spec.code} — uptrend, RSI stretched, wait for a dip`,
      status: "Pass",
      reason: `${smaTxt} is already an uptrend, but ${rsiTxt} is stretched. Wait for a dip. Do not chase.`,
      invalidation: "Re-open only if RSI backs off under 65 while SMA20 still holds above SMA50.",
    };
  }
  if (sma.dir === "down" && stretchedDn) {
    return {
      side: "pass",
      structure: "Washed-out downtrend",
      name: `NO TRADE ${spec.code} — downtrend, RSI washed out, do not short the washout`,
      status: "Pass",
      reason: `${smaTxt} is a downtrend, but ${rsiTxt} is washed out. Do not short the washout.`,
      invalidation: "Re-open a fade only if RSI bounces above 35 while SMA20 still holds under SMA50.",
    };
  }
  if (sma.dir === "flat") {
    return {
      side: "pass",
      structure: "Range — pass",
      name: `NO TRADE ${spec.code} — SMA20 and SMA50 have not separated`,
      status: "Pass",
      reason: `${smaTxt} are only ${sma.pct}% apart. That is not a trend. Do not start a ${spec.code} lot.`,
      invalidation: "Wait until SMA20 is at least 0.35% away from SMA50 and ADX is 18 or higher.",
    };
  }
  if (adx != null && adx < 18) {
    return {
      side: "pass",
      structure: "Range — pass",
      name: `NO TRADE ${spec.code} — ADX ${round(adx, 1)} is too low for a trend lot`,
      status: "Pass",
      reason: `${adxTxt} is below 18. ${smaTxt}. Treat as a range — no new trend lot.`,
      invalidation: "Wait for ADX 18 or higher with SMA20 on one side of SMA50.",
    };
  }
  return {
    side: "pass",
    structure: "Mixed tape",
    name: `NO TRADE ${spec.code} — no clean trend-follow`,
    status: "Pass",
    reason: `Composite is ${trend || "n/a"}. ${smaTxt}. ${adxTxt}. ${rsiTxt}. No clean trend-follow.`,
    invalidation: "Wait for SMA stack + ADX 18+ with RSI not stretched.",
  };
}

function heatRupees(id, atrNative, usdinr) {
  const spec = SPECS[id];
  if (!spec || atrNative == null) return null;
  const mcxAtr = id === "usdinr" ? atrNative : toMcx(id, atrNative, usdinr);
  if (mcxAtr == null) return null;
  return round(1.5 * mcxAtr * spec.multiplier, 0);
}

function fmtZone(z, prefix = "") {
  if (!z || z.low == null) return "confirm on the live tape";
  if (z.low === z.high) return `${prefix}${Number(z.low).toLocaleString("en-IN")}`;
  return `${prefix}${Number(z.low).toLocaleString("en-IN")} – ${prefix}${Number(z.high).toLocaleString("en-IN")}`;
}

function ticketFor(row, spec, side, native, mcx, proxy, reason) {
  const action = side === "sell" ? "SELL" : side === "pass" ? "NO TRADE" : "BUY";
  const mcxZone = mcx.entry;
  const steps = [];
  const venue = row.id === "usdinr" ? "NSE F&O" : "MCX";
  const ticker = proxyCode(row);
  const nativePrint = formatNative(row, native.last);
  if (side === "pass") {
    steps.push(`Do not send a new ${spec.code} order today.`);
    steps.push(reason || `Stand aside. ATR ${native.atrPct ?? "—"}% of price.`);
    steps.push(`When you do send later: ${venue} → ${spec.code} → 1 lot = ${spec.lot}. Confirm LTP, then a limit + hard SL.`);
    steps.push("If you already hold, tighten the existing stop. Do not average.");
    return { action, steps };
  }
  steps.push(`Open ${venue}. Select ${spec.code} (${spec.name}).`);
  steps.push(`Qty: 1 lot = ${spec.lot}. Quote is ${spec.quote}.`);
  steps.push(`Expiry: ${spec.expiry}. Confirm the exact contract month on the watchlist before you click.`);
  if (mcx.last != null) {
    const fx = native.usdinr != null ? ` × USDINR ${round(native.usdinr, 4)}` : "";
    steps.push(`${action} 1 lot. Limit ${fmtZone(mcxZone, "₹")} (map from ${nativePrint}${fx} — confirm MCX LTP first).`);
  } else {
    steps.push(`${action} 1 lot after you read ${spec.code} LTP. Dollar last is ${nativePrint}. Do not type a COMEX/NYMEX tick into the rupee ticket.`);
  }
  if (mcx.stop != null) steps.push(`Hard stop: ₹${Number(mcx.stop).toLocaleString("en-IN")} per ${spec.quote}. Not a mental note.`);
  else if (native.stop != null) steps.push(`Hard stop: ${formatNative(row, native.stop)} on the dollar tape, mirrored onto the rupee lot.`);
  if (mcx.t1 != null) {
    steps.push(`Book 50% at T1 ₹${Number(mcx.t1).toLocaleString("en-IN")}. Trail the rest under T2 ₹${mcx.t2 != null ? Number(mcx.t2).toLocaleString("en-IN") : "—"}.`);
  }
  if (native.heat != null) steps.push(`Heat on 1 lot at 1.5× ATR ≈ ₹${inr(native.heat)}. Skip this lot if that is over 1% of equity.`);
  steps.push(`Flatten on a daily close ${side === "sell" ? "above SMA20" : "below SMA50"} or through the stop.`);
  if (proxy?.price != null && side !== "sell") {
    steps.push(`No MCX login? BUY ${ticker} CNC around ₹${Number(proxy.price).toLocaleString("en-IN")} instead — that is an overlay, not this futures ticket.`);
  } else if (proxy?.price != null && side === "sell") {
    steps.push(`Do not add ${row.proxyName || ticker}. Trim an existing BeES overweight. Do not short the ETF unless you understand STBT.`);
  }
  return { action, steps };
}

function mcxSheet(row, spec, side, mcx, native, ticket, extra = {}) {
  const venue = row.id === "usdinr" ? "NSE F&O" : "MCX";
  const action = ticket.action;
  const pass = side === "pass";
  const rupee = mcx.last != null;
  return {
    venue,
    product: spec.code,
    side: action,
    qty: pass ? "0 lots" : `1 lot (${spec.lot})`,
    orderType: pass ? "Do not send" : "Limit + hard SL",
    limit: pass ? "Do not send" : (mcx.entry ? fmtZone(mcx.entry, rupee ? "₹" : "") : "Confirm MCX LTP"),
    stop: pass
      ? "Do not send"
      : mcx.stop != null
        ? `₹${Number(mcx.stop).toLocaleString("en-IN")}`
        : native.stop != null
          ? formatNative(row, native.stop)
          : "Confirm LTP then write the ATR stop",
    target: pass
      ? "None — no new lot"
      : mcx.t1 != null
        ? `₹${Number(mcx.t1).toLocaleString("en-IN")} (book 50%)`
        : "Confirm LTP",
    when: pass ? "No new risk" : "3–15 sessions, square before delivery",
    skip: native.heat != null ? `Skip if 1-lot heat ₹${inr(native.heat)} is over 1% of equity` : "Confirm SPAN before send",
    path: pass ? `${venue} → ${spec.code} → do not send` : `${venue} → ${spec.code} front month → ${action} 1 lot`,
    nativeLast: extra.nativeLastLabel || formatNative(row, native.last),
    usdinr: extra.usdinr != null ? String(round(extra.usdinr, 4)) : "Missing — confirm NSE USDINR",
    mcxEstimate: mcx.last != null ? `₹${inr(mcx.last)} (${spec.quote})` : "Confirm MCX LTP",
    formula: extra.formula || "Fill on MCX LTP — dollar ticks are not rupee lots",
    beesCheck: extra.beesCheck || null,
    sma: extra.sma || null,
    adxRsi: extra.adxRsi || null,
    notional: extra.notional || null,
    expiry: spec.expiry,
  };
}

function buildPlans(row, latest, trend, price, ctx = {}) {
  const spec = SPECS[row.id];
  const atr = latest?.atr ?? null;
  const support = latest?.support ?? null;
  const resistance = latest?.resistance ?? null;
  const sma20 = latest?.sma20 ?? null;
  const sma50 = latest?.sma50 ?? null;
  const adx = latest?.adx ?? null;
  const rsi = latest?.rsi ?? null;
  const usdinr = ctx.usdinr ?? null;
  const proxy = ctx.proxy && typeof ctx.proxy === "object" && ctx.proxy.price != null
    ? ctx.proxy
    : (row.proxy && typeof row.proxy === "object" ? row.proxy : null);
  const pctAtr = atrPct(price, atr);
  const violent = row.id === "natgas" || (pctAtr != null && pctAtr >= 4.5);
  const plans = [];

  const nativeStopBuy = atr != null && price != null ? round(price - 1.5 * atr) : support;
  const nativeStopSell = atr != null && price != null ? round(price + 1.5 * atr) : resistance;
  const nativeT1Buy = atr != null && price != null ? round(price + 1 * atr) : resistance;
  const nativeT2Buy = atr != null && price != null ? round(price + 2 * atr) : resistance;
  const nativeT1Sell = atr != null && price != null ? round(price - 1 * atr) : support;
  const nativeT2Sell = atr != null && price != null ? round(price - 2 * atr) : support;
  const heat = heatRupees(row.id, atr, usdinr);

  const mcxLast = toMcx(row.id, price, usdinr) ?? ctx.mcxEstimate ?? null;
  const convert = (v) => {
    if (v == null) return null;
    if (row.id === "usdinr") return round(v, 4);
    return toMcx(row.id, v, usdinr);
  };

  const fallback = {
    side: "pass",
    structure: "Stand aside",
    name: `${spec?.name || row.name}: stand aside`,
    status: "Pass",
    reason: "No Indian contract spec for this row.",
    invalidation: "Stay flat.",
  };
  const decision = spec
    ? decideSide(row, spec, { trend, sma20, sma50, adx, rsi, price })
    : fallback;
  const side = decision.side;
  const structure = decision.structure;
  let name = decision.name;
  const status = decision.status;
  const reason = decision.reason;

  const nativeZone = side === "pass" ? null : dipZone(price, atr, side);
  const stopLoss = side === "sell" ? nativeStopSell : side === "buy" ? nativeStopBuy : null;
  const t1 = side === "sell" ? nativeT1Sell : side === "buy" ? nativeT1Buy : null;
  const t2 = side === "sell" ? nativeT2Sell : side === "buy" ? nativeT2Buy : null;

  const convertedEntry = nativeZone
    ? { low: convert(nativeZone.low), high: convert(nativeZone.high) }
    : null;
  const mcx = {
    last: mcxLast,
    entry: convertedEntry && convertedEntry.low != null ? convertedEntry : null,
    stop: convert(stopLoss),
    t1: convert(t1),
    t2: convert(t2),
  };

  if (side !== "pass" && spec && mcx.entry?.low != null) {
    const limit = fmtZone(mcx.entry, mcx.last != null ? "₹" : "");
    const sl = mcx.stop != null ? ` · stop ₹${Number(mcx.stop).toLocaleString("en-IN")}` : "";
    const tag = row.id === "usdinr"
      ? (side === "buy" ? "importer hedge" : "exporter hedge")
      : side === "buy" ? "dip in uptrend" : "fade in downtrend";
    name = `${side === "sell" ? "SELL" : "BUY"} 1 lot ${spec.code} — ${tag} · limit ${limit}${sl}`;
  }

  const formula = conversionLine(row, price, usdinr, mcxLast);
  const beesLine = beesCheckLine(row, mcxLast, proxy?.price);
  const nativeLabel = formatNative(row, price);
  const sma = smaGap(sma20, sma50);
  const smaLine = sma20 != null || sma50 != null
    ? `SMA20 ${formatNative(row, sma20)} vs SMA50 ${formatNative(row, sma50)}${sma.pct != null ? ` (${sma.pct}% apart${sma.dir === "up" ? ", stacked up" : sma.dir === "down" ? ", stacked down" : ", not separated"})` : ""}`
    : null;
  const adxRsi = [adx != null ? `ADX ${round(adx, 1)}` : null, rsi != null ? `RSI ${round(rsi, 1)}` : null].filter(Boolean).join(" · ") || null;
  const notional = lotNotional(row.id, mcxLast);

  const ticket = spec
    ? ticketFor(row, spec, side, { last: price, stop: stopLoss, atrPct: pctAtr, heat, usdinr }, mcx, proxy, reason)
    : { action: "NO TRADE", steps: [] };

  const fillSheet = spec
    ? mcxSheet(row, spec, side, mcx, { last: price, stop: stopLoss, heat }, ticket, {
      nativeLastLabel: nativeLabel,
      usdinr,
      formula,
      beesCheck: beesLine,
      sma: smaLine,
      adxRsi,
      notional,
    })
    : null;

  const tradeLine = side === "pass"
    ? `NO TRADE · ${spec?.code || row.mcx} · ATR ${pctAtr ?? "—"}%`
    : `${ticket.action} 1 lot ${spec.code} · limit ${fmtZone(mcx.entry, mcx.last != null ? "₹" : "")} · SL ${mcx.stop != null ? `₹${Number(mcx.stop).toLocaleString("en-IN")}` : "confirm LTP"}`;

  const why = [
    { category: "Setup", text: `${row.name} composite is ${trend || "n/a"}. ${reason}` },
    side !== "pass" && heat != null
      ? { category: "Size", text: `1 lot ${spec.code} risks about ₹${inr(heat)} at a 1.5× ATR stop. If that is more than 1% of your book, trade the next smaller contract or skip.` }
      : null,
    formula
      ? { category: "India", text: `${formula}. MCX can print a different number — the ticket is a map, not an order.` }
      : { category: "India", text: "USDINR or dollar tape missing — fill on MCX / NSE LTP. Do not type a COMEX tick into the rupee ticket." },
    beesLine ? { category: "BeES", text: beesLine } : null,
    notional ? { category: "Notional", text: notional } : null,
  ].filter(Boolean);

  if (row.id === "natgas") {
    why.push({ category: "Caution", text: "Natural gas can gap several percent. Naked shorts and 'just one lot' both belong on a specialist book." });
  } else if (row.kind === "energy") {
    why.push({ category: "Caution", text: "Energy gaps on EIA inventories and geopolitics. Defined size, no averaging. Square before the 19th on MCX crude." });
  }

  const tapeMetrics = [
    price != null ? { label: row.venue === "FX" ? "USDINR last" : `${row.venue} last`, value: nativeLabel } : null,
    usdinr != null && row.id !== "usdinr" ? { label: "USDINR", value: String(round(usdinr, 4)) } : null,
    mcxLast != null ? { label: `MCX est. (${spec?.quote || "INR"})`, value: `₹${inr(mcxLast)}` } : null,
    proxy?.price != null ? { label: proxyCode(row), value: `₹${Number(proxy.price).toLocaleString("en-IN")}` } : null,
  ].filter(Boolean);

  plans.push({
    name,
    structure,
    bias: side === "buy" ? "Bullish" : side === "sell" ? "Bearish" : "Neutral",
    action: ticket.action,
    type: structure,
    status,
    holdingPeriod: side === "pass" ? "None — no new risk" : "3–15 sessions, square before delivery",
    contract: spec?.code,
    contractName: spec?.name,
    lotSpec: spec ? `1 lot = ${spec.lot}` : null,
    lots: side === "pass" ? 0 : 1,
    entryZone: side === "pass" ? "Do not send" : (mcx.entry || "Confirm MCX LTP"),
    stopLoss: side === "pass" ? "Do not send" : (mcx.stop ?? stopLoss ?? "Confirm LTP"),
    targets: side === "pass" ? { t1: "None — no new lot", t2: null } : { t1: mcx.t1 ?? t1, t2: mcx.t2 ?? t2 },
    heat: side === "pass" ? null : heat,
    last: mcxLast ?? price,
    nativeLast: price,
    nativeLastLabel: nativeLabel,
    usdinr,
    mcxLast,
    formula,
    beesCheck: beesLine,
    tapeMetrics,
    tradeLine,
    tradeTicket: ticket,
    fillSheet,
    why,
    caution: violent
      ? "Default is no trade unless this is a specialist energy book."
      : "Confirm MCX / NSE LTP and SPAN. Dollar ticks are not rupee lots.",
    invalidation: decision.invalidation,
  });

  if ((typeof row.proxy === "string" || row.proxy?.symbol || row.proxyName) && proxy?.price != null) {
    const ticker = proxyCode(row);
    const etfSide = side === "sell" || trend === "BEARISH" ? "WAIT" : side === "buy" ? "BUY" : "SIP";
    const units = proxy.price ? Math.max(1, Math.round(5000 / proxy.price)) : null;
    const etfBias = etfSide === "WAIT" ? "Bearish" : etfSide === "BUY" ? "Bullish" : "Neutral";
    const etfStatus = etfSide === "WAIT" ? "Pass" : "Plan";
    const px = `₹${Number(proxy.price).toLocaleString("en-IN")}`;
    const etfSteps = etfSide === "WAIT"
      ? [
          `Open NSE cash. Search ${ticker}. Do not BUY today — metal tape is ${trend === "BEARISH" ? "bearish" : "in a downtrend"}.`,
          "Existing holders: trim if this overlay is over 12% of the book.",
          "Skip if the ETF is more than 0.7% rich to NAV (check Funds desk).",
        ]
      : etfSide === "SIP"
        ? [
            `Open NSE cash. Search ${ticker}. Product type: CNC.`,
            `SIP about ${units} units (₹5,000 monthly example) near ${px}. Do not lump-sum while the metal tape is mixed.`,
            `This is a 5–10% ${row.name.toLowerCase()} overlay, not a day trade and not ${spec.code}.`,
            "Skip if last is more than 0.7% above NAV.",
          ]
        : [
            `Open NSE cash. Search ${ticker}. Product type: CNC.`,
            `BUY ${units} units (₹5,000 example) at limit ${px}.`,
            `This is a 5–10% ${row.name.toLowerCase()} overlay, not a day trade and not ${spec.code}.`,
            "Skip if last is more than 0.7% above NAV.",
            `Add on dips toward ₹${round(proxy.price * 0.98, 2)} if the metal SMA stack stays up.`,
          ];
    plans.push({
      name: etfSide === "WAIT"
        ? `WAIT ${ticker} — do not add the overlay`
        : etfSide === "SIP"
          ? `SIP ${ticker} CNC — mixed metal tape @ ${px}`
          : `BUY ${ticker} CNC — rupee overlay @ ${px}`,
      structure: "ETF overlay",
      bias: etfBias,
      action: etfSide,
      type: "ETF overlay",
      status: etfStatus,
      holdingPeriod: "Position — months, not sessions",
      contract: ticker,
      contractName: row.proxyName,
      lotSpec: "NSE cash, CNC",
      lots: etfSide === "WAIT" ? 0 : units,
      entryZone: etfSide === "WAIT" ? "Do not send" : { low: round(proxy.price * 0.995, 2), high: round(proxy.price, 2) },
      stopLoss: "Not a futures stop. Review if the overlay exceeds 12% of the book.",
      targets: { t1: "Hold as the metal overlay", t2: "Rebalance annually vs equity" },
      last: proxy.price,
      tradeLine: etfSide === "WAIT"
        ? `WAIT ${ticker} · 0 units · CNC`
        : etfSide === "SIP"
          ? `SIP ${ticker} · ~${units} units / month @ ${px} · CNC`
          : `BUY ${ticker} · ${units} units @ ${px} · CNC`,
      tradeTicket: { action: etfSide, steps: etfSteps },
      fillSheet: {
        venue: "NSE cash",
        product: ticker,
        side: etfSide,
        qty: etfSide === "WAIT" ? "0 units" : etfSide === "SIP" ? `SIP ${units} units / month (₹5,000 example)` : `${units} units (₹5,000 example)`,
        orderType: etfSide === "WAIT" ? "Do not send" : etfSide === "SIP" ? "SIP · CNC" : "Limit · CNC",
        limit: px,
        stop: "Cap overlay at 12% of the book",
        target: "5–10% of investable assets",
        when: "Months, not sessions",
        skip: "Premium to NAV over 0.7%, or overlay already over 12%",
        path: `NSE → ${ticker} → CNC → ${etfSide}`,
        beesCheck: beesLine,
        formula,
      },
      why: [
        { category: "Wrapper", text: `${row.proxyName || ticker} is how an Indian demat owns ${row.name} without SPAN. TER + premium still apply.` },
        { category: "Setup", text: `Metal tape: ${smaLine || trend || "n/a"}. Use BeES for allocation, ${spec.code} for a defined-risk trade.` },
        beesLine ? { category: "BeES", text: beesLine } : null,
      ].filter(Boolean),
      caution: null,
      invalidation: "Stop adding if the ETF premium to NAV is over 0.7% or the overlay is over 12% of equity.",
    });
  }

  return plans.map((plan, i) => ({
    ...plan,
    id: `${row.id}-${i + 1}`,
    commodityId: row.id,
    commodity: row.name,
    mcx: spec?.name || row.mcx,
    venue: row.venue,
    symbol: row.symbol,
    proxy: typeof row.proxy === "string" ? row.proxy : row.proxy?.symbol || null,
    rank: null,
  }));
}

function blankRow(row, error) {
  return {
    ...row,
    price: null,
    changePct: null,
    ret1m: null,
    ret3m: null,
    trend: null,
    rsi: null,
    atr: null,
    atrPct: null,
    adx: null,
    sma20: null,
    sma50: null,
    support: null,
    resistance: null,
    proxyQuote: row.proxy ? { symbol: row.proxy, name: row.proxyName, price: null } : null,
    latest: {},
    error: error || null,
    fetchedAt: new Date().toISOString(),
  };
}

async function loadProxy(row) {
  if (!row.proxy || typeof row.proxy !== "string") return null;
  try {
    const p = await fetchChart(row.proxy, "1d", "6mo");
    const pc = p.candles || [];
    return {
      symbol: row.proxy,
      name: row.proxyName,
      price: pc.at(-1)?.close ?? p.meta?.regularMarketPrice ?? null,
      changePct: changePct(pc),
      candles: pc,
    };
  } catch (err) {
    return { symbol: row.proxy, name: row.proxyName, price: null, error: err.message };
  }
}

async function analyzeOne(row) {
  let chart = null;
  let error = null;
  try {
    chart = await fetchChart(row.symbol, "1d", "1y");
  } catch (err) {
    error = err.message;
    if (row.id === "crude") {
      try {
        chart = await fetchChart("BZ=F", "1d", "1y");
        error = error ? `${error}; using Brent (BZ=F)` : null;
      } catch (brentErr) {
        error = `${error}; Brent also missed (${brentErr.message})`;
      }
    }
  }
  const candles = chart?.candles || [];
  const price = candles.at(-1)?.close ?? chart?.meta?.regularMarketPrice ?? null;
  const indicators = candles.length >= 30 ? computeIndicators(candles) : { latest: {} };
  const latest = indicators.latest || {};
  const trend = candles.length >= 30 ? technicalSignal(indicators) : price != null ? "NEUTRAL" : null;
  const proxyQuote = await loadProxy(row);
  return {
    ...row,
    price,
    changePct: changePct(candles),
    ret1m: ret(candles, 21),
    ret3m: ret(candles, 63),
    trend,
    rsi: latest.rsi ?? null,
    atr: latest.atr ?? null,
    atrPct: atrPct(price, latest.atr),
    adx: latest.adx ?? null,
    sma20: latest.sma20 ?? null,
    sma50: latest.sma50 ?? null,
    support: latest.support ?? null,
    resistance: latest.resistance ?? null,
    proxyQuote,
    latest,
    error,
    fetchedAt: new Date().toISOString(),
  };
}

async function fetchUsdInrFx() {
  const symbols = ["INR=X", "USDINR=X"];
  for (const symbol of symbols) {
    try {
      const chart = await fetchChart(symbol, "1d", "1y");
      const candles = chart.candles || [];
      const price = candles.at(-1)?.close ?? chart.meta?.regularMarketPrice ?? null;
      if (price) {
        return { price, candles, source: `Yahoo ${symbol}`, reference: false };
      }
    } catch {
      // try next
    }
  }
  try {
    const res = await fetchWithTimeout("https://api.frankfurter.app/latest?from=USD&to=INR", {}, 10_000);
    if (res.ok) {
      const body = await res.json();
      const price = Number(body?.rates?.INR);
      if (Number.isFinite(price) && price > 0) {
        return { price, candles: [], source: "ECB/Frankfurter reference (not NSE USDINR)", reference: true };
      }
    }
  } catch {
    // ignore
  }
  return { price: null, candles: [], source: null, reference: false };
}

function crudeRollCard(crude) {
  return {
    id: "crude-roll",
    commodityId: "crude",
    commodity: "Crude oil (WTI)",
    name: "CRUDEOIL — square before the MCX expiry (usually the 19th)",
    structure: "Calendar / roll",
    action: "WAIT",
    bias: "Neutral",
    status: "Plan",
    holdingPeriod: "Never into delivery week unless you are a hedger",
    contract: "CRUDEOIL",
    lotSpec: "1 lot = 100 barrels",
    lots: 0,
    last: crude?.mcxEstimate ?? crude?.price ?? null,
    entryZone: null,
    stopLoss: "If you are inside 3 sessions of expiry, flatten — do not roll in the last hour.",
    targets: { t1: "Be flat or in the next month before the 16th", t2: null },
    tradeLine: "WAIT / SQUARE CRUDEOIL · do not sit a speculative long into MCX expiry",
    tradeTicket: {
      action: "WAIT",
      steps: [
        "MCX crude typically expires around the 19th. Speculators square well before tender.",
        "If the directional card is BUY 1 lot CRUDEOIL, use the next-month contract if you are inside a week of expiry.",
        "Roll cost is P&L. A long in contango bleeds; do not ignore it.",
        "Natural gas: same rule, stricter. Default remains NO TRADE.",
      ],
    },
    why: [{ category: "Calendar", text: "Front-month charts hide the roll. The strategy is to not be the last speculator in the contract." }],
    invalidation: "Hedgers with documentation follow their own roll. This card is for discretionary accounts.",
    fillSheet: {
      venue: "MCX",
      product: "CRUDEOIL",
      side: "WAIT / SQUARE",
      qty: "Flatten speculative lots",
      orderType: "Square, do not add",
      limit: "Square, no new limit",
      stop: "Inside 3 sessions of expiry, flatten",
      target: "Flat or next month before the 16th",
      when: "Never into delivery week",
      skip: "Do not sit a speculative long into the 19th",
      path: "MCX → CRUDEOIL → SQUARE before expiry",
    },
    mcx: "MCX Crude Oil",
    venue: "NYMEX",
  };
}

function ratioCard(gold, silver) {
  if (!gold?.price || !silver?.price) return null;
  const ratio = round(gold.price / silver.price, 1);
  if (ratio == null) return null;
  const silverCheap = ratio >= 88;
  const goldCheap = ratio <= 72;
  const side = silverCheap ? "silver" : goldCheap ? "gold" : "pass";
  return {
    id: "gold-silver-ratio",
    commodityId: "silver",
    commodity: "Silver",
    name: silverCheap
      ? `Ratio ${ratio}: tilt to SILVERM, not more GOLDMINI`
      : goldCheap
        ? `Ratio ${ratio}: prefer GOLDMINI over silver`
        : `Ratio ${ratio}: no gold–silver spread`,
    structure: "Gold–silver ratio",
    action: side === "pass" ? "NO TRADE" : "BUY",
    bias: "Neutral",
    status: side === "pass" ? "Pass" : "Plan",
    holdingPeriod: "2–8 weeks relative-value, then review",
    contract: silverCheap ? "SILVERM" : goldCheap ? "GOLDMINI" : "RATIO",
    lotSpec: silverCheap ? "1 lot = 5 kg" : goldCheap ? "1 lot = 100 g" : "No new lot",
    lots: side === "pass" ? 0 : 1,
    last: ratio,
    entryZone: null,
    stopLoss: "Flatten the tilt if the ratio mean-reverts through 80 the other way.",
    targets: { t1: "Ratio toward 80", t2: "Do not let metals exceed 12% of the book" },
    tradeLine: silverCheap
      ? `BUY 1 lot SILVERM (or SILVERBEES CNC) · ratio ${ratio} · gold is rich vs silver`
      : goldCheap
        ? `BUY 1 lot GOLDMINI (or GOLDBEES CNC) · ratio ${ratio} · silver is rich vs gold`
        : `NO TRADE on the ratio · ${ratio} is not extreme`,
    tradeTicket: {
      action: side === "pass" ? "NO TRADE" : "BUY",
      steps: silverCheap
        ? [
            `Gold/silver ratio is ${ratio} (COMEX oz). Silver is cheap versus gold — do not add GOLDMINI first.`,
            "Prefer 1 lot SILVERM (5 kg) on a dip, or BUY SILVERBEES CNC as a 0–5% overlay.",
            "Still use the silver ATR stop on the silver card. This is a tilt, not a magnet.",
            "Invalidation: ratio back under 80 without silver catching up — flatten the extra silver.",
          ]
        : goldCheap
          ? [
              `Gold/silver ratio is ${ratio}. Gold is cheap versus silver — prefer GOLDMINI / GOLDBEES over adding silver.`,
              "Do not short silver just because the ratio is low. Size the gold card as written.",
              "Invalidation: ratio back above 80. Rebalance metals to the 5–10% gold overlay.",
            ]
          : [
              `Gold/silver ratio is ${ratio} — not extreme. Do not run a ratio trade.`,
              "Use the individual GOLDMINI and SILVERM cards. Default overlay remains Gold BeES 5–10%.",
            ],
    },
    why: [{ category: "Setup", text: `COMEX gold ${gold.price} / silver ${silver.price} = ${ratio}. Extreme is typically above 88 or below 72.` }],
    invalidation: "If ATR heat on the chosen lot is over 1% of equity, skip the ratio tilt.",
    caution: "Relative value is still a trade. Write the rupee heat from the individual metal card.",
    fillSheet: {
      venue: "MCX",
      product: silverCheap ? "SILVERM" : goldCheap ? "GOLDMINI" : "RATIO",
      side: side === "pass" ? "NO TRADE" : "BUY",
      qty: side === "pass" ? "0 lots" : "1 lot",
      orderType: side === "pass" ? "Do not send" : "Limit + hard SL from the metal card",
      limit: `Ratio ${ratio}`,
      stop: "Flatten if ratio crosses back through 80",
      target: "Ratio toward 80",
      when: "2–8 weeks",
      skip: "Not extreme (72–88), or heat over 1% of equity",
      path: side === "pass" ? "No ratio order" : `MCX → ${silverCheap ? "SILVERM" : "GOLDMINI"} → BUY 1 lot`,
    },
    mcx: silverCheap ? "MCX Silver Mini" : "MCX Gold Mini",
    venue: "COMEX",
  };
}

function quoteOf(row) {
  if (row.proxyQuote && typeof row.proxyQuote === "object") return row.proxyQuote;
  if (row.proxy && typeof row.proxy === "object" && row.proxy.price != null) return row.proxy;
  return null;
}

function assembleDesk(rows, extras = {}) {
  const usdinr = extras.usdinr ?? rows.find((r) => r.id === "usdinr")?.price ?? null;
  const warnings = [...(extras.warnings || [])];

  for (const row of rows) {
    row.usdinr = usdinr;
    const quote = quoteOf(row);
    const fromDollar = toMcx(row.id, row.price, usdinr);
    const fromBees = beesToMcx(row.id, quote?.price);
    row.mcxEstimate = fromDollar ?? fromBees;
    row.nativeLastLabel = formatNative(row, row.price);
    row.conversion = conversionLine(row, row.price, usdinr, fromDollar);
    row.beesCheck = beesCheckLine(row, row.mcxEstimate, quote?.price);
    if (!fromDollar && fromBees) {
      row.mcxEstimateSource = `${row.proxyName} × 1000 (rupee estimate, not MCX LTP)`;
    } else if (fromDollar) {
      row.mcxEstimateSource = "COMEX/NYMEX × USDINR";
    }
    if (row.error) warnings.push(`${row.mcx}: ${row.error}`);
    row.plans = buildPlans(row, row.latest || {}, row.trend, row.price, {
      usdinr,
      proxy: quote,
      mcxEstimate: row.mcxEstimate,
    });
  }

  const strategies = [];
  for (const row of rows) {
    for (const plan of row.plans || []) {
      strategies.push({ ...plan, last: plan.last ?? row.mcxEstimate ?? row.price, trend: row.trend });
    }
  }

  const gold = rows.find((r) => r.id === "gold");
  const silver = rows.find((r) => r.id === "silver");
  const crude = rows.find((r) => r.id === "crude");

  const ratio = ratioCard(gold, silver);
  if (ratio) strategies.push(ratio);
  strategies.push(crudeRollCard(crude));

  strategies.forEach((s, i) => {
    s.rank = i + 1;
  });

  const actionable = strategies.filter((s) => s.status === "Plan").length;
  const live = rows.filter((r) => r.price != null).length;

  return {
    source: extras.source || "Yahoo COMEX/NYMEX/FX + Indian ETF proxies",
    refreshedAt: new Date().toISOString(),
    usdinr,
    available: true,
    loadWarning: warnings.length ? warnings.slice(0, 6).join(" · ") : extras.loadWarning || null,
    executiveSummary: {
      gold: gold?.mcxEstimate ?? gold?.price ?? null,
      goldNative: gold?.price ?? null,
      goldNativeLabel: gold ? formatNative(gold, gold.price) : null,
      goldConversion: gold ? conversionLine(gold, gold.price, usdinr, gold.mcxEstimate) : null,
      goldBees: gold?.beesCheck ?? null,
      goldChange: gold?.changePct ?? null,
      goldTrend: gold?.trend ?? null,
      crude: crude?.mcxEstimate ?? crude?.price ?? null,
      crudeChange: crude?.changePct ?? null,
      usdinr,
      contractsLive: live,
      strategies: strategies.length,
      actionable,
    },
    contracts: rows.map((row) => {
      const { latest, plans, ...rest } = row;
      const quote = quoteOf(row);
      return {
        ...rest,
        proxy: quote,
        proxyName: row.proxyName,
      };
    }),
    strategies,
    notes: [
      "Tickets name the Indian contract (GOLDMINI, SILVERM, CRUDEOIL, NATURALGAS, COPPER, USDINR).",
      "COMEX gold is USD/oz. MCX Gold Mini is ₹/10g. Formula: USD/oz × USDINR × 10 / 31.1034768.",
      "MCX rupee levels are estimates from the dollar tape × USDINR (or Gold/Silver BeES × 1000 if COMEX missed). Fill on your MCX LTP.",
      "A commodity trend is SMA20 vs SMA50 (at least 0.35% apart) plus ADX 18+. The equity-style composite can stay Neutral while the stack is already up.",
      "1.5× ATR heat is shown in rupees for one official lot. If that exceeds 1% of equity, skip or step down a contract size.",
      "Natural gas defaults to no trade. Crude specs square before the 19th. Gold/Silver BeES is the demat overlay, not a futures substitute.",
    ],
  };
}

async function buildCommoditiesDashboard() {
  const warnings = [];
  const fxQuote = await fetchUsdInrFx();
  if (fxQuote.reference && fxQuote.price) {
    warnings.push(`USDINR from ${fxQuote.source} — confirm NSE USDINR LTP before a lot.`);
  }
  if (!fxQuote.price) warnings.push("USDINR tape missed. Rupee estimates unavailable until FX prints.");

  const fxRow = UNIVERSE.find((u) => u.id === "usdinr");
  const others = UNIVERSE.filter((u) => u.id !== "usdinr");

  let fx;
  try {
    fx = await analyzeOne(fxRow);
    if (fx.price == null && fxQuote.price) {
      fx = {
        ...fx,
        price: fxQuote.price,
        trend: fx.trend || "NEUTRAL",
        error: fx.error || (fxQuote.reference ? fxQuote.source : null),
      };
    }
  } catch (err) {
    fx = blankRow(fxRow, err.message);
    if (fxQuote.price) {
      fx.price = fxQuote.price;
      fx.trend = "NEUTRAL";
    }
  }

  const rest = await mapPool(others, 3, async (row) => {
    try {
      return await analyzeOne(row);
    } catch (err) {
      return blankRow(row, err.message);
    }
  });

  const rows = [fx, ...rest.map((row, i) => (row?.id ? row : blankRow(others[i], row?.error)))];
  return assembleDesk(rows, {
    usdinr: fx.price ?? fxQuote.price,
    warnings,
    source: fxQuote.reference
      ? "Yahoo metals/energy + ECB USDINR reference"
      : "Yahoo COMEX/NYMEX/FX + Indian ETF proxies",
  });
}

function buildCommoditiesFallback(message) {
  const rows = UNIVERSE.map((row) => blankRow(row, message));
  const desk = assembleDesk(rows, {
    usdinr: null,
    warnings: [message || "Futures quotes unavailable"],
    source: "Named tickets without live tape",
    loadWarning: message || "Futures quotes unavailable — fill sheets still name the Indian contract.",
  });
  desk.available = false;
  desk.message = message || "Commodities tape unavailable. Tickets below are stand-aside fill sheets — confirm MCX/NSE LTP before any lot.";
  return desk;
}

module.exports = {
  UNIVERSE,
  SPECS,
  buildCommoditiesDashboard,
  buildCommoditiesFallback,
  buildPlans,
  assembleDesk,
  toMcx,
  beesToMcx,
  decideSide,
  smaGap,
  dipZone,
  formatNative,
  conversionLine,
};
