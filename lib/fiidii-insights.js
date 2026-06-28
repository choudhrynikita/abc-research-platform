function consecutiveDays(history, field, direction) {
  let count = 0;
  for (const row of history) {
    const v = row[field];
    if (v == null) break;
    if (direction === "buy" && v > 0) count += 1;
    else if (direction === "sell" && v < 0) count += 1;
    else break;
  }
  return count;
}

function buildVerifiedInsights(live, history, aggregates) {
  const insights = [];
  const recent = history.slice(0, Math.min(22, history.length));

  if (live?.fii?.netValue != null && live?.dii?.netValue != null) {
    if (live.fii.netValue > 0 && live.dii.netValue > 0) {
      insights.push({
        type: "flow",
        text: "Both FIIs and DIIs are net buyers in the latest verified NSE session — broad institutional participation.",
        confidence: "high",
      });
    } else if (live.fii.netValue < 0 && live.dii.netValue > 0) {
      insights.push({
        type: "flow",
        text: "DII buying has offset recent foreign selling pressure in the latest session.",
        confidence: "high",
      });
    } else if (live.fii.netValue > 0 && live.dii.netValue < 0) {
      insights.push({
        type: "flow",
        text: "FII-led buying with DII profit-taking in the latest session — foreign accumulation with domestic distribution.",
        confidence: "high",
      });
    } else if (live.fii.netValue < 0 && live.dii.netValue < 0) {
      insights.push({
        type: "risk",
        text: "Both FIIs and DIIs were net sellers in the latest session — distribution risk elevated.",
        confidence: "high",
      });
    }
  }

  const fiiStreak = consecutiveDays(history, "fiiNet", "buy");
  const fiiSellStreak = consecutiveDays(history, "fiiNet", "sell");
  if (fiiStreak >= 3) {
    insights.push({
      type: "trend",
      text: `FIIs have recorded net buying for ${fiiStreak} consecutive stored sessions.`,
      confidence: fiiStreak >= 5 ? "high" : "medium",
    });
  }
  if (fiiSellStreak >= 3) {
    insights.push({
      type: "trend",
      text: `FIIs have recorded net selling for ${fiiSellStreak} consecutive stored sessions.`,
      confidence: fiiSellStreak >= 5 ? "high" : "medium",
    });
  }

  const diiStreak = consecutiveDays(history, "diiNet", "buy");
  if (diiStreak >= 3) {
    insights.push({
      type: "trend",
      text: `DIIs have supported the market with net buying for ${diiStreak} consecutive stored sessions.`,
      confidence: "medium",
    });
  }

  if (aggregates?.fii?.monthly?.available && aggregates?.dii?.monthly?.available) {
    const fiiM = aggregates.fii.monthly.value;
    const diiM = aggregates.dii.monthly.value;
    if (fiiM > 0 && diiM > 0) {
      insights.push({
        type: "monthly",
        text: `Monthly institutional flows are positive — FII net ${fiiM.toLocaleString()} Cr, DII net ${diiM.toLocaleString()} Cr (verified sessions).`,
        confidence: "medium",
      });
    } else if (fiiM < 0 && diiM > 0) {
      insights.push({
        type: "monthly",
        text: `Monthly DII inflows (${diiM.toLocaleString()} Cr) are absorbing FII outflows (${fiiM.toLocaleString()} Cr).`,
        confidence: "medium",
      });
    }
  }

  if (recent.length >= 5) {
    const fiiBuyDays = recent.filter((r) => (r.fiiNet ?? 0) > 0).length;
    const fiiSellDays = recent.filter((r) => (r.fiiNet ?? 0) < 0).length;
    if (fiiBuyDays > fiiSellDays * 1.5) {
      insights.push({
        type: "accumulation",
        text: `FII accumulation pattern: ${fiiBuyDays} of last ${recent.length} stored sessions show net buying.`,
        confidence: "medium",
      });
    } else if (fiiSellDays > fiiBuyDays * 1.5) {
      insights.push({
        type: "distribution",
        text: `FII distribution pattern: ${fiiSellDays} of last ${recent.length} stored sessions show net selling.`,
        confidence: "medium",
      });
    }
  }

  return insights;
}

function buildSentiment(live, history) {
  if (live?.fii?.netValue == null || live?.dii?.netValue == null) {
    return { label: null, mood: null, available: false };
  }

  const combined = live.fii.netValue + live.dii.netValue;
  let mood = "Neutral";
  let label = "Mixed institutional flows";

  if (combined > 3000) {
    mood = "Bullish";
    label = "Strong institutional inflow";
  } else if (combined > 0) {
    mood = "Cautiously Bullish";
    label = "Net institutional buying";
  } else if (combined < -3000) {
    mood = "Bearish";
    label = "Strong institutional outflow";
  } else if (combined < 0) {
    mood = "Cautiously Bearish";
    label = "Net institutional selling";
  }

  const recent = history.slice(0, 5);
  if (recent.length >= 3) {
    const avgFii = recent.reduce((a, r) => a + (r.fiiNet ?? 0), 0) / recent.length;
    if (avgFii > 1000 && mood.includes("Bullish")) label = "Sustained FII accumulation";
    if (avgFii < -1000 && mood.includes("Bearish")) label = "Sustained FII distribution";
  }

  return { label, mood, combined, available: true };
}

function buildMarketStatus() {
  const now = new Date();
  const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const day = ist.getDay();
  const hours = ist.getHours();
  const mins = ist.getMinutes();
  const timeVal = hours * 60 + mins;

  const isWeekday = day >= 1 && day <= 5;
  const marketOpen = 9 * 60 + 15;
  const marketClose = 15 * 60 + 30;
  const isOpen = isWeekday && timeVal >= marketOpen && timeVal <= marketClose;

  return {
    status: isOpen ? "open" : "closed",
    label: isOpen ? "Market Open" : "Market Closed",
    timezone: "Asia/Kolkata",
    checkedAt: now.toISOString(),
  };
}

module.exports = { buildVerifiedInsights, buildSentiment, buildMarketStatus };