import * as Sentry from "@sentry/nextjs";
import { and, desc, eq, isNull, sql, count } from "drizzle-orm";
import { analyses, query_history, conversations } from "../db/schema";
import { getDb } from "./db";
import { cached, invalidate } from "./cache";
import { bufferChatMessage, forceFlush } from "./chat-buffer";

function notFound(message) {
  const error = new Error(message);
  error.status = 404;
  return error;
}

export function serializeAnalysisRecord(record) {
  if (!record) return null;

  return {
    ...record,
    languages: record.languages || {},
    file_tree: record.file_tree || [],
    architecture: record.architecture || {},
    results: record.results || {},
  };
}

// ─── Analysis CRUD ───

export async function createAnalysisRecord(payload) {
  const db = getDb();
  try {
    const [data] = await db.insert(analyses).values(payload).returning();
    return serializeAnalysisRecord(data);
  } catch (err) {
    Sentry.captureException(err, { tags: { db_op: "createAnalysisRecord" } });
    throw err;
  }
}

export async function updateAnalysisRecord(id, payload) {
  const db = getDb();
  try {
    const [data] = await db.update(analyses).set(payload).where(eq(analyses.id, id)).returning();
    if (!data) throw notFound("Analysis not found.");
    // Invalidate caches
    await invalidate(`analysis:${id}`);
    await invalidate(`analysis-summary:${id}`);
    if (data.owner_email) await invalidate(`analyses:${data.owner_email}`);
    return serializeAnalysisRecord(data);
  } catch (err) {
    if (err.status !== 404) Sentry.captureException(err, { tags: { db_op: "updateAnalysisRecord" }, extra: { id } });
    throw err;
  }
}

/**
 * Get full analysis record (cached 10 min).
 * Use this when you need the full JSON blobs (file_tree, results, architecture).
 */
export async function getAnalysisRecord(id) {
  return cached(`analysis:${id}`, 600, async () => {
    const db = getDb();
    const [data] = await db.select().from(analyses).where(eq(analyses.id, id)).limit(1);
    if (!data) throw notFound("Analysis not found.");
    return serializeAnalysisRecord(data);
  });
}

/**
 * List analyses for a user — DENORMALIZED: only fetches summary columns.
 * Avoids pulling 50-200KB JSON blobs (results, file_tree, architecture) per row.
 * Cached for 2 minutes.
 */
export async function listAnalysisRecords(ownerEmail) {
  return cached(`analyses:${ownerEmail || 'public'}`, 120, async () => {
    const db = getDb();
    const condition = ownerEmail
      ? eq(analyses.owner_email, ownerEmail)
      : isNull(analyses.owner_email);

    // Select only lightweight columns — skip results, file_tree, architecture
    const rows = await db
      .select({
        id: analyses.id,
        owner_email: analyses.owner_email,
        repo_url: analyses.repo_url,
        repo_name: analyses.repo_name,
        source: analyses.source,
        status: analyses.status,
        summary: analyses.summary,
        total_files: analyses.total_files,
        total_lines: analyses.total_lines,
        is_private: analyses.is_private,
        error_message: analyses.error_message,
        languages: analyses.languages,
        created_at: analyses.created_at,
        updated_at: analyses.updated_at,
      })
      .from(analyses)
      .where(condition)
      .orderBy(desc(analyses.created_at))
      .limit(20);

    return rows.map(r => ({
      ...r,
      languages: r.languages || {},
      // These are intentionally empty — full data loaded on demand via getAnalysisRecord
      file_tree: [],
      architecture: {},
      results: {},
    }));
  });
}

export async function deleteAnalysisRecord(id) {
  const db = getDb();
  await db.delete(analyses).where(eq(analyses.id, id));
  await invalidate(`analysis:${id}`);
  await invalidate(`analysis-summary:${id}`);
}

/**
 * Get analysis metadata only (no large JSON blobs).
 * Use this for access checks, ownership verification, and status display.
 * Cached for 5 minutes. Much cheaper than getAnalysisRecord.
 */
export async function getAnalysisMeta(id) {
  return cached(`analysis-meta:${id}`, 300, async () => {
    const db = getDb();
    const [data] = await db
      .select({
        id: analyses.id,
        owner_email: analyses.owner_email,
        repo_url: analyses.repo_url,
        repo_name: analyses.repo_name,
        source: analyses.source,
        status: analyses.status,
        summary: analyses.summary,
        total_files: analyses.total_files,
        total_lines: analyses.total_lines,
        is_private: analyses.is_private,
        languages: analyses.languages,
        created_at: analyses.created_at,
        updated_at: analyses.updated_at,
      })
      .from(analyses)
      .where(eq(analyses.id, id))
      .limit(1);
    if (!data) throw notFound("Analysis not found.");
    return data;
  });
}

// ─── Chat History (Buffered Writes) ───

/**
 * Create a query history entry.
 * Uses the write buffer for performance — messages are batched and flushed
 * every 5 seconds or every 10 messages.
 * 
 * The user sees the message immediately (streamed to UI).
 * DB persistence happens asynchronously in the background.
 */
export async function createQueryHistory(payload, { immediate = false } = {}) {
  bufferChatMessage(payload);
  // Only invalidate after data is actually written — flushBuffer handles that.
  // Do not invalidate on buffer add; that repopulates cache with stale/empty DB rows.
  if (immediate) {
    await forceFlush();
  }
}

/**
 * Force-flush the chat buffer.
 * Call before sharing a chat or when immediate persistence is needed.
 */
export { forceFlush as flushChatBuffer };

// ─── Conversation Queries (Optimized) ───

/**
 * Get list of conversations for the sidebar.
 * 
 * OPTIMIZATION: Queries the denormalized `conversations` table first.
 * Falls back to GROUP BY on `query_history` if the conversations table
 * hasn't been populated yet (backward compatibility).
 * 
 * Cached for 30 seconds.
 */
export async function getConversations(analysisId, limit = 30) {
  return cached(`conversations:${analysisId}`, 30, async () => {
    const db = getDb();

    // Try the denormalized conversations table first (fast path)
    try {
      const rows = await db
        .select({
          id: conversations.conversation_id,
          title: conversations.title,
          created_at: conversations.created_at,
          last_activity: conversations.last_activity_at,
          messageCount: conversations.message_count,
        })
        .from(conversations)
        .where(eq(conversations.analysis_id, analysisId))
        .orderBy(desc(conversations.last_activity_at))
        .limit(limit);

      if (rows.length > 0) {
        return rows.map(row => ({
          ...row,
          title: (row.title || '').slice(0, 80),
        }));
      }
    } catch {
      // Table might not exist yet — fall through to legacy query
    }

    // Fallback: GROUP BY on query_history (slower but always works)
    const result = await db.execute(sql`
      SELECT
        conversation_id as id,
        (ARRAY_AGG(query ORDER BY created_at ASC))[1] as title,
        MIN(created_at) as created_at,
        MAX(created_at) as last_activity,
        COUNT(*)::int as "messageCount"
      FROM query_history
      WHERE analysis_id = ${analysisId}
      GROUP BY conversation_id
      ORDER BY MAX(created_at) DESC
      LIMIT ${limit}
    `);

    return (result.rows || []).map(row => ({
      id: row.id,
      title: (row.title || '').slice(0, 80),
      created_at: row.created_at,
      last_activity: row.last_activity,
      messageCount: row.messageCount,
    }));
  });
}

/**
 * Get messages in a conversation with cursor-based pagination.
 * 
 * OPTIMIZATION: Only loads the most recent N messages by default.
 * Older messages can be loaded on demand via the `before` cursor.
 * 
 * @param {string} conversationId
 * @param {object} options - { limit, before }
 *   - limit: max messages to return (default 30)
 *   - before: ISO timestamp cursor — fetch messages older than this
 */
export async function getConversationMessages(conversationId, options = {}) {
  const { limit = 50, before } = options;
  const db = getDb();

  const conditions = [eq(query_history.conversation_id, conversationId)];

  if (before) {
    const { lt } = await import("drizzle-orm");
    conditions.push(lt(query_history.created_at, before));
  }

  const rows = await db
    .select({
      id: query_history.id,
      query: query_history.query,
      response: query_history.response,
      created_at: query_history.created_at,
    })
    .from(query_history)
    .where(and(...conditions))
    .orderBy(query_history.created_at)
    .limit(limit);

  return rows;
}

/**
 * Get message count for a conversation (for limit checking).
 * Cached briefly to avoid repeated COUNT queries during streaming.
 */
export async function getConversationMessageCount(conversationId) {
  return cached(`conv-count:${conversationId}`, 10, async () => {
    const db = getDb();
    const [result] = await db
      .select({ count: count() })
      .from(query_history)
      .where(eq(query_history.conversation_id, conversationId));
    return result?.count || 0;
  });
}

// Delete an entire conversation
export async function deleteConversation(conversationId) {
  const db = getDb();
  // Delete messages
  await db.delete(query_history).where(eq(query_history.conversation_id, conversationId));
  // Delete from denormalized conversations table
  await db.delete(conversations).where(eq(conversations.conversation_id, conversationId)).catch(() => {});
  // Invalidate caches
  await invalidate(`conv-count:${conversationId}`).catch(() => {});
}

/**
 * Get recent queries for context (used by non-streaming endpoint).
 * Cached briefly since it's called on every query.
 */
export async function getRecentQueries(analysisId, limit = 3) {
  return cached(`recent-queries:${analysisId}`, 15, async () => {
    const db = getDb();
    const rows = await db
      .select({
        id: query_history.id,
        query: query_history.query,
        response: query_history.response,
        created_at: query_history.created_at,
      })
      .from(query_history)
      .where(eq(query_history.analysis_id, analysisId))
      .orderBy(desc(query_history.created_at))
      .limit(limit);

    return rows.reverse();
  });
}

export async function deleteQueryHistory(analysisId, queryText) {
  const db = getDb();
  const trimmed = queryText.trim();
  await db.delete(query_history).where(
    and(eq(query_history.analysis_id, analysisId), eq(query_history.query, trimmed))
  ).catch(() => {});
}

export async function findLatestAnalysisByRepo(repoUrl, ownerEmail) {
  const db = getDb();
  const conditions = [eq(analyses.repo_url, repoUrl)];
  conditions.push(ownerEmail ? eq(analyses.owner_email, ownerEmail) : isNull(analyses.owner_email));

  const [data] = await db
    .select()
    .from(analyses)
    .where(and(...conditions))
    .orderBy(desc(analyses.updated_at))
    .limit(1);

  return serializeAnalysisRecord(data);
}
