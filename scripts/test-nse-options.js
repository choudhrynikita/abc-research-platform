const { fetchFiiDii } = require("../lib/nse");

async function warm() {
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    Accept: "application/json",
    Referer: "https://www.nseindia.com/",
  };
  const r = await fetch("https://www.nseindia.com/", { headers });
  const cookies =
    typeof r.headers.getSetCookie === "function"
      ? r.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ")
      : "";
  const r2 = await fetch(
    "https://www.nseindia.com/api/option-chain-equities?symbol=RELIANCE",
    { headers: { ...headers, Cookie: cookies } }
  );
  console.log("status", r2.status);
  const data = await r2.json();
  console.log("keys", Object.keys(data));
  console.log("records", data.records?.data?.length);
  if (data.records?.data?.[0]) console.log("sample", JSON.stringify(data.records.data[0]).slice(0, 300));
}

warm().catch(console.error);