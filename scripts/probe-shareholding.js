const { fetchWithTimeout } = require("../lib/fetch-utils");

const NSE_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://www.nseindia.com/companies-listing/corporate-filings-shareholding-pattern",
};

async function main() {
  const warm = await fetchWithTimeout(
    "https://www.nseindia.com/companies-listing/corporate-filings-shareholding-pattern",
    { headers: NSE_HEADERS },
    15000
  );
  const raw =
    typeof warm.headers.getSetCookie === "function"
      ? warm.headers.getSetCookie()
      : [warm.headers.get("set-cookie")].filter(Boolean);
  const cookie = raw.map((c) => String(c).split(";")[0]).join("; ");

  const masterUrl =
    "https://www.nseindia.com/api/corporate-share-holdings-master?index=equities&symbol=RELIANCE";
  const res = await fetchWithTimeout(
    masterUrl,
    { headers: { ...NSE_HEADERS, Cookie: cookie } },
    15000
  );
  const data = await res.json();
  const row = data[0];
  console.log("master keys", Object.keys(row));
  console.log("promoter", row.pr_and_prgrp, "public", row.public_val, "date", row.date);
  console.log("xbrl", row.xbrl);

  if (row.xbrl) {
    const xr = await fetchWithTimeout(
      row.xbrl,
      {
        headers: {
          ...NSE_HEADERS,
          Accept: "application/xml,text/xml,*/*",
          Cookie: cookie,
        },
      },
      20000
    );
    const xml = await xr.text();
    console.log("xbrl status", xr.status, "len", xml.length);
    // collect tag=value for percentage-like numbers
    const re = /<([A-Za-z0-9_:-]+)>([0-9]{1,3}(?:\.[0-9]+)?)<\/\1>/g;
    let m;
    const hits = [];
    while ((m = re.exec(xml)) && hits.length < 80) {
      const n = Number(m[2]);
      if (n >= 0 && n <= 100) hits.push(`${m[1]}=${m[2]}`);
    }
    console.log(hits.join("\n"));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
