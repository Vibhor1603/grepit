import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    console.log("[disconnect-github] No userId in session");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    console.log(`[disconnect-github] User ${userId}: checking GitHub connection`);

    // Check if GitHub token exists in private metadata (our custom OAuth flow)
    const hasMetadataToken = !!user.privateMetadata?.githubAccessToken;
    
    // Check if GitHub exists as an external account (Clerk OAuth flow)
    const githubAccount = user.externalAccounts?.find(
      (account) => account.provider === 'oauth_github'
    );

    if (!hasMetadataToken && !githubAccount) {
      console.log(`[disconnect-github] User ${userId}: no GitHub connection found`);
      return NextResponse.json({ error: "GitHub is not connected" }, { status: 400 });
    }

    // Remove the token from private metadata
    if (hasMetadataToken) {
      await client.users.updateUserMetadata(userId, {
        privateMetadata: {
          githubAccessToken: null,
        },
      });
      console.log(`[disconnect-github] User ${userId}: cleared metadata token`);
    }

    // Remove external account if it exists
    if (githubAccount) {
      try {
        await client.users.deleteExternalAccount(userId, githubAccount.id);
        console.log(`[disconnect-github] User ${userId}: removed external account`);
      } catch (err) {
        console.warn(`[disconnect-github] Could not remove external account:`, err.message);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[disconnect-github] Error:', err.message, err.stack?.split('\n')[1]);
    return NextResponse.json({ error: "Failed to disconnect GitHub" }, { status: 500 });
  }
}
