import { headers } from "next/headers";
import { rateLimit, rateLimitKey } from "../../../../lib/rateLimit";
import { getAnalysisRecord, createQueryHistory, getRecentQueries } from "../../../../lib/analysis-store";
import { buildQueryResponse } from "../../../../lib/analysis";
import { isAIConfigured } from "../../../../lib/env";
import { getAIHeaders, getAIApiUrl, getAIModel } from "../../../../lib/ai";
import { getCurrentSession, getSessionOwner } from "../../../../lib/server-session";
import { queryCodebase } from "../../../../lib/codebase-index";

// Fallback models for Groq (only used if OpenRouter fails)
const GROQ_FALLBACK_MODELS = [
  "llama-3.1-8b-instant",
  "llama-3.3-70b-versatile",
];

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

  const { query, analysisId, files: forcedFilePaths } = body;
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

  if (!isAIConfigured()) {
    const fallback = buildQueryResponse(analysis, query);
    return new Response(JSON.stringify({ error: "AI not configured", fallback }), { status: 503, headers: { 'Content-Type': 'application/json' } });
  }

  // Build context — with configured chat model (1M context) we can be generous
  const queryResult = queryCodebase(analysis, query, { maxFiles: 10, maxSymbols: 15, maxGraphDepth: 3 });
  const files = analysis?.results?.files || [];
  const fileByPath = new Map(files.map(f => [f.path, f]));
  const relevantFiles = queryResult.fileMatches.map(m => fileByPath.get(m.path)).filter(Boolean);

  // Force-include user-tagged files
  const forcedFiles = (forcedFilePaths || [])
    .map(p => fileByPath.get(p) || files.find(f => f.path.endsWith(p)))
    .filter(Boolean);

  const forcedPaths = new Set(forcedFiles.map(f => f.path));
  const otherFiles = relevantFiles.filter(f => !forcedPaths.has(f.path)).slice(0, 8);

  // Build context
  const contextParts = [
    `Repository: ${analysis.repo_name}`,
    `Summary: ${analysis.summary}`,
    `Languages: ${JSON.stringify(analysis.languages)}`,
    `File tree (${(analysis.file_tree || []).length} files): ${JSON.stringify((analysis.file_tree || []).slice(0, 150).map(f => f.path))}`,
  ];

  // Tagged files get generous code space
  if (forcedFiles.length > 0) {
    contextParts.push(`User-specified files (BASE YOUR ANSWER ON THESE):\n${JSON.stringify(forcedFiles.map(file => ({
      path: file.path, summary: file.summary,
      functions: (file.functions || []).map(i => i.name),
      classes: (file.classes || []).map(i => i.name),
      imports: file.imports || [],
      code: (file.code || "").slice(0, 6000),
    })))}`);
  }

  // Other relevant files
  const codePerFile = forcedFiles.length > 0 ? 2500 : 4000;
  contextParts.push(`Relevant files:\n${JSON.stringify(otherFiles.map(file => ({
    path: file.path, summary: file.summary,
    functions: (file.functions || []).map(i => i.name),
    classes: (file.classes || []).map(i => i.name),
    code: (file.code || "").slice(0, codePerFile),
  })))}`);

  contextParts.push(`Symbols: ${JSON.stringify((queryResult.symbolMatches || []).slice(0, 15))}`);

  let context = contextParts.join("\n");
  // Cap at 60K chars — still well within 1M context budget
  if (context.length > 60000) context = context.slice(0, 60000);

  console.log(`[stream] Context: ${context.length} chars, query: ${query.length} chars`);

  // Fetch conversation history — full context, no trimming needed with 1M window
  const history = await getRecentQueries(analysisId, 5).catch(() => []);
  const historyMessages = history.flatMap(h => [
    { role: "user", content: h.query },
    { role: "assistant", content: h.response || "" },
  ]);

  const systemPrompt = `You are an expert code analyst for this codebase. Answer ONLY about this codebase.

RULES:
- ALWAYS wrap file paths in backticks like \`path/to/file.js\`. Never use single quotes for file paths.
- Show real code from context only.
- Use **bold**, ## headings, bullet lists, tables, mermaid diagrams as needed.
- When user attaches a file, base answer on that file's code.

ONBOARDING: If user asks "where do I start" / "onboarding guide" / "guide me" — ask what they're building so you can create a personalized guide. Once they answer, respond with a mermaid TD flowchart showing reading order. CRITICAL MERMAID RULES: Use simple node IDs (A, B, C...) with short labels in square brackets like A["filename.js"]. Do NOT use slashes, parentheses, or special chars in labels. Use --> for arrows with short labels in pipes like A -->|"data flow"| B. Keep labels under 4 words. After the diagram, provide a numbered list of full file paths in backticks with one-line descriptions (5-7 files max), then 2 sentences on reading order logic. ALWAYS include the Follow-up questions section at the end.

End every response with:
## Follow-up questions
3 questions from the user's POV (e.g. "How does X work?").

Context:
${context}`;

  // ── Build messages array ──
  const allMessages = [
    { role: "system", content: systemPrompt },
    ...historyMessages,
    { role: "user", content: query },
  ];

  const totalChars = allMessages.reduce((sum, m) => sum + m.content.length, 0);
  console.log(`[stream] Final payload: ${totalChars} chars, ${allMessages.length} messages`);

  // Stream from AI provider
  const encoder = new TextEncoder();
  let fullResponse = '';

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let aiRes = null;
        const primaryModel = getAIModel();

        // Try primary provider (OpenRouter / configured chat model)
        const requestBody = {
          model: primaryModel,
          messages: allMessages,
          temperature: 0.25,
          max_tokens: 4000,
          stream: true,
        };

        aiRes = await fetch(getAIApiUrl(), {
          method: "POST",
          headers: getAIHeaders(),
          body: JSON.stringify(requestBody),
        });

        // If primary fails, try Groq fallback models
        if (!aiRes.ok && process.env.GROQ_API_KEY) {
          console.log(`[stream] Primary (${primaryModel}) failed with ${aiRes.status}, trying Groq fallback...`);
          for (const model of GROQ_FALLBACK_MODELS) {
            const fallbackBody = { ...requestBody, model, max_tokens: 2000 };
            aiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(fallbackBody),
            });
            if (aiRes.ok) {
              console.log(`[stream] Groq fallback ${model} succeeded`);
              break;
            }
            console.log(`[stream] Groq fallback ${model} failed (${aiRes.status})`);
          }
        }

        if (!aiRes || !aiRes.ok) {
          const err = await aiRes?.text().catch(() => 'Unknown error');
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: `AI error: ${aiRes?.status || 'no response'}` })}\n\n`));
          controller.close();
          return;
        }

        const reader = aiRes.body.getReader();
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
