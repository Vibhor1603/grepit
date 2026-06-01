import * as Sentry from "@sentry/nextjs";
import { headers } from "next/headers";
import { rateLimit, rateLimitKey, checkTokenBudget, recordTokenUsage } from "../lib/rateLimit";
import { getAnalysisRecord, createQueryHistory, getRecentQueries, getConversationMessages, getConversationMessageCount } from "../lib/analysis-store";
import { buildQueryResponse } from "../lib/analysis";
import { isAIConfigured } from "../lib/env";
import { getAIHeaders, getAIApiUrl, getAIModel, FALLBACK_MODELS } from "../lib/ai";
import { getCurrentSession, getGithubAccessToken, getSessionOwner } from "../lib/server-session";
import { checkGate, logUsage, getUserPlan } from "../lib/subscription-gate";
import { getPlan } from "../config/plans";
import { searchEmbeddings } from "../lib/embeddings";
import { collectRelevantContext, hydratePromptFiles } from "../lib/query-context";
import { getPromptSecurityPreamble, sanitizeUntrustedTextForPrompt } from "../lib/prompt-security";
import { enforceJsonBodySize, validateUserQueryInput } from "../lib/request-security";

function buildSystemPrompt(context) {
  return `${getPromptSecurityPreamble()}

You are an expert code analyst for this codebase. Answer ONLY about this codebase.

CORE RULE:
- ALWAYS give a direct, actionable answer. NEVER ask the user to provide information that exists in the codebase context. If you can see a file path in the file tree, reference it directly. If you can infer the answer from the code structure, do so.
- NEVER say "point me to the file" or "can you tell me which file" — YOU are the expert. Find it yourself from the context.
- Separate VERIFIED facts from partial evidence. If the context includes only metadata for a file, say that explicitly.
- Never invent missing implementations, security controls, or sanitization steps. If code is absent, say exactly what is confirmed and what is unconfirmed.
- If a route imports a controller or service that is present in context, use that imported implementation instead of claiming it is missing.
- Only ask clarifying questions when the user's INTENT is genuinely ambiguous (e.g., "fix the bug" without saying which bug).

RESPONSE STYLE:
- Match response length to the question. Simple questions get short answers (2-3 sentences). Complex questions, documentation requests, or architecture explanations get detailed, thorough responses.
- For documentation, guides, or comprehensive explanations — use as much space as needed. Don't artificially truncate.
- For quick factual questions — be concise. Don't pad with unnecessary context.
- Default to a slightly conversational tone focused on helping the user understand what the code is doing. Sound like a thoughtful teammate unless the user explicitly requests a stricter format.
- Do NOT begin with meta phrasing like "Based on the code/context provided", "From the full code in context", or "Here's the answer based on...". Start directly and naturally.
- ALWAYS wrap file paths in backticks like \`path/to/file.js\`. Never use single quotes for file paths.
- Include code snippets only when they directly help explain the answer — not by default.
- Use **bold** for key terms, ## headings for sections, bullet lists for steps.
- Use markdown tables when comparing items or listing endpoints/routes.
- Include mermaid diagrams only when visualizing architecture or data flow adds real value.
- When user attaches a file, base answer on that file's actual code from context.
- NEVER repeat information already covered in previous messages in this conversation. If something was already explained (env vars, setup steps, file purposes), reference it briefly ("as mentioned earlier") or skip it entirely. Check the conversation history before generating — don't regenerate what's already there.

ONBOARDING GUIDE:
When user asks "where do I start" / "where do I start?" / "onboarding guide" / "onboard me" / "get me started" / "guide me" / "guide me through something" / "guide me through this codebase" / "how to get started" / "walk me through" / "help me get started":
- First response: Ask what they need the guide for. Suggestions should be DEVELOPER TASKS — things someone would actually need to implement, modify, or understand to do their job. NOT feature descriptions. Think: "implementing X", "adding Y to Z", "understanding how A connects to B", "modifying the C pipeline". Frame them as work a developer would do, not a product tour. 3-4 suggestions max. At the end, say something like "or if you have something else in mind, just let me know and I'll create a proper guide so you don't waste any time."
- Once user responds with their goal: Provide a proper onboarding guide with:
  - A mermaid TD flowchart showing the data/control flow (use simple IDs like A["filename"], no slashes/special chars, arrows like A -->|"label"| B, labels under 4 words)
  - Clear explanation of how the feature works end-to-end
  - Key files with paths in backticks and what each does
  - Short code snippets where they help explain (only relevant lines)
  - Environment variables needed (if any)
  Make it feel like a real onboarding doc — structured, visual, actionable.

CONVERSATIONAL STYLE:
- Be natural and direct. Ask clarifying questions when the user's intent is unclear.
- Use bullet points for lists of options/items. Use prose for explanations.
- Use formatting (headings, code blocks, tables) only when it genuinely helps.

DAY 1 OVERVIEW:
When user says "I'm new here" / "new to this codebase" / "day 1" / "give me the big picture" / "codebase overview" / "what is this":
You are onboarding a day-1 engineer who knows NOTHING. Give them everything they need to not feel lost. Include ALL of the following:

1. What this system does (2-3 sentences — what problem it solves, who uses it)
2. High-level architecture diagram (mermaid TD — show how the main pieces connect)
3. Project structure — table with key directories/folders and what lives in each
4. Entry points — where does the app start? What are the main files that kick everything off?
5. Available scripts — npm scripts, make targets, or whatever commands they need to run/build/test/deploy
6. Key files to know about — the most important files a new dev should be aware of (with paths in backticks and 1 line about what each does)
7. Environment setup — what env vars are needed, any external services required
8. How to run it locally — the actual commands
9. Core patterns — any important architectural patterns used (e.g., "all API routes go through middleware X", "state is managed via Y", "the DB is accessed through Z layer")

Include code snippets for anything that's non-obvious (e.g., how a request flows through middleware, how the main export works). Use tables where they help organize info. This should feel like the README that every codebase should have but doesn't.

For large codebases: give the overview of the whole system, then ask "Want me to go deeper on any specific area?"

ARCHITECTURE DIAGRAM:
When user asks "show architecture diagram" / "architecture overview" / "system diagram" / "how is this structured":
- Lead with a mermaid flowchart TD showing main subsystems and data flow (entry → API → services → data).
- Follow with 3-5 bullet points naming the most important directories or modules and what each owns.
- Cite key files with backtick paths. Keep it scannable — this is a map, not an essay.

MERMAID DIAGRAMS — intelligent selection (do NOT diagram by default):
Only add a diagram when structure, flow, or relationships are hard to scan in prose alone. Skip diagrams for simple Q&A, single-file explanations, or list-style answers.

Choose type AND layout from the user's question:

| User intent | Diagram type | Layout |
|-------------|--------------|--------|
| API/auth/request sequence over time | sequenceDiagram | vertical (participants top-to-bottom) |
| System architecture, module map | flowchart | LR (horizontal) for ≤6 peers; TD (vertical) for layered stacks (UI → logic → data) |
| Class/inheritance/UML structure | classDiagram | default |
| Database schema / entities | erDiagram | default |
| State machine / lifecycle | stateDiagram-v2 | TD |
| Dependency tree / import graph | graph TD | vertical-first |
| Language or file mix breakdown | pie | n/a |
| Multi-step pipeline (3–5 steps) | flowchart LR | horizontal-first |

Layout rules:
- LR when flow moves left-to-right (client → API → DB, request pipeline).
- TD when showing layers, hierarchies, or top-down decomposition.
- If one diagram would exceed ~8–10 nodes, split into two focused diagrams (e.g. high-level LR overview + sequenceDiagram for one critical path) instead of one cluttered chart.
- Combine types only when each serves a distinct purpose (architecture LR + auth sequence).

If the user asks for a specific diagram type ("class diagram", "sequence diagram", "ER diagram", etc.) — use that Mermaid type exactly. Don't convert everything to flowchart.

Syntax rules: simple node IDs (A, B, C or short names), no slashes or special chars in labels, keep labels under 5 words.

MANDATORY — End EVERY response with:
## Follow-up suggestions
3 short user-style follow-up suggestion chips.
- They do NOT have to be questions.
- Write them from the USER'S perspective, like "Show me the controller flow", "Trace the auth path", or "Where is the database schema?"
- Keep each under 8 words.
- NEVER write them from the AI's perspective.
- NEVER skip this section. This applies even when your response contains a diagram, code block, or table.

Context:
${context}`;
}

function buildContextFromAnalysis(analysis, query, forcedFilePaths, vectorResults, accessToken) {
  const files = analysis?.results?.files || [];
  const fileByPath = new Map(files.map(f => [f.path, f]));

  const { queryResult, promptFiles: basePromptFiles, missingCandidates, promptSecurity } = collectRelevantContext(analysis, query, {
    forcedFilePaths,
    vectorResults: vectorResults || [],
    maxFiles: 8,
    maxCodeCharsPerFile: 12_000,
  });

  const contextParts = [
    promptSecurity.note,
    `Repository: ${analysis.repo_name}`,
    `Summary: ${analysis.summary}`,
    `Languages: ${JSON.stringify(analysis.languages)}`,
    `File tree (${(analysis.file_tree || []).length} files): ${JSON.stringify((analysis.file_tree || []).slice(0, 120).map(f => f.path))}`,
    `Relevant files (path + graph retrieval):\n${JSON.stringify(basePromptFiles)}`,
    `Relevant symbols: ${JSON.stringify((queryResult.symbolMatches || []).slice(0, 10))}`,
    `Matched folders: ${JSON.stringify((queryResult.folderMatches || []).map(folder => folder.path))}`,
    `Traversal seeds: ${JSON.stringify(queryResult.traversal?.seedFiles || [])}`,
    `Traversal path: ${JSON.stringify(queryResult.traversal?.path || [])}`,
  ];

  if (vectorResults?.length > 0) {
    const fileChunks = new Map();
    for (const result of vectorResults) {
      if (!fileChunks.has(result.filePath)) fileChunks.set(result.filePath, []);
      fileChunks.get(result.filePath).push(result);
    }

    const relevantCode = [];
    for (const [filePath, chunks] of fileChunks) {
      const combined = chunks.sort((a, b) => a.startLine - b.startLine).map(c => c.content).join("\n\n");
      const fileMeta = fileByPath.get(filePath);
      const sanitized = sanitizeUntrustedTextForPrompt(combined, { path: filePath, maxChars: 20_000 });
      relevantCode.push({
        path: filePath,
        summary: fileMeta?.summary || "",
        functions: (fileMeta?.functions || []).map(i => ({ name: i.name, args: i.args })),
        classes: (fileMeta?.classes || []).map(i => i.name),
        imports: fileMeta?.imports || [],
        code: sanitized.text,
        promptSecurity: sanitized.meta,
        similarity: chunks[0].similarity,
      });
    }
    contextParts.push(`Relevant code (found via semantic search, ordered by relevance):\n${JSON.stringify(relevantCode)}`);
  }

  return {
    queryResult,
    missingCandidates,
    promptFiles: basePromptFiles,
    contextParts,
    hydrateArgs: { basePromptFiles, missingCandidates, accessToken },
  };
}

async function buildHistoryMessages(analysisId, conversationId, plan) {
  if (conversationId) {
    const messageCount = await getConversationMessageCount(conversationId).catch(() => 0);
    if (messageCount >= plan.maxMessagesPerChat) {
      return {
        error: {
          message: `This conversation has reached the ${plan.maxMessagesPerChat}-message limit for your plan. Start a new chat to continue.`,
          code: "CHAT_MESSAGE_LIMIT",
        },
      };
    }
    const convMessages = await getConversationMessages(conversationId, { limit: 10 }).catch(() => []);
    return {
      historyMessages: convMessages.slice(-10).flatMap(h => [
        { role: "user", content: h.query },
        { role: "assistant", content: (h.response || "").slice(0, 2000) },
      ]),
    };
  }

  const history = await getRecentQueries(analysisId, 3).catch(() => []);
  return {
    historyMessages: history.flatMap(h => [
      { role: "user", content: h.query },
      { role: "assistant", content: h.response || "" },
    ]),
  };
}

function stripThinkingFromStream(fullResponse, token) {
  if (fullResponse.includes("<think>") && !fullResponse.includes("</think>")) {
    return null;
  }
  if (fullResponse.includes("</think>")) {
    const cleaned = fullResponse.replace(/<think>[\s\S]*?<\/redacted_thinking>/gi, "").trimStart();
    const alreadySent = fullResponse.length - token.length;
    const cleanedPrev = fullResponse.slice(0, alreadySent).replace(/<think>[\s\S]*?<\/redacted_thinking>/gi, "").trimStart();
    return cleaned.slice(cleanedPrev.length) || null;
  }
  return token;
}

// Streaming query endpoint — returns SSE
export async function handleStreamPost(request) {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const ct = headersList.get("content-type") || "";
  if (!ct.includes("application/json")) {
    return new Response(JSON.stringify({ error: "Content-Type must be application/json" }), { status: 415, headers: { 'Content-Type': 'application/json' } });
  }
  const bodySizeCheck = enforceJsonBodySize(headersList);
  if (!bodySizeCheck.ok) {
    return new Response(JSON.stringify({ error: bodySizeCheck.error }), { status: bodySizeCheck.status, headers: { 'Content-Type': 'application/json' } });
  }

  let body;
  try { body = await request.json(); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const { query, analysisId, files: forcedFilePaths, conversationId } = body;
  const queryValidation = validateUserQueryInput(query);
  if (!queryValidation.ok) {
    return new Response(
      JSON.stringify({ error: queryValidation.error, code: queryValidation.code }),
      { status: queryValidation.status, headers: { 'Content-Type': 'application/json' } }
    );
  }
  const safeQuery = queryValidation.value;
  if (!analysisId || !/^[0-9a-f-]{36}$/i.test(analysisId)) {
    return new Response(JSON.stringify({ error: "valid analysisId required" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const session = await getCurrentSession();
  const ownerEmail = await getSessionOwner(session);
  const accessToken = await getGithubAccessToken(session);

  const analysis = await getAnalysisRecord(analysisId).catch(() => null);
  if (!analysis) return new Response(JSON.stringify({ error: "Analysis not found" }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  if (analysis.owner_email && analysis.owner_email !== ownerEmail) {
    return new Response(JSON.stringify({ error: "Access denied" }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const gateResult = await checkGate(session.userId, "ai_query");
  if (!gateResult.allowed) {
    return new Response(JSON.stringify({ error: gateResult.reason, code: gateResult.code }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const userPlanName = await getUserPlan(session.userId);
  const plan = getPlan(userPlanName);
  const tokenBudget = await checkTokenBudget(session.userId, plan.maxTokensPerDay);
  if (!tokenBudget.allowed) {
    return new Response(JSON.stringify({ error: `You've reached your daily usage limit. Your budget resets in 24 hours, or upgrade your plan for more.`, code: "TOKEN_BUDGET_EXCEEDED" }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const isAuthed = Boolean(ownerEmail);
  const rlKey = rateLimitKey("query", ip, ownerEmail);
  const limit = await rateLimit(rlKey, isAuthed ? 20 : 5, 60_000);
  if (!limit.success) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { 'Content-Type': 'application/json' } });
  }

  if (!isAIConfigured()) {
    const fallback = buildQueryResponse(analysis, safeQuery);
    return new Response(JSON.stringify({ error: "AI not configured", fallback }), { status: 503, headers: { 'Content-Type': 'application/json' } });
  }

  const encoder = new TextEncoder();
  let fullResponse = '';

  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));

      try {
        send({ status: "preparing" });

        const [vectorResults, historyResult] = await Promise.all([
          searchEmbeddings(analysis.id, safeQuery, { limit: 10 }).catch(() => null),
          buildHistoryMessages(analysisId, conversationId, plan),
        ]);

        if (historyResult.error) {
          send({ error: historyResult.error.message, code: historyResult.error.code });
          controller.close();
          return;
        }

        send({ status: "context" });

        const ctx = buildContextFromAnalysis(analysis, safeQuery, forcedFilePaths, vectorResults, accessToken);
        const promptFiles = await hydratePromptFiles(analysis, ctx.promptFiles, ctx.missingCandidates, {
          accessToken,
          maxExtraFiles: 3,
          maxCodeCharsPerFile: 12_000,
        });

        ctx.contextParts.splice(4, 1, `Relevant files (path + graph retrieval):\n${JSON.stringify(promptFiles)}`);

        let context = ctx.contextParts.join("\n");
        if (context.length > 150_000) context = context.slice(0, 150_000);

        const systemPrompt = buildSystemPrompt(context);
        const allMessages = [
          { role: "system", content: systemPrompt },
          ...historyResult.historyMessages,
          { role: "user", content: safeQuery },
        ];

        console.log(`[stream] Context: ${context.length} chars, query: ${safeQuery.length} chars, vector: ${vectorResults?.length || 0} chunks`);

        send({ status: "generating" });

        const aiRes = await fetch(getAIApiUrl(), {
          method: "POST",
          headers: getAIHeaders(),
          body: JSON.stringify({
            model: getAIModel(),
            models: FALLBACK_MODELS,
            route: "fallback",
            messages: allMessages,
            temperature: 0.25,
            max_tokens: 16000,
            stream: true,
          }),
        });

        if (!aiRes?.ok) {
          const err = await aiRes?.text().catch(() => 'Unknown error');
          console.error(`[stream] AI error ${aiRes?.status}:`, err?.slice(0, 500));
          send({ error: `AI error: ${aiRes?.status || 'no response'}` });
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
              if (!token) continue;

              fullResponse += token;
              const emit = stripThinkingFromStream(fullResponse, token);
              if (emit) send({ token: emit });
            } catch { /* skip malformed chunks */ }
          }
        }

        send({ done: true });
        controller.close();

        const cleanResponse = fullResponse
          .replace(/<think>[\s\S]*?<\/redacted_thinking>/gi, '')
          .replace(/^(User|Assistant|System):\s*/gim, '')
          .trim();
        createQueryHistory({ analysis_id: analysisId, conversation_id: conversationId, owner_email: ownerEmail, query: safeQuery, response: cleanResponse }).catch(() => {});

        logUsage(session.userId, "ai_query", {
          analysis_id: analysisId,
          query_length: safeQuery.length,
          response_length: cleanResponse.length,
        }).catch(() => {});

        const inputTokens = Math.ceil(context.length / 4);
        const outputTokens = Math.ceil(cleanResponse.length / 4);
        recordTokenUsage(session.userId, inputTokens + outputTokens).catch(() => {});

      } catch (err) {
        Sentry.captureException(err, {
          tags: { route: "query-stream" },
          extra: { analysisId, query: safeQuery?.slice(0, 200) },
        });
        send({ error: err.message });
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
