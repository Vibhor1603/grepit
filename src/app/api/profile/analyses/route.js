import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { listAnalysisRecords, serializeAnalysisRecord } from "../../../../lib/analysis-store";
import { getSessionOwner } from "../../../../lib/server-session";

export async function GET() {
  const authState = await auth();
  if (!authState.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ownerEmail = await getSessionOwner(authState);

  const records = await listAnalysisRecords(ownerEmail);

  return NextResponse.json({
    analyses: records.map(serializeAnalysisRecord),
  });
}