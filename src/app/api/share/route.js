import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDb } from "../../../lib/db";
import { shared_chats, query_history, analyses } from "../../../db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import { checkGate, logUsage } from "../../../lib/subscription-gate";
import { flushChatBuffer } from "../../../lib/analysis-store";

/**
 * POST /api/share — Create a share link for a conversation
 * Body: { conversationId, analysisId }
 * Returns: { token, url }
 */
export async function POST(request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { conversationId, analysisId } = body;
  if (!conversationId || !analysisId) {
    return NextResponse.json({ error: "conversationId and analysisId are required" }, { status: 400 });
  }

  console.log("[share] Creating share for conversation:", conversationId, "user:", userId);

  // Flush chat buffer to ensure all messages are persisted before sharing
  await flushChatBuffer().catch(() => {});

  // Check share gate (free: 2 total, paid: unlimited)
  const gate = await checkGate(userId, "chat_share");
  if (!gate.allowed) {
    console.log("[share] Gate blocked for user:", userId, "reason:", gate.reason);
    return NextResponse.json({ error: gate.reason, code: gate.code }, { status: 403 });
  }

  const db = getDb();

  // Verify the conversation exists and belongs to this user
  const messages = await db.select()
    .from(query_history)
    .where(and(
      eq(query_history.conversation_id, conversationId),
      eq(query_history.analysis_id, analysisId),
    ))
    .limit(1);

  if (messages.length === 0) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  // Get repo name for display
  const [analysis] = await db.select({ repo_name: analyses.repo_name })
    .from(analyses)
    .where(eq(analyses.id, analysisId))
    .limit(1);

  // Check if already shared
  const [existing] = await db.select()
    .from(shared_chats)
    .where(eq(shared_chats.conversation_id, conversationId))
    .limit(1);

  if (existing) {
    const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "https://grepit.co";
    return NextResponse.json({ token: existing.token, url: `${origin}/share/${existing.token}` });
  }

  // Generate a short, URL-safe token
  const token = crypto.randomBytes(12).toString("base64url");
  const title = messages[0]?.query?.slice(0, 80) || "Shared chat";

  await db.insert(shared_chats).values({
    token,
    conversation_id: conversationId,
    analysis_id: analysisId,
    shared_by: userId,
    repo_name: analysis?.repo_name || "Unknown",
    title,
  });

  // Log usage for gating (free users have limited shares)
  logUsage(userId, "chat_share", { conversation_id: conversationId }).catch(() => {});

  const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "https://grepit.co";
  console.log("[share] Created token:", token, "for conversation:", conversationId);
  return NextResponse.json({ token, url: `${origin}/share/${token}` });
}
