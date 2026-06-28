const http = require("http");
const BASE = process.env.QA_BASE || "http://localhost:4000";
const paths = [
  "/api/export/nifty-strategy/pdf",
  "/api/export/nifty-strategy/xlsx",
  "/api/export/fno/pdf",
  "/api/export/fno/xlsx",
  "/api/export/research/pdf?symbol=RELIANCE",
  "/api/export/research/xlsx?symbol=RELIANCE",
];

function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`${BASE}${path}`, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () =>
        resolve({
          status: res.statusCode,
          ct: res.headers["content-type"] || "",
          size: Buffer.concat(chunks).length,
        })
      );
    }).on("error", reject);
  });
}

(async () => {
  let failed = 0;
  for (const p of paths) {
    const r = await get(p);
    const ok =
      r.status === 200 &&
      (r.ct.includes("pdf") || r.ct.includes("spreadsheet") || r.ct.includes("octet"));
    console.log(`${ok ? "OK" : "FAIL"} ${p} ${r.status} ${r.ct} ${r.size}b`);
    if (!ok) failed++;
  }
  process.exit(failed ? 1 : 0);
})();