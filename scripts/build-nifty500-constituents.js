/**
 * Build data/nifty500-constituents.json from official NSE NIFTY 500 CSV.
 * Source: https://nsearchives.nseindia.com/content/indices/ind_nifty500list.csv
 * Never invents tickers — only maps symbols from the verified index list.
 */
const fs = require("fs");
const path = require("path");
const https = require("https");

const OUT = path.join(__dirname, "..", "data", "nifty500-constituents.json");
const URLS = [
  "https://nsearchives.nseindia.com/content/indices/ind_nifty500list.csv",
  "https://www.niftyindices.com/IndexConstituent/ind_nifty500list.csv",
];

const industryToSector = {
  "Financial Services": "Financial Services",
  "Information Technology": "IT",
  IT: "IT",
  "Oil Gas & Consumable Fuels": "Energy",
  "Oil, Gas & Consumable Fuels": "Energy",
  Power: "Utilities",
  Healthcare: "Pharma",
  Pharmaceuticals: "Pharma",
  "Automobile and Auto Components": "Auto",
  Automobiles: "Auto",
  "Fast Moving Consumer Goods": "FMCG",
  "Consumer Durables": "Consumer",
  "Consumer Services": "Consumer",
  Realty: "Real Estate",
  "Metals & Mining": "Materials",
  "Construction Materials": "Materials",
  Construction: "Industrials",
  "Capital Goods": "Industrials",
  Services: "Services",
  Telecommunication: "Telecom",
  "Media Entertainment & Publication": "Media",
  Chemicals: "Chemicals",
  Textiles: "Textiles",
  Diversified: "Conglomerate",
  "Forest Materials": "Materials",
};

function parseLine(line) {
  const out = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      q = !q;
      continue;
    }
    if (c === "," && !q) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += c;
  }
  out.push(cur);
  return out;
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; ABC-Research/2.0)",
          Accept: "text/csv,*/*",
        },
        timeout: 60000,
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchText(res.headers.location).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          res.resume();
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout"));
    });
  });
}

function convert(csv) {
  const lines = csv.replace(/^\uFEFF/, "").trim().split(/\r?\n/);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cols = parseLine(lines[i]);
    if (cols.length < 3) continue;
    const name = cols[0].trim();
    const industry = cols[1].trim();
    const sym = cols[2].trim();
    if (!sym || !name) continue;
    const sector = industryToSector[industry] || industry || "Other";
    rows.push({
      symbol: `${sym}.NS`,
      name,
      sector,
      industry,
    });
  }
  const seen = new Set();
  return rows
    .filter((r) => {
      if (seen.has(r.symbol)) return false;
      seen.add(r.symbol);
      return true;
    })
    .sort((a, b) => a.symbol.localeCompare(b.symbol));
}

async function main() {
  let csv = null;
  let source = null;
  for (const url of URLS) {
    try {
      csv = await fetchText(url);
      source = url;
      break;
    } catch (e) {
      console.warn("fetch failed", url, e.message);
    }
  }
  if (!csv) {
    // Fallback: use local raw if present
    const local = path.join(__dirname, "..", "data", "_nifty500_raw.csv");
    if (fs.existsSync(local)) {
      csv = fs.readFileSync(local, "utf8");
      source = local;
    } else {
      throw new Error("Could not download NIFTY 500 list from NSE archives");
    }
  }
  const unique = convert(csv);
  if (unique.length < 400) {
    throw new Error(`Unexpected constituent count ${unique.length} — refusing to write`);
  }
  const payload = unique;
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2) + "\n");
  console.log(
    JSON.stringify(
      {
        written: OUT,
        count: unique.length,
        source,
        sectors: [...new Set(unique.map((u) => u.sector))].sort(),
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
