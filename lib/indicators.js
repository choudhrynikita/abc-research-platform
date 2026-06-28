function sma(values, period) {
  const result = Array(values.length).fill(null);
  for (let i = period - 1; i < values.length; i += 1) {
    const slice = values.slice(i - period + 1, i + 1);
    result[i] = slice.reduce((sum, v) => sum + v, 0) / period;
  }
  return result;
}

function ema(values, period) {
  const result = Array(values.length).fill(null);
  const multiplier = 2 / (period + 1);
  let prev = null;

  for (let i = 0; i < values.length; i += 1) {
    const value = values[i];
    if (value == null) continue;
    if (prev == null) {
      if (i >= period - 1) {
        const seed = values.slice(i - period + 1, i + 1);
        if (seed.every((v) => v != null)) {
          prev = seed.reduce((sum, v) => sum + v, 0) / period;
          result[i] = prev;
        }
      }
    } else {
      prev = (value - prev) * multiplier + prev;
      result[i] = prev;
    }
  }
  return result;
}

function rsi(closes, period = 14) {
  const result = Array(closes.length).fill(null);
  if (closes.length <= period) return result;

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i += 1) {
    const change = closes[i] - closes[i - 1];
    if (change >= 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }
  avgGain /= period;
  avgLoss /= period;

  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < closes.length; i += 1) {
    const change = closes[i] - closes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return result;
}

function macd(closes, fast = 12, slow = 26, signalPeriod = 9) {
  const emaFast = ema(closes, fast);
  const emaSlow = ema(closes, slow);
  const line = closes.map((_, i) =>
    emaFast[i] != null && emaSlow[i] != null ? emaFast[i] - emaSlow[i] : null
  );
  const signal = ema(
    line.map((v) => v ?? 0),
    signalPeriod
  );
  const histogram = line.map((value, i) =>
    value != null && signal[i] != null ? value - signal[i] : null
  );
  return { line, signal, histogram };
}

function bollingerBands(closes, period = 20, stdDevMultiplier = 2) {
  const middle = sma(closes, period);
  const upper = Array(closes.length).fill(null);
  const lower = Array(closes.length).fill(null);

  for (let i = period - 1; i < closes.length; i += 1) {
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = middle[i];
    const variance = slice.reduce((sum, v) => sum + (v - mean) ** 2, 0) / period;
    const stdDev = Math.sqrt(variance);
    upper[i] = mean + stdDevMultiplier * stdDev;
    lower[i] = mean - stdDevMultiplier * stdDev;
  }

  return { upper, middle, lower };
}

function trueRange(candles) {
  const tr = [];
  for (let i = 0; i < candles.length; i += 1) {
    if (i === 0) {
      tr.push(candles[i].high - candles[i].low);
    } else {
      const hl = candles[i].high - candles[i].low;
      const hc = Math.abs(candles[i].high - candles[i - 1].close);
      const lc = Math.abs(candles[i].low - candles[i - 1].close);
      tr.push(Math.max(hl, hc, lc));
    }
  }
  return tr;
}

function atr(candles, period = 14) {
  const tr = trueRange(candles);
  const result = Array(candles.length).fill(null);
  if (tr.length < period) return result;
  let sum = tr.slice(0, period).reduce((a, b) => a + b, 0);
  result[period - 1] = sum / period;
  for (let i = period; i < tr.length; i += 1) {
    result[i] = (result[i - 1] * (period - 1) + tr[i]) / period;
  }
  return result;
}

function cmo(closes, period = 14) {
  const result = Array(closes.length).fill(null);
  if (closes.length <= period) return result;

  for (let i = period; i < closes.length; i += 1) {
    let up = 0;
    let down = 0;
    for (let j = i - period + 1; j <= i; j += 1) {
      const change = closes[j] - closes[j - 1];
      if (change > 0) up += change;
      else down += Math.abs(change);
    }
    result[i] = down === 0 ? 100 : ((up - down) / (up + down)) * 100;
  }
  return result;
}

function adx(candles, period = 14) {
  const len = candles.length;
  const result = Array(len).fill(null);
  if (len <= period * 2) return result;

  const plusDM = [];
  const minusDM = [];
  const tr = trueRange(candles);

  for (let i = 1; i < len; i += 1) {
    const upMove = candles[i].high - candles[i - 1].high;
    const downMove = candles[i - 1].low - candles[i].low;
    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
  }

  const smooth = (arr, p) => {
    const out = [];
    let sum = arr.slice(0, p).reduce((a, b) => a + b, 0);
    out.push(sum);
    for (let i = p; i < arr.length; i += 1) {
      sum = sum - sum / p + arr[i];
      out.push(sum);
    }
    return out;
  };

  const trSmooth = smooth(tr.slice(1), period);
  const plusSmooth = smooth(plusDM, period);
  const minusSmooth = smooth(minusDM, period);

  const dx = [];
  for (let i = 0; i < trSmooth.length; i += 1) {
    const pdi = trSmooth[i] ? (100 * plusSmooth[i]) / trSmooth[i] : 0;
    const mdi = trSmooth[i] ? (100 * minusSmooth[i]) / trSmooth[i] : 0;
    const sum = pdi + mdi;
    dx.push(sum ? (100 * Math.abs(pdi - mdi)) / sum : 0);
  }

  let adxVal = dx.slice(0, period).reduce((a, b) => a + b, 0) / period;
  const start = period * 2 - 1;
  result[start] = adxVal;
  for (let i = period; i < dx.length; i += 1) {
    adxVal = (adxVal * (period - 1) + dx[i]) / period;
    result[start + (i - period) + 1] = adxVal;
  }
  return result;
}

function volumeTrend(candles, period = 20) {
  const volumes = candles.map((c) => c.volume ?? 0);
  const avg = sma(volumes, period);
  const latestVol = latest(volumes);
  const latestAvg = latest(avg);
  if (!latestVol || !latestAvg) return { ratio: null, label: "Unavailable" };
  const ratio = Number((latestVol / latestAvg).toFixed(2));
  return {
    ratio,
    label: ratio > 1.2 ? "Rising" : ratio < 0.8 ? "Falling" : "Stable",
  };
}

function findSupportResistance(candles, lookback = 20) {
  const recent = candles.slice(-lookback);
  const lows = recent.map((c) => c.low).filter((v) => v != null);
  const highs = recent.map((c) => c.high).filter((v) => v != null);
  return {
    support: lows.length ? Math.min(...lows) : null,
    resistance: highs.length ? Math.max(...highs) : null,
  };
}

function latest(values) {
  for (let i = values.length - 1; i >= 0; i -= 1) {
    if (values[i] != null) return values[i];
  }
  return null;
}

function computeIndicators(candles) {
  const closes = candles.map((c) => c.close);
  const sma20Series = sma(closes, 20);
  const sma50Series = sma(closes, 50);
  const sma100Series = sma(closes, 100);
  const sma200Series = sma(closes, 200);
  const ema12Series = ema(closes, 12);
  const ema26Series = ema(closes, 26);
  const rsiSeries = rsi(closes, 14);
  const macdSeries = macd(closes);
  const bollinger = bollingerBands(closes);
  const cmoSeries = cmo(closes, 14);
  const adxSeries = adx(candles, 14);
  const atrSeries = atr(candles, 14);
  const volTrend = volumeTrend(candles);
  const levels = findSupportResistance(candles);

  return {
    series: {
      sma20: sma20Series,
      sma50: sma50Series,
      sma100: sma100Series,
      sma200: sma200Series,
      ema12: ema12Series,
      ema26: ema26Series,
      rsi: rsiSeries,
      macdLine: macdSeries.line,
      macdSignal: macdSeries.signal,
      macdHistogram: macdSeries.histogram,
      bollingerUpper: bollinger.upper,
      bollingerMiddle: bollinger.middle,
      bollingerLower: bollinger.lower,
      cmo: cmoSeries,
      adx: adxSeries,
      atr: atrSeries,
    },
    latest: {
      sma20: latest(sma20Series),
      sma50: latest(sma50Series),
      sma100: latest(sma100Series),
      sma200: latest(sma200Series),
      ema12: latest(ema12Series),
      ema26: latest(ema26Series),
      rsi: latest(rsiSeries),
      macdLine: latest(macdSeries.line),
      macdSignal: latest(macdSeries.signal),
      macdHistogram: latest(macdSeries.histogram),
      bollingerUpper: latest(bollinger.upper),
      bollingerMiddle: latest(bollinger.middle),
      bollingerLower: latest(bollinger.lower),
      cmo: latest(cmoSeries),
      adx: latest(adxSeries),
      atr: latest(atrSeries),
      volumeTrend: volTrend.label,
      volumeRatio: volTrend.ratio,
      support: levels.support,
      resistance: levels.resistance,
    },
  };
}

function technicalSignal(indicators) {
  const { latest: l } = indicators;
  let score = 0;

  if (l.rsi != null) {
    if (l.rsi < 30) score += 2;
    else if (l.rsi > 70) score -= 2;
    else if (l.rsi >= 55) score += 1;
    else if (l.rsi <= 45) score -= 1;
  }

  if (l.macdHistogram != null) {
    if (l.macdHistogram > 0) score += 1;
    else if (l.macdHistogram < 0) score -= 1;
  }

  if (l.sma20 != null && l.sma50 != null) {
    if (l.sma20 > l.sma50) score += 1;
    else if (l.sma20 < l.sma50) score -= 1;
  }

  if (l.ema12 != null && l.ema26 != null) {
    if (l.ema12 > l.ema26) score += 1;
    else if (l.ema12 < l.ema26) score -= 1;
  }

  if (score >= 2) return "BULLISH";
  if (score <= -2) return "BEARISH";
  return "NEUTRAL";
}

function technicalTarget(currentPrice, indicators, daysAway) {
  const closes = [];
  const { sma20, sma50, ema12, ema26 } = indicators.latest;
  const refs = [sma20, sma50, ema12, ema26].filter((v) => v != null);
  const anchor = refs.length ? refs.reduce((sum, v) => sum + v, 0) / refs.length : currentPrice;
  const slope = (currentPrice - anchor) / 20;
  const signal = technicalSignal(indicators);
  const bias = signal === "BULLISH" ? 1.15 : signal === "BEARISH" ? 0.85 : 1;
  return Number((currentPrice + slope * daysAway * bias).toFixed(2));
}

module.exports = {
  computeIndicators,
  technicalSignal,
  technicalTarget,
  sma,
  cmo,
  adx,
  atr,
  volumeTrend,
};