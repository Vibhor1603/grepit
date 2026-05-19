import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error) {
    const redirect = new URL("/", request.url);
    redirect.searchParams.set("github_error", errorDescription || error);
    return NextResponse.redirect(redirect);
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/?github_error=missing_params", request.url));
  }

  const colonIndex = state.indexOf(":");
  const userId = colonIndex > 0 ? state.slice(0, colonIndex) : state;
  const resumeRepo = colonIndex > 0 ? decodeURIComponent(state.slice(colonIndex + 1)) : null;

  try {
    const client = await clerkClient();

    try {
      await client.users.getUser(userId);
    } catch {
      return NextResponse.redirect(new URL("/?github_error=invalid_user", request.url));
    }

    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_OAUTH_CLIENT_ID,
        client_secret: process.env.GITHUB_OAUTH_CLIENT_SECRET,
        code,
        redirect_uri: process.env.GITHUB_OAUTH_REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      return NextResponse.redirect(new URL("/?github_error=token_exchange_failed", request.url));
    }

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      return NextResponse.redirect(new URL(`/?github_error=${encodeURIComponent(tokenData.error_description || tokenData.error)}`, request.url));
    }

    const grantedScopes = (tokenData.scope || "").split(",").map((s) => s.trim());
    if (!grantedScopes.includes("repo")) {
      return NextResponse.redirect(new URL(`/?github_error=${encodeURIComponent("'repo' scope was not granted. Got: " + tokenData.scope)}`, request.url));
    }

    await client.users.updateUserMetadata(userId, {
      privateMetadata: {
        githubAccessToken: tokenData.access_token,
      },
    });

    if (resumeRepo) {
      // Special case: if connecting from profile page, redirect back there
      if (resumeRepo === '__profile__') {
        return NextResponse.redirect(new URL("/profile?github=connected", request.url));
      }
      const redirect = new URL("/", request.url);
      redirect.searchParams.set("resume", resumeRepo);
      return NextResponse.redirect(redirect);
    }

    return NextResponse.redirect(new URL("/profile?github=connected", request.url));
  } catch (err) {
    console.error("[github-callback]", err);
    return NextResponse.redirect(new URL("/?github_error=internal", request.url));
  }
}
