/**
 * Vector embedding layer for semantic code search.
 * 
 * Uses OpenRouter for embeddings (same account as chat) + pgvector in Neon for storage/search.
 * 
 * Flow:
 *   Analysis time: file code → chunk → embed via OpenRouter → store in code_embeddings
 *   Query time: user question → embed → pgvector cosine search → top chunks
 * 
 * Chunking strategy:
 *   - Each file is split into chunks of ~200 lines (overlapping by 20 lines)
 *   - Each chunk stores: file path, line range, code content, embedding vector
 *   - Small files (< 100 lines) are stored as a single chunk
 */

import { getDb } from "./db";
import { sql } from "drizzle-orm";

import { getEmbeddingModel, isEmbeddingModelConfigured } from "./ai-models";
const EMBEDDING_DIMENSIONS = 1536;
const CHUNK_LINES = 200;
const CHUNK_OVERLAP = 20;
const MAX_CHUNKS_PER_FILE = 10;
const BATCH_SIZE = 50; // OpenRouter supports large batches

// ─── Embedding generation via OpenRouter ───

/**
 * Generate embeddings for an array of text inputs via OpenRouter.
 * Uses the same API key as chat — no separate account needed.
 */
async function embedTexts(texts) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || !isEmbeddingModelConfigured()) {
    console.warn("[embeddings] OPENROUTER_API_KEY or OPENROUTER_EMBEDDING_MODEL not set, skipping embeddings");
    return null;
  }

  try {
    const res = await fetch("https://openrouter.ai/api/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://grepit.co",
        "X-Title": "grepit Code Analyst",
      },
      body: JSON.stringify({
        model: getEmbeddingModel(),
        input: texts,
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      console.error(`[embeddings] OpenRouter embed error ${res.status}:`, err.slice(0, 200));
      return null;
    }

    const data = await res.json();
    return data.data.map(item => item.embedding);
  } catch (err) {
    console.error("[embeddings] Embedding API call failed:", err.message);
    return null;
  }
}

/**
 * Generate a single embedding for a query.
 */
async function embedQuery(text) {
  const vectors = await embedTexts([text]);
  return vectors?.[0] || null;
}

// ─── Chunking ───

/**
 * Split file code into overlapping chunks for embedding.
 * Each chunk includes file path context for better retrieval.
 */
function chunkFileCode(filePath, code, summary = "") {
  if (!code || code.length < 50) return [];

  const lines = code.split("\n");
  const chunks = [];

  // Small files → single chunk
  if (lines.length <= CHUNK_LINES) {
    chunks.push({
      filePath,
      startLine: 1,
      endLine: lines.length,
      content: `File: ${filePath}\n${summary ? `Purpose: ${summary}\n` : ""}---\n${code}`,
    });
    return chunks;
  }

  // Large files → overlapping chunks
  for (let i = 0; i < lines.length && chunks.length < MAX_CHUNKS_PER_FILE; i += CHUNK_LINES - CHUNK_OVERLAP) {
    const chunkLines = lines.slice(i, i + CHUNK_LINES);
    const startLine = i + 1;
    const endLine = Math.min(i + CHUNK_LINES, lines.length);

    chunks.push({
      filePath,
      startLine,
      endLine,
      content: `File: ${filePath} (lines ${startLine}-${endLine})\n${summary ? `Purpose: ${summary}\n` : ""}---\n${chunkLines.join("\n")}`,
    });
  }

  return chunks;
}

// ─── Storage (pgvector) ───

/**
 * Store embeddings for an analysis. Deletes old embeddings first.
 * Called during the analysis pipeline after code intelligence is built.
 */
export async function storeEmbeddings(analysisId, files) {
  if (!process.env.OPENROUTER_API_KEY || !isEmbeddingModelConfigured()) {
    console.log("[embeddings] Skipping — embedding provider not configured");
    return { stored: 0, skipped: true };
  }

  const db = getDb();
  const startTime = Date.now();

  // Delete old embeddings for this analysis
  await db.execute(sql`DELETE FROM code_embeddings WHERE analysis_id = ${analysisId}`);

  // Build chunks from all files
  const allChunks = [];
  for (const file of files) {
    if (!file.code || file.code.length < 50) continue;
    const chunks = chunkFileCode(file.path, file.code, file.summary);
    allChunks.push(...chunks);
  }

  if (allChunks.length === 0) {
    console.log("[embeddings] No chunks to embed");
    return { stored: 0, skipped: false };
  }

  console.log(`[embeddings] Embedding ${allChunks.length} chunks from ${files.length} files...`);

  // Embed in batches
  let stored = 0;
  for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
    const batch = allChunks.slice(i, i + BATCH_SIZE);
    const texts = batch.map(c => c.content);
    const vectors = await embedTexts(texts);

    if (!vectors) {
      console.error(`[embeddings] Batch ${i / BATCH_SIZE + 1} failed, skipping`);
      continue;
    }

    // Insert into pgvector table
    for (let j = 0; j < batch.length; j++) {
      const chunk = batch[j];
      const vector = vectors[j];
      if (!vector) continue;

      try {
        await db.execute(sql`
          INSERT INTO code_embeddings (analysis_id, file_path, start_line, end_line, content, embedding)
          VALUES (${analysisId}, ${chunk.filePath}, ${chunk.startLine}, ${chunk.endLine}, ${chunk.content}, ${JSON.stringify(vector)}::vector)
        `);
        stored++;
      } catch (err) {
        // Skip individual insert failures (e.g., content too long)
        if (!err.message?.includes("duplicate")) {
          console.warn(`[embeddings] Insert failed for ${chunk.filePath}:${chunk.startLine}:`, err.message?.slice(0, 100));
        }
      }
    }
  }

  const elapsed = Date.now() - startTime;
  console.log(`[embeddings] Stored ${stored}/${allChunks.length} chunks in ${elapsed}ms`);
  return { stored, total: allChunks.length, elapsed };
}

// ─── Semantic search ───

/**
 * Search for code chunks semantically similar to the query.
 * Returns the top N most relevant chunks with their file paths and code.
 * 
 * This is the main function called at query time.
 */
export async function searchEmbeddings(analysisId, query, { limit = 8 } = {}) {
  if (!process.env.OPENROUTER_API_KEY) {
    console.log("[embeddings] Search skipped — OPENROUTER_API_KEY not configured");
    return null;
  }

  const startTime = Date.now();

  // Embed the query
  const queryVector = await embedQuery(query);
  if (!queryVector) {
    console.error("[embeddings] Failed to embed query");
    return null;
  }

  // Search pgvector using cosine similarity
  const db = getDb();
  try {
    const results = await db.execute(sql`
      SELECT 
        file_path,
        start_line,
        end_line,
        content,
        1 - (embedding <=> ${JSON.stringify(queryVector)}::vector) as similarity
      FROM code_embeddings
      WHERE analysis_id = ${analysisId}
      ORDER BY embedding <=> ${JSON.stringify(queryVector)}::vector
      LIMIT ${limit}
    `);

    const elapsed = Date.now() - startTime;
    const rows = results.rows || [];

    console.log(`[embeddings] Search returned ${rows.length} results in ${elapsed}ms (top: ${rows[0]?.file_path || 'none'}, similarity: ${rows[0]?.similarity?.toFixed(3) || 'n/a'})`);

    return rows.map(row => ({
      filePath: row.file_path,
      startLine: row.start_line,
      endLine: row.end_line,
      content: row.content,
      similarity: Number(row.similarity),
    }));
  } catch (err) {
    // Table might not exist yet or no embeddings for this analysis
    if (err.message?.includes("does not exist") || err.message?.includes("code_embeddings")) {
      console.log("[embeddings] Table not found — run migration first");
      return null;
    }
    console.error("[embeddings] Search error:", err.message);
    return null;
  }
}

/**
 * Check if embeddings exist for an analysis.
 */
export async function hasEmbeddings(analysisId) {
  try {
    const db = getDb();
    const result = await db.execute(sql`
      SELECT COUNT(*)::int as count FROM code_embeddings WHERE analysis_id = ${analysisId}
    `);
    return (result.rows?.[0]?.count || 0) > 0;
  } catch {
    return false;
  }
}
