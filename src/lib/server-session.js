import { auth, currentUser, clerkClient } from "@clerk/nextjs/server";

/**
 * Get the current authenticated user's auth state.
 */
export async function getCurrentSession() {
  const authState = await auth();
  return authState;
}

/**
 * Get the owner identifier — use email as the stable identifier
 * so it's consistent with how analyses were stored pre-Clerk.
 * Falls back to userId if email isn't available.
 */
export async function getSessionOwner(authState) {
  if (!authState?.userId) return null;
  try {
    const user = await currentUser();
    return user?.emailAddresses?.[0]?.emailAddress || authState.userId;
  } catch {
    return authState.userId;
  }
}

/**
 * Get the GitHub OAuth access token for the current user.
 * Tries the Clerk-linked GitHub account first (for public repos),
 * then falls back to privateMetadata (separate OAuth App with repo scope).
 */
export async function getGithubAccessToken(authState) {
  if (!authState?.userId) return null;

  const client = await clerkClient();

  // First try: Clerk-linked GitHub OAuth (for users who signed in with GitHub)
  try {
    const tokens = await client.users.getUserOauthAccessToken(authState.userId, "github");
    if (tokens.data && tokens.data.length > 0) {
      return tokens.data[0].token;
    }
  } catch {
    // User hasn't connected GitHub via Clerk — that's fine
  }

  // Second try: Our custom OAuth App token stored in privateMetadata (repo scope)
  try {
    const user = await client.users.getUser(authState.userId);
    if (user.privateMetadata?.githubAccessToken) {
      console.log(`[github] Found repo-scoped token in privateMetadata for user ${authState.userId}`);
      return user.privateMetadata.githubAccessToken;
    }
    console.log(`[github] No token found for user ${authState.userId} (privateMetadata empty)`);
  } catch (err) {
    console.warn(`[github] Failed to read privateMetadata for user ${authState.userId}:`, err.message);
  }

  return null;
}

/**
 * Get the repo-scoped GitHub token from privateMetadata only.
 * This is the token from the separate GitHub OAuth App with `repo` scope.
 */
export async function getGithubRepoToken(authState) {
  if (!authState?.userId) return null;

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(authState.userId);
    return user.privateMetadata?.githubAccessToken || null;
  } catch {
    return null;
  }
}

/**
 * Check if user has a repo-scoped GitHub token stored in privateMetadata.
 */
export async function hasGithubRepoToken(authState) {
  if (!authState?.userId) return false;
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(authState.userId);
    return Boolean(user.privateMetadata?.githubAccessToken);
  } catch {
    return false;
  }
}

/**
 * Check if the user has connected their GitHub account.
 * Used to gate private repo analysis.
 */
export async function hasGithubConnected(authState) {
  if (!authState?.userId) return false;
  try {
    const client = await clerkClient();
    const tokens = await client.users.getUserOauthAccessToken(authState.userId, "github");
    return tokens.data && tokens.data.length > 0;
  } catch {
    return false;
  }
}

/**
 * Get the current user's email address.
 */
export async function getCurrentUserEmail() {
  const user = await currentUser();
  return user?.emailAddresses?.[0]?.emailAddress || null;
}

export async function getClerkUserById(userId) {
  const client = await clerkClient();
  return client.users.getUser(userId);
}

export async function updateUserPrivateMetadata(userId, metadata) {
  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, { privateMetadata: metadata });
}

export async function getUserPrivateMetadata(userId) {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    return user.privateMetadata || {};
  } catch {
    return {};
  }
}
