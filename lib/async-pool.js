/**
 * Bounded concurrency map — avoids flooding Yahoo/NSE when screening full NIFTY 500.
 */
async function mapPool(items, concurrency, mapper) {
  if (!Array.isArray(items) || items.length === 0) return [];
  const limit = Math.max(1, Math.min(concurrency || 8, items.length));
  const results = new Array(items.length);
  let next = 0;

  async function worker() {
    while (true) {
      const i = next;
      next += 1;
      if (i >= items.length) return;
      try {
        results[i] = await mapper(items[i], i);
      } catch (err) {
        results[i] = {
          error: err?.message || String(err),
          symbol: items[i]?.symbol ?? null,
        };
      }
    }
  }

  await Promise.all(Array.from({ length: limit }, () => worker()));
  return results;
}

module.exports = { mapPool };
