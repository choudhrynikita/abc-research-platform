const { readJson, writeJson } = require("./json-store");
const { enforceFreshDataPolicy, DEFAULT_CACHE_TTL_MS } = require("./financial-intelligence");

const CACHE_FILE = "option-chain-cache.json";

async function readCacheStore() {
  return readJson(CACHE_FILE, { nifty: null, equities: {}, horizons: null, updatedAt: null });
}

function chainPremiumCount(chain) {
  if (!Array.isArray(chain?.strikes)) return 0;
  return chain.strikes.reduce((n, row) => {
    if (row?.ce?.premium > 0) n += 1;
    if (row?.pe?.premium > 0) n += 1;
    return n;
  }, 0);
}

function chainHasTradeablePremiums(chain) {
  return Boolean(chain?.available && chainPremiumCount(chain) >= 4);
}

async function saveNiftyChain(chain) {
  if (!chainHasTradeablePremiums(chain)) return;
  const store = await readCacheStore();
  store.nifty = {
    ...chain,
    cachedAt: new Date().toISOString(),
  };
  store.updatedAt = new Date().toISOString();
  await writeJson(CACHE_FILE, store);
}

async function saveEquityChain(symbol, chain) {
  if (!chain?.available || !symbol) return;
  const key = symbol.replace(".NS", "").toUpperCase();
  const store = await readCacheStore();
  store.equities[key] = {
    ...chain,
    symbol: key,
    cachedAt: new Date().toISOString(),
  };
  store.updatedAt = new Date().toISOString();
  await writeJson(CACHE_FILE, store);
}

async function getNiftyChainCache() {
  const store = await readCacheStore();
  return store.nifty;
}

async function getEquityChainCache(symbol) {
  const key = symbol.replace(".NS", "").toUpperCase();
  const store = await readCacheStore();
  return store.equities[key] ?? null;
}

/**
 * Prefer a chain that still has last-traded premiums. After hours NSE may
 * return OI with lastPrice 0 — never overwrite Friday's premiums with that.
 */
async function resolveNiftyChain(liveChain, marketStatus) {
  const cached = await getNiftyChainCache();
  const liveUsable = chainHasTradeablePremiums(liveChain);
  const cacheUsable = chainHasTradeablePremiums(cached);
  const cachedAt = cached?.fetchedAt || cached?.cachedAt;

  if (liveUsable) {
    await saveNiftyChain(liveChain);
    return {
      chain: liveChain,
      verified: true,
      live: marketStatus?.isLive === true,
      stale: !marketStatus?.isLive,
      source: liveChain.source || "NSE India option-chain-v3 API (NIFTY)",
      fetchedAt: liveChain.fetchedAt,
      message: marketStatus?.isLive
        ? "Live NSE NIFTY option chain"
        : "NSE NIFTY last-traded premiums from the latest session",
    };
  }

  const freshness = enforceFreshDataPolicy(cachedAt, DEFAULT_CACHE_TTL_MS);
  if (marketStatus?.isLive && cacheUsable && !freshness.fresh) {
    return {
      chain: { available: false, reason: freshness.message || "Verified data is currently unavailable." },
      verified: false,
      live: true,
      stale: true,
      source: "Unavailable",
      fetchedAt: cachedAt,
      message: freshness.message || "Cached NIFTY option chain exceeded freshness policy during live session",
    };
  }

  if (cacheUsable) {
    return {
      chain: {
        ...cached,
        available: true,
        stale: true,
        source: "Last verified NSE NIFTY close (cached)",
        fetchedAt: cachedAt,
      },
      verified: true,
      live: false,
      stale: true,
      source: "Last verified NSE NIFTY close (cached)",
      fetchedAt: cachedAt,
      message: "Using last verified NIFTY option premiums from the prior trading session",
    };
  }

  return {
    chain: liveChain || { available: false, reason: "NSE NIFTY option chain unavailable" },
    verified: false,
    live: false,
    stale: false,
    source: "Unavailable",
    fetchedAt: cachedAt || liveChain?.fetchedAt || null,
    message: liveChain?.reason || "NSE NIFTY option chain unavailable — technical setups only",
  };
}

async function resolveEquityChain(symbol, liveChain, marketStatus) {
  if (liveChain?.available) {
    await saveEquityChain(symbol, liveChain);
    return {
      chain: liveChain,
      verified: true,
      live: marketStatus?.isLive === true,
      stale: false,
      source: liveChain.source || "NSE India option-chain-equities API",
      fetchedAt: liveChain.fetchedAt,
    };
  }

  const cached = await getEquityChainCache(symbol);
  const cachedAt = cached?.fetchedAt || cached?.cachedAt;
  const freshness = enforceFreshDataPolicy(cachedAt, DEFAULT_CACHE_TTL_MS);
  if (marketStatus?.isLive && cached?.strikes?.length && !freshness.fresh) {
    return {
      chain: { available: false, reason: freshness.message || "Verified data is currently unavailable." },
      verified: false,
      live: true,
      stale: true,
      source: "Unavailable",
      fetchedAt: cachedAt,
    };
  }

  if (cached?.strikes?.length) {
    return {
      chain: {
        ...cached,
        available: true,
        stale: true,
        source: `Last verified NSE close for ${symbol.replace(".NS", "")} (cached)`,
        fetchedAt: cached.fetchedAt || cached.cachedAt,
      },
      verified: true,
      live: false,
      stale: true,
      source: cached.source || "Cached NSE equity option chain",
      fetchedAt: cached.fetchedAt || cached.cachedAt,
    };
  }

  return {
    chain: liveChain || { available: false, reason: "NSE equity option chain unavailable" },
    verified: false,
    live: false,
    stale: false,
    source: "Unavailable",
    fetchedAt: null,
  };
}

async function saveHorizonChains(pack) {
  if (!pack) return;
  const store = await readCacheStore();
  const next = {};
  for (const key of ["sevenDay", "fifteenDay", "monthly"]) {
    const item = pack[key];
    if (chainHasTradeablePremiums(item?.chain)) {
      next[key] = {
        ...item,
        chain: item.chain,
        cachedAt: new Date().toISOString(),
      };
    } else if (store.horizons?.[key]) {
      next[key] = store.horizons[key];
    }
  }
  store.horizons = next;
  store.updatedAt = new Date().toISOString();
  if (chainHasTradeablePremiums(next.sevenDay?.chain)) {
    store.nifty = {
      ...next.sevenDay.chain,
      cachedAt: new Date().toISOString(),
    };
  }
  await writeJson(CACHE_FILE, store);
}

async function getHorizonChainsCache() {
  const store = await readCacheStore();
  return store.horizons || null;
}

function emptyHorizon(id, label, reason) {
  return {
    id,
    label,
    expiry: null,
    chain: { available: false, reason },
  };
}

async function resolveNiftyHorizonPack(livePack, marketStatus) {
  const cached = (await getHorizonChainsCache()) || {};
  const resolved = {};

  for (const key of ["sevenDay", "fifteenDay", "monthly"]) {
    const live = livePack?.[key];
    const liveChain = live?.chain;
    if (chainHasTradeablePremiums(liveChain)) {
      resolved[key] = {
        ...live,
        stale: !marketStatus?.isLive,
        verified: true,
        live: marketStatus?.isLive === true,
        source: liveChain.source,
        fetchedAt: liveChain.fetchedAt,
        message: marketStatus?.isLive
          ? `Live NSE NIFTY ${live.label} chain`
          : `NSE NIFTY last-traded premiums for ${live.label} expiry ${live.expiry || ""}`.trim(),
      };
      continue;
    }

    const cachedItem = cached[key];
    if (chainHasTradeablePremiums(cachedItem?.chain)) {
      resolved[key] = {
        ...cachedItem,
        stale: true,
        verified: true,
        live: false,
        source: "Last verified NSE NIFTY close (cached)",
        fetchedAt: cachedItem.chain?.fetchedAt || cachedItem.cachedAt,
        message: `Using last verified ${cachedItem.label || key} NIFTY premiums from the prior session`,
      };
      continue;
    }

    resolved[key] = live || emptyHorizon(key, key, liveChain?.reason || "NSE NIFTY chain unavailable");
    resolved[key].verified = false;
    resolved[key].live = false;
    resolved[key].stale = false;
  }

  await saveHorizonChains(resolved);
  return resolved;
}

module.exports = {
  saveNiftyChain,
  saveEquityChain,
  getNiftyChainCache,
  getEquityChainCache,
  resolveNiftyChain,
  resolveEquityChain,
  saveHorizonChains,
  getHorizonChainsCache,
  resolveNiftyHorizonPack,
  chainHasTradeablePremiums,
};
