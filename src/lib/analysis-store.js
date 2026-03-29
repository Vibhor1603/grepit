import { createServerSupabase } from "./supabase";

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
  const supabase = createServerSupabase();
  const { data, error } = await supabase.from("analyses").insert(payload).select().single();

  if (error) throw error;
  return serializeAnalysisRecord(data);
}

export async function updateAnalysisRecord(id, payload) {
  const supabase = createServerSupabase();
  const { data, error } = await supabase.from("analyses").update(payload).eq("id", id).select().single();

  if (error) throw error;
  return serializeAnalysisRecord(data);
}

export async function getAnalysisRecord(id) {
  const supabase = createServerSupabase();
  const { data, error } = await supabase.from("analyses").select("*").eq("id", id).single();

  if (error) throw error;
  return serializeAnalysisRecord(data);
}

export async function listAnalysisRecords(ownerEmail) {
  const supabase = createServerSupabase();
  let query = supabase.from("analyses").select("*").order("created_at", { ascending: false }).limit(20);

  if (ownerEmail) {
    query = query.eq("owner_email", ownerEmail);
  } else {
    query = query.is("owner_email", null);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(serializeAnalysisRecord);
}

export async function deleteAnalysisRecord(id) {
  const supabase = createServerSupabase();
  const { error } = await supabase.from("analyses").delete().eq("id", id);
  if (error) throw error;
}

export async function createQueryHistory(payload) {
  const supabase = createServerSupabase();
  const { error } = await supabase.from("query_history").insert(payload);
  if (error) throw error;
}

export async function findLatestAnalysisByRepo(repoUrl, ownerEmail) {
  const supabase = createServerSupabase();
  let query = supabase
    .from("analyses")
    .select("*")
    .eq("repo_url", repoUrl)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (ownerEmail) query = query.eq("owner_email", ownerEmail);
  else query = query.is("owner_email", null);

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return serializeAnalysisRecord(data);
}
