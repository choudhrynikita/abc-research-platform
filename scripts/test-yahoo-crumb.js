async function test() {
  const r = await fetch("https://finance.yahoo.com/quote/RELIANCE.NS", {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  const cookies =
    typeof r.headers.getSetCookie === "function"
      ? r.headers.getSetCookie()
      : [r.headers.get("set-cookie")].filter(Boolean);
  const html = await r.text();
  const crumbMatch = html.match(/"CrumbStore":\{"crumb":"([^"]+)"/);
  const cookieStr = cookies.map((c) => String(c).split(";")[0]).join("; ");
  console.log("cookies", cookies.length);
  console.log("crumb", crumbMatch?.[1] || "none");

  if (crumbMatch) {
    const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/RELIANCE.NS?modules=financialData,defaultKeyStatistics,summaryDetail&crumb=${encodeURIComponent(crumbMatch[1])}`;
    const r2 = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", Cookie: cookieStr },
    });
    const data = await r2.json();
    const result = data.quoteSummary?.result?.[0];
    console.log("fundamentals ok", !!result);
    if (result) {
      console.log({
        pe: result.summaryDetail?.trailingPE,
        roe: result.defaultKeyStatistics?.returnOnEquity,
        revGrowth: result.financialData?.revenueGrowth,
        profitMargins: result.financialData?.profitMargins,
        debtToEquity: result.financialData?.debtToEquity,
        mcap: result.summaryDetail?.marketCap,
      });
    } else {
      console.log(data);
    }
  }
}

test().catch(console.error);