const { getNiftyExpiries } = require("./expiry");
const { computeIndicators, technicalSignal, technicalTarget } = require("./indicators");
const { statisticalForecast } = require("./forecast");
const { mlForecast } = require("./mlModel");

const WEIGHTS = {
  technical: 0.35,
  statistical: 0.35,
  ml: 0.3,
};

function signalFromChange(currentPrice, target) {
  const deltaPct = ((target - currentPrice) / currentPrice) * 100;
  if (deltaPct >= 0.35) return "BULLISH";
  if (deltaPct <= -0.35) return "BEARISH";
  return "NEUTRAL";
}

function combineRange(ranges, target) {
  const lows = ranges.map((r) => r?.low).filter((v) => v != null && Number.isFinite(v));
  const highs = ranges.map((r) => r?.high).filter((v) => v != null && Number.isFinite(v));
  if (!lows.length || !highs.length || target == null || !Number.isFinite(target)) {
    // Never invent a ±1.5% band when ranges are missing
    return { low: null, high: null, available: false };
  }
  return {
    low: Number(Math.min(...lows, target).toFixed(2)),
    high: Number(Math.max(...highs, target).toFixed(2)),
    available: true,
  };
}

function buildPrediction(currentPrice, indicators, candles, expiry) {
  const daysAway = Math.max(expiry.daysAway, 1);

  const technical = {
    target: technicalTarget(currentPrice, indicators, daysAway),
    signal: technicalSignal(indicators),
    weight: WEIGHTS.technical,
  };

  const statistical = {
    ...statisticalForecast(candles, daysAway),
    weight: WEIGHTS.statistical,
  };

  const mlRaw = mlForecast(candles, daysAway);
  const ml = {
    ...mlRaw,
    weight: WEIGHTS.ml,
    available: mlRaw.available !== false && mlRaw.target != null,
  };

  // Weighted ensemble over available model targets only — never treat missing ML as 0
  const parts = [];
  if (technical.target != null && Number.isFinite(technical.target)) {
    parts.push({ target: technical.target, weight: WEIGHTS.technical, conf: technical.signal === "NEUTRAL" ? 55 : 70 });
  }
  if (statistical.target != null && Number.isFinite(statistical.target)) {
    const movePct = Math.abs(((statistical.target - currentPrice) / currentPrice) * 100);
    parts.push({
      target: statistical.target,
      weight: WEIGHTS.statistical,
      conf: 100 - Math.min(movePct * 8, 40),
    });
  }
  if (ml.available && ml.target != null && Number.isFinite(ml.target)) {
    parts.push({ target: ml.target, weight: WEIGHTS.ml, conf: ml.confidence ?? 50 });
  }

  if (!parts.length || currentPrice == null || !Number.isFinite(currentPrice)) {
    return {
      available: false,
      date: expiry.date,
      daysAway: expiry.daysAway,
      label: expiry.label,
      target: null,
      range: { low: null, high: null, available: false },
      signal: null,
      confidence: null,
      reason: "Insufficient verified model inputs for ensemble forecast",
      breakdown: { technical, statistical, ml },
    };
  }

  const wSum = parts.reduce((a, p) => a + p.weight, 0);
  const target = Number((parts.reduce((a, p) => a + p.target * (p.weight / wSum), 0)).toFixed(2));
  const confidence = Math.round(parts.reduce((a, p) => a + p.conf * (p.weight / wSum), 0));

  return {
    available: true,
    date: expiry.date,
    daysAway: expiry.daysAway,
    label: expiry.label,
    target,
    range: combineRange([statistical.range], target),
    signal: signalFromChange(currentPrice, target),
    confidence: Math.max(0, Math.min(confidence, 100)),
    breakdown: {
      technical: {
        target: technical.target,
        signal: technical.signal,
        weight: technical.weight,
      },
      statistical: {
        target: statistical.target,
        range: statistical.range,
        weight: statistical.weight,
      },
      ml: {
        available: ml.available,
        target: ml.target,
        confidence: ml.confidence,
        predictedReturn: ml.predictedReturn,
        weight: ml.weight,
        reason: ml.reason || null,
      },
    },
  };
}

function buildNiftyPrediction(candles, meta = {}) {
  if (!candles.length) {
    throw new Error("Insufficient Nifty history");
  }

  const currentPrice = candles[candles.length - 1].close;
  const indicators = computeIndicators(candles);
  const expiries = getNiftyExpiries();

  const weekly = buildPrediction(currentPrice, indicators, candles, expiries.weekly);
  const monthly = buildPrediction(currentPrice, indicators, candles, expiries.monthly);

  const ensembleSignal = signalFromChange(
    currentPrice,
    (weekly.target * 0.45 + monthly.target * 0.55)
  );

  return {
    symbol: "^NSEI",
    name: meta.name || "NIFTY 50",
    currentPrice,
    fetchedAt: new Date().toISOString(),
    indicators: indicators.latest,
    indicatorSeries: {
      rsi: indicators.series.rsi.slice(-30),
      macdHistogram: indicators.series.macdHistogram.slice(-30),
      sma20: indicators.series.sma20.slice(-90),
      sma50: indicators.series.sma50.slice(-90),
    },
    expiries,
    predictions: {
      weekly,
      monthly,
    },
    ensembleSignal,
    disclaimer: "Model-based estimate for educational use only. Not financial advice.",
  };
}

module.exports = {
  buildNiftyPrediction,
  WEIGHTS,
};