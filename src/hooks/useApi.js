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
      return data.code || '// No content';
    },
    enabled: Boolean(analysisId && filePath),
    staleTime: Infinity, // File content doesn't change — cache forever
  });
}

/* ── Fetch chat history ── */
export function useChatHistory(analysisId) {
  return useQuery({
    queryKey: ['chatHistory', analysisId],
    queryFn: async () => {
      const res = await fetch(`/api/query?analysisId=${analysisId}`);
      const data = await res.json();
      return data.history || [];
    },
    enabled: Boolean(analysisId),
    staleTime: 5_000, // Short stale time so invalidation triggers refetch
  });
}

/* ── Delete chat history item ── */
export function useDeleteChatHistory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ analysisId, query }) => {
      const res = await fetch('/api/query', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ analysisId, query }) });
      // Don't throw on failure — item might already be deleted
      return res.ok;
    },
    onMutate: async ({ analysisId, query }) => {
      // Optimistic update — remove from cache immediately
      await queryClient.cancelQueries({ queryKey: ['chatHistory', analysisId] });
      const prev = queryClient.getQueryData(['chatHistory', analysisId]);
      queryClient.setQueryData(['chatHistory', analysisId], (old) => (old || []).filter(h => h.query !== query));
      return { prev };
    },
    onError: (_, { analysisId }, context) => {
      // Rollback on error
      if (context?.prev) queryClient.setQueryData(['chatHistory', analysisId], context.prev);
    },
    onSettled: (_, __, { analysisId }) => {
      queryClient.invalidateQueries({ queryKey: ['chatHistory', analysisId] });
    },
  });
}

/* ── Inline explain (for CodeViewer) ── */
export function useExplainCode() {
  return useMutation({
    mutationFn: async ({ analysisId, name, code }) => {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `Briefly explain what "${name}" does in 2-3 sentences. Be specific. Do NOT include follow-up questions.\n\nCode:\n${code}`, analysisId }),
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
