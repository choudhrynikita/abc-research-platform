async function getCrumb() {
  const r = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Cookie: "A3=d=AQABBF8Zz2QE",
    },
  });
  const crumb = await r.text();
  console.log("crumb", crumb.slice(0, 30));
  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/RELIANCE.NS?modules=financialData,defaultKeyStatistics,incomeStatementHistory,balanceSheetHistory,cashflowStatementHistory,summaryProfile&crumb=${encodeURIComponent(crumb)}`;
  const r2 = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0", Cookie: "A3=d=AQABBF8Zz2QE" },
  });
  const data = await r2.json();
  const result = data.quoteSummary?.result?.[0];
  console.log("ok", !!result);
  if (result) {
    console.log({
      roe: result.defaultKeyStatistics?.returnOnEquity,
      rev: result.financialData?.revenueGrowth,
      pe: result.summaryDetail?.trailingPE,
      profile: result.summaryProfile?.longBusinessSummary?.slice(0, 80),
      income: result.incomeStatementHistory?.incomeStatementHistory?.length,
    });
  } else console.log(JSON.stringify(data).slice(0, 300));
}
getCrumb().catch(console.error);