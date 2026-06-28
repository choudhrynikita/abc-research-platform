const { isAvailable } = require("./format");

function val(field) {
  if (field == null) return null;
  if (typeof field === "object") return field.available === false ? null : field.value ?? null;
  return field;
}

function buildInsightCards(data) {
  const insights = [];
  const t = data.technicalAnalysis || {};
  const fund = data.fundamentalAnalysis || {};
  const price = data.price;

  if (price != null && t.sma20 != null && t.sma50 != null && t.sma50) {
    const above20 = price > t.sma20;
    const above50 = price > t.sma50;
    if (above20 && above50) {
      insights.push({
        category: "Technical",
        text: "Price is trading above the 20 and 50 DMA, indicating positive short-to-medium term momentum.",
        verified: true,
      });
    } else if (!above20 && !above50) {
      insights.push({
        category: "Technical",
        text: "Price is below the 20 and 50 DMA — short-term trend remains weak.",
        verified: true,
      });
    }
  }

  if (t.rsi != null) {
    if (t.rsi >= 50 && t.rsi <= 70) {
      insights.push({
        category: "Technical",
        text: `RSI at ${t.rsi.toFixed(1)} — healthy bullish momentum without extreme overbought conditions.`,
        verified: true,
      });
    } else if (t.rsi > 70) {
      insights.push({
        category: "Technical",
        text: `RSI at ${t.rsi.toFixed(1)} — overbought territory; pullback risk elevated.`,
        verified: true,
      });
    } else if (t.rsi < 35) {
      insights.push({
        category: "Technical",
        text: `RSI at ${t.rsi.toFixed(1)} — oversold conditions; potential mean-reversion setup.`,
        verified: true,
      });
    }
  }

  if (t.macdHistogram != null) {
    insights.push({
      category: "Technical",
      text:
        t.macdHistogram > 0
          ? "MACD histogram is positive — bullish momentum confirmed."
          : "MACD histogram is negative — bearish momentum in control.",
      verified: true,
    });
  }

  const revGrowth = val(fund.revenueGrowth);
  const profitGrowth = val(fund.profitGrowth);
  if (revGrowth != null && revGrowth > 0) {
    insights.push({
      category: "Fundamental",
      text: `Revenue growth at ${(revGrowth * 100).toFixed(1)}% (Yahoo Finance verified).`,
      verified: true,
    });
  }
  if (profitGrowth != null && profitGrowth > 0) {
    insights.push({
      category: "Fundamental",
      text: `Earnings/profit growth at ${(profitGrowth * 100).toFixed(1)}% (verified source).`,
      verified: true,
    });
  }

  const roe = val(fund.roe);
  if (roe != null && roe > 0.12) {
    insights.push({
      category: "Fundamental",
      text: `ROE of ${(roe * 100).toFixed(1)}% indicates strong capital efficiency.`,
      verified: true,
    });
  }

  const pe = val(data.valuationAnalysis?.peRatio);
  const sectorPe = data.industryComparison?.avgPe;
  if (pe != null && sectorPe != null && pe < sectorPe) {
    insights.push({
      category: "Valuation",
      text: `Stock trades at P/E ${pe.toFixed(1)} vs peer average ${sectorPe.toFixed(1)} — relatively attractive valuation.`,
      verified: true,
    });
  }

  if (data.relativeStrength?.vsNifty != null) {
    const rs = data.relativeStrength.vsNifty;
    insights.push({
      category: "Relative Strength",
      text:
        rs > 2
          ? `Outperforming NIFTY 50 by ${rs.toFixed(1)}% over 1 month.`
          : rs < -2
            ? `Underperforming NIFTY 50 by ${Math.abs(rs).toFixed(1)}% over 1 month.`
            : "Performance broadly in line with NIFTY 50 over 1 month.",
      verified: true,
    });
  }

  if (data.sectorComparison?.available && data.sectorComparison.sectorAvgChange1m != null) {
    const sect = data.sectorComparison;
    insights.push({
      category: "Sector",
      text: `${sect.sector} sector average 1-month change: ${sect.sectorAvgChange1m}% (verified peer prices).`,
      verified: true,
    });
  }

  return insights;
}

function buildThesisBullets(data, decision) {
  const bullets = [];
  const t = data.technicalAnalysis || {};
  const fund = data.fundamentalAnalysis || {};

  if (t.trend === "BULLISH") bullets.push("Positive technical trend structure (SMA/RSI/MACD ensemble)");
  if (val(fund.revenueGrowth) > 0) bullets.push("Revenue growth trend positive");
  if (val(fund.operatingMargin) > 0.1) bullets.push("Healthy operating margins");
  if (val(fund.debtToEquity) != null && val(fund.debtToEquity) < 1) bullets.push("Manageable debt profile");
  if (data.sectorComparison?.sectorOutlook === "BULLISH") bullets.push("Sector tailwinds supporting relative performance");
  if (decision?.valuationStatus === "Attractive") bullets.push("Valuation attractive vs peers");

  if (bullets.length < 3 && t.trend) {
    bullets.push(`Technical bias: ${t.trend} based on verified price data`);
  }
  if (bullets.length < 3 && data.price != null) {
    bullets.push(`Current price ₹${data.price.toLocaleString()} from Yahoo Finance`);
  }

  return bullets.slice(0, 5);
}

function computeRatings(data) {
  const t = data.technicalAnalysis || {};
  const fund = data.fundamentalAnalysis || {};
  const confidence = data.aiConclusion?.confidenceScore ?? 50;

  let technical = 50;
  if (t.trend === "BULLISH") technical += 20;
  if (t.trend === "BEARISH") technical -= 20;
  if (t.rsi != null && t.rsi >= 45 && t.rsi <= 65) technical += 10;
  if (t.macdHistogram > 0) technical += 10;
  technical = Math.max(0, Math.min(100, technical));

  let fundamental = null;
  const roe = val(fund.roe);
  const rev = val(fund.revenueGrowth);
  if (roe != null || rev != null) {
    fundamental = 50;
    if (roe > 0.15) fundamental += 15;
    else if (roe > 0.1) fundamental += 8;
    if (rev > 0.1) fundamental += 15;
    else if (rev > 0) fundamental += 8;
    if (val(fund.debtToEquity) < 0.8) fundamental += 10;
    fundamental = Math.max(0, Math.min(100, fundamental));
  }

  let industry = data.sectorComparison?.available ? 50 : null;
  if (industry != null && data.sectorComparison.sectorAvgChange1m != null) {
    industry += data.sectorComparison.sectorAvgChange1m > 1 ? 15 : data.sectorComparison.sectorAvgChange1m < -1 ? -15 : 0;
    industry = Math.max(0, Math.min(100, industry));
  }

  const weights = fundamental != null ? [0.35, 0.3, 0.15, 0.2] : [0.5, 0, 0.2, 0.3];
  const parts = [technical, fundamental ?? technical, industry ?? 50, confidence];
  const overall = Math.round(
    parts[0] * weights[0] + parts[1] * weights[1] + parts[2] * weights[2] + parts[3] * weights[3]
  );

  let recommendation = "Hold";
  if (overall >= 70 && t.trend !== "BEARISH") recommendation = "Buy";
  else if (overall < 45 || t.trend === "BEARISH") recommendation = "Avoid";

  let riskLevel = "Medium";
  if (t.atr != null && data.price > 0) {
    const vol = (t.atr / data.price) * 100;
    if (vol > 4) riskLevel = "High";
    else if (vol < 2) riskLevel = "Low";
  }

  let valuationStatus = "Fair";
  const pe = val(data.valuationAnalysis?.peRatio);
  const avgPe = data.industryComparison?.avgPe;
  if (pe != null && avgPe != null) {
    if (pe < avgPe * 0.85) valuationStatus = "Attractive";
    else if (pe > avgPe * 1.2) valuationStatus = "Expensive";
  } else if (pe == null) {
    valuationStatus = null;
  }

  return {
    overallRating: overall,
    recommendation,
    confidenceLevel: confidence >= 75 ? "High" : confidence >= 55 ? "Medium" : "Low",
    investmentHorizon: t.trend === "BULLISH" ? "Positional" : "Swing",
    riskLevel,
    valuationStatus,
    technicalRating: technical,
    fundamentalRating: fundamental,
    industryRating: industry,
    aiConviction: confidence,
    sectorOutlook: data.sectorComparison?.sectorOutlook || null,
  };
}

module.exports = { buildInsightCards, buildThesisBullets, computeRatings, val };