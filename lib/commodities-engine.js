/**
 * Commodities desk — specific MCX / NSE tickets from COMEX/NYMEX + USDINR.
 * Plans name the contract, lot, entry, stop and targets. Confirm MCX LTP
 * before sending — dollar futures and rupee lots are not the same print.
 */

const { fetchChart } = require("./yahoo");
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

function ticketFor(row, spec, side, native, mcx, proxy) {
  const action = side === "sell" ? "SELL" : side === "pass" ? "NO TRADE" : "BUY";
  const mcxZone = mcx.entry;
  const steps = [];
  if (side === "pass") {
    steps.push(`Do not open a new ${spec.name} position today.`);
    steps.push(`ATR is ${native.atrPct ?? "—"}% of price — too violent for a standard 1-lot book.`);
    steps.push("If you already hold, tighten the existing stop. Do not average.");
    return { action, steps };
  }
  steps.push(`${action} 1 lot ${spec.code} (${spec.name}, ${spec.lot}). Quote is ${spec.quote}.`);
  steps.push(`Expiry: ${spec.expiry}. Confirm the exact contract on the MCX / NSE watchlist before you click.`);
  if (mcx.last != null) {
    steps.push(`Place in ${fmtZone(mcxZone, "₹")} (MCX estimate from COMEX × USDINR — confirm LTP).`);
  } else {
    steps.push(`COMEX/NYMEX last ${native.last}. Translate to the rupee lot on your terminal; do not fire USD ticks on MCX.`);
  }
  if (mcx.stop != null) steps.push(`Stop-loss: ₹${Number(mcx.stop).toLocaleString("en-IN")} (${spec.quote}). Hard stop, not a mental note.`);
  else if (native.stop != null) steps.push(`Stop-loss: ${native.stop} ${row.unit} on the dollar tape, mirrored onto the rupee lot.`);
  if (mcx.t1 != null) {
    steps.push(`Book 50% at T1 ₹${Number(mcx.t1).toLocaleString("en-IN")}. Trail the rest under T2 ₹${mcx.t2 != null ? Number(mcx.t2).toLocaleString("en-IN") : "—"}.`);
  }
  if (native.heat != null) steps.push(`Heat on 1 lot at 1.5× ATR ≈ ₹${inr(native.heat)}. Size so this is ≤ 1% of equity.`);
  steps.push(`Invalidation: daily close ${side === "sell" ? "above SMA20" : "below SMA50"} or a close through the stop — flatten, do not negotiate.`);
  if (proxy?.price != null && side !== "sell") {
    steps.push(`Cash wrapper: BUY ${row.proxyName} (${row.proxy.replace(".NS", "")}) on NSE CNC around ₹${Number(proxy.price).toLocaleString("en-IN")} if you do not have an MCX login.`);
  } else if (proxy?.price != null && side === "sell") {
    steps.push(`Cash wrapper: do not add ${row.proxyName}. Trim an existing BeES overweight; do not short the ETF unless you understand STBT.`);
  }
  return { action, steps };
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
  const proxy = ctx.proxy ?? null;
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

  const mcxLast = toMcx(row.id, price, usdinr);
  const convert = (v) => (row.id === "usdinr" ? v : toMcx(row.id, v, usdinr));

  let side = "pass";
  let structure = "Stand aside";
  let name = `${spec?.name || row.name}: stand aside`;
  let status = "Pass";
  if (violent && row.id === "natgas") {
    side = "pass";
    structure = "No new gas";
    name = "NO TRADE NATURALGAS — specialist book only";
    status = "Pass";
  } else if (trend === "BULLISH" && price != null) {
    side = "buy";
    structure = "Buy pullback";
    name = `BUY 1 lot ${spec.code} — dip toward support`;
    status = "Plan";
  } else if (trend === "BEARISH" && price != null) {
    side = "sell";
    structure = "Sell rally";
    name = `SELL 1 lot ${spec.code} — fade into resistance`;
    status = "Plan";
  } else if (price != null && adx != null && adx < 18) {
    side = "pass";
    structure = "Range — pass";
    name = `NO TRADE ${spec?.code || row.mcx} — ADX is low, no trend to follow`;
    status = "Pass";
  } else if (price != null) {
    side = "pass";
    structure = "Mixed tape";
    name = `NO TRADE ${spec?.code || row.mcx} — wait for SMA20 / SMA50 to agree`;
    status = "Pass";
  }

  const buyZone = zoneAround(price, support, resistance, "buy");
  const sellZone = zoneAround(price, support, resistance, "sell");
  const nativeZone = side === "sell" ? sellZone : side === "buy" ? buyZone : zoneAround(price, support, resistance, "range");
  const stopLoss = side === "sell" ? nativeStopSell : side === "buy" ? nativeStopBuy : null;
  const t1 = side === "sell" ? nativeT1Sell : side === "buy" ? nativeT1Buy : null;
  const t2 = side === "sell" ? nativeT2Sell : side === "buy" ? nativeT2Buy : null;

  const mcx = {
    last: mcxLast,
    entry: nativeZone ? { low: convert(nativeZone.low) ?? nativeZone.low, high: convert(nativeZone.high) ?? nativeZone.high } : null,
    stop: convert(stopLoss),
    t1: convert(t1),
    t2: convert(t2),
  };

  const ticket = spec
    ? ticketFor(
        row,
        spec,
        side,
        { last: price, stop: stopLoss, atrPct: pctAtr, heat },
        mcx,
        proxy
      )
    : { action: "NO TRADE", steps: [] };

  const tradeLine = side === "pass"
    ? `NO TRADE · ${spec?.code || row.mcx} · ATR ${pctAtr ?? "—"}%`
    : `${ticket.action} 1 lot ${spec.code} · entry ${fmtZone(mcx.entry || nativeZone, mcx.last != null ? "₹" : "")} · SL ${mcx.stop != null ? `₹${Number(mcx.stop).toLocaleString("en-IN")}` : stopLoss}`;

  const why = [
    { category: "Setup", text: `${row.name} composite is ${trend || "n/a"}. RSI ${rsi != null ? round(rsi, 1) : "—"}, ADX ${adx != null ? round(adx, 1) : "—"}, SMA20 ${sma20 != null ? round(sma20) : "—"} vs SMA50 ${sma50 != null ? round(sma50) : "—"}.` },
    heat != null ? { category: "Size", text: `1 lot ${spec.code} risks about ₹${inr(heat)} at a 1.5× ATR stop. If that is more than 1% of your book, trade the next smaller contract or skip.` } : null,
    mcxLast != null ? { category: "India", text: `Estimated ${spec.quote} = ₹${Number(mcxLast).toLocaleString("en-IN")} from the dollar tape × USDINR. MCX can print a different number — the ticket is a map, not an order.` } : { category: "India", text: "USDINR missing — use the COMEX/NYMEX numbers only as direction, fill on MCX LTP." },
  ].filter(Boolean);

  if (row.id === "natgas") {
    why.push({ category: "Caution", text: "Natural gas can gap several percent. Naked shorts and 'just one lot' both belong on a specialist book." });
  } else if (row.kind === "energy") {
    why.push({ category: "Caution", text: "Energy gaps on EIA inventories and geopolitics. Defined size, no averaging." });
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

  if (row.proxy && proxy?.price != null) {
    const premNote = "Fill on NSE, CNC. Compare last vs AMFI NAV on the Funds desk — skip a fill if Gold/Silver BeES is more than 0.7% rich.";
    const etfSide = trend === "BEARISH" ? "WAIT" : "BUY";
    const units = proxy.price ? Math.max(1, Math.round(5000 / proxy.price)) : null;
    const etfSteps = trend === "BEARISH"
      ? [
          `Do not add ${row.proxyName} while the metal tape is bearish.`,
          `Existing holders: trim if this is an overweight > 12% of the book.`,
          premNote,
        ]
      : [
          `BUY ${row.proxyName} (${row.proxy.replace(".NS", "")}) on NSE, CNC — not F&O, not MTF.`,
          `Example: ₹5,000 ≈ ${units} units at ₹${Number(proxy.price).toLocaleString("en-IN")}.`,
          `Use this as a 5–10% gold/silver overlay, not a day trade.`,
          premNote,
          trend === "BULLISH"
            ? `Add on dips toward ₹${support != null ? round(proxy.price * (support / price), 2) : round(proxy.price * 0.98, 2)} if the metal trend stays up.`
            : "Only SIP the wrapper while the metal is mixed — no lump sum.",
        ];
    plans.push({
      name: trend === "BEARISH" ? `WAIT ${row.proxy.replace(".NS", "")} — do not add the overlay` : `BUY ${row.proxy.replace(".NS", "")} CNC — rupee overlay`,
      structure: "ETF overlay",
      bias: trend === "BEARISH" ? "Bearish" : trend === "BULLISH" ? "Bullish" : "Neutral",
      action: etfSide,
      type: "ETF overlay",
      status: trend === "BEARISH" ? "Pass" : "Plan",
      holdingPeriod: "Position — months, not sessions",
      contract: row.proxy.replace(".NS", ""),
      contractName: row.proxyName,
      lotSpec: "NSE cash, 1 unit",
      lots: units,
      entryZone: { low: round(proxy.price * 0.995, 2), high: round(proxy.price, 2) },
      stopLoss: "Not a futures stop. Review if the overlay exceeds 12% of the book.",
      targets: { t1: "Hold as the metal overlay", t2: "Rebalance annually vs equity" },
      last: proxy.price,
      tradeLine: `${etfSide} ${row.proxy.replace(".NS", "")} · ₹${Number(proxy.price).toLocaleString("en-IN")} · CNC`,
      tradeTicket: { action: etfSide, steps: etfSteps },
      why: [
        { category: "Wrapper", text: `${row.proxyName} is how an Indian demat owns ${row.name} without SPAN. TER + premium still apply.` },
        { category: "Setup", text: `Metal trend ${trend}. Use BeES for allocation, ${spec.code} for a defined-risk trade.` },
      ],
      caution: null,
      invalidation: "Stop adding if the ETF premium to NAV is > 0.7% or the overlay is > 12% of equity.",
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
    proxy: row.proxy,
    rank: null,
  }));
}

async function analyzeOne(row) {
  const chart = await fetchChart(row.symbol, "1d", "1y");
  const candles = chart.candles || [];
  const price = candles.at(-1)?.close ?? chart.meta?.regularMarketPrice ?? null;
  const indicators = candles.length >= 30 ? computeIndicators(candles) : { latest: {} };
  const latest = indicators.latest || {};
  const trend = candles.length >= 30 ? technicalSignal(indicators) : "NEUTRAL";
  let proxy = null;
  if (row.proxy) {
    try {
      const p = await fetchChart(row.proxy, "1d", "3mo");
      const pc = p.candles || [];
      proxy = {
        symbol: row.proxy,
        name: row.proxyName,
        price: pc.at(-1)?.close ?? null,
        changePct: changePct(pc),
      };
    } catch {
      proxy = { symbol: row.proxy, name: row.proxyName, price: null };
    }
  }
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
    proxy,
    latest,
    fetchedAt: new Date().toISOString(),
  };
}

async function buildCommoditiesDashboard() {
  const fxRow = UNIVERSE.find((u) => u.id === "usdinr");
  const others = UNIVERSE.filter((u) => u.id !== "usdinr");
  const fx = await analyzeOne(fxRow);
  const rest = await mapPool(others, 3, async (row) => {
    try {
      return await analyzeOne(row);
    } catch (err) {
      return { ...row, error: err.message, price: null, trend: null, latest: {}, proxy: null };
    }
  });
  const rows = [fx, ...rest];
  const usdinr = fx.price;

  for (const row of rows) {
    row.mcxEstimate = toMcx(row.id, row.price, usdinr);
    row.usdinr = usdinr;
    row.plans = buildPlans(row, row.latest || {}, row.trend, row.price, { usdinr, proxy: row.proxy });
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

  if (gold?.price && silver?.price) {
    const ratio = round(gold.price / silver.price, 1);
    const silverCheap = ratio >= 88;
    const goldCheap = ratio <= 72;
    const side = silverCheap ? "silver" : goldCheap ? "gold" : "pass";
    strategies.push({
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
      why: [{ category: "Setup", text: `COMEX gold ${gold.price} / silver ${silver.price} = ${ratio}. Extreme is typically >88 or <72.` }],
      invalidation: "If ATR heat on the chosen lot > 1% of equity, skip the ratio tilt.",
      caution: "Relative value is still a trade. Write the rupee heat from the individual metal card.",
      mcx: silverCheap ? "MCX Silver Mini" : "MCX Gold Mini",
      venue: "COMEX",
    });
  }

  if (crude?.price) {
    strategies.push({
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
      last: crude.mcxEstimate ?? crude.price,
      entryZone: null,
      stopLoss: "If you are inside 3 sessions of expiry, flatten — do not 'roll in the last hour'.",
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
      mcx: "MCX Crude Oil",
      venue: "NYMEX",
    });
  }

  strategies.forEach((s, i) => {
    s.rank = i + 1;
  });

  const actionable = strategies.filter((s) => s.status === "Plan").length;

  return {
    source: "Yahoo COMEX/NYMEX/FX + Indian ETF proxies",
    refreshedAt: new Date().toISOString(),
    usdinr,
    executiveSummary: {
      gold: gold?.mcxEstimate ?? gold?.price ?? null,
      goldNative: gold?.price ?? null,
      goldChange: gold?.changePct ?? null,
      goldTrend: gold?.trend ?? null,
      crude: crude?.mcxEstimate ?? crude?.price ?? null,
      crudeChange: crude?.changePct ?? null,
      usdinr,
      contractsLive: rows.filter((r) => r.price != null).length,
      strategies: strategies.length,
      actionable,
    },
    contracts: rows.map(({ latest, ...rest }) => rest),
    strategies,
    notes: [
      "Tickets name the Indian contract (GOLDMINI, SILVERM, CRUDEOIL, NATURALGAS, COPPER, USDINR).",
      "MCX rupee levels are estimates from the dollar tape × USDINR. Fill on your MCX LTP, never on this estimate alone.",
      "1.5× ATR heat is shown in rupees for one official lot. If that exceeds 1% of equity, skip or step down a contract size.",
      "Natural gas defaults to no trade. Gold/Silver BeES is the demat overlay, not a futures substitute.",
    ],
  };
}

module.exports = { UNIVERSE, SPECS, buildCommoditiesDashboard, buildPlans, toMcx };
