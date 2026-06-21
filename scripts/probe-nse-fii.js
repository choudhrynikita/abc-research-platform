async function warm() {
  const h = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    Accept: "application/json",
    Referer: "https://www.nseindia.com/",
  };
  const r = await fetch("https://www.nseindia.com/", { headers: h });
  const cookies =
    typeof r.headers.getSetCookie === "function"
      ? r.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ")
      : "";
  const urls = [
    "https://www.nseindia.com/api/fiidiiTradeReact",
    "https://www.nseindia.com/api/fiidiiTrade",
    "https://www.nseindia.com/api/fiidii-archive",
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: { ...h, Cookie: cookies } });
      const text = await res.text();
      console.log(url, res.status, text.slice(0, 200));
    } catch (e) {
      console.log(url, "ERR", e.message);
    }
  }
}
warm();