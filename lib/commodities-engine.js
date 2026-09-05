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

function heatRupees(id, atrNative, usdinr) {
  const spec = SPECS[id];
  if (!spec || atrNative == null) return null;
  const mcxAtr = id === "usdinr" ? atrNative : toMcx(id, atrNative, usdinr);
  if (mcxAtr == null) return null;
  return round(1.5 * mcxAtr * spec.multiplier, 0);
}

function zoneAround(price, support, resistance, side) {
  if (price == null) return null;
  if (side === "buy") {
    const low = support != null ? Math.min(support, price) : price * 0.992;
    return { low: round(low), high: round(price) };
  }
  if (side === "sell") {
    const high = resistance != null ? Math.max(resistance, price) : price * 1.008;
    return { low: round(price), high: round(high) };
  }
  if (support != null && resistance != null) return { low: round(support), high: round(resistance) };
  return { low: round(price), high: round(price) };
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
    steps.push(`${action} 1 lot. Limit in ${fmtZone(mcxZone, "₹")} (estimate from dollar tape × USDINR — confirm MCX LTP first).`);
  } else {
    steps.push(`${action} 1 lot after you translate COMEX/NYMEX last ${native.last} onto the rupee lot. Do not fire USD ticks on MCX.`);
  }
  if (mcx.stop != null) steps.push(`Hard stop: ₹${Number(mcx.stop).toLocaleString("en-IN")} per ${spec.quote}. Not a mental note.`);
  else if (native.stop != null) steps.push(`Hard stop: ${native.stop} ${row.unit} on the dollar tape, mirrored onto the rupee lot.`);
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

function mcxSheet(row, spec, side, mcx, native, ticket) {
  const venue = row.id === "usdinr" ? "NSE F&O" : "MCX";
  const action = ticket.action;
  return {
    venue,
    product: spec.code,
    side: action,
    qty: side === "pass" ? "0 lots" : `1 lot (${spec.lot})`,
    orderType: side === "pass" ? "Do not send" : "Limit + hard SL",
    limit: side === "pass" ? "—" : fmtZone(mcx.entry, mcx.last != null ? "₹" : ""),
    stop: mcx.stop != null ? `₹${Number(mcx.stop).toLocaleString("en-IN")}` : native.stop != null ? String(native.stop) : "—",
    target: mcx.t1 != null ? `₹${Number(mcx.t1).toLocaleString("en-IN")} (book 50%)` : "—",
    when: side === "pass" ? "No new risk" : "3–15 sessions, square before delivery",
    skip: native.heat != null ? `Skip if 1-lot heat ₹${inr(native.heat)} is over 1% of equity` : "Confirm SPAN before send",
    path: `${venue} → ${spec.code} front month → ${action} 1 lot`,
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
    if (row.id === "usdinr") return v;
    const converted = toMcx(row.id, v, usdinr);
    return converted ?? v;
  };

  let side = "pass";
  let structure = "Stand aside";
  let name = `${spec?.name || row.name}: stand aside`;
  let status = "Pass";
  let reason = "SMA20 and SMA50 do not agree, or ADX is too low for a trend trade.";
  if (violent && row.id === "natgas") {
    side = "pass";
    structure = "No new gas";
    name = "NO TRADE NATURALGAS — specialist book only";
    status = "Pass";
    reason = "Natural gas gaps several percent. Default is no new lot. Do not try one lot because crude is moving.";
  } else if (price == null) {
    side = "pass";
    structure = "Confirm LTP";
    name = `NO TRADE ${spec?.code || row.mcx} — tape missed, confirm ${spec?.name || "MCX"} LTP`;
    status = "Pass";
    reason = "No live dollar print to convert. Open the Indian contract, read LTP, then rewrite this card. Do not invent a limit.";
  } else if (row.id === "usdinr" && trend === "BULLISH") {
    side = "buy";
    structure = "Importer hedge";
    name = "BUY 1 lot USDINR — rupee weakening, importers hedge";
    status = "Plan";
    reason = "USDINR trend is up (rupee weaker). This is an importer hedge, not a Nifty substitute.";
  } else if (row.id === "usdinr" && trend === "BEARISH") {
    side = "sell";
    structure = "Exporter hedge";
    name = "SELL 1 lot USDINR — rupee strengthening, exporters hedge";
    status = "Plan";
    reason = "USDINR trend is down (rupee stronger). Exporters sell dollars forward. Speculators size 1R, not the invoice.";
  } else if (trend === "BULLISH") {
    side = "buy";
    structure = `${spec.code} pullback`;
    name = `BUY 1 lot ${spec.code} — dip toward support`;
    status = "Plan";
    reason = `${row.name} composite is bullish. Buy a dip, do not chase the high of the day.`;
  } else if (trend === "BEARISH") {
    side = "sell";
    structure = `${spec.code} rally fade`;
    name = `SELL 1 lot ${spec.code} — fade into resistance`;
    status = "Plan";
    reason = `${row.name} composite is bearish. Sell a bounce, do not short a waterfall.`;
  } else if (adx != null && adx < 18) {
    side = "pass";
    structure = "Range — pass";
    name = `NO TRADE ${spec?.code || row.mcx} — ADX is low, no trend to follow`;
    status = "Pass";
    reason = `ADX ${round(adx, 1)} is below 18. Do not start a trend trade.`;
  } else {
    side = "pass";
    structure = "Mixed tape";
    name = `NO TRADE ${spec?.code || row.mcx} — wait for SMA20 / SMA50 to agree`;
    status = "Pass";
    reason = `SMA20 ${sma20 != null ? round(sma20) : "—"} vs SMA50 ${sma50 != null ? round(sma50) : "—"}. Wait for them to separate.`;
  }

  const buyZone = zoneAround(price, support, resistance, "buy");
  const sellZone = zoneAround(price, support, resistance, "sell");
  const nativeZone = side === "sell" ? sellZone : side === "buy" ? buyZone : zoneAround(price, support, resistance, "range");
  const stopLoss = side === "sell" ? nativeStopSell : side === "buy" ? nativeStopBuy : null;
  const t1 = side === "sell" ? nativeT1Sell : side === "buy" ? nativeT1Buy : null;
  const t2 = side === "sell" ? nativeT2Sell : side === "buy" ? nativeT2Buy : null;

  const mcx = {
    last: mcxLast,
    entry: nativeZone ? { low: convert(nativeZone.low), high: convert(nativeZone.high) } : null,
    stop: convert(stopLoss),
    t1: convert(t1),
    t2: convert(t2),
  };

  if (side !== "pass" && spec && mcx.entry?.low != null) {
    const limit = fmtZone(mcx.entry, mcx.last != null ? "₹" : "");
    const sl = mcx.stop != null ? ` · stop ₹${Number(mcx.stop).toLocaleString("en-IN")}` : "";
    const tag = row.id === "usdinr" ? (side === "buy" ? "importer hedge" : "exporter hedge") : side === "buy" ? "dip to support" : "fade resistance";
    name = `${side === "sell" ? "SELL" : "BUY"} 1 lot ${spec.code} — ${tag} · limit ${limit}${sl}`;
  }

  const ticket = spec
    ? ticketFor(row, spec, side, { last: price, stop: stopLoss, atrPct: pctAtr, heat }, mcx, proxy, reason)
    : { action: "NO TRADE", steps: [] };

  const fillSheet = spec ? mcxSheet(row, spec, side, mcx, { stop: stopLoss, heat }, ticket) : null;

  const tradeLine = side === "pass"
    ? `NO TRADE · ${spec?.code || row.mcx} · ATR ${pctAtr ?? "—"}%`
    : `${ticket.action} 1 lot ${spec.code} · entry ${fmtZone(mcx.entry || nativeZone, mcx.last != null ? "₹" : "")} · SL ${mcx.stop != null ? `₹${Number(mcx.stop).toLocaleString("en-IN")}` : stopLoss}`;

  const why = [
    { category: "Setup", text: `${row.name} composite is ${trend || "n/a"}. RSI ${rsi != null ? round(rsi, 1) : "—"}, ADX ${adx != null ? round(adx, 1) : "—"}, SMA20 ${sma20 != null ? round(sma20) : "—"} vs SMA50 ${sma50 != null ? round(sma50) : "—"}.` },
    heat != null ? { category: "Size", text: `1 lot ${spec.code} risks about ₹${inr(heat)} at a 1.5× ATR stop. If that is more than 1% of your book, trade the next smaller contract or skip.` } : null,
    mcxLast != null ? { category: "India", text: `Estimated ${spec.quote} = ₹${Number(mcxLast).toLocaleString("en-IN")} from the dollar tape × USDINR. MCX can print a different number — the ticket is a map, not an order.` } : { category: "India", text: "USDINR or dollar tape missing — fill on MCX / NSE LTP. Do not type a COMEX tick into the rupee ticket." },
  ].filter(Boolean);

  if (row.id === "natgas") {
    why.push({ category: "Caution", text: "Natural gas can gap several percent. Naked shorts and 'just one lot' both belong on a specialist book." });
  } else if (row.kind === "energy") {
    why.push({ category: "Caution", text: "Energy gaps on EIA inventories and geopolitics. Defined size, no averaging. Square before the 19th on MCX crude." });
  }

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
    entryZone: mcx.entry || nativeZone,
    stopLoss: mcx.stop ?? stopLoss,
    targets: { t1: mcx.t1 ?? t1, t2: mcx.t2 ?? t2 },
    heat,
    last: mcxLast ?? price,
    nativeLast: price,
    mcxLast,
    tradeLine,
    tradeTicket: ticket,
    fillSheet,
    why,
    caution: violent
      ? "Default is no trade unless this is a specialist energy book."
      : "Confirm MCX / NSE LTP and SPAN. Dollar ticks are not rupee lots.",
    invalidation: side === "pass"
      ? "Stay flat until ADX > 20 and SMA20 is on one side of SMA50."
      : side === "sell"
        ? "Flatten on a daily close above SMA20 or through the stop."
        : "Flatten on a daily close below SMA50 or through the stop.",
  });

  if ((typeof row.proxy === "string" || row.proxy?.symbol || row.proxyName) && proxy?.price != null) {
    const etfSide = trend === "BEARISH" ? "WAIT" : "BUY";
    const units = proxy.price ? Math.max(1, Math.round(5000 / proxy.price)) : null;
    const ticker = proxyCode(row);
    const etfSteps = trend === "BEARISH"
      ? [
          `Open NSE cash. Search ${ticker}. Do not BUY today — metal tape is bearish.`,
          "Existing holders: trim if this overlay is over 12% of the book.",
          "Skip if the ETF is more than 0.7% rich to NAV (check Funds desk).",
        ]
      : [
          `Open NSE cash. Search ${ticker}. Product type: CNC.`,
          `BUY ${units} units (₹5,000 example) at limit ₹${Number(proxy.price).toLocaleString("en-IN")}.`,
          `This is a 5–10% ${row.name.toLowerCase()} overlay, not a day trade and not ${spec.code}.`,
          "Skip if last is more than 0.7% above NAV.",
          trend === "BULLISH"
            ? `Add on dips toward ₹${support != null && price ? round(proxy.price * (support / price), 2) : round(proxy.price * 0.98, 2)} if the metal trend stays up.`
            : "SIP the wrapper while the metal is mixed — no lump sum.",
        ];
    plans.push({
      name: trend === "BEARISH" ? `WAIT ${ticker} — do not add the overlay` : `BUY ${ticker} CNC — rupee overlay @ ₹${Number(proxy.price).toLocaleString("en-IN")}`,
      structure: "ETF overlay",
      bias: trend === "BEARISH" ? "Bearish" : trend === "BULLISH" ? "Bullish" : "Neutral",
      action: etfSide,
      type: "ETF overlay",
      status: trend === "BEARISH" ? "Pass" : "Plan",
      holdingPeriod: "Position — months, not sessions",
      contract: ticker,
      contractName: row.proxyName,
      lotSpec: "NSE cash, CNC",
      lots: units,
      entryZone: { low: round(proxy.price * 0.995, 2), high: round(proxy.price, 2) },
      stopLoss: "Not a futures stop. Review if the overlay exceeds 12% of the book.",
      targets: { t1: "Hold as the metal overlay", t2: "Rebalance annually vs equity" },
      last: proxy.price,
      tradeLine: `${etfSide} ${ticker} · ${units} units @ ₹${Number(proxy.price).toLocaleString("en-IN")} · CNC`,
      tradeTicket: { action: etfSide, steps: etfSteps },
      fillSheet: {
        venue: "NSE cash",
        product: ticker,
        side: etfSide,
        qty: etfSide === "WAIT" ? "0 units" : `${units} units (₹5,000 example)`,
        orderType: etfSide === "WAIT" ? "Do not send" : "Limit · CNC",
        limit: `₹${Number(proxy.price).toLocaleString("en-IN")}`,
        stop: "Cap overlay at 12% of the book",
        target: "5–10% of investable assets",
        when: "Months, not sessions",
        skip: "Premium to NAV over 0.7%, or overlay already over 12%",
        path: `NSE → ${ticker} → CNC → ${etfSide}`,
      },
      why: [
        { category: "Wrapper", text: `${row.proxyName || ticker} is how an Indian demat owns ${row.name} without SPAN. TER + premium still apply.` },
        { category: "Setup", text: `Metal trend ${trend || "n/a"}. Use BeES for allocation, ${spec.code} for a defined-risk trade.` },
      ],
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
      limit: "—",
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
      "MCX rupee levels are estimates from the dollar tape × USDINR (or Gold/Silver BeES × 1000 if COMEX missed). Fill on your MCX LTP.",
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
};
