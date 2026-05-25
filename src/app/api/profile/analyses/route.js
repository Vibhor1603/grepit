import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { listAnalysisRecords, serializeAnalysisRecord } from "../../../../lib/analysis-store";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get email from currentUser (already available in the auth context)
  const user = await currentUser();
  const ownerEmail = user?.emailAddresses?.[0]?.emailAddress || userId;

  const records = await listAnalysisRecords(ownerEmail);

  return NextResponse.json({
    analyses: records.map(serializeAnalysisRecord),
  });
}