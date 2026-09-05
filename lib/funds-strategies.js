/**
 * Specific, fillable playbooks for Nifty BeES-style ETFs and mutual-fund books.
 * Not day-trade theatre — SIP / overlay / skip rules with live premium and NAV.
 */

function round(n, d = 2) {
  if (n == null || !Number.isFinite(Number(n))) return null;
  return Number(Number(n).toFixed(d));
}

function unitsFor(rupees, price) {
  if (price == null || price <= 0) return null;
  return Math.max(1, Math.round(rupees / price));
}

function premiumLabel(p) {
  if (p == null) return "NAV not matched — confirm iNAV on the exchange before you fill";
  if (p > 0.7) return `SKIP this print — ETF is ${p.toFixed(2)}% rich to NAV`;
  if (p > 0.35) return `Premium ${p.toFixed(2)}% — fill only a small SIP, not a lump`;
  if (p < -0.35) return `Discount ${Math.abs(p).toFixed(2)}% — acceptable to add`;
  return `Premium/discount ${p.toFixed(2)}% — gap is tight enough to fill`;
}

function etfBy(etfs, nse) {
  return (etfs || []).find((e) => e.nse === nse) || null;
}

function fundBy(featured, re) {
  return (featured || []).find((f) => re.test(f.name)) || null;
}

function rupeeAmt(v) {
  if (v == null || Number.isNaN(Number(v))) return null;
  return `₹${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function fundSheet(plan) {
  const sip = plan.action === "SIP";
  const amc = /AMC|Direct/i.test(plan.lotSpec || "") || sip;
  const limit = plan.entryZone?.low != null
    ? plan.entryZone.low === plan.entryZone.high
      ? rupeeAmt(plan.entryZone.low)
      : `${rupeeAmt(plan.entryZone.low)} – ${rupeeAmt(plan.entryZone.high)}`
    : plan.last != null
      ? rupeeAmt(plan.last)
      : null;
  const qty = sip && plan.lots
    ? `SIP ${rupeeAmt(plan.lots)} / month`
    : plan.lots
      ? `${plan.lots} units (${plan.lotSpec || "CNC"})`
      : plan.lotSpec;
  return {
    venue: amc ? "AMC / MF app" : "NSE cash",
    product: plan.contract,
    side: plan.action,
    qty,
    orderType: sip ? "SIP Direct–Growth" : plan.action === "WAIT" ? "Do not send" : "Limit · CNC delivery",
    limit,
    stop: typeof plan.stopLoss === "number" ? rupeeAmt(plan.stopLoss) : plan.stopLoss,
    target: typeof plan.targets?.t1 === "number" ? rupeeAmt(plan.targets.t1) : plan.targets?.t1,
    when: plan.holdingPeriod,
    skip: plan.invalidation,
    path: amc
      ? `${plan.contract} → Direct–Growth → SIP`
      : `NSE → ${plan.contract} → CNC → ${plan.action}`,
  };
}

function push(out, plan) {
  const next = {
    rank: out.length + 1,
    status: plan.status || "Plan",
    lots: plan.lots ?? null,
    ...plan,
  };
  if (!next.fillSheet) next.fillSheet = fundSheet(next);
  out.push(next);
}

function buildFundDeskPlans({ etfs = [], featured = [], navDate = null } = {}) {
  const out = [];
  const bees = etfBy(etfs, "NIFTYBEES");
  const bank = etfBy(etfs, "BANKBEES");
  const junior = etfBy(etfs, "JUNIORBEES");
  const gold = etfBy(etfs, "GOLDBEES");
  const silver = etfBy(etfs, "SILVERBEES");
  const liquid = etfBy(etfs, "LIQUIDBEES");
  const mid = etfBy(etfs, "MID150BEES");
  const nasdaq = etfBy(etfs, "MON100");
  const it = etfBy(etfs, "ITBEES");
  const psu = etfBy(etfs, "PSUBNKBEES");
  const indexFund = fundBy(featured, /uti nifty 50 index|hdfc index fund.*nifty 50|sbi nifty index/i);
  const flexi = fundBy(featured, /parag parikh flexi/i);
  const elss = fundBy(featured, /elss|tax saver/i);
  const liqFund = fundBy(featured, /liquid fund/i);
  const small = fundBy(featured, /small cap/i);

  if (bees?.price) {
    const sipUnits = unitsFor(10000, bees.price);
    const skip = bees.premiumPct != null && bees.premiumPct > 0.7;
    const dip = bees.ret1m != null && bees.ret1m <= -4;
    push(out, {
      id: "niftybees-sip",
      name: skip ? "Skip Nifty BeES this print" : dip ? "Nifty BeES SIP + dip add" : "Nifty BeES monthly SIP",
      structure: "Core index",
      action: skip ? "WAIT" : "BUY",
      bias: skip ? "Neutral" : "Bullish",
      status: skip ? "Pass" : "Plan",
      holdingPeriod: "5+ years (this is the core, not a trade)",
      contract: "NIFTYBEES",
      contractName: bees.name,
      lotSpec: "NSE cash, CNC",
      lots: skip ? 0 : sipUnits,
      last: bees.price,
      entryZone: { low: round(bees.price, 2), high: round(bees.price, 2) },
      stopLoss: "No daily stop. Review if you need the money inside 3 years — then this product is wrong.",
      targets: { t1: "Match Nifty 50 minus TER", t2: "Rebalance once a year vs the rest of the book" },
      tradeLine: skip
        ? `WAIT NIFTYBEES · last ₹${bees.price} · ${premiumLabel(bees.premiumPct)}`
        : `BUY NIFTYBEES CNC · ₹10,000 ≈ ${sipUnits} units @ ₹${bees.price} · ${premiumLabel(bees.premiumPct)}`,
      tradeTicket: {
        action: skip ? "WAIT" : "BUY",
        steps: skip
          ? [
              `Open NSE. Search NIFTYBEES. Last ₹${bees.price} vs NAV ₹${bees.nav ?? "—"}.`,
              premiumLabel(bees.premiumPct) + " — do not click BUY today.",
              indexFund
                ? `Want Nifty 50 today anyway? SIP the index fund at NAV, not this ETF.`
                : "Wait for the premium to compress, then fill CNC.",
            ]
          : [
              "Open NSE cash (equity). Search NIFTYBEES. Product type: CNC — not MIS, not MTF, not F&O.",
              `BUY ${sipUnits} units (₹10,000 SIP) at limit ₹${bees.price} or better.`,
              bees.nav != null
                ? `Check premium: last ₹${bees.price} vs NAV ₹${bees.nav}. ${premiumLabel(bees.premiumPct)}.`
                : "Confirm iNAV on the exchange before you send.",
              dip
                ? `1-month is ${bees.ret1m}%. Add another ${unitsFor(5000, bees.price)} units (₹5,000) as a dip add — still CNC.`
                : "No extra lump. Repeat this SIP on the first trading day of each month.",
              "Hold 5 years+. You are buying Nifty 50, not trying to beat it.",
            ],
      },
      why: [
        { category: "Product", text: "Nifty BeES is an ETF. You buy it like a share. It is designed to track Nifty 50, not to outperform it." },
        { category: "Cost", text: "Compare this fill to a Direct Nifty 50 index fund. Use BeES when you want a live fill; use the fund when you want a standing SIP without watching the tape." },
      ],
      invalidation: "Skip whenever premium to NAV > 0.7%, or if this money is needed inside 3 years.",
    });
  }

  if (bank?.price) {
    const bear = bank.trend === "BEARISH" || (bank.ret1m != null && bank.ret1m <= -8);
    const units = unitsFor(5000, bank.price);
    push(out, {
      id: "bankbees-satellite",
      name: bear ? "Do not add Bank BeES" : "Bank BeES satellite (max 15% of equity)",
      structure: "Sector satellite",
      action: bear ? "WAIT" : "BUY",
      bias: bear ? "Bearish" : bank.trend === "BULLISH" ? "Bullish" : "Neutral",
      status: bear ? "Pass" : "Plan",
      holdingPeriod: "12–24 months satellite — not the core",
      contract: "BANKBEES",
      contractName: bank.name,
      last: bank.price,
      entryZone: { low: round(bank.price * 0.995, 2), high: round(bank.price, 2) },
      stopLoss: bear ? "None — you are not buying" : `Trim if Bank BeES closes 1.5× ATR (${bank.atr != null ? round(bank.atr) : "—"}) below the fill and Nifty is still firm.`,
      targets: { t1: "Keep ≤ 15% of the equity book", t2: "Do not let it replace Nifty BeES" },
      tradeLine: `${bear ? "WAIT" : "BUY"} BANKBEES · ₹${bank.price} · ${premiumLabel(bank.premiumPct)}`,
      tradeTicket: {
        action: bear ? "WAIT" : "BUY",
        steps: bear
          ? [
              `BANKBEES last ₹${bank.price}, 1M ${bank.ret1m ?? "—"}%, trend ${bank.trend || "n/a"}.`,
              "Do not add a bank overweight into a weak tape. Core stays Nifty BeES.",
            ]
          : [
              `BUY BANKBEES CNC, about ₹5,000 ≈ ${units} units at ₹${bank.price}.`,
              premiumLabel(bank.premiumPct),
              "Cap at 15% of equity. This is Nifty Bank, not the whole market.",
              "If Nifty BeES is not yet the core, buy that first — do not start with a sector ETF.",
            ],
      },
      why: [{ category: "Setup", text: `Nifty Bank 1M ${bank.ret1m ?? "—"}%, 3M ${bank.ret3m ?? "—"}%, trend ${bank.trend || "n/a"}.` }],
      invalidation: "No add if premium > 0.7% or if banks are already > 20% of the book via stocks + ETF.",
    });
  }

  if (gold?.price) {
    const rich = gold.premiumPct != null && gold.premiumPct > 0.7;
    const units = unitsFor(5000, gold.price);
    push(out, {
      id: "goldbees-overlay",
      name: rich ? "Skip Gold BeES — premium is fat" : "Gold BeES 5–10% overlay",
      structure: "Metal overlay",
      action: rich ? "WAIT" : "BUY",
      bias: "Neutral",
      status: rich ? "Pass" : "Plan",
      holdingPeriod: "Years — this is ballast, not a momentum trade",
      contract: "GOLDBEES",
      contractName: gold.name,
      last: gold.price,
      entryZone: { low: round(gold.price, 2), high: round(gold.price, 2) },
      stopLoss: "Rebalance if gold is > 12% of the book. Not a futures stop.",
      targets: { t1: "5–10% of investable assets", t2: "Do not confuse with jewellery or MCX" },
      tradeLine: `${rich ? "WAIT" : "BUY"} GOLDBEES · ₹${gold.price} · ${premiumLabel(gold.premiumPct)}`,
      tradeTicket: {
        action: rich ? "WAIT" : "BUY",
        steps: rich
          ? [
              `GOLDBEES last ₹${gold.price} vs NAV ₹${gold.nav ?? "—"}. ${premiumLabel(gold.premiumPct)}.`,
              "Wait for the premium to compress, or buy a gold index fund at NAV.",
            ]
          : [
              `BUY GOLDBEES CNC. Example ₹5,000 ≈ ${units} units at ₹${gold.price}.`,
              "Target 5–10% of the whole book. This is not MCX Gold Mini and not jewellery.",
              premiumLabel(gold.premiumPct) + (gold.nav != null ? ` NAV ₹${gold.nav}.` : ""),
              "If you want defined-risk gold for 2 weeks, that is the Commodities desk (GOLDMINI) — not this ETF.",
            ],
      },
      why: [{ category: "Product", text: "Gold BeES tracks gold in a demat. Making charges and SPAN do not apply. TER and premium do." }],
      invalidation: "Skip if premium > 0.7%, or if you are buying jewellery and calling it a hedge.",
    });
  }

  if (junior?.price && bees?.price) {
    const lag = junior.ret3m != null && bees.ret3m != null ? round(junior.ret3m - bees.ret3m) : null;
    const catchUp = lag != null && lag <= -5;
    push(out, {
      id: "juniorbees-satellite",
      name: catchUp ? "Junior BeES catch-up SIP (Nifty Next 50)" : "Junior BeES — keep as a small satellite",
      structure: "Next 50 satellite",
      action: "BUY",
      bias: catchUp ? "Bullish" : "Neutral",
      status: "Plan",
      holdingPeriod: "5 years. Next 50 is bumpier than Nifty 50.",
      contract: "JUNIORBEES",
      last: junior.price,
      entryZone: { low: round(junior.price, 2), high: round(junior.price, 2) },
      stopLoss: "Cap at 20% of equity. Do not let Next 50 become the core.",
      targets: { t1: "₹3,000 of every ₹10,000 equity SIP if you want a 70/30 Nifty/Next50 mix", t2: null },
      tradeLine: `BUY JUNIORBEES · ₹${junior.price} · 3M ${junior.ret3m ?? "—"}% vs Nifty ${bees.ret3m ?? "—"}%`,
      tradeTicket: {
        action: "BUY",
        steps: [
          `BUY JUNIORBEES CNC at ₹${junior.price}. Tracks Nifty Next 50, not Nifty 50.`,
          catchUp
            ? `Next 50 has lagged Nifty by ${Math.abs(lag)} pp over 3 months. A ₹3,000 satellite SIP is the catch-up — not a double-down lump.`
            : "Keep Junior as 20–30% of the equity SIP. Core remains Nifty BeES.",
          premiumLabel(junior.premiumPct),
        ],
      },
      why: [{ category: "Setup", text: `Junior 3M ${junior.ret3m ?? "—"}% vs Nifty BeES ${bees.ret3m ?? "—"}%.` }],
      invalidation: "No lump after a 3-month melt-up. SIP only.",
    });
  }

  if (mid?.price) {
    push(out, {
      id: "mid150-drip",
      name: "Midcap 150 BeES — drip, never lump",
      structure: "Mid-cap drip",
      action: mid.ret3m != null && mid.ret3m > 18 ? "WAIT" : "BUY",
      bias: "Neutral",
      status: mid.ret3m != null && mid.ret3m > 18 ? "Pass" : "Plan",
      holdingPeriod: "7+ years",
      contract: "MID150BEES",
      last: mid.price,
      tradeLine: `${mid.ret3m != null && mid.ret3m > 18 ? "WAIT" : "BUY"} MID150BEES · 3M ${mid.ret3m ?? "—"}% · ₹${mid.price}`,
      entryZone: { low: round(mid.price, 2), high: round(mid.price, 2) },
      stopLoss: "Cap at 15% of equity. Mid-caps draw down 30–40% as a personality, not a bug.",
      targets: { t1: "₹2,000 of a ₹10,000 SIP, max", t2: null },
      tradeTicket: {
        action: mid.ret3m != null && mid.ret3m > 18 ? "WAIT" : "BUY",
        steps:
          mid.ret3m != null && mid.ret3m > 18
            ? [
                `MID150BEES is +${mid.ret3m}% over 3 months at ₹${mid.price}. Do not lump.`,
                "If you want mid-cap, start a ₹2,000 SIP next month — the 3-month spike is not your entry cue.",
              ]
            : [
                `BUY MID150BEES CNC, ₹2,000 SIP ≈ ${unitsFor(2000, mid.price)} units at ₹${mid.price}.`,
                "Never more than 15% of equity. This is not Nifty 50.",
                premiumLabel(mid.premiumPct),
              ],
      },
      why: [{ category: "Risk", text: "Mid-cap indexes are a long-horizon product. A 3-month trophy chart is how lumps get trapped." }],
      invalidation: "No lumps after a fast 3-month run. Hard cap 15%.",
    });
  }

  if (silver?.price) {
    push(out, {
      id: "silverbees-small",
      name: "Silver BeES — only as a 0–5% satellite",
      structure: "Metal satellite",
      action: "BUY",
      bias: "Neutral",
      status: "Plan",
      holdingPeriod: "Years, tiny weight",
      contract: "SILVERBEES",
      last: silver.price,
      tradeLine: `BUY SILVERBEES · tiny overlay · ₹${silver.price} · ${premiumLabel(silver.premiumPct)}`,
      entryZone: { low: round(silver.price, 2), high: round(silver.price, 2) },
      stopLoss: "Cap 5%. Silver is jumpy — this is not Gold BeES.",
      targets: { t1: "0–5% of the book", t2: null },
      tradeTicket: {
        action: "BUY",
        steps: [
          `If gold overlay is already 8–10%, skip silver. If you still want it: BUY SILVERBEES CNC, ₹2,000 ≈ ${unitsFor(2000, silver.price)} units at ₹${silver.price}.`,
          premiumLabel(silver.premiumPct),
          "Do not pair this with a naked MCX silver mini unless you know both books.",
        ],
      },
      why: [{ category: "Risk", text: "Silver moves harder than gold. Size is the strategy." }],
      invalidation: "Skip if premium > 0.8% or if metals already > 12% combined.",
    });
  }

  if (it?.price) {
    const hot = (it.rsi != null && it.rsi >= 72) || (it.ret1m != null && it.ret1m >= 12);
    const units = unitsFor(3000, it.price);
    push(out, {
      id: "itbees-satellite",
      name: hot ? "Do not add IT BeES — tape is extended" : "IT BeES satellite (max 10% of equity)",
      structure: "Sector satellite",
      action: hot ? "WAIT" : "BUY",
      bias: hot ? "Bearish" : it.trend === "BULLISH" ? "Bullish" : "Neutral",
      status: hot ? "Pass" : "Plan",
      holdingPeriod: "12–24 months satellite",
      contract: "ITBEES",
      contractName: it.name,
      lotSpec: "NSE cash, CNC",
      lots: hot ? 0 : units,
      last: it.price,
      entryZone: { low: round(it.price * 0.995, 2), high: round(it.price, 2) },
      stopLoss: "Cap 10% of equity. Trim if IT BeES is a double overweight vs Nifty BeES.",
      targets: { t1: "Keep IT as a satellite, never the core", t2: null },
      tradeLine: `${hot ? "WAIT" : "BUY"} ITBEES CNC · ₹${it.price} · 1M ${it.ret1m ?? "—"}% · ${premiumLabel(it.premiumPct)}`,
      tradeTicket: {
        action: hot ? "WAIT" : "BUY",
        steps: hot
          ? [
              `ITBEES last ₹${it.price}, 1M ${it.ret1m ?? "—"}%, RSI ${it.rsi != null ? round(it.rsi, 1) : "—"}.`,
              "Do not lump a sector ETF after a sharp run. Core remains NIFTYBEES.",
              "If you already hold IT BeES above 10% of equity, trim on strength — do not add.",
            ]
          : [
              `BUY ITBEES CNC, about ₹3,000 ≈ ${units} units at ₹${it.price}.`,
              premiumLabel(it.premiumPct),
              "Hard cap 10% of the equity book. Nifty BeES is the core; this is a sector tilt.",
            ],
      },
      why: [{ category: "Setup", text: `Nifty IT 1M ${it.ret1m ?? "—"}%, 3M ${it.ret3m ?? "—"}%, trend ${it.trend || "n/a"}.` }],
      invalidation: "No add if premium > 0.7% or if IT is already > 12% via stocks + ETF.",
    });
  }

  if (psu?.price) {
    const hot = psu.ret3m != null && psu.ret3m >= 20;
    push(out, {
      id: "psubank-skip",
      name: hot ? "PSU Bank BeES — stand aside after the run" : "PSU Bank BeES — tiny tactical only",
      structure: "Tactical sector",
      action: hot ? "WAIT" : "BUY",
      bias: hot ? "Bearish" : "Neutral",
      status: hot ? "Pass" : "Plan",
      holdingPeriod: "Tactical 3–9 months — not a core SIP",
      contract: "PSUBNKBEES",
      last: psu.price,
      lots: hot ? 0 : unitsFor(2000, psu.price),
      lotSpec: "NSE cash, CNC",
      entryZone: { low: round(psu.price, 2), high: round(psu.price, 2) },
      stopLoss: "Cap 5%. PSU banks are a policy tape, not a Nifty substitute.",
      targets: { t1: "0–5% of equity, then stop adding", t2: null },
      tradeLine: `${hot ? "WAIT" : "BUY"} PSUBNKBEES · ₹${psu.price} · 3M ${psu.ret3m ?? "—"}%`,
      tradeTicket: {
        action: hot ? "WAIT" : "BUY",
        steps: hot
          ? [
              `PSUBNKBEES is +${psu.ret3m}% over 3 months at ₹${psu.price}. That is a trophy chart, not an entry.`,
              "Do not start a PSU-bank SIP because last quarter was green.",
            ]
          : [
              `BUY PSUBNKBEES CNC, ₹2,000 ≈ ${unitsFor(2000, psu.price)} units at ₹${psu.price} — only if Nifty BeES is already the core.`,
              "Cap 5% of equity. One policy headline can reverse the sleeve.",
              premiumLabel(psu.premiumPct),
            ],
      },
      why: [{ category: "Risk", text: "PSU banks are a concentrated policy bet. Size is the strategy." }],
      invalidation: "Skip after a 3-month melt-up, or if banks (Bank BeES + PSU) already > 20%.",
    });
  }

  if (indexFund && bees?.price) {
    const fundName = indexFund.name.replace(/\s+-\s+Direct Plan - Growth/i, "");
    const beesRich = bees.premiumPct != null && bees.premiumPct > 0.35;
    push(out, {
      id: "index-vs-bees",
      name: beesRich
        ? `Use ${fundName} today — BeES is rich to NAV`
        : "Nifty BeES for a live fill; index fund for a standing SIP",
      structure: "Wrapper pick",
      action: beesRich ? "SIP" : "BUY",
      bias: "Neutral",
      status: "Plan",
      holdingPeriod: "Same 5-year Nifty 50 job — different plumbing",
      contract: beesRich ? indexFund.code : "NIFTYBEES",
      contractName: beesRich ? fundName : bees.name,
      last: beesRich ? indexFund.nav : bees.price,
      lotSpec: beesRich ? "AMC SIP, Direct–Growth" : "NSE cash, CNC",
      entryZone: null,
      stopLoss: "Do not hold both a Nifty 50 ETF and a Nifty 50 index fund as two ideas. Pick one wrapper.",
      targets: { t1: "Own Nifty 50 cheaply", t2: null },
      tradeLine: beesRich
        ? `SIP ${fundName} · NAV ₹${indexFund.nav} · skip BeES while premium is ${bees.premiumPct.toFixed(2)}%`
        : `BUY NIFTYBEES for a live fill; SIP ${fundName} (NAV ₹${indexFund.nav}) if you do not want to watch the tape`,
      tradeTicket: {
        action: beesRich ? "SIP" : "BUY",
        steps: beesRich
          ? [
              `NIFTYBEES last ₹${bees.price} vs NAV ₹${bees.nav ?? "—"} (${premiumLabel(bees.premiumPct)}).`,
              `Start / keep the SIP in ${fundName} Direct–Growth, NAV ₹${indexFund.nav} on ${indexFund.date || navDate || "—"}.`,
              "Same index. Do not 'diversify' by buying both.",
            ]
          : [
              "Want a fill at 10:42am? BUY NIFTYBEES CNC.",
              `Want a standing ₹10,000 SIP with no demat click? Use ${fundName} Direct–Growth, NAV ₹${indexFund.nav}.`,
              "Do not run both as two strategies. One Nifty 50 wrapper is enough.",
            ],
      },
      why: [{ category: "Product", text: "ETF = live price + possible premium. Index fund = NAV. The index is the same." }],
      invalidation: "If you already SIP a Nifty 50 index fund, do not also lump Nifty BeES for diversification.",
    });
  }

  if (nasdaq?.price) {
    push(out, {
      id: "nasdaq-cap",
      name: "Nasdaq 100 ETF — cap at 10%, remember the tax wrapper",
      structure: "International satellite",
      action: "BUY",
      bias: "Neutral",
      status: "Plan",
      holdingPeriod: "5+ years",
      contract: nasdaq.nse,
      last: nasdaq.price,
      tradeLine: `BUY ${nasdaq.nse} · ₹${nasdaq.price} · keep ≤ 10% of the book`,
      entryZone: { low: round(nasdaq.price, 2), high: round(nasdaq.price, 2) },
      stopLoss: "Hard cap 10%. This is US tech beta in an Indian ETF, not 'diversification magic'.",
      targets: { t1: "5–10% satellite", t2: null },
      tradeTicket: {
        action: "BUY",
        steps: [
          `BUY ${nasdaq.nse} CNC at ₹${nasdaq.price}. Tracks Nasdaq 100.`,
          "Cap 10% of the overall book. USD and US tech are the risks — not Nifty.",
          "Confirm current tax treatment of specified / overseas funds with a CA. Do not use a 2021 blog.",
        ],
      },
      why: [{ category: "Product", text: "Useful satellite. It will not save a rupee-only book in every crash, and it can fall with Nasdaq 30%." }],
      invalidation: "No add if already > 10%, or if you need rupee cash inside 2 years.",
    });
  }

  if (liquid?.price || liqFund) {
    const nav = liqFund?.nav;
    push(out, {
      id: "cash-bucket",
      name: "Cash you need in 12 months — liquid fund / Liquid BeES, not equity",
      structure: "Cash bucket",
      action: "BUY",
      bias: "Neutral",
      status: "Plan",
      holdingPeriod: "Days to 12 months",
      contract: liqFund ? liqFund.name : "LIQUIDBEES",
      last: liquid?.price ?? nav,
      tradeLine: liqFund
        ? `BUY ${liqFund.name.split(" - ")[0]} · NAV ₹${nav} · money needed inside 12 months`
        : `BUY LIQUIDBEES · ₹${liquid.price} · parking cash, not a momentum trade`,
      entryZone: null,
      stopLoss: "This is cash management. Do not 'deploy' it into small-caps because last month was green.",
      targets: { t1: "Survive the next 12 months of known expenses", t2: null },
      tradeTicket: {
        action: "BUY",
        steps: [
          liqFund
            ? `Park near-term cash in ${liqFund.name} (Direct–Growth if you can). NAV ₹${nav} on ${liqFund.date || navDate || "—"}.`
            : `LIQUIDBEES last ₹${liquid.price}. Use it as a listed cash proxy, not a trade.`,
          "Emergency fund and any house/school bill inside 12 months belongs here — not in Nifty BeES, not in Gold Mini.",
          "Do not try to time Liquid BeES like an index ETF. The product is parking.",
        ],
      },
      why: [{ category: "Horizon", text: "Horizon first. A 9-month down-payment does not belong in Next 50." }],
      invalidation: "If the money's horizon is 7+ years, this is the wrong bucket — use the Nifty SIP instead.",
    });
  }

  const sipByKind = {
    index: 10000,
    flexicap: 5000,
    largecap: 5000,
    midcap: 2000,
    smallcap: 1000,
    elss: 1500,
    hybrid: 3000,
    debt: 10000,
    liquid: 10000,
    international: 3000,
  };

  for (const fund of featured.slice(0, 8)) {
    const sip = sipByKind[fund.kind] || 3000;
    const shortName = fund.name.replace(/\s+-\s+Direct Plan - Growth/i, "");
    const skipSmall = fund.kind === "smallcap";
    push(out, {
      id: `fund-sip-${fund.code}`,
      name: skipSmall
        ? `${shortName} — ₹${sip.toLocaleString("en-IN")} SIP max, never a bonus lump`
        : `SIP ₹${sip.toLocaleString("en-IN")} ${shortName} (Direct–Growth)`,
      structure: fund.kind === "elss" ? "80C lock-in" : fund.kind === "liquid" ? "Cash bucket" : "Fund SIP",
      action: "SIP",
      bias: "Neutral",
      status: "Plan",
      holdingPeriod: fund.kind === "liquid" ? "Days to 12 months" : fund.kind === "elss" ? "3-year lock-in, then review" : "5+ years",
      contract: shortName,
      contractName: fund.name,
      lotSpec: "AMC SIP, Direct–Growth",
      lots: sip,
      last: fund.nav,
      entryZone: fund.nav != null ? { low: fund.nav, high: fund.nav } : null,
      stopLoss: fund.kind === "smallcap"
        ? "Never a lump after a 3-month spike. Cap 10% of equity."
        : fund.kind === "elss"
          ? "Only if 80C is still open after EPF/PPF. The 3-year lock is real."
          : "Do not pause the SIP because last month was red.",
      targets: { t1: `₹${sip.toLocaleString("en-IN")} on the same calendar day each month`, t2: "Direct–Growth only" },
      tradeLine: `SIP ₹${sip.toLocaleString("en-IN")} · ${shortName} · Direct–Growth · NAV ₹${fund.nav ?? "—"}`,
      tradeTicket: {
        action: "SIP",
        steps: [
          `Open / keep a Direct–Growth SIP of ₹${sip.toLocaleString("en-IN")} in ${shortName}.`,
          `Latest AMFI NAV ₹${fund.nav ?? "—"} on ${fund.date || navDate || "—"}. You get that day's NAV, not a live fill.`,
          fund.kind === "elss"
            ? "ELSS has a 3-year lock-in. Use it for 80C leftover, not as a better index fund."
            : fund.kind === "liquid"
              ? "This is parking money needed inside 12 months — not a return engine."
              : fund.kind === "smallcap"
                ? "Small-cap SIP only. A bonus lump after a trophy quarter is how people buy the high."
                : "Same date every month. Do not skip a red month and double a green one.",
          fund.blurb ? `Role: ${fund.blurb}.` : "Do not add a second fund in the same category.",
        ],
      },
      why: [{ category: "Product", text: `${fund.amc || "AMC"} · ${fund.kind} · ${fund.blurb || "Direct–Growth SIP"}` }],
      invalidation: fund.kind === "index"
        ? "If you already SIP Nifty BeES, this is the same Nifty 50 job — pick one wrapper."
        : "If the rupee is needed inside 3 years, this SIP does not start.",
    });
  }

  const bookSteps = [
    `Core (70%): Nifty 50 via ${bees ? `NIFTYBEES SIP at ₹${bees.price}` : "a Direct Nifty 50 index fund"}${indexFund ? ` or ${indexFund.name.split(" - ")[0]} NAV ₹${indexFund.nav}` : ""}.`,
    `Satellite (20%): ${flexi ? `${flexi.name.split(" - ")[0]} NAV ₹${flexi.nav}` : "one flexi-cap you will still hold in a 30% drawdown"}.`,
    `Cash (10%): ${liqFund ? liqFund.name.split(" - ")[0] : "a liquid fund / Liquid BeES"} for money inside 12 months.`,
    "All Direct–Growth where a fund is used. SIP dates on the same day each month. No 'special' lumps after a hot quarter.",
    elss
      ? `ELSS (${elss.name.split(" - ")[0]}, NAV ₹${elss.nav}) only if you still need 80C after EPF/PPF/insurance — 3-year lock is real.`
      : "ELSS only if 80C is still open after EPF/PPF. It is not a better index fund.",
    small
      ? `${small.name.split(" - ")[0]} is a satellite of a satellite. SIP ₹1,000–2,000 max, never a bonus lump after a 3-month spike.`
      : "Small-cap is optional. If you cannot sit through −40%, skip it.",
  ];

  push(out, {
    id: "core-satellite-book",
    name: "Household book: 70% Nifty / 20% flexi / 10% liquid",
    structure: "Core–satellite",
    action: "SIP",
    bias: "Neutral",
    status: "Plan",
    holdingPeriod: "10 years or it is the wrong book",
    contract: "Book",
    contractName: "Direct plans + BeES",
    last: bees?.price ?? indexFund?.nav ?? null,
    tradeLine: "SIP the book · 70 / 20 / 10 · Direct–Growth · no bonus lumps",
    entryZone: null,
    stopLoss: "The stop is behaviour: no pausing SIPs because Nifty had a bad month.",
    targets: { t1: "Stay fully invested in the written mix", t2: "Rebalance if a sleeve drifts 10 pp" },
    tradeTicket: { action: "SIP", steps: bookSteps },
    why: [
      { category: "Allocation", text: "The mix is the strategy. Picking last quarter's winner as 100% of the SIP is not a strategy." },
    ],
    invalidation: "If any rupee is needed inside 3 years, it leaves the 70% equity core and goes to liquid.",
  });

  return out;
}

module.exports = { buildFundDeskPlans, premiumLabel, unitsFor };
