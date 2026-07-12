const { MultivariateLinearRegression } = require("ml-regression");
const { computeIndicators } = require("./indicators");
const { standardDeviation, dailyReturns } = require("./forecast");

function buildFeatureRow(candles, index, indicators) {
  const close = candles[index].close;
  const close1 = candles[index - 1]?.close;
  const close5 = candles[index - 5]?.close;
  const close10 = candles[index - 10]?.close;
  const rsi = indicators.series.rsi[index];
  const macdHistogram = indicators.series.macdHistogram[index];
  const sma20 = indicators.series.sma20[index];
  const sma50 = indicators.series.sma50[index];

  if ([close, close1, close5, close10, rsi, macdHistogram, sma20, sma50].some((v) => v == null)) {
    return null;
  }

  const recentCloses = candles.slice(Math.max(0, index - 10), index + 1).map((c) => c.close);
  const volatility = standardDeviation(dailyReturns(recentCloses));

  return [
    (close - close1) / close1,
    (close - close5) / close5,
    (close - close10) / close10,
    rsi / 100,
    macdHistogram / close,
    (close - sma20) / sma20,
    (close - sma50) / sma50,
    volatility,
  ];
}

function trainReturnModel(candles, horizon) {
  const indicators = computeIndicators(candles);
  const rows = [];
  const targets = [];

  for (let i = 15; i < candles.length - horizon; i += 1) {
    const features = buildFeatureRow(candles, i, indicators);
    if (!features) continue;
    const futureClose = candles[i + horizon].close;
    const currentClose = candles[i].close;
    rows.push(features);
    targets.push((futureClose - currentClose) / currentClose);
  }

  if (rows.length < 30) {
    return { model: null, mape: 1 };
  }

  const model = new MultivariateLinearRegression(
    rows,
    targets.map((value) => [value]),
    { intercept: true, statistics: false }
  );

  const validationRows = rows.slice(-20);
  const validationTargets = targets.slice(-20);
  let absPctError = 0;
  let count = 0;

  validationRows.forEach((row, idx) => {
    const predicted = model.predict(row)[0];
    const actual = validationTargets[idx];
    if (actual !== 0) {
      absPctError += Math.abs((predicted - actual) / actual);
      count += 1;
    }
  });

  const mape = count ? absPctError / count : 1;
  return { model, mape, indicators };
}

function mlForecast(candles, daysAway) {
  const horizon = Math.max(1, Math.min(daysAway, 30));
  const { model, mape, indicators } = trainReturnModel(candles, horizon);
  const currentClose = candles[candles.length - 1].close;

  if (!model) {
    // Never invent a flat-price "forecast" with fake confidence
    return {
      available: false,
      target: null,
      confidence: null,
      predictedReturn: null,
      mape: null,
      reason: "Insufficient verified history to train return model",
    };
  }

  const index = candles.length - 1;
  const features = buildFeatureRow(candles, index, indicators);
  let predictedReturn = 0;

  if (features) {
    predictedReturn = model.predict(features)[0];
    if (daysAway !== horizon) {
      predictedReturn *= daysAway / horizon;
    }
  }

  const target = Number((currentClose * (1 + predictedReturn)).toFixed(2));
  const confidence = Math.max(25, Math.min(90, Math.round(90 - mape * 100)));

  return {
    target,
    confidence,
    predictedReturn: Number((predictedReturn * 100).toFixed(4)),
    mape: Number(mape.toFixed(4)),
  };
}

module.exports = {
  mlForecast,
};