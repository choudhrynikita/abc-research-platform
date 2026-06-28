const { buildPdfBuffer, buildExcelBuffer } = require("./export");
const { buildInstitutionalDashboard } = require("./nifty500-institutional");
const { buildInstitutionalFiiDiiDashboard } = require("./fiidii-institutional");
const { buildInstitutionalResearch } = require("./research-institutional");
const { buildInstitutionalStrategyDashboard } = require("./nifty-strategy-institutional");
const { buildInstitutionalEquityFnoDashboard } = require("./equity-fno-institutional");
const { buildInstitutionalIpoDashboard, buildInstitutionalIpoDetail } = require("./ipo-institutional");
const ExcelJS = require("exceljs");

const MODULE_NAMES = {
  nifty500: "Top 50 Stocks to Buy",
  fiidii: "FII & DII Intelligence",
  research: "AI Research Engine",
  "nifty-strategy": "NIFTY Strategy Center",
  fno: "Equity F&O Strategy Center",
  ipo: "IPO Research Center",
};

async function loadModuleData(module, symbol) {
  switch (module) {
    case "nifty500":
      return buildInstitutionalDashboard();
    case "fiidii":
      return buildInstitutionalFiiDiiDashboard();
    case "research":
      return buildInstitutionalResearch(symbol || "RELIANCE");
    case "nifty-strategy":
      return buildInstitutionalStrategyDashboard();
    case "fno":
      return buildInstitutionalEquityFnoDashboard();
    case "ipo":
      if (symbol) return buildInstitutionalIpoDetail(symbol);
      return buildInstitutionalIpoDashboard();
    default:
      throw new Error(`Unknown module: ${module}`);
  }
}

function baseReport(module, data, symbol) {
  const now = new Date().toISOString();
  return {
    title: data.title || MODULE_NAMES[module] || module,
    moduleName: MODULE_NAMES[module] || module,
    companyName: data.companyName || data.executiveSummary?.companyName || symbol || null,
    source: data.source || "ABC Research Platform",
    generatedAt: now,
    dataFreshness: { fetchedAt: data.refreshedAt || now },
    confidence: data.executiveSummary?.confidence ?? data.executiveSummary?.aiConviction ?? null,
    disclaimer: "Not investment advice. Verify all data with original sources before making investment decisions.",
    sections: [],
  };
}

function sectionsNifty500(data) {
  const s = [];
  const es = data.executiveSummary;
  s.push({
    title: "Executive Summary",
    dataType: "verified",
    content: es ? `Market trend: ${es.marketTrend}. ${es.top50Count ?? data.top50?.length} recommendations.` : null,
    bullets: es?.thesis || [],
  });
  if (data.top50?.length) {
    s.push({
      title: "Top 50 Recommendations",
      dataType: "mixed",
      table: {
        headers: ["Rank", "Symbol", "Sector", "Price", "Score", "Action", "Conviction"],
        rows: data.top50.map((st, i) => [
          i + 1,
          st.symbol,
          st.sector,
          st.price,
          st.buyScore,
          st.recommendation?.action,
          st.recommendation?.conviction,
        ]),
      },
    });
  }
  if (data.insights?.length) {
    s.push({ title: "AI Insights", dataType: "mixed", bullets: data.insights.map((x) => x.text || x) });
  }
  s.push({ title: "Data Sources", dataType: "verified", bullets: [data.source, `Refreshed: ${data.refreshedAt}`] });
  return s;
}

function sectionsFiidii(data) {
  const s = [];
  s.push({
    title: "Executive Summary",
    dataType: "verified",
    content: data.executiveSummary,
    bullets: data.insights?.map((i) => i.text) || [],
  });
  if (data.overview) {
    s.push({
      title: "Flow Overview",
      dataType: "verified",
      table: {
        headers: ["Metric", "Value"],
        rows: [
          ["Today FII", data.overview.netFii],
          ["Today DII", data.overview.netDii],
          ["Sentiment", data.overview.sentiment?.label],
        ],
      },
    });
  }
  const dailyRaw = data.charts?.daily?.series?.raw;
  if (dailyRaw?.length) {
    s.push({
      title: "Daily FII/DII Flows",
      dataType: "verified",
      table: {
        headers: ["Date", "FII Net", "DII Net"],
        rows: dailyRaw.slice(-30).map((r) => [r.date, r.fiiNet, r.diiNet]),
      },
    });
  }
  return s;
}

function sectionsResearch(data) {
  const s = [];
  const es = data.executiveSummary;
  s.push({
    title: "Executive Summary",
    dataType: "mixed",
    content: `${data.companyName} (${data.symbol})`,
    bullets: es?.thesis || [],
  });
  if (es) {
    s.push({
      title: "Investment Recommendation",
      dataType: "mixed",
      table: {
        headers: ["Field", "Value"],
        rows: [
          ["Recommendation", es.recommendation],
          ["Rating", es.overallRating],
          ["Confidence", es.confidenceLevel],
          ["Risk", es.riskLevel],
          ["Horizon", es.investmentHorizon],
        ],
      },
    });
  }
  if (data.technicalAnalysis) {
    const t = data.technicalAnalysis;
    s.push({
      title: "Technical Analysis",
      dataType: "verified",
      table: {
        headers: ["Indicator", "Value"],
        rows: [
          ["Trend", t.trend],
          ["RSI", t.rsi],
          ["Support", t.support],
          ["Resistance", t.resistance],
        ],
      },
    });
  }
  if (data.insights) {
    s.push({
      title: "AI Insights",
      dataType: "mixed",
      bullets: [
        ...(data.insights.bullish || []),
        ...(data.insights.bearish || []),
        ...(data.insights.risks || []),
      ].map((x) => x.text || x),
    });
  }
  if (data.investmentDecision) {
    const d = data.investmentDecision;
    s.push({
      title: "Risk Factors",
      dataType: "mixed",
      bullets: d.risks || [],
    });
  }
  return s;
}

function sectionsNiftyStrategy(data) {
  const s = [];
  const es = data.executiveSummary;
  s.push({
    title: "Executive Summary",
    dataType: "mixed",
    bullets: [
      `NIFTY Spot: ${es?.spotPrice}`,
      `Trend: ${es?.niftyTrend}`,
      `VIX: ${es?.vix}`,
      `Active strategies: ${es?.strategiesActive}`,
    ],
  });
  if (data.top10?.length) {
    s.push({
      title: "Top 10 Strategies",
      dataType: "mixed",
      table: {
        headers: ["Rank", "Strategy", "Type", "Status", "Entry Low", "Entry High", "Stop", "T1", "T2", "Confidence"],
        rows: data.top10.map((st) => [
          st.rank,
          st.name,
          st.type,
          st.status,
          st.entryZone?.low,
          st.entryZone?.high,
          st.stopLoss,
          st.targets?.t1,
          st.targets?.t2,
          st.confidenceScore,
        ]),
      },
    });
  }
  if (data.insights) {
    s.push({
      title: "AI Insights",
      dataType: "mixed",
      bullets: [
        ...(data.insights.bullish || []).map((x) => x.text),
        ...(data.insights.risks || []),
      ],
    });
  }
  return s;
}

function sectionsFno(data) {
  const s = [];
  const es = data.executiveSummary;
  s.push({
    title: "Executive Summary",
    dataType: "mixed",
    bullets: [
      `Market trend: ${es?.marketTrend}`,
      `Chains verified: ${es?.chainsVerified}/${es?.universeSize}`,
      `Active: ${es?.strategiesActive}`,
    ],
  });
  if (data.top10?.length) {
    s.push({
      title: "Top 10 Equity Options Strategies",
      dataType: "mixed",
      table: {
        headers: ["Rank", "Company", "Symbol", "Type", "Expiry", "Net Prem", "Stop", "T1", "Confidence"],
        rows: data.top10.map((st) => [
          st.rank,
          st.companyName,
          st.nseSymbol,
          st.type,
          st.expiry,
          st.premiums?.net,
          st.stopLoss,
          st.targets?.t1,
          st.confidenceScore,
        ]),
      },
    });
  }
  return s;
}

function sectionsIpo(data, isDetail) {
  const s = [];
  if (isDetail && data.executiveSummary) {
    const es = data.executiveSummary;
    s.push({
      title: "Executive Summary",
      dataType: "mixed",
      bullets: es.thesis || [],
    });
    s.push({
      title: "Investment Recommendation",
      dataType: "mixed",
      table: {
        headers: ["Field", "Value"],
        rows: [
          ["IPO Score", es.ipoScore],
          ["Recommendation", es.recommendation],
          ["Confidence", es.confidence],
          ["Risk", es.riskLevel],
        ],
      },
    });
    if (data.subscription) {
      s.push({
        title: "Subscription Data",
        dataType: "verified",
        table: {
          headers: ["Category", "Subscription"],
          rows: [
            ["Overall", data.subscription.overall?.display],
            ["QIB", data.subscription.qib?.display],
            ["NII", data.subscription.hni?.display],
            ["Retail", data.subscription.retail?.display],
            ["Employee", data.subscription.employee?.display],
          ],
        },
      });
    }
    s.push({ title: "Risk Factors", dataType: "mixed", bullets: data.risks?.bullets || [] });
  } else {
    s.push({
      title: "IPO Market Snapshot",
      dataType: "verified",
      content: `Open: ${data.counts?.open}, Upcoming: ${data.counts?.upcoming}, Listed (30D): ${data.counts?.listed}`,
    });
    ["open", "upcoming", "listed"].forEach((key) => {
      const list = data.sections?.[key];
      if (list?.length) {
        s.push({
          title: `${key.charAt(0).toUpperCase() + key.slice(1)} IPOs`,
          dataType: "verified",
          table: {
            headers: ["Company", "Symbol", "Price Band", "Open", "Close", "Subscription"],
            rows: list.map((i) => [
              i.companyName,
              i.symbol,
              i.priceBand,
              i.openDate,
              i.closeDate,
              i.subscription?.overall?.display,
            ]),
          },
        });
      }
    });
  }
  return s;
}

function buildPdfReport(module, data, symbol) {
  const isDetail = module === "ipo" && symbol;
  const report = baseReport(module, data, symbol);
  const builders = {
    nifty500: sectionsNifty500,
    fiidii: sectionsFiidii,
    research: sectionsResearch,
    "nifty-strategy": sectionsNiftyStrategy,
    fno: sectionsFno,
    ipo: (d) => sectionsIpo(d, isDetail),
  };
  report.sections = (builders[module] || (() => []))(data);
  report.title = symbol && data.companyName
    ? `${data.companyName} — ${report.moduleName}`
    : report.title;
  return report;
}

async function buildExcelWorkbook(module, data, symbol) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "ABC Research Platform";
  wb.created = new Date();
  const summary = wb.addWorksheet("Summary");
  summary.addRow(["Module", MODULE_NAMES[module]]);
  summary.addRow(["Generated", new Date().toISOString()]);
  summary.addRow(["Data Timestamp", data.refreshedAt || "—"]);
  if (symbol) summary.addRow(["Symbol", symbol]);

  if (module === "nifty500" && data.top50) {
    const sheet = wb.addWorksheet("Top50");
    sheet.addRow(["Rank", "Symbol", "Name", "Sector", "Price", "Change%", "Score", "Action", "ROE", "PE"]);
    data.top50.forEach((st, i) => {
      sheet.addRow([
        i + 1, st.symbol, st.name, st.sector, st.price, st.changePercent,
        st.buyScore, st.recommendation?.action, st.roe?.value ?? st.roe, st.peRatio,
      ]);
    });
  }

  if (module === "fiidii") {
    for (const tf of ["daily", "monthly", "quarterly", "yearly"]) {
      const raw = data.charts?.[tf]?.series?.raw;
      if (!raw?.length) continue;
      const sheet = wb.addWorksheet(`${tf.charAt(0).toUpperCase()}${tf.slice(1)}Flows`);
      sheet.addRow(["Date", "FII Net", "DII Net", "FII Buy", "FII Sell", "DII Buy", "DII Sell"]);
      raw.forEach((r) => sheet.addRow([r.date, r.fiiNet, r.diiNet, r.fiiBuy, r.fiiSell, r.diiBuy, r.diiSell]));
    }
  }

  if (module === "research") {
    const t = data.technicalAnalysis;
    if (t) {
      const sheet = wb.addWorksheet("Technicals");
      sheet.addRow(["Metric", "Value"]);
      [["Trend", t.trend], ["RSI", t.rsi], ["Support", t.support], ["Resistance", t.resistance],
        ["SMA20", t.sma20], ["SMA50", t.sma50]].forEach(([k, v]) => sheet.addRow([k, v]));
    }
    if (data.competitorComparison?.peers?.length) {
      const sheet = wb.addWorksheet("Peers");
      const peers = data.competitorComparison.peers;
      sheet.addRow(["Symbol", "Price", "Change1M%", "PE", "ROE"]);
      peers.forEach((p) => sheet.addRow([p.symbol, p.price, p.change1m, p.pe, p.roe]));
    }
  }

  if (module === "nifty-strategy" && data.top10) {
    const sheet = wb.addWorksheet("Strategies");
    sheet.addRow(["Rank", "Name", "Type", "Expiry", "NetPremium", "StopLoss", "Target1", "Target2", "MaxRisk", "RR", "Confidence"]);
    data.top10.forEach((st) => sheet.addRow([
      st.rank, st.name, st.type, st.expiry, st.premiums?.net, st.stopLoss,
      st.targets?.t1, st.targets?.t2, st.maxRisk, st.riskRewardRatio, st.confidenceScore,
    ]));
  }

  if (module === "fno" && data.top10) {
    const sheet = wb.addWorksheet("Strategies");
    sheet.addRow(["Rank", "Company", "Symbol", "Type", "Expiry", "Premium", "LotSize", "Stop", "T1", "Confidence"]);
    data.top10.forEach((st) => sheet.addRow([
      st.rank, st.companyName, st.nseSymbol, st.type, st.expiry, st.premiums?.net,
      st.positionSizing?.lotSize, st.stopLoss, st.targets?.t1, st.confidenceScore,
    ]));
  }

  if (module === "ipo") {
    if (symbol && data.subscription) {
      const sheet = wb.addWorksheet("Subscription");
      sheet.addRow(["Category", "Value", "Display"]);
      [["Overall", data.subscription.overall], ["QIB", data.subscription.qib],
        ["NII", data.subscription.hni], ["Retail", data.subscription.retail],
        ["Employee", data.subscription.employee]].forEach(([k, m]) => {
        if (m) sheet.addRow([k, m.value, m.display]);
      });
      if (data.card) {
        const det = wb.addWorksheet("IPODetails");
        det.addRow(["Field", "Value"]);
        [["Company", data.card.companyName], ["Symbol", data.card.symbol], ["Price Band", data.card.priceBand],
          ["Lot Size", data.card.lotSize], ["Issue Size", data.card.issueSize]].forEach(([k, v]) => det.addRow([k, v]));
      }
    } else if (data.sections) {
      const sheet = wb.addWorksheet("IPOList");
      sheet.addRow(["Section", "Company", "Symbol", "PriceBand", "Open", "Close", "Subscription"]);
      ["open", "upcoming", "listed"].forEach((key) => {
        (data.sections[key] || []).forEach((i) => {
          sheet.addRow([key, i.companyName, i.symbol, i.priceBand, i.openDate, i.closeDate, i.subscription?.overall?.display]);
        });
      });
    }
  }

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

async function exportTerminal(module, format, symbol) {
  const data = await loadModuleData(module, symbol);
  const slug = symbol ? `${module}-${symbol}` : module;
  const date = new Date().toISOString().slice(0, 10);

  if (format === "pdf") {
    const report = buildPdfReport(module, data, symbol);
    const buffer = await buildPdfBuffer(report);
    return {
      buffer,
      filename: `${slug}-${date}.pdf`,
      contentType: "application/pdf",
    };
  }

  if (format === "xlsx") {
    const buffer = await buildExcelWorkbook(module, data, symbol);
    return {
      buffer,
      filename: `${slug}-${date}.xlsx`,
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
  }

  throw new Error(`Unsupported format: ${format}`);
}

module.exports = { exportTerminal, MODULE_NAMES };