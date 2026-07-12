/**
 * Synthetic multi-leg options backtest using verified underlying OHLCV + documented
 * Black–Scholes-style premium approximation from historical volatility.
 *
 * IMPORTANT DISCLAIMER (always attached to results):
 * This is NOT a historical multi-leg option premium backtest.
 * Free feeds do not provide historical option tick premiums.
 * Premiums are synthetically estimated from underlying path + HV (or IV when provided).
 * Results are analytical simulations — never guaranteed win rates.
 */

function isFiniteNum(n) {
  return n != null && typeof n === "number" && Number.isFinite(n);
}

/** Annualized historical vol % from verified closes (no external deps). */
function histVolPct(closes, period = 30) {
  const slice = closes.slice(-(period + 1));
  if (slice.length < 10) return null;
  const rets = [];
  for (let i = 1; i < slice.length; i++) {
    if (slice[i] > 0 && slice[i - 1] > 0) rets.push(Math.log(slice[i] / slice[i - 1]));
  }
  if (rets.length < 5) return null;
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const variance = rets.reduce((a, r) => a + (r - mean) ** 2, 0) / rets.length;
  return Number((Math.sqrt(variance) * Math.sqrt(252) * 100).toFixed(2));
}

/** Standard normal CDF (Abramowitz & Stegun approximation) */
function normCdf(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  let p =
    d *
    t *
    (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  if (x > 0) p = 1 - p;
  return p;
}

/**
 * European option premium (Black–Scholes, r≈0 for short horizons).
 * sigma annualized decimal (e.g. 0.18), T in years.
 */
function bsPremium(type, S, K, sigma, T) {
  if (!isFiniteNum(S) || !isFiniteNum(K) || !isFiniteNum(sigma) || !isFiniteNum(T)) return null;
  if (S <= 0 || K <= 0 || sigma <= 0) return null;
  if (T <= 0) {
    // expiry intrinsic
    if (type === "CE") return Math.max(S - K, 0);
    return Math.max(K - S, 0);
  }
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (sigma * sigma * T) / 2) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  if (type === "CE") return S * normCdf(d1) - K * normCdf(d2);
  return K * normCdf(-d2) - S * normCdf(-d1);
}

function legPnl(leg, S, entryPremium) {
  const type = leg.type === "PE" || leg.type === "PUT" ? "PE" : "CE";
  const K = leg.strike;
  const action = leg.action;
  // At exit use intrinsic only (conservative expiry-style) unless exitPremium provided
  const exitValue = type === "CE" ? Math.max(S - K, 0) : Math.max(K - S, 0);
  if (action === "BUY") return exitValue - entryPremium;
  if (action === "SELL") return entryPremium - exitValue;
  return 0;
}

/**
 * @param {Array} candles - verified OHLCV
 * @param {object} strategy - { strikes: [{action,type,strike,premium?}], bias, holdingPeriod days? }
 * @param {object} opts
 */
function backtestSyntheticMultiLeg(candles, strategy, opts = {}) {
  const minBars = opts.minBars || 80;
  const holdBars = opts.holdBars || 10;
  const minTrades = opts.minTradesForStats || 5;
  const legs = (strategy?.strikes || [])
    .map((l) => ({
      action: String(l.action || "").toUpperCase(),
      type: String(l.type || "").toUpperCase().replace("CALL", "CE").replace("PUT", "PE"),
      strike: Number(l.strike),
      premium: l.premium != null ? Number(l.premium) : null,
    }))
    .filter((l) => (l.action === "BUY" || l.action === "SELL") && (l.type === "CE" || l.type === "PE") && isFiniteNum(l.strike));

  const disclaimer =
    "SYNTHETIC simulation: entry premiums estimated via Black–Scholes using historical volatility of the underlying (or last verified IV when supplied). This is NOT a historical multi-leg option premium series backtest. Past simulated results are not guarantees.";

  if (!Array.isArray(candles) || candles.length < minBars) {
    return {
      available: false,
      reason: `Awaiting Latest Verified Data — need ≥${minBars} underlying bars for synthetic multi-leg simulation`,
      samples: 0,
      simulationType: "synthetic-bs-hv",
      disclaimer,
    };
  }
  if (!legs.length) {
    return {
      available: false,
      reason: "No verified option legs (action/type/strike) on strategy for synthetic simulation",
      samples: 0,
      simulationType: "synthetic-bs-hv",
      disclaimer,
    };
  }

  const closes = candles.map((c) => c.close).filter((c) => isFiniteNum(c));
  if (closes.length < minBars) {
    return {
      available: false,
      reason: "Verified close series incomplete for synthetic simulation",
      samples: 0,
      simulationType: "synthetic-bs-hv",
      disclaimer,
    };
  }

  // Rolling HV for sigma from verified closes
  const hvPct = histVolPct(closes, 30);
  // Prefer strategy-provided IV when present (percent)
  const ivHint =
    opts.impliedVolPct != null && isFiniteNum(opts.impliedVolPct)
      ? opts.impliedVolPct
      : strategy?.analytics?.impliedVolatility ?? null;
  const sigma =
    ivHint != null && ivHint > 0
      ? ivHint / 100
      : hvPct != null && hvPct > 0
        ? hvPct / 100
        : null;

  if (sigma == null) {
    return {
      available: false,
      reason: "Cannot run synthetic simulation — historical volatility unavailable from verified OHLCV",
      samples: 0,
      simulationType: "synthetic-bs-hv",
      disclaimer,
    };
  }

  const Tyears = holdBars / 252;
  const trades = [];
  // Sample entries every holdBars starting after warmup
  for (let i = 60; i + holdBars < closes.length; i += Math.max(5, Math.floor(holdBars / 2))) {
    const S0 = closes[i];
    const S1 = closes[i + holdBars];
    if (!isFiniteNum(S0) || !isFiniteNum(S1)) continue;

    // Scale strikes relative to current spot if absolute ATM-like (optional)
    // Use absolute strikes from strategy as-of generation; if far from S0, re-center ATM offset
    const atmStrike = legs.reduce((a, l) => a + l.strike, 0) / legs.length;
    const scale = isFiniteNum(atmStrike) && atmStrike > 0 ? S0 / atmStrike : 1;

    let entryDebit = 0; // capital risk proxy
    let pnl = 0;
    const entryLegs = [];
    let ok = true;
    for (const leg of legs) {
      const K = Number((leg.strike * scale).toFixed(2));
      // Prefer live verified premium scaled roughly by spot ratio when provided; else BS
      let prem =
        leg.premium != null && isFiniteNum(leg.premium)
          ? leg.premium * scale
          : bsPremium(leg.type, S0, K, sigma, Tyears);
      if (prem == null || prem < 0) {
        ok = false;
        break;
      }
      prem = Number(prem.toFixed(2));
      entryLegs.push({ ...leg, strike: K, entryPremium: prem });
      // net premium paid (debit positive)
      entryDebit += leg.action === "BUY" ? prem : -prem;
      pnl += legPnl({ ...leg, strike: K }, S1, prem);
    }
    if (!ok) continue;

    const capitalAtRisk = Math.max(Math.abs(entryDebit), 1e-6);
    const retPct = (pnl / capitalAtRisk) * 100;
    trades.push({
      entryDate: candles[i].date || null,
      exitDate: candles[i + holdBars].date || null,
      entrySpot: Number(S0.toFixed(2)),
      exitSpot: Number(S1.toFixed(2)),
      netPremiumEntry: Number(entryDebit.toFixed(2)),
      pnlPerUnit: Number(pnl.toFixed(2)),
      returnPct: Number(retPct.toFixed(2)),
      barsHeld: holdBars,
      sigmaUsed: Number((sigma * 100).toFixed(2)),
    });
  }

  if (trades.length < minTrades) {
    return {
      available: false,
      reason: `Synthetic multi-leg rule produced only ${trades.length} samples — need ≥${minTrades} (never fabricate)`,
      samples: trades.length,
      trades: trades.slice(-15),
      simulationType: "synthetic-bs-hv",
      sigmaPct: Number((sigma * 100).toFixed(2)),
      rules: [
        "Entry premiums: BS(S,K,σ,T) with σ from verified HV (or IV if provided)",
        `Hold ${holdBars} daily bars; exit mark-to-intrinsic at underlying close`,
        "Strikes re-centered to contemporaneous spot to avoid look-ahead fixed-level bias",
      ],
      assumptions: [
        "r=0 Black–Scholes European approximation",
        "No bid-ask, no early assignment, no gap slippage",
        "Not historical exchange-traded premiums",
      ],
      disclaimer,
    };
  }

  const rets = trades.map((t) => t.returnPct);
  const wins = rets.filter((r) => r > 0);
  const losses = rets.filter((r) => r <= 0);
  const winRate = (wins.length / trades.length) * 100;
  const avgReturn = rets.reduce((a, b) => a + b, 0) / rets.length;
  let peak = 0;
  let equity = 0;
  let maxDd = 0;
  for (const r of rets) {
    equity += r;
    if (equity > peak) peak = equity;
    maxDd = Math.max(maxDd, peak - equity);
  }
  const grossProfit = wins.reduce((a, b) => a + b, 0);
  const grossLoss = Math.abs(losses.reduce((a, b) => a + b, 0));

  return {
    available: true,
    simulationType: "synthetic-bs-hv",
    samples: trades.length,
    numberOfTrades: trades.length,
    winRate: Number(winRate.toFixed(1)),
    lossRate: Number(((losses.length / trades.length) * 100).toFixed(1)),
    averageReturnPct: Number(avgReturn.toFixed(2)),
    averageWinPct: wins.length
      ? Number((wins.reduce((a, b) => a + b, 0) / wins.length).toFixed(2))
      : null,
    averageLossPct: losses.length
      ? Number((losses.reduce((a, b) => a + b, 0) / losses.length).toFixed(2))
      : null,
    maxDrawdownPctPoints: Number(maxDd.toFixed(2)),
    profitFactor: grossLoss > 0 ? Number((grossProfit / grossLoss).toFixed(2)) : null,
    sharpeRatio: null,
    sortinoRatio: null,
    sigmaPct: Number((sigma * 100).toFixed(2)),
    holdBars,
    period: {
      from: trades[0]?.entryDate || null,
      to: trades[trades.length - 1]?.exitDate || null,
    },
    rules: [
      "Synthetic multi-leg: BS entry premiums from verified HV/IV + underlying path",
      `Hold ${holdBars} bars; exit at intrinsic vs underlying close`,
      "Strike lattice re-centered to entry spot",
    ],
    assumptions: [
      "Not exchange historical option premiums",
      "European BS, r≈0, no transaction costs",
      "Past simulated performance is not a guarantee of future results",
    ],
    trades: trades.slice(-25),
    disclaimer,
  };
}

module.exports = {
  backtestSyntheticMultiLeg,
  bsPremium,
  normCdf,
};
