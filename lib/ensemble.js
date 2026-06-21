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
  const lows = ranges.map((r) => r.low).filter((v) => v != null);
  const highs = ranges.map((r) => r.high).filter((v) => v != null);
  if (!lows.length || !highs.length) {
    const band = target * 0.015;
    return { low: Number((target - band).toFixed(2)), high: Number((target + band).toFixed(2)) };
  }
  return {
    low: Number(Math.min(...lows, target * 0.985).toFixed(2)),
    high: Number(Math.max(...highs, target * 1.015).toFixed(2)),
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

  const ml = {
    ...mlForecast(candles, daysAway),
    weight: WEIGHTS.ml,
  };

  const target = Number(
    (
      technical.target * WEIGHTS.technical +
      statistical.target * WEIGHTS.statistical +
      ml.target * WEIGHTS.ml
    ).toFixed(2)
  );

  const confidence = Math.round(
    ml.confidence * WEIGHTS.ml +
      (100 - Math.min(Math.abs(((statistical.target - currentPrice) / currentPrice) * 100) * 8, 40)) *
        WEIGHTS.statistical +
      (technical.signal === "NEUTRAL" ? 55 : 70) * WEIGHTS.technical
  );

  return {
    date: expiry.date,
    daysAway: expiry.daysAway,
    label: expiry.label,
    target,
    range: combineRange([statistical.range], target),
    signal: signalFromChange(currentPrice, target),
    confidence: Math.max(25, Math.min(confidence, 92)),
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
        target: ml.target,
        confidence: ml.confidence,
        predictedReturn: ml.predictedReturn,
        weight: ml.weight,
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