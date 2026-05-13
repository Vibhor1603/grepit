import { headers } from "next/headers";
import { rateLimit, rateLimitKey } from "../../../../lib/rateLimit";
import { getAnalysisRecord, createQueryHistory, getRecentQueries } from "../../../../lib/analysis-store";
import { buildQueryResponse } from "../../../../lib/analysis";
import { isGroqConfigured } from "../../../../lib/env";
import { getGroqDefaultHeaders, getGroqApiUrl } from "../../../../lib/groq";

// Model fallback chain (same as groq.js)
const STREAM_MODELS = [
  "llama-3.3-70b-versatile",
  "openai/gpt-oss-20b",
  "llama-3.1-8b-instant",
  "qwen/qwen3-32b",
];
import { getCurrentSession, getSessionOwner } from "../../../../lib/server-session";
import { queryCodebase } from "../../../../lib/codebase-index";

// Streaming query endpoint — returns SSE
export async function POST(request) {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const ct = headersList.get("content-type") || "";
  if (!ct.includes("application/json")) {
    return new Response(JSON.stringify({ error: "Content-Type must be application/json" }), { status: 415, headers: { 'Content-Type': 'application/json' } });
  }

  let body;
  try { body = await request.json(); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const { query, analysisId } = body;
  if (!query || typeof query !== "string" || !query.trim()) {
    return new Response(JSON.stringify({ error: "query is required" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  if (!analysisId || !/^[0-9a-f-]{36}$/i.test(analysisId)) {
    return new Response(JSON.stringify({ error: "valid analysisId required" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const session = await getCurrentSession();
  const ownerEmail = getSessionOwner(session);

  const analysis = await getAnalysisRecord(analysisId).catch(() => null);
  if (!analysis) return new Response(JSON.stringify({ error: "Analysis not found" }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  if (analysis.owner_email && analysis.owner_email !== ownerEmail) {
    return new Response(JSON.stringify({ error: "Access denied" }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const isAuthed = Boolean(ownerEmail);
  const rlKey = rateLimitKey("query", ip, ownerEmail);
  const limit = rateLimit(rlKey, isAuthed ? 20 : 5, 60_000);
  if (!limit.success) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { 'Content-Type': 'application/json' } });
  }

  if (!isGroqConfigured()) {
    const fallback = buildQueryResponse(analysis, query);
    return new Response(JSON.stringify({ error: "AI not configured", fallback }), { status: 503, headers: { 'Content-Type': 'application/json' } });
  }

  // Build context
  const queryResult = queryCodebase(analysis, query, { maxFiles: 4, maxSymbols: 8, maxGraphDepth: 2 });
  const files = analysis?.results?.files || [];
  const fileByPath = new Map(files.map(f => [f.path, f]));
  const relevantFiles = queryResult.fileMatches.map(m => fileByPath.get(m.path)).filter(Boolean);

  const contextParts = [
    `Repository: ${analysis.repo_name}`,
    `Summary: ${analysis.summary}`,
    `Languages: ${JSON.stringify(analysis.languages)}`,
    `File tree (first 50): ${JSON.stringify((analysis.file_tree || []).slice(0, 50).map(f => f.path))}`,
    `Relevant files: ${JSON.stringify(relevantFiles.slice(0, 4).map(file => ({
      path: file.path, summary: file.summary,
      functions: (file.functions || []).map(i => i.name).slice(0, 6),
      classes: (file.classes || []).map(i => i.name).slice(0, 4),
      imports: (file.imports || []).slice(0, 6),
      code: (file.code || "").slice(0, 1500),
    })))}`,
    `Relevant symbols: ${JSON.stringify((queryResult.symbolMatches || []).slice(0, 8))}`,
  ];
  let context = contextParts.join("\n");
  if (context.length > 24000) context = context.slice(0, 24000);

  const history = await getRecentQueries(analysisId, 2).catch(() => []);
  const historyMessages = history.flatMap(h => [
    { role: "user", content: h.query },
    { role: "assistant", content: (h.response || "").slice(0, 500) },
  ]);

  const systemPrompt = `You are an expert code analyst helping a developer understand a codebase. 

SCOPE:
- You can ONLY answer questions about THIS specific codebase.
- If the user asks about something not in the context, say so clearly.

RESPONSE GUIDELINES:
- Give thorough answers. ALWAYS include file paths in backticks.
- Include code snippets in fenced blocks when explaining functionality.
- Use **bold** for key terms, ## headings for sections, bullet lists for steps.
- Use markdown tables when comparing items.
- If a visual helps, include a mermaid code block.

Always end with:
## Follow-up questions
- [relevant question 1]
- [relevant question 2]
- [relevant question 3]

Codebase Context:
${context}`;

  // Stream from Groq
  const encoder = new TextEncoder();
  let fullResponse = '';

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let groqRes = null;

        // Try models in order until one works
        for (const model of STREAM_MODELS) {
          const requestBody = {
            model,
            messages: [
              { role: "system", content: systemPrompt },
              ...historyMessages,
              { role: "user", content: query },
            ],
            temperature: 0.25,
            max_tokens: 1800,
            stream: true,
          };

          groqRes = await fetch(getGroqApiUrl(), {
            method: "POST",
            headers: getGroqDefaultHeaders(),
            body: JSON.stringify(requestBody),
          });

          if (groqRes.status === 429 || groqRes.status === 413) {
            console.log(`[stream] Model ${model} rate-limited/too-large, trying next...`);
            continue;
          }
          break; // Got a non-429 response
        }

        if (!groqRes || !groqRes.ok) {
          const err = await groqRes.text().catch(() => 'Unknown error');
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: `Groq error: ${groqRes.status}` })}\n\n`));
          controller.close();
          return;
        }

        const reader = groqRes.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const token = parsed.choices?.[0]?.delta?.content;
              if (token) {
                fullResponse += token;

                // Strip thinking blocks in real-time — don't send them to client
                // Detect if we're inside a thinking block
                if (fullResponse.includes('<think>') && !fullResponse.includes('</think>')) {
                  // Still inside thinking block — don't emit
                  continue;
                }
                // If thinking block just closed, strip it and emit what's after
                if (fullResponse.includes('</think>')) {
                  const cleaned = fullResponse.replace(/<think>[\s\S]*?<\/think>/gi, '').trimStart();
                  const alreadySent = fullResponse.length - token.length;
                  const cleanedPrev = fullResponse.slice(0, alreadySent).replace(/<think>[\s\S]*?<\/think>/gi, '').trimStart();
                  const newContent = cleaned.slice(cleanedPrev.length);
                  if (newContent) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: newContent })}\n\n`));
                  }
                  continue;
                }

                // Also skip lines that look like internal reasoning
                if (/^(Okay,|Let me|First,|I need|I should|Wait,|Also,|Finally,|The user)/i.test(fullResponse.trimStart()) && !fullResponse.includes('\n\n')) {
                  // Likely still in preamble thinking — don't emit yet
                  continue;
                }

                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
              }
            } catch { /* skip malformed chunks */ }
          }
        }

        // Send done signal
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
        controller.close();

        // Persist to history (fire-and-forget)
        const cleanResponse = fullResponse
          .replace(/<think>[\s\S]*?<\/think>/gi, '')
          .replace(/^(User|Assistant|System):\s*/gim, '')
          .trim();
        createQueryHistory({ analysis_id: analysisId, owner_email: ownerEmail, query, response: cleanResponse }).catch(() => {});

      } catch (err) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
