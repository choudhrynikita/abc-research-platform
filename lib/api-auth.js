const PUBLIC_PATHS = new Set(["/api", "/api/health"]);

/**
 * Write/mutation endpoints that require Bearer API_SECRET in production.
 * Research Q&A assistants (copilot, strategy-assistant) are intentionally public POST
 * queries — they do not mutate platform state and must not force browser users to hold secrets.
 */
const MUTATION_PREFIXES = [
  "/api/strategies",
  "/api/ipo-alerts/preferences",
  "/api/watchlists",
  "/api/portfolios",
  "/api/broker/sync-holdings",
];

/** Sensitive read endpoints — require Bearer token in production. */
const PROTECTED_READ_PATHS = new Set(["/api/audit"]);

function getApiSecret() {
  return process.env.API_SECRET || "";
}

function isProduction() {
  return process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
}

function requiresMutationAuth(method, pathname) {
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return false;
  if (PUBLIC_PATHS.has(pathname)) return false;
  return MUTATION_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function requiresProtectedReadAuth(method, pathname) {
  if (method !== "GET" && method !== "HEAD") return false;
  return PROTECTED_READ_PATHS.has(pathname);
}

function requiresApiAuth(method, pathname) {
  return requiresMutationAuth(method, pathname) || requiresProtectedReadAuth(method, pathname);
}

function extractBearerToken(authHeader) {
  if (!authHeader) return "";
  const match = String(authHeader).match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

function checkApiAuth({ method, pathname, authHeader }) {
  if (!requiresApiAuth(method, pathname)) return null;

  const secret = getApiSecret();
  if (!secret) {
    if (isProduction()) {
      return {
        status: 503,
        body: {
          error: "API authentication not configured",
          message: "Set API_SECRET environment variable to enable write access.",
        },
      };
    }
    return null;
  }

  const token = extractBearerToken(authHeader);
  if (!token || token !== secret) {
    return {
      status: 401,
      body: {
        error: "Unauthorized",
        message: "Valid Authorization: Bearer <API_SECRET> required for this endpoint.",
      },
    };
  }

  return null;
}

function getMutationAuthMode() {
  const secret = getApiSecret();
  if (secret) return "bearer";
  if (isProduction()) return "disabled";
  return "dev-open";
}

module.exports = {
  checkApiAuth,
  getApiSecret,
  getMutationAuthMode,
  requiresMutationAuth,
  requiresProtectedReadAuth,
  requiresApiAuth,
};