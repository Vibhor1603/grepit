-- Migration: Add vector embeddings for semantic code search
-- Requires pgvector extension (supported natively by Neon)

-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Code embeddings table — stores chunked file content with vector embeddings
CREATE TABLE IF NOT EXISTS "code_embeddings" (
  "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "analysis_id" uuid NOT NULL REFERENCES "analyses"("id") ON DELETE CASCADE,
  "file_path" text NOT NULL,
  "start_line" integer NOT NULL DEFAULT 1,
  "end_line" integer NOT NULL DEFAULT 1,
  "content" text NOT NULL,
  "embedding" vector(1536) NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for filtering by analysis
CREATE INDEX IF NOT EXISTS "code_embeddings_analysis_id_idx" ON "code_embeddings" ("analysis_id");

-- HNSW index for fast approximate nearest neighbor search
-- This makes cosine similarity queries fast (< 50ms for 10K vectors)
CREATE INDEX IF NOT EXISTS "code_embeddings_embedding_idx" ON "code_embeddings" 
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
