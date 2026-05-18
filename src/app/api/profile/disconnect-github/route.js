import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    // Find the GitHub external account
    const githubAccount = user.externalAccounts?.find(
      (account) => account.provider === 'oauth_github'
    );

    if (!githubAccount) {
      return NextResponse.json({ error: "GitHub is not connected" }, { status: 400 });
    }

    // Remove the external account — Clerk handles token revocation
    await client.users.deleteExternalAccount(userId, githubAccount.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[disconnect-github]', err);
    return NextResponse.json({ error: "Failed to disconnect GitHub" }, { status: 500 });
  }
}
