const { fetchWithTimeout } = require("../lib/fetch-utils");

(async () => {
  const u =
    "https://nsearchives.nseindia.com/corporate/xbrl/SHP_1655961_21042026012504_WEB.xml";
  const r = await fetchWithTimeout(u, { headers: { "User-Agent": "Mozilla/5.0" } }, 20000);
  const t = await r.text();

  // Map context id -> category member name from dimension
  const ctxMap = {};
  const ctxRe =
    /<xbrli:context id="([^"]+)">[\s\S]*?(?:explicitMember[^>]*>([^<]+)<)?[\s\S]*?<\/xbrli:context>/g;
  let m;
  while ((m = ctxRe.exec(t))) {
    const id = m[1];
    const member = (m[2] || "").replace("in-bse-shp:", "");
    ctxMap[id] = member || id;
  }

  const pctRe =
    /<in-bse-shp:ShareholdingAsAPercentageOfTotalNumberOfShares[^>]*contextRef="([^"]+)"[^>]*>([^<]+)<\/in-bse-shp:ShareholdingAsAPercentageOfTotalNumberOfShares>/g;
  const rows = [];
  while ((m = pctRe.exec(t))) {
    rows.push({ ctx: m[1], member: ctxMap[m[1]] || m[1], pct: Number(m[2]) });
  }
  console.log("pct rows", rows.length);
  // aggregate by top-level categories in member name
  const interesting = rows.filter((r) =>
    /Promoter|Foreign|Institution|Mutual|Insurance|Public|Bank|Pension|Alternative|Sovereign|NBFCs|BodyCorporate|Individuals/i.test(
      r.member + r.ctx
    )
  );
  console.log(
    interesting
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 40)
      .map((r) => `${r.pct}% | ${r.member} | ${r.ctx}`)
      .join("\n")
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
