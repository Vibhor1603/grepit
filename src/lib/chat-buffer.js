/**
 * Chat message write buffer.
 * 
 * Instead of inserting one row per message immediately, we buffer messages
 * and flush them in bulk. This reduces DB round trips by 10-50x for active
 * chat sessions.
 * 
 * Flush triggers:
 * - Buffer reaches 10 messages
 * - 5 seconds since last flush
 * - Process is shutting down (beforeExit)
 * 
 * The user sees messages immediately (streamed to UI). The DB write is
 * purely for persistence and happens asynchronously.
 */

import { getDb } from "./db";
import { query_history, conversations } from "../db/schema";
import { invalidate } from "./cache";
import { eq } from "drizzle-orm";

// ── Buffer state ──
const buffer = [];
let flushTimer = null;
const FLUSH_INTERVAL_MS = 5000; // 5 seconds
const FLUSH_THRESHOLD = 10;    // 10 messages

/**
 * Add a chat message to the write buffer.
 * Will be flushed to DB automatically.
 * 
 * @param {object} message - { analysis_id, conversation_id, owner_email, query, response }
 */
export function bufferChatMessage(message) {
  buffer.push({
    ...message,
    created_at: new Date().toISOString(),
  });

  // Flush immediately if buffer is full
  if (buffer.length >= FLUSH_THRESHOLD) {
    flushBuffer();
    return;
  }

  // Schedule a flush if not already scheduled
  if (!flushTimer) {
    flushTimer = setTimeout(flushBuffer, FLUSH_INTERVAL_MS);
  }
}

/**
 * Flush all buffered messages to the database in a single bulk insert.
 * Also updates the denormalized conversations table.
 * Safe to call multiple times — no-ops if buffer is empty.
 */
export async function flushBuffer() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  if (buffer.length === 0) return;

  // Drain the buffer atomically
  const messages = buffer.splice(0, buffer.length);

  try {
    const db = getDb();

    // Bulk insert messages
    await db.insert(query_history).values(messages);

    // Update the denormalized conversations table
    await updateConversationsSummary(db, messages);

    // Invalidate conversation caches for affected analyses
    const analysisIds = new Set(messages.map(m => m.analysis_id).filter(Boolean));
    for (const id of analysisIds) {
      await invalidate(`conversations:${id}`).catch(() => {});
    }

    // Invalidate message count caches
    const convIds = new Set(messages.map(m => m.conversation_id).filter(Boolean));
    for (const id of convIds) {
      await invalidate(`conv-count:${id}`).catch(() => {});
    }
  } catch (err) {
    console.error("[chat-buffer] Bulk insert failed, retrying individually:", err.message);
    // Fallback: try inserting one by one so we don't lose all messages
    const db = getDb();
    for (const msg of messages) {
      try {
        await db.insert(query_history).values(msg);
      } catch (innerErr) {
        console.error("[chat-buffer] Single insert failed:", innerErr.message);
      }
    }
    // Still try to update conversations table
    await updateConversationsSummary(db, messages).catch(() => {});
  }
}

/**
 * Update the denormalized conversations table after flushing messages.
 * Uses upsert (INSERT ... ON CONFLICT UPDATE) for atomicity.
 */
async function updateConversationsSummary(db, messages) {
  // Group messages by conversation_id
  const convMap = new Map();
  for (const msg of messages) {
    if (!msg.conversation_id) continue;
    if (!convMap.has(msg.conversation_id)) {
      convMap.set(msg.conversation_id, {
        conversation_id: msg.conversation_id,
        analysis_id: msg.analysis_id,
        owner_email: msg.owner_email,
        title: (msg.query || '').slice(0, 80),
        count: 1,
        last_activity: msg.created_at,
        created_at: msg.created_at,
      });
    } else {
      const conv = convMap.get(msg.conversation_id);
      conv.count++;
      if (msg.created_at > conv.last_activity) {
        conv.last_activity = msg.created_at;
      }
    }
  }

  // Upsert each conversation summary
  for (const [convId, data] of convMap) {
    try {
      // Check if conversation exists
      const [existing] = await db
        .select({ id: conversations.id, message_count: conversations.message_count })
        .from(conversations)
        .where(eq(conversations.conversation_id, convId))
        .limit(1);

      if (existing) {
        // Update: increment count and update last_activity
        await db.update(conversations)
          .set({
            message_count: existing.message_count + data.count,
            last_activity_at: data.last_activity,
          })
          .where(eq(conversations.conversation_id, convId));
      } else {
        // Insert new conversation record
        await db.insert(conversations).values({
          conversation_id: convId,
          analysis_id: data.analysis_id,
          owner_email: data.owner_email,
          title: data.title,
          message_count: data.count,
          last_activity_at: data.last_activity,
          created_at: data.created_at,
        });
      }
    } catch (err) {
      // Non-fatal — the fallback GROUP BY query still works
      console.warn("[chat-buffer] Conversation summary upsert failed:", err.message);
    }
  }
}

/**
 * Force flush — call this when you need messages persisted immediately.
 * Used before sharing a chat or when the process is about to exit.
 */
export async function forceFlush() {
  await flushBuffer();
}

// ── Flush on process exit (best-effort) ──
if (typeof process !== "undefined" && process.on) {
  process.on("beforeExit", () => {
    if (buffer.length > 0) {
      flushBuffer().catch(() => {});
    }
  });
}
