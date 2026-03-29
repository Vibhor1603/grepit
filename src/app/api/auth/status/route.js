import { NextResponse } from "next/server";
import { isGitHubAuthConfigured } from "../../../../lib/env";

export async function GET() {
  return NextResponse.json({
    configured: isGitHubAuthConfigured(),
  });
}
