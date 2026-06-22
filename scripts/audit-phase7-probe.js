const BASE = process.env.ABC_BASE || "http://localhost:4000";

function synthCandles(count = 120, start = 24000) {
  const candles = [];
  let price = start;
  for (let i = 0; i < count; i += 1) {
    const drift = Math.sin(i / 6) * 40 + (i % 9 - 4) * 8;
    price = Math.max(start * 0.85, price + drift);
    candles.push({
      date: `2025-${String(Math.floor(i / 28) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
      open: price - 20,
      high: price + 60,
      low: price - 60,
      close: price,
      volume: 1_000_000 + i * 5000,
    });
  }
  return candles;
}

function isFiniteNum(n) {
  return typeof n === "number" && Number.isFinite(n);
}

function walkFinite(obj, issues, path = "root") {
  if (obj == null) return;
  if (typeof obj === "number") {
    if (!Number.isFinite(obj)) issues.push(`${path}=${obj}`);
    return;
  }
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => walkFinite(v, issues, `${path}[${i}]`));
    return;
  }
  if (typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) walkFinite(v, issues, `${path}.${k}`);
  }
}

function testIndicators() {
  const { computeIndicators, technicalSignal, rsi, cmo, adx, atr, sma } = require("../lib/indicators");
  const candles = synthCandles(120);
  const closes = candles.map((c) => c.close);
  const indicators = computeIndicators(candles);
  const l = indicators.latest;
  let ok = true;

  const rsiPass = l.rsi == null || (l.rsi >= 0 && l.rsi <= 100);
  console.log(`${rsiPass ? "PASS" : "FAIL"} indicators RSI bounded 0-100 (${l.rsi})`);
  ok = rsiPass && ok;

  const cmoLast = cmo(closes).filter((v) => v != null).at(-1);
  const cmoPass = cmoLast == null || (cmoLast >= -100 && cmoLast <= 100);
  console.log(`${cmoPass ? "PASS" : "FAIL"} indicators CMO bounded -100..100 (${cmoLast})`);
  ok = cmoPass && ok;

  const adxLast = adx(candles).filter((v) => v != null).at(-1);
  const adxPass = adxLast == null || (adxLast >= 0 && adxLast <= 100);
  console.log(`${adxPass ? "PASS" : "FAIL"} indicators ADX bounded 0-100 (${adxLast})`);
  ok = adxPass && ok;

  const atrLast = atr(candles).filter((v) => v != null).at(-1);
  const atrPass = atrLast == null || atrLast > 0;
  console.log(`${atrPass ? "PASS" : "FAIL"} indicators ATR positive (${atrLast})`);
  ok = atrPass && ok;

  const sma20 = sma(closes, 20).at(-1);
  const smaPass = sma20 != null && sma20 > 0;
  console.log(`${smaPass ? "PASS" : "FAIL"} indicators SMA20 computed`);
  ok = smaPass && ok;

  const signal = technicalSignal(indicators);
  const sigPass = ["BULLISH", "BEARISH", "NEUTRAL"].includes(signal);
  console.log(`${sigPass ? "PASS" : "FAIL"} indicators technicalSignal=${signal}`);
  ok = sigPass && ok;

  return ok;
}

function testEnsembleMl() {
  const { buildNiftyPrediction, WEIGHTS } = require("../lib/ensemble");
  const { statisticalForecast } = require("../lib/forecast");
  const { mlForecast } = require("../lib/mlModel");
  const candles = synthCandles(120);
  let ok = true;

  const weightSum = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
  const wPass = Math.abs(weightSum - 1) < 0.001;
  console.log(`${wPass ? "PASS" : "FAIL"} ensemble weights sum to 1 (${weightSum})`);
  ok = wPass && ok;

  const pred = buildNiftyPrediction(candles);
  const weekly = pred.predictions.weekly;
  const confPass = weekly.confidence >= 25 && weekly.confidence <= 92;
  const targetPass = isFiniteNum(weekly.target) && weekly.target > 0;
  const rangePass = weekly.range.low < weekly.range.high;
  console.log(`${confPass && targetPass && rangePass ? "PASS" : "FAIL"} ensemble prediction bounds (conf=${weekly.confidence}, target=${weekly.target})`);
  ok = confPass && targetPass && rangePass && ok;

  const stat = statisticalForecast(candles, 5);
  const statPass = isFiniteNum(stat.target) && stat.range.low < stat.range.high;
  console.log(`${statPass ? "PASS" : "FAIL"} statistical forecast finite range`);
  ok = statPass && ok;

  const ml = mlForecast(candles, 5);
  const mlPass = ml.confidence >= 25 && ml.confidence <= 90 && isFiniteNum(ml.target);
  console.log(`${mlPass ? "PASS" : "FAIL"} ml forecast confidence/target (conf=${ml.confidence})`);
  ok = mlPass && ok;

  const ensPass = ["BULLISH", "BEARISH", "NEUTRAL"].includes(pred.ensembleSignal);
  console.log(`${ensPass ? "PASS" : "FAIL"} ensembleSignal valid`);
  ok = ensPass && ok;

  return ok;
}

function testConfidenceAlignment() {
  const { computeConfidence, field } = require("../lib/confidence");
  const { computeAlignment } = require("../lib/alignment");
  let ok = true;

  const score = computeConfidence({
    fields: [field("a", 1, "t"), field("b", null, "t")],
    alignment: 80,
    modelAgreement: 70,
    backtestQuality: { samples: 25, hitRate: 55 },
  });
  const confPass = score >= 0 && score <= 100;
  console.log(`${confPass ? "PASS" : "FAIL"} confidence score bounded 0-100 (${score})`);
  ok = confPass && ok;

  const alignPass =
    computeAlignment("BULLISH", "BULLISH") === "aligned" &&
    computeAlignment("BULLISH", "BEARISH") === "conflict" &&
    computeAlignment("NEUTRAL", "BULLISH") === "neutral";
  console.log(`${alignPass ? "PASS" : "FAIL"} alignment logic`);
  ok = alignPass && ok;

  return ok;
}

function testFiiAggregates() {
  const { buildAggregates } = require("../lib/fii-history");
  const rows = [
    { date: "22-Jun-2026", fiiNet: 100, diiNet: 50, recordedAt: "2026-06-22" },
    { date: "21-Jun-2026", fiiNet: 200, diiNet: -30, recordedAt: "2026-06-21" },
  ];
  const agg = buildAggregates(rows);
  const pass = !agg.fii.quarterly.available && agg.fii.quarterly.value == null;
  console.log(`${pass ? "PASS" : "FAIL"} fii quarterly unavailable with 2 sessions`);
  return pass;
}

function testOptionsChain() {
  const { analyzeChain } = require("../lib/nse-options");
  const mock = {
    records: {
      underlyingValue: 2500,
      expiryDates: ["2026-06-26"],
      data: [
        { strikePrice: 2400, CE: { openInterest: 1000, changeinOpenInterest: 10, impliedVolatility: 15 }, PE: { openInterest: 2000, changeinOpenInterest: 20, impliedVolatility: 16 } },
        { strikePrice: 2500, CE: { openInterest: 5000, changeinOpenInterest: 50, impliedVolatility: 14 }, PE: { openInterest: 3000, changeinOpenInterest: 30, impliedVolatility: 15 } },
      ],
    },
  };
  const result = analyzeChain(mock);
  const expectedPcr = Number(((2000 + 3000) / (1000 + 5000)).toFixed(2));
  const pass = result.available && result.putCallRatio === expectedPcr && result.maxPain != null;
  console.log(`${pass ? "PASS" : "FAIL"} options PCR/maxPain (${result.putCallRatio} exp ${expectedPcr})`);
  return pass;
}

function testScreening() {
  const { runFundamentalScreen, runTechnicalScreen } = require("../lib/screening");
  const fund = runFundamentalScreen([{ symbol: "X.NS", name: "X", price: 100 }]);
  const fundPass = fund.available === false && fund.matches.length === 0;
  console.log(`${fundPass ? "PASS" : "FAIL"} fundamental screen refuses fabricated data`);
  let ok = fundPass;

  const tech = runTechnicalScreen([
    {
      symbol: "A.NS",
      name: "A",
      price: 100,
      technicals: { trend: "BULLISH", rsi: 60, volumeTrend: "Rising", sma20: 99, sma50: 95, resistance: 101 },
    },
  ]);
  const techPass = tech.matches.length === 1;
  console.log(`${techPass ? "PASS" : "FAIL"} technical screen matches bullish setup`);
  ok = techPass && ok;

  return ok;
}

function checkCalcReport(name, payload) {
  const issues = [];
  const report = payload.report || payload;
  walkFinite(report, issues, name);

  if (report.type === "research") {
    const intrinsic = report.valuationAnalysis?.intrinsicValueEstimate || report.sections?.find((s) => s.title?.includes("Valuation"));
    const text = JSON.stringify(intrinsic || report.valuationAnalysis || {});
    if (/intrinsic|dcf/i.test(text) && !/unavailable/i.test(text)) {
      issues.push("research: intrinsic/DCF without unavailable guard");
    }
    if (report.fundamentals?.available === false) {
      const fundSection = (report.sections || []).find((s) => s.title === "Fundamental Analysis");
      if (fundSection?.dataType === "verified") {
        issues.push("research: fundamentals unavailable but section marked verified");
      }
    }
  }

  if (report.type === "fno") {
    for (const row of report.watchlist || []) {
      if (row.chain?.available === false) {
        if (row.putCallRatio != null && row.putCallRatio !== "—") {
          issues.push(`fno: PCR shown without chain (${row.symbol})`);
        }
      }
    }
    const text = JSON.stringify(report);
    if (/max pain|pcr/i.test(text)) {
      const hasProvenance = /unavailable|model-estimated|verified|NSE/i.test(text);
      if (!hasProvenance) issues.push("fno: options metrics lack provenance");
    }
  }

  if (report.type === "nifty-strategy") {
    const bt = report.backtest || report.sections?.find((s) => s.title?.includes("Backtest"));
    const btObj = report.backtest || {};
    if ((btObj.samples ?? 0) < 20 && btObj.hitRate != null && btObj.note?.includes("Insufficient") === false) {
      issues.push("nifty-strategy: hitRate without sufficient samples");
    }
  }

  if (report.type === "fiidii") {
    const agg = report.aggregates || report.trends?.aggregates;
    if (agg?.fii?.quarterly?.available && (agg.fii.quarterly.sessions ?? 0) < 66) {
      issues.push("fiidii: quarterly aggregate overstated");
    }
  }

  return issues;
}

async function fetchJson(path) {
  const res = await fetch(`${BASE}${path}`);
  const json = await res.json();
  return { status: res.status, json };
}

async function testLiveCalculations() {
  let ok = true;
  const endpoints = [
    ["nifty-prediction", "/api/nifty/prediction"],
    ["alignment", "/api/strategies/alignment"],
    ["nifty-strategy", "/api/reports/generate/nifty-strategy"],
    ["fno", "/api/reports/generate/fno"],
    ["fiidii", "/api/reports/generate/fiidii"],
    ["research", "/api/reports/generate/research/RELIANCE"],
  ];

  for (const [name, path] of endpoints) {
    const { status, json } = await fetchJson(path);
    if (status !== 200) {
      console.log(`FAIL live ${name} HTTP ${status}`);
      ok = false;
      continue;
    }

    if (name === "nifty-prediction") {
      const p = json;
      const w = p.predictions?.weekly;
      const pass =
        w &&
        isFiniteNum(w.target) &&
        w.confidence >= 25 &&
        w.confidence <= 92 &&
        ["BULLISH", "BEARISH", "NEUTRAL"].includes(p.ensembleSignal);
      console.log(`${pass ? "PASS" : "FAIL"} live nifty-prediction calculations`);
      ok = pass && ok;
      const issues = [];
      walkFinite(p, issues, "nifty-prediction");
      if (issues.length) {
        console.log(`FAIL live nifty-prediction non-finite: ${issues.slice(0, 3).join(", ")}`);
        ok = false;
      }
      continue;
    }

    if (name === "alignment") {
      const pass = ["BULLISH", "BEARISH", "NEUTRAL"].includes(json.niftySignal);
      console.log(`${pass ? "PASS" : "FAIL"} live alignment niftySignal=${json.niftySignal}`);
      ok = pass && ok;
      continue;
    }

    const issues = checkCalcReport(name, json);
    if (issues.length) {
      console.log(`FAIL live ${name} ${issues.length} issue(s)`);
      issues.forEach((i) => console.log(`  - ${i}`));
      ok = false;
    } else {
      console.log(`PASS live ${name} calculation integrity`);
    }
  }

  return ok;
}

async function main() {
  console.log(`Phase 7 Financial Calculation Validation @ ${BASE}\n`);
  let ok = true;

  ok = testIndicators() && ok;
  ok = testEnsembleMl() && ok;
  ok = testConfidenceAlignment() && ok;
  ok = testFiiAggregates() && ok;
  ok = testOptionsChain() && ok;
  ok = testScreening() && ok;
  ok = (await testLiveCalculations()) && ok;

  console.log(`\nSummary: ${ok ? "PASS" : "FAIL"}`);
  if (!ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});