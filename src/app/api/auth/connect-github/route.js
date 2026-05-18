import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

/**
 * Initiates GitHub OAuth connection for an already-signed-in user.
 * This adds GitHub as an external account to their existing Clerk session,
 * giving us access to their GitHub OAuth token for private repo analysis.
 */
export async function GET(request) {
  const { userId } = await auth();
  const { searchParams } = new URL(request.url);
  const redirectAfter = searchParams.get('redirect') || '/';

  if (!userId) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  try {
    const client = await clerkClient();
    
    // Generate an external account connection URL for GitHub
    // This uses Clerk's OAuth flow to connect GitHub to the existing user account
    const response = await client.users.createExternalAccount(userId, {
      provider: 'github',
      redirectUrl: `${new URL(request.url).origin}/api/auth/github-callback?redirect=${encodeURIComponent(redirectAfter)}`,
      additionalScopes: ['repo', 'read:user', 'user:email'],
    });

    if (response.verificationRedirectURL) {
      return NextResponse.redirect(response.verificationRedirectURL);
    }

    // If already connected, just redirect back
    return NextResponse.redirect(new URL(redirectAfter, request.url));
  } catch (err) {
    Sentry.captureException(err, {
      tags: { route: "connect-github" },
      extra: { userId },
    });
    console.error('[connect-github] Error:', err);
    // Fallback: redirect to sign-in with GitHub OAuth
    return NextResponse.redirect(new URL('/sign-in?connect_github=1', request.url));
  }
}
