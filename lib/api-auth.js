const PUBLIC_PATHS = new Set(["/api", "/api/health"]);

const MUTATION_PREFIXES = [
  "/api/strategies",
  "/api/ipo-alerts/preferences",
  "/api/copilot",
  "/api/strategy-assistant",
];

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

function extractBearerToken(authHeader) {
  if (!authHeader) return "";
  const match = String(authHeader).match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

function checkApiAuth({ method, pathname, authHeader }) {
  if (!requiresMutationAuth(method, pathname)) return null;

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
};