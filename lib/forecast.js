function linearRegression(values) {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] ?? 0 };

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i += 1) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX || 1);
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function exponentialSmoothing(values, alpha = 0.3) {
  if (!values.length) return 0;
  let smoothed = values[0];
  for (let i = 1; i < values.length; i += 1) {
    smoothed = alpha * values[i] + (1 - alpha) * smoothed;
  }
  return smoothed;
}

function standardDeviation(values) {
  if (!values.length) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function dailyReturns(closes) {
  const returns = [];
  for (let i = 1; i < closes.length; i += 1) {
    returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }
  return returns;
}

function statisticalForecast(candles, daysAway) {
  const closes = candles.map((c) => c.close).filter((v) => v != null);
  const window = closes.slice(-60);
  const shortWindow = closes.slice(-30);

  const regression = linearRegression(shortWindow);
  const regressionTarget =
    regression.intercept + regression.slope * (shortWindow.length - 1 + daysAway);

  const smoothed = exponentialSmoothing(window, 0.25);
  const recentReturn =
    window.length > 1 ? (window[window.length - 1] - window[window.length - 2]) / window[window.length - 2] : 0;
  const smoothedTarget = smoothed * (1 + recentReturn * daysAway * 0.6);

  const target = Number(((regressionTarget + smoothedTarget) / 2).toFixed(2));

  const returns = dailyReturns(closes.slice(-21));
  const vol = standardDeviation(returns);
  const band = closes[closes.length - 1] * vol * Math.sqrt(Math.max(daysAway, 1)) * 1.65;

  return {
    target,
    range: {
      low: Number((target - band).toFixed(2)),
      high: Number((target + band).toFixed(2)),
    },
    regressionTarget: Number(regressionTarget.toFixed(2)),
    smoothedTarget: Number(smoothedTarget.toFixed(2)),
  };
}

module.exports = {
  statisticalForecast,
  linearRegression,
  standardDeviation,
  dailyReturns,
};