import { NextResponse } from "next/server";

const PUBLIC_PATHS = new Set(["/api", "/api/health"]);

const MUTATION_PREFIXES = [
  "/api/strategies",
  "/api/ipo-alerts/preferences",
  "/api/copilot",
  "/api/strategy-assistant",
];

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

  const secret = process.env.API_SECRET || "";
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

export function middleware(request) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/api")) return NextResponse.next();

  const authError = checkApiAuth({
    method: request.method,
    pathname,
    authHeader: request.headers.get("authorization"),
  });

  if (authError) {
    return NextResponse.json(authError.body, { status: authError.status });
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};