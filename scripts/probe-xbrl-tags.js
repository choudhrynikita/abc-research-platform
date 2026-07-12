const { fetchWithTimeout } = require("../lib/fetch-utils");

(async () => {
  const u =
    "https://nsearchives.nseindia.com/corporate/xbrl/SHP_1655961_21042026012504_WEB.xml";
  const r = await fetchWithTimeout(u, { headers: { "User-Agent": "Mozilla/5.0" } }, 20000);
  const t = await r.text();
  const re =
    /<in-bse-shp:([A-Za-z0-9]+)([^>]*)>([^<]*)<\/in-bse-shp:\1>/g;
  let m;
  const tags = [];
  while ((m = re.exec(t))) {
    const attrs = m[2] || "";
    const ctx = (attrs.match(/contextRef="([^"]+)"/) || [])[1] || "";
    tags.push({ name: m[1], ctx, val: m[3].trim() });
  }
  console.log("tag count", tags.length);
  const names = [...new Set(tags.map((x) => x.name))].sort();
  console.log(names.join("\n"));
  const pct = tags.filter(
    (x) => /percent|share|holding/i.test(x.name) && /[0-9]/.test(x.val)
  );
  console.log("--- pct ---");
  console.log(
    pct
      .slice(0, 60)
      .map((x) => `${x.name}|${x.ctx}|${x.val}`)
      .join("\n")
  );
  // MainI context summary
  const main = tags.filter((x) => x.ctx === "MainI" || x.ctx === "MainD");
  console.log("--- Main ---");
  console.log(main.map((x) => `${x.name}=${x.val}`).join("\n"));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
