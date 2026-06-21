const { computeIndicators, technicalSignal } = require("./indicators");
const { isAvailable } = require("./format");

function runTechnicalScreen(constituents) {
  const matches = [];
  const screened = constituents.filter((c) => c.price != null && c.technicals);

  screened.forEach((c) => {
    const t = c.technicals;
    const reasons = [];
    if (t.trend === "BULLISH") reasons.push("Bullish trend structure (SMA/RSI/MACD ensemble)");
    if (t.rsi != null && t.rsi >= 50 && t.rsi <= 70) reasons.push("Positive momentum (RSI 50–70)");
    if (t.volumeTrend === "Rising") reasons.push("Volume confirmation (above 20d average)");
    if (c.price != null && t.resistance != null && c.price >= t.resistance * 0.98) {
      reasons.push("Near resistance — breakout watch");
    }
    if (t.sma20 != null && t.sma50 != null && t.sma20 > t.sma50) {
      reasons.push("Short-term MA above long-term MA");
    }
    if (reasons.length >= 2) {
      matches.push({
        symbol: c.symbol,
        name: c.name,
        sector: c.sector,
        price: c.price,
        changePercent: c.changePercent,
        reasons,
      });
    }
  });

  return {
    criteria: [
      "Bullish trend structure",
      "Positive momentum",
      "Volume confirmation",
      "Breakout or trend continuation signals",
    ],
    screened: screened.length,
    matches,
    note: "Screening uses verified Yahoo Finance OHLCV only. No estimated fundamentals.",
  };
}

function runFundamentalScreen(constituents) {
  const withFundamentals = constituents.filter(
    (c) =>
      isAvailable(c.peRatio?.value ?? c.peRatio) ||
      isAvailable(c.roe?.value ?? c.roe) ||
      isAvailable(c.revenueGrowth?.value ?? c.revenueGrowth)
  );

  if (!withFundamentals.length) {
    return {
      available: false,
      criteria: [
        "Consistent revenue growth",
        "Consistent earnings growth",
        "Strong ROE",
        "Healthy cash flow",
        "Low debt levels",
        "Reasonable valuation",
      ],
      matches: [],
      message:
        "Fundamental screening feed unavailable (PE, ROE, revenue growth require licensed NSE/BSE fundamentals API). No stocks selected to prevent fabricated results.",
    };
  }

  const matches = withFundamentals.filter((c) => {
    const roe = c.roe?.value ?? c.roe;
    const pe = c.peRatio?.value ?? c.peRatio;
    const rev = c.revenueGrowth?.value ?? c.revenueGrowth;
    const debt = c.debtToEquity?.value ?? c.debtToEquity;
    return (
      (rev == null || rev > 0) &&
      (roe == null || roe > 0.12) &&
      (debt == null || debt < 1) &&
      (pe == null || (pe > 5 && pe < 60))
    );
  });

  return {
    available: true,
    criteria: ["Revenue growth", "ROE", "Debt levels", "Valuation"],
    matches: matches.map((c) => ({
      symbol: c.symbol,
      name: c.name,
      pe: c.peRatio?.value ?? c.peRatio,
      roe: c.roe?.value ?? c.roe,
      revenueGrowth: c.revenueGrowth?.value ?? c.revenueGrowth,
    })),
    screened: withFundamentals.length,
  };
}

async function enrichConstituentTechnicals(item, fetchChart) {
  try {
    const chart = await fetchChart(item.symbol, "1d", "3mo");
    const candles = chart.candles.filter((c) => c.close != null);
    if (candles.length < 30) return { ...item, technicals: null };
    const indicators = computeIndicators(candles);
    return {
      ...item,
      technicals: {
        ...indicators.latest,
        trend: technicalSignal(indicators),
      },
    };
  } catch {
    return { ...item, technicals: null };
  }
}

module.exports = {
  runTechnicalScreen,
  runFundamentalScreen,
  enrichConstituentTechnicals,
};