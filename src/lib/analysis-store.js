import { and, desc, eq, isNull, like } from "drizzle-orm";
import { analyses, query_history } from "../db/schema";
import { getDb } from "./db";

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

export async function createAnalysisRecord(payload) {
  const db = getDb();
  const [data] = await db.insert(analyses).values(payload).returning();
  return serializeAnalysisRecord(data);
}

export async function updateAnalysisRecord(id, payload) {
  const db = getDb();
  const [data] = await db.update(analyses).set(payload).where(eq(analyses.id, id)).returning();

  if (!data) throw notFound("Analysis not found.");
  return serializeAnalysisRecord(data);
}

export async function getAnalysisRecord(id) {
  const db = getDb();
  const [data] = await db.select().from(analyses).where(eq(analyses.id, id)).limit(1);

  if (!data) throw notFound("Analysis not found.");
  return serializeAnalysisRecord(data);
}

export async function listAnalysisRecords(ownerEmail) {
  const db = getDb();
  const rows = ownerEmail
    ? await db.select().from(analyses).where(eq(analyses.owner_email, ownerEmail)).orderBy(desc(analyses.created_at)).limit(20)
    : await db.select().from(analyses).where(isNull(analyses.owner_email)).orderBy(desc(analyses.created_at)).limit(20);

  return rows.map(serializeAnalysisRecord);
}

export async function deleteAnalysisRecord(id) {
  const db = getDb();
  await db.delete(analyses).where(eq(analyses.id, id));
}

export async function createQueryHistory(payload) {
  const db = getDb();
  await db.insert(query_history).values(payload);
}

export async function getRecentQueries(analysisId, limit = 3) {
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
}

export async function deleteQueryHistory(analysisId, queryText) {
  const db = getDb();
  const trimmed = queryText.trim();
  // Delete matching rows — if none match, that's fine (already deleted)
  await db.delete(query_history).where(
    and(eq(query_history.analysis_id, analysisId), eq(query_history.query, trimmed))
  ).catch(() => {}); // Silently handle if row doesn't exist
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
