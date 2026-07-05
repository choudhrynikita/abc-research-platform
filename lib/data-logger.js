/**
 * Structured logging for financial data pipeline events.
 * Logs to stderr in all environments; failures never throw.
 */

const PREFIX = "[abc-data]";

function logEvent(level, category, message, meta = {}) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    category,
    message,
    ...meta,
  };
  const line = `${PREFIX} ${JSON.stringify(entry)}`;
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

function logApiFailure(provider, endpoint, error, meta = {}) {
  logEvent("error", "api_failure", `${provider} request failed`, {
    provider,
    endpoint,
    error: error?.message || String(error),
    ...meta,
  });
}

function logValidationFailure(metric, reason, meta = {}) {
  logEvent("warn", "validation_failure", `Rejected ${metric}: ${reason}`, {
    metric,
    reason,
    ...meta,
  });
}

function logMissingHistory(symbol, reason, meta = {}) {
  logEvent("warn", "missing_iv_history", reason, { symbol, ...meta });
}

function logStaleCache(resource, ageMs, meta = {}) {
  logEvent("warn", "stale_cache", `Stale cache detected for ${resource}`, {
    resource,
    ageMs,
    ...meta,
  });
}

function logSourceMismatch(metric, sources, meta = {}) {
  logEvent("warn", "source_mismatch", `Source disagreement for ${metric}`, {
    metric,
    sources,
    ...meta,
  });
}

function logCalculationFailure(metric, reason, meta = {}) {
  logEvent("warn", "calculation_failure", `Cannot compute ${metric}: ${reason}`, {
    metric,
    reason,
    ...meta,
  });
}

module.exports = {
  logEvent,
  logApiFailure,
  logValidationFailure,
  logMissingHistory,
  logStaleCache,
  logSourceMismatch,
  logCalculationFailure,
};