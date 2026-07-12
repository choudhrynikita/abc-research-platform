/**
 * Optional broker connectivity.
 *
 * Live broker APIs (Zerodha Kite, etc.) require user-provided API credentials.
 * When credentials are absent, the platform uses CSV import only — never invents holdings.
 *
 * Supported env (optional):
 *   BROKER_PROVIDER=kite|none
 *   KITE_API_KEY=
 *   KITE_ACCESS_TOKEN=   (user session token — never hardcode)
 *
 * This adapter validates configuration and, when fully configured, can fetch holdings
 * via Kite REST. Without tokens, status explains how to enable.
 */

const { fetchWithTimeout } = require("./fetch-utils");
const { normalizeSymbol } = require("./portfolio-engine");

function getBrokerConfig() {
  const provider = String(process.env.BROKER_PROVIDER || "none").toLowerCase();
  const kiteKey = process.env.KITE_API_KEY || "";
  const kiteToken = process.env.KITE_ACCESS_TOKEN || "";
  const configured =
    provider === "kite" && Boolean(kiteKey) && Boolean(kiteToken);

  return {
    provider: configured ? "kite" : provider === "kite" ? "kite-incomplete" : "none",
    configured,
    liveSyncAvailable: configured,
    kite: {
      apiKeyPresent: Boolean(kiteKey),
      accessTokenPresent: Boolean(kiteToken),
    },
    instructions: [
      "1. Create a Kite Connect app at https://developers.kite.trade",
      "2. Set BROKER_PROVIDER=kite",
      "3. Set KITE_API_KEY and KITE_ACCESS_TOKEN (session token from login flow)",
      "4. Restart the server — never commit secrets",
      "5. Without keys, use Portfolio → Import broker CSV",
    ],
    disclaimer:
      "Broker sync only reads holdings the user authorized. ABC never invents positions or balances.",
  };
}

/**
 * Fetch holdings from Kite when configured.
 * @returns {Promise<{ok:boolean, holdings?:Array, error?:string, source?:string}>}
 */
async function fetchBrokerHoldings() {
  const cfg = getBrokerConfig();
  if (!cfg.configured) {
    return {
      ok: false,
      error:
        cfg.provider === "kite-incomplete"
          ? "Kite selected but KITE_API_KEY or KITE_ACCESS_TOKEN missing"
          : "No broker configured — use CSV import or set Kite env vars",
      config: cfg,
    };
  }

  try {
    const res = await fetchWithTimeout(
      "https://api.kite.trade/portfolio/holdings",
      {
        headers: {
          "X-Kite-Version": "3",
          Authorization: `token ${process.env.KITE_API_KEY}:${process.env.KITE_ACCESS_TOKEN}`,
        },
      },
      20_000
    );
    if (!res.ok) {
      const text = await res.text();
      return {
        ok: false,
        error: `Kite holdings HTTP ${res.status}: ${text.slice(0, 200)}`,
        config: cfg,
      };
    }
    const data = await res.json();
    const list = Array.isArray(data?.data) ? data.data : [];
    const holdings = list
      .map((h) => {
        const exchange = String(h.exchange || "NSE").toUpperCase();
        const tradingsymbol = h.tradingsymbol || h.symbol;
        const qty = Number(h.quantity ?? h.t1_quantity ?? 0);
        const avg = Number(h.average_price ?? h.average_price);
        if (!tradingsymbol || !Number.isFinite(qty) || qty <= 0) return null;
        if (!Number.isFinite(avg) || avg < 0) return null;
        // Map NSE equities to Yahoo-style .NS
        let symbol = String(tradingsymbol).toUpperCase();
        if (exchange === "NSE" && !symbol.includes(".")) symbol = `${symbol}.NS`;
        else symbol = normalizeSymbol(symbol) || symbol;
        return {
          symbol,
          quantity: qty,
          avgCost: avg,
          notes: `Imported from Kite (${exchange})`,
          source: "Zerodha Kite holdings API",
        };
      })
      .filter(Boolean);

    return {
      ok: true,
      holdings,
      count: holdings.length,
      source: "Zerodha Kite Connect portfolio/holdings",
      config: cfg,
      disclaimer: cfg.disclaimer,
    };
  } catch (err) {
    return { ok: false, error: err.message, config: cfg };
  }
}

module.exports = {
  getBrokerConfig,
  fetchBrokerHoldings,
};
