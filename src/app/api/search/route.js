import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { rateLimit } from "../../../lib/rateLimit";
import { getAnalysisRecord } from "../../../lib/analysis-store";
import { getCurrentSession, getSessionOwner } from "../../../lib/server-session";

export async function POST(request) {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "unknown";
  const limit = rateLimit(`search:${ip}`, 15, 60000);
  if (!limit.success) {
    return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
  }

  try {
    const { analysisId, q } = await request.json();
    if (!analysisId || !q) {
      return NextResponse.json({ error: "analysisId and q are required." }, { status: 400 });
    }

    const session = await getCurrentSession();
    const ownerEmail = getSessionOwner(session);
    const analysis = await getAnalysisRecord(analysisId);
    if (analysis?.owner_email && analysis.owner_email !== ownerEmail) {
      return NextResponse.json({ error: "You do not have access to this analysis." }, { status: 403 });
    }

    const needle = q.toLowerCase();
    const files = analysis?.results?.files || [];
    const symbols = analysis?.results?.symbolIndex || [];

    const fileMatches = files.filter((file) => file.path.toLowerCase().includes(needle) || (file.summary || "").toLowerCase().includes(needle)).slice(0, 20);
    const symbolMatches = symbols.filter((symbol) => symbol.name?.toLowerCase().includes(needle) || symbol.file?.toLowerCase().includes(needle)).slice(0, 30);

    return NextResponse.json({ fileMatches, symbolMatches });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

