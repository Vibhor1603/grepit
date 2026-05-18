import { NextResponse } from "next/server";

/**
 * Callback after GitHub OAuth connection completes.
 * Redirects back to the original page (usually to retry the analysis).
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const redirect = searchParams.get('redirect') || '/';
  
  // Redirect back to where the user was trying to go
  return NextResponse.redirect(new URL(redirect, request.url));
}
