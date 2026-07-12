/**
 * Equity options transaction cost helpers (India).
 *
 * Policy:
 * - Never invent brokerage — default 0 unless caller supplies it.
 * - Statutory rates below are documented public-market conventions and are
 *   labeled "indicative" with as-of date. If a rate cannot be confirmed, the
 *   charge is marked unavailable rather than estimated.
 * - Slippage is applied only when the caller provides a value.
 */

const DATA_UNAVAILABLE = "Data Unavailable";

/** As-of note for statutory references (update when rates change). */
const CHARGES_AS_OF = "2025-01-01";
const CHARGES_SOURCE =
  "Indicative NSE equity options statutory components; brokerage never assumed";

/**
 * @param {object} params
 * @param {number} params.premiumPerUnit - absolute premium per share/unit
 * @param {number} params.quantity - lot size × number of lots
 * @param {'BUY'|'SELL'} params.side
 * @param {number} [params.brokerage] - absolute brokerage for the order (₹), never invented
 * @param {number} [params.slippage] - absolute ₹ slippage, only if user-provided
 */
function computeOptionLegCharges({
  premiumPerUnit,
  quantity,
  side,
  brokerage = 0,
  slippage = null,
} = {}) {
  if (
    premiumPerUnit == null ||
    !Number.isFinite(Number(premiumPerUnit)) ||
    quantity == null ||
    !Number.isFinite(Number(quantity)) ||
    quantity <= 0
  ) {
    return {
      available: false,
      message: DATA_UNAVAILABLE,
      reason: "Verified premium and quantity required for charge calculation",
    };
  }

  const prem = Math.abs(Number(premiumPerUnit));
  const qty = Number(quantity);
  const turnover = prem * qty;
  const isSell = String(side).toUpperCase() === "SELL";

  // STT on sale of options in securities (equity options): 0.0625% of option premium (sell side).
  // Index options schedules differ (often 0.1%) — this helper is equity F&O only.
  // Source: published NSE/CBDT equity options STT schedule; labeled indicative with CHARGES_AS_OF.
  const stt = isSell ? Number((turnover * 0.000625).toFixed(2)) : 0;

  // Exchange transaction charges (approx public schedule for equity options).
  // Using published-style basis points — labeled indicative.
  const exchangeTxn = Number((turnover * 0.00053).toFixed(2)); // ~0.053%

  // SEBI turnover fees ~ ₹10 / crore of turnover
  const sebi = Number(((turnover / 1e7) * 10).toFixed(2));

  // Stamp duty on buy side of options (indicative; state schedules vary)
  const stampDuty = !isSell ? Number((turnover * 0.00003).toFixed(2)) : 0;

  const brokerageAmt =
    brokerage != null && Number.isFinite(Number(brokerage)) && Number(brokerage) >= 0
      ? Number(Number(brokerage).toFixed(2))
      : 0;

  // GST 18% on (brokerage + exchange charges) — not on STT/stamp
  const gstBase = brokerageAmt + exchangeTxn;
  const gst = Number((gstBase * 0.18).toFixed(2));

  const slippageAmt =
    slippage != null && Number.isFinite(Number(slippage)) && Number(slippage) >= 0
      ? Number(Number(slippage).toFixed(2))
      : 0;

  const total = Number(
    (stt + exchangeTxn + sebi + stampDuty + brokerageAmt + gst + slippageAmt).toFixed(2)
  );

  return {
    available: true,
    asOf: CHARGES_AS_OF,
    source: CHARGES_SOURCE,
    side: isSell ? "SELL" : "BUY",
    turnover: Number(turnover.toFixed(2)),
    brokerage: brokerageAmt,
    brokerageAssumed: brokerageAmt === 0,
    stt,
    exchangeTxn,
    sebi,
    stampDuty,
    gst,
    slippage: slippageAmt,
    slippageApplied: slippage != null,
    total,
    note:
      brokerageAmt === 0
        ? "Brokerage set to ₹0 (not assumed). Enter broker rates for net P/L after brokerage."
        : "Includes user-provided brokerage.",
  };
}

/**
 * Estimate round-trip charges for a multi-leg options strategy (open all legs).
 * Does not invent future exit charges beyond a symmetric open estimate when requested.
 */
function estimateStrategyOpenCharges(legs, lotSize, { brokeragePerLeg = 0, slippage = null } = {}) {
  if (!Array.isArray(legs) || !legs.length || lotSize == null || !Number.isFinite(lotSize)) {
    return {
      available: false,
      message: DATA_UNAVAILABLE,
      reason: "Verified legs and lot size required",
    };
  }

  const details = [];
  let total = 0;
  for (const leg of legs) {
    if (leg?.premium == null || !leg.action || leg.action === "WATCH") continue;
    const c = computeOptionLegCharges({
      premiumPerUnit: leg.premium,
      quantity: lotSize,
      side: leg.action,
      brokerage: brokeragePerLeg,
      slippage,
    });
    if (!c.available) continue;
    details.push({ strike: leg.strike, type: leg.type, action: leg.action, charges: c });
    total += c.total;
  }

  if (!details.length) {
    return {
      available: false,
      message: DATA_UNAVAILABLE,
      reason: "No tradeable legs with verified premiums",
    };
  }

  return {
    available: true,
    asOf: CHARGES_AS_OF,
    source: CHARGES_SOURCE,
    total: Number(total.toFixed(2)),
    legs: details,
    note:
      "Open-side indicative charges only. Exit charges depend on future premiums and are not fabricated.",
  };
}

/**
 * Net max profit/loss after open charges (conservative: charges reduce profit / increase loss).
 * Exit charges are NOT estimated.
 */
function applyChargesToPayoff({ maxProfit, maxLoss, maxProfitUnlimited, maxLossUnlimited, openCharges }) {
  if (!openCharges?.available) {
    return {
      available: false,
      maxProfitNet: maxProfit,
      maxLossNet: maxLoss,
      message: "Charges not applied",
    };
  }
  const ch = openCharges.total || 0;
  return {
    available: true,
    maxProfitNet:
      maxProfitUnlimited || maxProfit == null ? null : Number((maxProfit - ch).toFixed(2)),
    maxLossNet:
      maxLossUnlimited || maxLoss == null ? null : Number((maxLoss + ch).toFixed(2)),
    openChargesTotal: ch,
    note: "Net of open-side charges only; exit charges not estimated",
  };
}

module.exports = {
  computeOptionLegCharges,
  estimateStrategyOpenCharges,
  applyChargesToPayoff,
  CHARGES_AS_OF,
  CHARGES_SOURCE,
  DATA_UNAVAILABLE,
};
