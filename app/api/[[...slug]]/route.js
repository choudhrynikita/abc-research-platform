import { NextResponse } from "next/server";

export const runtime = "nodejs";
/** Allow full-universe Top 50 screen on Vercel Pro (Hobby caps at 60s; cache mitigates cold starts). */
export const maxDuration = 300;

const { handleApi } = require("../../../lib/api-handlers");

function buildPath(slug) {
  if (!slug?.length) return "/api";
  return `/api/${slug.join("/")}`;
}

async function dispatch(request, { params }) {
  const resolved = await params;
  const slug = resolved?.slug;
  const pathname = buildPath(slug);
  const { searchParams } = new URL(request.url);
  const query = Object.fromEntries(searchParams.entries());

  let body = null;
  if (request.method !== "GET" && request.method !== "HEAD") {
    try {
      body = await request.json();
    } catch {
      body = null;
    }
  }

  const result = await handleApi({
    method: request.method,
    pathname,
    query,
    body,
    authHeader: request.headers.get("authorization"),
  });

  if (result.json) {
    return NextResponse.json(result.body, { status: result.status, headers: result.headers });
  }

  const payload = Buffer.isBuffer(result.body) ? result.body : result.body;
  return new NextResponse(payload, { status: result.status, headers: result.headers });
}

export const GET = dispatch;
export const POST = dispatch;
export const PATCH = dispatch;
export const DELETE = dispatch;
export const PUT = dispatch;