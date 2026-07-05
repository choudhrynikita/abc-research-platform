/** Normalize NIFTY 500 breadth field names (advances vs advancers). */
function normalizeBreadth(breadth) {
  if (!breadth) return null;
  const advancers = breadth.advancers ?? breadth.advances ?? null;
  const decliners = breadth.decliners ?? breadth.declines ?? null;
  return {
    ...breadth,
    advancers,
    decliners,
    advances: advancers,
    declines: decliners,
    advanceDeclineRatio:
      breadth.advanceDeclineRatio ??
      (advancers != null && decliners ? Number((advancers / decliners).toFixed(2)) : null),
  };
}

module.exports = { normalizeBreadth };