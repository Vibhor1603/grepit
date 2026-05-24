import * as Sentry from "@sentry/nextjs";
import { headers } from "next/headers";
import { rateLimit, rateLimitKey, getCachedResponse, setCachedResponse, buildCacheKey, checkTokenBudget, recordTokenUsage } from "../lib/rateLimit";
import { getAnalysisRecord, createQueryHistory, getRecentQueries, getConversationMessages, getConversationMessageCount } from "../lib/analysis-store";
import { buildQueryResponse } from "../lib/analysis";
import { isAIConfigured } from "../lib/env";
import { getAIHeaders, getAIApiUrl, getAIModel, FALLBACK_MODELS } from "../lib/ai";
import { getCurrentSession, getSessionOwner } from "../lib/server-session";
import { queryCodebase } from "../lib/codebase-index";
import { checkGate, logUsage, isUserPro, getUserPlan } from "../lib/subscription-gate";
import { getPlan } from "../config/plans";

// Streaming query endpoint — returns SSE
export async function handleStreamPost(request) {
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

  const { query, analysisId, files: forcedFilePaths, conversationId } = body;
  if (!query || typeof query !== "string" || !query.trim()) {
    return new Response(JSON.stringify({ error: "query is required" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  if (!analysisId || !/^[0-9a-f-]{36}$/i.test(analysisId)) {
    return new Response(JSON.stringify({ error: "valid analysisId required" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const session = await getCurrentSession();
  const ownerEmail = await getSessionOwner(session);

  const analysis = await getAnalysisRecord(analysisId).catch(() => null);
  if (!analysis) return new Response(JSON.stringify({ error: "Analysis not found" }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  if (analysis.owner_email && analysis.owner_email !== ownerEmail) {
    return new Response(JSON.stringify({ error: "Access denied" }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const gateResult = await checkGate(session.userId, "ai_query");
  if (!gateResult.allowed) {
    return new Response(JSON.stringify({ error: gateResult.reason, code: gateResult.code }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  // Token budget check — prevents runaway AI costs
  const userPlanName = await getUserPlan(session.userId);
  const plan = getPlan(userPlanName);
  const tokenBudget = await checkTokenBudget(session.userId, plan.maxTokensPerDay);
  if (!tokenBudget.allowed) {
    return new Response(JSON.stringify({ error: `Daily token budget exhausted (${plan.maxTokensPerDay.toLocaleString()} tokens). Resets at midnight.`, code: "TOKEN_BUDGET_EXCEEDED" }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const isAuthed = Boolean(ownerEmail);
  const rlKey = rateLimitKey("query", ip, ownerEmail);
  const limit = await rateLimit(rlKey, isAuthed ? 20 : 5, 60_000);
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

  // Fetch conversation history — use conversation messages if available, else recent queries
  let historyMessages = [];
  if (conversationId) {
    // Check message limit using cached count (avoids fetching all messages just to count)
    const messageCount = await getConversationMessageCount(conversationId).catch(() => 0);
    if (messageCount >= plan.maxMessagesPerChat) {
      return new Response(JSON.stringify({ 
        error: `This conversation has reached the ${plan.maxMessagesPerChat}-message limit for your plan. Start a new chat to continue.`,
        code: "CHAT_MESSAGE_LIMIT",
        messageCount,
        limit: plan.maxMessagesPerChat,
      }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    // Only fetch last 10 messages for context (not the full history)
    const convMessages = await getConversationMessages(conversationId, { limit: 10 }).catch(() => []);
    const recentMessages = convMessages.slice(-10);
    historyMessages = recentMessages.flatMap(h => [
      { role: "user", content: h.query },
      { role: "assistant", content: (h.response || "").slice(0, 2000) }, // Truncate old responses
    ]);
  } else {
    const history = await getRecentQueries(analysisId, 3).catch(() => []);
    historyMessages = history.flatMap(h => [
      { role: "user", content: h.query },
      { role: "assistant", content: h.response || "" },
    ]);
  }

  const systemPrompt = `You are an expert code analyst for this codebase. Answer ONLY about this codebase.

WHEN YOU CAN'T ANSWER:
- Never bluntly refuse or say "I can't help with that." Instead, acknowledge what they asked, explain what you can see in the codebase that's related, and suggest what they might actually be looking for.
- If the question is close to something in the codebase, point them in the right direction. If it's completely unrelated to the codebase, gently redirect: "That's outside what I can see in this codebase, but I can help you with [related thing]."
- Always include follow-up questions even when you can't fully answer — guide them toward something useful.

RESPONSE STYLE:
- Match response length to the question. Simple questions get short answers. Complex questions get detailed ones.
- ALWAYS wrap file paths in backticks like \`path/to/file.js\`. Never use single quotes for file paths.
- Include code snippets only when they directly help explain the answer — not by default.
- Use **bold** for key terms, ## headings for sections, bullet lists for steps.
- Use markdown tables when comparing items or listing endpoints/routes.
- Include mermaid diagrams only when visualizing architecture or data flow adds real value.
- When user attaches a file, base answer on that file's actual code from context.
- NEVER repeat information already covered in previous messages in this conversation. If something was already explained (env vars, setup steps, file purposes), reference it briefly ("as mentioned earlier") or skip it entirely. Check the conversation history before generating — don't regenerate what's already there.

ONBOARDING GUIDE:
When user asks "where do I start" / "onboarding guide" / "onboard me" / "get me started" / "guide me" / "how to get started" / "walk me through" / "help me get started":
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

MERMAID DIAGRAMS:
When including flowcharts, use simple node IDs like A["filename"] with no slashes or special chars in labels. Arrows like A -->|"label"| B. Keep labels under 4 words.

End every response with:
## Follow-up questions
3 short questions (under 8 words) that the USER would naturally ask next. Write them as if the user is typing them — first person, like "How does the auth flow work?" or "Where is the database schema?" NEVER write questions from the AI's perspective.

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

        // Use OpenRouter with native fallback routing
        const requestBody = {
          model: getAIModel(),
          models: FALLBACK_MODELS,
          route: "fallback",
          messages: allMessages,
          temperature: 0.25,
          max_tokens: 8000,
          stream: true,
        };

        aiRes = await fetch(getAIApiUrl(), {
          method: "POST",
          headers: getAIHeaders(),
          body: JSON.stringify(requestBody),
        });

        if (!aiRes || !aiRes.ok) {
          const err = await aiRes?.text().catch(() => 'Unknown error');
          console.error(`[stream] AI error ${aiRes?.status}:`, err?.slice(0, 500));
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
        createQueryHistory({ analysis_id: analysisId, conversation_id: conversationId, owner_email: ownerEmail, query, response: cleanResponse }).catch(() => {});

        logUsage(session.userId, "ai_query", {
          analysis_id: analysisId,
          query_length: query.length,
          response_length: cleanResponse.length,
        }).catch(() => {});

        // Record approximate token usage (4 chars ≈ 1 token)
        const approxTokens = Math.ceil((query.length + cleanResponse.length) / 4);
        recordTokenUsage(session.userId, approxTokens).catch(() => {});

      } catch (err) {
        Sentry.captureException(err, {
          tags: { route: "query-stream" },
          extra: { analysisId, query: query?.slice(0, 200) },
        });
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
