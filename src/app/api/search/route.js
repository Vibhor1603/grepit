import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { rateLimit, rateLimitKey } from "../../../lib/rateLimit";
import { getAnalysisRecord } from "../../../lib/analysis-store";
import { getCurrentSession, getSessionOwner } from "../../../lib/server-session";
import { queryCodebase } from "../../../lib/codebase-index";

export async function POST(request) {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0].trim()
    || headersList.get("x-real-ip")
    || "unknown";

  const ct = headersList.get("content-type") || "";
  if (!ct.includes("application/json")) {
    return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });
  }

  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { analysisId, q } = body;
  if (!analysisId || typeof analysisId !== "string") {
    return NextResponse.json({ error: "analysisId is required" }, { status: 400 });
  }
  if (!q || typeof q !== "string" || q.trim().length === 0) {
    return NextResponse.json({ error: "q is required" }, { status: 400 });
  }
  if (q.length > 200) {
    return NextResponse.json({ error: "q too long (max 200 characters)" }, { status: 400 });
  }

  const session = await getCurrentSession();
  const ownerEmail = await getSessionOwner(session);

  const rlKey = rateLimitKey("search", ip, ownerEmail);
  const limit = rateLimit(rlKey, 20, 60_000);
  if (!limit.success) {
    return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
  }

  try {
    const analysis = await getAnalysisRecord(analysisId);
    if (!analysis) {
      return NextResponse.json({ error: "Analysis not found." }, { status: 404 });
    }
    if (analysis.owner_email && analysis.owner_email !== ownerEmail) {
      return NextResponse.json({ error: "You do not have access to this analysis." }, { status: 403 });
    }

    const queryResult = queryCodebase(analysis, q, { maxFiles: 20, maxSymbols: 30, maxGraphDepth: 2 });
    return NextResponse.json(queryResult);
  } catch (error) {
    Sentry.captureException(error, {
      tags: { route: "search" },
      extra: { analysisId, q },
    });
    console.error("[search] error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
