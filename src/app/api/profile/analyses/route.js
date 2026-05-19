import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSessionOwner } from "../../../../lib/server-session";
import { listAnalysisRecords, serializeAnalysisRecord } from "../../../../lib/analysis-store";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  console.log("[profile/analyses] Listing for user:", userId);

  const ownerEmail = await getSessionOwner({ userId });
  const records = await listAnalysisRecords(ownerEmail);

  console.log("[profile/analyses] Found", records.length, "analyses");

  return NextResponse.json({
    analyses: records.map(serializeAnalysisRecord),
  });
}