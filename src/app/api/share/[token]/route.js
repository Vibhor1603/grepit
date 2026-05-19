import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/db";
import { shared_chats, query_history } from "../../../../db/schema";
import { eq, and } from "drizzle-orm";

/**
 * GET /api/share/[token] — Fetch shared chat data (public, no auth required)
 * Returns: { title, repoName, messages: [{ query, response, created_at }] }
 */
export async function GET(request, { params }) {
  const { token } = await params;
  if (!token) return NextResponse.json({ error: "Token required" }, { status: 400 });

  console.log("[share/token] Fetching shared chat:", token);

  const db = getDb();

  // Find the shared chat record
  const [shared] = await db.select()
    .from(shared_chats)
    .where(eq(shared_chats.token, token))
    .limit(1);

  if (!shared) {
    console.log("[share/token] Not found:", token);
    return NextResponse.json({ error: "Shared chat not found or has expired" }, { status: 404 });
  }

  // Check expiry
  if (shared.expires_at && new Date(shared.expires_at) < new Date()) {
    return NextResponse.json({ error: "This shared link has expired" }, { status: 410 });
  }

  // Fetch all messages in the conversation
  const messages = await db.select({
    query: query_history.query,
    response: query_history.response,
    created_at: query_history.created_at,
  })
    .from(query_history)
    .where(eq(query_history.conversation_id, shared.conversation_id))
    .orderBy(query_history.created_at);

  if (messages.length === 0) {
    return NextResponse.json({ error: "Chat messages not found" }, { status: 404 });
  }

  console.log("[share/token] Returning", messages.length, "messages for token:", token);
  return NextResponse.json({
    title: shared.title,
    repoName: shared.repo_name,
    messages,
    sharedAt: shared.created_at,
  });
}
