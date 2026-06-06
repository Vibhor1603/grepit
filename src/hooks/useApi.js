"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

/* ── Fetch analysis data ── */
export function useAnalysis(analysisId) {
  return useQuery({
    queryKey: ['analysis', analysisId],
    queryFn: async () => {
      const url = analysisId ? `/api/analyze?id=${analysisId}` : '/api/analyze';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load analysis');
      const data = await res.json();
      return Array.isArray(data) ? data[0] : data;
    },
    enabled: Boolean(analysisId),
    staleTime: Infinity, // Analysis data doesn't change until user re-analyzes
    gcTime: 30 * 60_000, // Keep in cache for 30 minutes
  });
}

/* ── Fetch file content (cached per file path) ── */
export function useFileContent(analysisId, filePath) {
  return useQuery({
    queryKey: ['file', analysisId, filePath],
    queryFn: async () => {
      const res = await fetch(`/api/file?id=${encodeURIComponent(analysisId)}&path=${encodeURIComponent(filePath)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load file');
      return {
        code: data.code || '// No content',
        truncated: Boolean(data.truncated),
        source: data.source || 'unknown',
      };
    },
    enabled: Boolean(analysisId && filePath),
    staleTime: Infinity,
  });
}

/* ── Fetch conversations list (sidebar) ── */
export function useChatHistory(analysisId) {
  return useQuery({
    queryKey: ['chatHistory', analysisId],
    queryFn: async () => {
      const res = await fetch(`/api/query?analysisId=${encodeURIComponent(analysisId)}`);
      const data = await res.json();
      return data.conversations || [];
    },
    enabled: Boolean(analysisId),
    staleTime: Infinity,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
  });
}

/** Convert API conversation rows to chat UI messages. */
export function rowsToChatMessages(rows) {
  return (rows || []).flatMap((m) => [
    { role: 'user', content: m.query },
    { role: 'assistant', content: m.response },
  ]);
}

/** Fetch conversation messages once; React Query caches until invalidated. */
export async function fetchConversationMessagesCached(queryClient, { conversationId, analysisId }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    return await queryClient.fetchQuery({
      queryKey: ['conversation', analysisId, conversationId],
      queryFn: async () => {
        const res = await fetch(
          `/api/query?analysisId=${encodeURIComponent(analysisId)}&conversationId=${encodeURIComponent(conversationId)}`,
          { signal: controller.signal }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load conversation');
        return data.messages || [];
      },
      staleTime: Infinity,
      gcTime: 30 * 60_000,
    });
  } finally {
    clearTimeout(timeout);
  }
}

/** Upsert a sidebar entry locally — no network refetch. */
export function upsertChatHistoryEntry(queryClient, analysisId, entry) {
  if (!analysisId || !entry?.id) return;
  queryClient.setQueryData(['chatHistory', analysisId], (old = []) => {
    const idx = old.findIndex((c) => c.id === entry.id);
    const next = idx === -1 ? [entry, ...old] : old.map((c, i) => (i === idx ? { ...c, ...entry } : c));
    return next.sort(
      (a, b) =>
        new Date(b.last_activity || b.created_at || 0) -
        new Date(a.last_activity || a.created_at || 0)
    );
  });
}

/* ── Fetch all messages in a conversation ── */
export function useConversationMessages(conversationId, analysisId) {
  return useQuery({
    queryKey: ['conversation', analysisId, conversationId],
    queryFn: async () => {
      const res = await fetch(`/api/query?analysisId=${encodeURIComponent(analysisId)}&conversationId=${encodeURIComponent(conversationId)}`);
      const data = await res.json();
      return data.messages || [];
    },
    enabled: Boolean(conversationId && analysisId),
    staleTime: Infinity,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/* ── Fetch conversation messages on demand ── */
export function useFetchConversationMessages() {
  return useMutation({
    mutationFn: async ({ conversationId, analysisId }) => {
      const res = await fetch(`/api/query?analysisId=${encodeURIComponent(analysisId)}&conversationId=${encodeURIComponent(conversationId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load conversation');
      return data.messages || [];
    },
  });
}

/* ── Stream chat answer (SSE) ── */
export function useStreamChat() {
  return useMutation({
    mutationFn: async ({ query, analysisId, files = [], conversationId, signal }) => {
      const res = await fetch('/api/query/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, analysisId, files, conversationId }),
        signal,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const error = new Error(data.error || 'Stream failed');
        error.status = res.status;
        error.code = data.code;
        throw error;
      }
      return res;
    },
  });
}

/* ── Share chat ── */
export function useShareChat() {
  return useMutation({
    mutationFn: async ({ conversationId, analysisId }) => {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, analysisId }),
      });
      const data = await res.json();
      if (!res.ok) {
        const error = new Error(data.error || 'Could not create share link');
        error.code = data.code;
        throw error;
      }
      return data;
    },
  });
}

/* ── Re-analyze repository ── */
export function useReanalyzeRepo() {
  return useMutation({
    mutationFn: async ({ repoUrl, repoName }) => {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl, repoName, force: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        const error = new Error(data.error || data.message || 'Re-analysis failed');
        error.code = data.code;
        throw error;
      }
      return data;
    },
  });
}

/* ── Delete a conversation ── */
export function useDeleteChatHistory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ analysisId, conversationId }) => {
      const res = await fetch('/api/query', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ analysisId, conversationId }) });
      return res.ok;
    },
    onMutate: async ({ analysisId, conversationId }) => {
      await queryClient.cancelQueries({ queryKey: ['chatHistory', analysisId] });
      const prev = queryClient.getQueryData(['chatHistory', analysisId]);
      queryClient.setQueryData(['chatHistory', analysisId], (old) => (old || []).filter(h => h.id !== conversationId));
      return { prev };
    },
    onError: (_, { analysisId }, context) => {
      if (context?.prev) queryClient.setQueryData(['chatHistory', analysisId], context.prev);
    },
  });
}

/* ── Inline explain (for CodeViewer) ── */
export function useExplainCode() {
  return useMutation({
    mutationFn: async ({ analysisId, name, code }) => {
      const explainPrompt = [
        `Explain \`${name}\` from this code block.`,
        "",
        "Respond with exactly these sections:",
        "1) What it does (2-3 specific sentences).",
        "2) Parameters (bullet list: name, expected type/shape, purpose).",
        "3) Returns (what it returns and when; if unknown, explicitly say unknown).",
        "4) Important behavior (side effects, async behavior, notable branches).",
        "",
        "Rules:",
        "- Be specific to this code block, not generic.",
        "- Do not invent missing information.",
        "- If type info is missing, say that clearly.",
        "- Do NOT include follow-up questions.",
        "",
        "Code:",
        code,
      ].join("\n");

      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: explainPrompt, analysisId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      let clean = (data.response || '')
        .replace(/<think>[\s\S]*?<\/think>/gi, '')
        .replace(/## Follow-up[\s\S]*/i, '')
        .replace(/\*\*Follow-up[\s\S]*/i, '')
        .trim();
      return clean;
    },
  });
}

/* ── Generate diagram ── */
export function useDiagram() {
  return useMutation({
    mutationFn: async ({ analysisId, mode }) => {
      const res = await fetch('/api/diagram', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ analysisId, mode }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      return data.mermaid;
    },
  });
}

/* ── System tab data ── */
export function useSystemData(analysisId) {
  return useQuery({
    queryKey: ['system', analysisId],
    queryFn: async () => {
      const res = await fetch(`/api/system?id=${analysisId}`);
      if (!res.ok) throw new Error('Failed to load system data');
      return res.json();
    },
    enabled: Boolean(analysisId),
    staleTime: Infinity, // System data doesn't change for a given analysis
  });
}
