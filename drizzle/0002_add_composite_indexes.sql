-- Migration: Add composite indexes + conversations table
-- Run this against your Neon DB to apply optimizations

-- ─── Composite Indexes ───

-- Analyses: list by owner sorted by date (dashboard, profile)
CREATE INDEX IF NOT EXISTS "analyses_owner_created_idx" ON "analyses" ("owner_email", "created_at" DESC);

-- Analyses: findLatestAnalysisByRepo lookup
CREATE INDEX IF NOT EXISTS "analyses_repo_url_idx" ON "analyses" ("repo_url");

-- Query history: fetch conversations for an analysis (sidebar GROUP BY)
CREATE INDEX IF NOT EXISTS "query_history_analysis_conversation_idx" ON "query_history" ("analysis_id", "conversation_id", "created_at");

-- Query history: fetch messages in a conversation (chat view)
CREATE INDEX IF NOT EXISTS "query_history_conversation_created_idx" ON "query_history" ("conversation_id", "created_at");

-- Usage logs: daily usage count per user per feature (gate checks)
CREATE INDEX IF NOT EXISTS "usage_logs_user_feature_created_idx" ON "usage_logs" ("user_id", "feature", "created_at");

-- ─── Conversations Table (denormalized sidebar data) ───

CREATE TABLE IF NOT EXISTS "conversations" (
  "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "conversation_id" uuid NOT NULL UNIQUE,
  "analysis_id" uuid REFERENCES "analyses"("id") ON DELETE CASCADE,
  "owner_email" text,
  "title" text NOT NULL DEFAULT '',
  "message_count" integer NOT NULL DEFAULT 0,
  "last_activity_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "conversations_analysis_id_idx" ON "conversations" ("analysis_id");
CREATE INDEX IF NOT EXISTS "conversations_conversation_id_idx" ON "conversations" ("conversation_id");
CREATE INDEX IF NOT EXISTS "conversations_analysis_activity_idx" ON "conversations" ("analysis_id", "last_activity_at" DESC);

-- ─── Backfill conversations table from existing query_history ───
-- This populates the conversations table for existing data.
-- Safe to run multiple times (uses ON CONFLICT DO NOTHING).

INSERT INTO "conversations" ("conversation_id", "analysis_id", "owner_email", "title", "message_count", "last_activity_at", "created_at")
SELECT
  conversation_id,
  analysis_id,
  (ARRAY_AGG(owner_email ORDER BY created_at ASC))[1],
  LEFT((ARRAY_AGG(query ORDER BY created_at ASC))[1], 80),
  COUNT(*)::int,
  MAX(created_at),
  MIN(created_at)
FROM query_history
WHERE conversation_id IS NOT NULL
GROUP BY conversation_id, analysis_id
ON CONFLICT (conversation_id) DO NOTHING;
