// Controller: query — extracted from src/app/api/query/route.js

import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { rateLimit, rateLimitKey } from "../lib/rateLimit";
import { buildQueryResponse } from "../lib/analysis";
import { createQueryHistory, getAnalysisRecord, getRecentQueries, deleteQueryHistory, getConversations, getConversationMessages, deleteConversation } from "../lib/analysis-store";
import { isAIConfigured } from "../lib/env";
import { buildReasoningRequest, aiFetch } from "../lib/ai";
import { getCurrentSession, getGithubAccessToken, getSessionOwner } from "../lib/server-session";
import { queryCodebase } from "../lib/codebase-index";
import { checkGate, logUsage } from "../lib/subscription-gate";
import { getPromptSecurityPreamble, normalizeAssistantOpening } from "../lib/prompt-security";
import { collectRelevantContext, hydratePromptFiles } from "../lib/query-context";
import { enforceJsonBodySize, validateUserQueryInput } from "../lib/request-security";

// ── Context builder ────────────────────────────────────────────────────────
// Hard-cap at ~48,000 chars (~12,000 tokens) before sending to the AI provider.
// Priority order: summary → languages → architecture → file tree → files → symbols
const MAX_CONTEXT_CHARS = 48_000;

/**
 * Builds a context string from analysis data and relevant files/symbols for AI queries.
 * Respects a character budget to avoid exceeding token limits.
 *
 * @param {object} analysis - The analysis record
 * @param {object[]} relevantFiles - Files relevant to the query
 * @param {object[]} relevantSymbols - Symbols relevant to the query
 * @returns {string} Context string for the AI prompt
 */
export function buildContext(analysis, relevantFiles, relevantSymbols) {
  const parts = [
    `Repository: ${analysis.repo_name}`,
    `Summary: ${analysis.summary}`,
    `Languages: ${JSON.stringify(analysis.languages)}`,
    `Architecture: ${JSON.stringify(analysis.architecture)}`,
    `File tree (first 80): ${JSON.stringify((analysis.file_tree || []).slice(0, 80).map(f => f.path))}`,
  ];

  const filesJson = JSON.stringify(relevantFiles.map(file => ({
    path: file.path,
    summary: file.summary,
    why: file.why,
    functions:    (file.functions    || []).map(i => i.name).slice(0, 8),
    classes:      (file.classes      || []).map(i => i.name).slice(0, 6),
    methods:      (file.methods      || []).map(i => i.name).slice(0, 8),
    selectors:    (file.selectors    || []).slice(0, 8),
    topLevelKeys: (file.topLevelKeys || []).slice(0, 8),
    headings:     (file.headings     || []).slice(0, 8),
    imports:      (file.imports      || []).slice(0, 8),
    code: (file.code || "").slice(0, 2500),
  })));

  const symbolsJson = JSON.stringify(relevantSymbols);

  let context = parts.join("\n");
  const filesSection   = `\nRelevant files: ${filesJson}`;
  const symbolsSection = `\nRelevant symbols: ${symbolsJson}`;

  // Add sections only if they fit within the token budget
  if ((context + filesSection).length <= MAX_CONTEXT_CHARS) {
    context += filesSection;
  } else {
    context += `\nRelevant files: ${filesJson.slice(0, MAX_CONTEXT_CHARS - context.length - 20)}...`;
  }

  if ((context + symbolsSection).length <= MAX_CONTEXT_CHARS) {
    context += symbolsSection;
  }

  return context;
}

/**
 * Builds context enriched with graph traversal information for more precise queries.
 *
 * @param {object} analysis - The analysis record
 * @param {object} queryResult - Result from queryCodebase with traversal data
 * @returns {string} Enriched context string
 */
export function buildTraversalContext(analysis, queryResult) {
  const files = analysis?.results?.files || [];
  const fileByPath = new Map(files.map((file) => [file.path, file]));
  const relevantFiles = (queryResult.fileMatches || []).map((match) => {
    const file = fileByPath.get(match.path);
    if (!file) return null;
    return {
      ...file,
      summary: `${file.summary}${match.reasons?.length ? ` Relevance: ${match.reasons.join("; ")}.` : ""}`,
    };
  }).filter(Boolean);

  const relevantSymbols = (queryResult.symbolMatches || []).map((symbol) => ({
    name: symbol.name,
    file: symbol.file,
    type: symbol.type,
    score: symbol.score,
    reasons: symbol.reasons,
  }));

  const baseContext = buildContext(analysis, relevantFiles, relevantSymbols);
  const traversalSection = [
    `Traversal strategy: ${queryResult.strategy}`,
    `Seed files: ${JSON.stringify(queryResult.traversal?.seedFiles || [])}`,
    `Matched folders: ${JSON.stringify((queryResult.folderMatches || []).map((folder) => folder.path))}`,
    `Traversal path: ${JSON.stringify(queryResult.traversal?.path || [])}`,
    `Query phases: ${JSON.stringify(queryResult.traversal?.queryPhases || [])}`,
  ].join("\n");

  return `${baseContext}\n${traversalSection}`;
}

/**
 * Handles the POST request for querying an analysis with AI.
 * Validates input, checks auth/rate limits/subscription gates, builds context,
 * sends to AI, and persists the query history.
 *
 * @param {Request} request - The incoming HTTP request
 * @returns {Promise<NextResponse>} JSON response with AI answer or error
 */
export async function handleQueryPost(request) {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0].trim()
    || headersList.get("x-real-ip")
    || "unknown";

  // Content-Type guard
  const ct = headersList.get("content-type") || "";
  if (!ct.includes("application/json")) {
    return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });
  }
  const bodySizeCheck = enforceJsonBodySize(headersList);
  if (!bodySizeCheck.ok) {
    return NextResponse.json({ error: bodySizeCheck.error }, { status: bodySizeCheck.status });
  }

  // Parse body
  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  const { query, analysisId } = body;

  // Input validation
  const queryValidation = validateUserQueryInput(query);
  if (!queryValidation.ok) {
    return NextResponse.json({ error: queryValidation.error, code: queryValidation.code }, { status: queryValidation.status });
  }
  const safeQuery = queryValidation.value;

  if (!analysisId || typeof analysisId !== "string") {
    return NextResponse.json({ error: "analysisId is required" }, { status: 400 });
  }
  if (!/^[0-9a-f-]{36}$/i.test(analysisId)) {
    return NextResponse.json({ error: "analysisId is invalid" }, { status: 400 });
  }

  // Auth + ownership check BEFORE rate limiting
  const session    = await getCurrentSession();
  const ownerEmail = await getSessionOwner(session);
  const accessToken = await getGithubAccessToken(session);

  const analysis = await getAnalysisRecord(analysisId).catch(() => null);
  if (!analysis) {
    return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
  }
  if (analysis.owner_email && analysis.owner_email !== ownerEmail) {
    return NextResponse.json({ error: "You do not have access to this analysis." }, { status: 403 });
  }

  const gateResult = await checkGate(session.userId, "ai_query");
  if (!gateResult.allowed) {
    return NextResponse.json({ error: gateResult.reason, code: gateResult.code }, { status: 403 });
  }

  // Rate limit — authed users get 20/min, anonymous get 5/min
  const isAuthed = Boolean(ownerEmail);
  const rlKey    = rateLimitKey("query", ip, ownerEmail);
  const limit    = await rateLimit(rlKey, isAuthed ? 20 : 5, 60_000);
  if (!limit.success) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again in ${Math.ceil(limit.resetIn / 1000)}s.`, remaining: 0 },
      { status: 429 },
    );
  }

  try {
    let response = buildQueryResponse(analysis, query);

    if (isAIConfigured()) {
      const { queryResult, promptFiles: basePromptFiles, missingCandidates, promptSecurity } = collectRelevantContext(analysis, safeQuery, {
        maxFiles: 6,
        maxCodeCharsPerFile: 4000,
      });
      const promptFiles = await hydratePromptFiles(analysis, basePromptFiles, missingCandidates, {
        accessToken,
        maxExtraFiles: 2,
        maxCodeCharsPerFile: 4000,
      });

      const contextParts = [
        promptSecurity.note,
        `Repository: ${analysis.repo_name}`,
        `Summary: ${analysis.summary}`,
        `Languages: ${JSON.stringify(analysis.languages)}`,
        `File tree (first 50): ${JSON.stringify((analysis.file_tree || []).slice(0, 50).map(f => f.path))}`,
        `Relevant files: ${JSON.stringify(promptFiles)}`,
        `Relevant symbols: ${JSON.stringify((queryResult.symbolMatches || []).slice(0, 8))}`,
        `Traversal seeds: ${JSON.stringify(queryResult.traversal?.seedFiles || [])}`,
        `Traversal path: ${JSON.stringify(queryResult.traversal?.path || [])}`,
      ];
      let context = contextParts.join("\n");
      if (context.length > 24000) context = context.slice(0, 24000);

      const history = await getRecentQueries(analysisId, 2).catch(() => []);
      const historyMessages = history.flatMap(h => [
        { role: "user", content: h.query },
        { role: "assistant", content: (h.response || "").slice(0, 500) },
      ]);

      console.log("[query] Sending to AI, context length:", context.length, "chars");

      const aiRes = await aiFetch(buildReasoningRequest({
        maxCompletionTokens: 3000,
        temperature: 0.25,
        messages: [
          {
            role: "system",
            content: `${getPromptSecurityPreamble()}

You are an expert code analyst helping a developer understand a codebase.

SCOPE:
- You can ONLY answer questions about THIS specific codebase based on the context provided.
- If the user asks about something not in the codebase context (general programming, unrelated topics, external services), respond: "This doesn't appear to be part of the analyzed codebase. I can only help with questions about the files and code in this repository."
- If a function/file truly is not present in the retrieved context, say so clearly.

RESPONSE GUIDELINES:
- Give thorough, explanatory answers. Cover the "what", "why", and "how".
- Default to a slightly conversational tone that helps the user understand the code. Sound like a smart teammate explaining what they found, unless the user explicitly asks for a strict format.
- Separate VERIFIED facts from partial evidence. If you only have metadata for a file, say that explicitly.
- Never invent missing implementations or security controls. If code is absent, say exactly what is confirmed and what is unconfirmed.
- If a route file imports a controller/service and that imported file is present in context, use that file instead of claiming the implementation is missing.
- Do NOT start with meta phrases like "Based on the code/context provided", "From the files in context", or "Here's the answer based on...". Start directly with the answer in natural language.
- ALWAYS include the file path when referencing code: \`path/to/file.js\`
- ALWAYS include relevant code snippets in fenced code blocks when explaining functionality.
- When mentioning functions, classes, or variables, wrap them in backticks with the file path: \`functionName\` in \`src/path/file.js\`
- Use clear structure: start with a brief summary, then explain in detail.
- Use **bold** for key concepts and important terms.
- Use ## headings to organize longer answers into sections.
- Use bullet lists for steps, enumerations, or multiple points.
- Use markdown tables (| pipes) when comparing items, listing properties, or showing mappings.
- If a visual would help (architecture, flow, relationships), include a mermaid code block.
- Be specific to THIS codebase — reference actual files, functions, and patterns found in the context.

ONBOARDING GUIDE:
- If the user asks for an "onboarding guide", "where do I start", "where to start", "guide me through this codebase", "how to get started", or similar — respond with something like: "I'll create a personalized onboarding guide so you don't waste time reading irrelevant code. To tailor it to you, give me a brief summary of what you're building or working on — a feature, a bug fix, a service, anything. The more specific, the better the guide."
- Once the user tells you what they're working on, generate a VISUAL reading path using a mermaid flowchart. CRITICAL MERMAID RULES: Use simple node IDs (A, B, C...) with short labels in square brackets like A["filename.js"]. Do NOT use slashes, parentheses, or special chars in labels. Use --> for arrows with short labels in pipes like A -->|"data flow"| B. Keep labels under 4 words. After the diagram, list each file with its full path in backticks and ONE short sentence about what it does. Keep it to 5-7 files max. Do NOT use tables.
- After the list, add 2 sentences explaining the reading order logic.

FORMATTING:
- Tables for: comparisons, file-to-purpose mappings, endpoint lists, config options
- Code blocks for: showing actual implementation code from the codebase
- Mermaid diagrams for: architecture overviews, request flows, data flows
- Bullet lists for: step-by-step processes, feature lists, dependencies

Always end with:

## Follow-up suggestions
Write 3 short user-style follow-up suggestion chips from the USER'S perspective.
- They do NOT have to be questions.
- Good examples: "Show me the controller flow", "Trace this endpoint", "Where is auth checked?"
- Keep each suggestion under 8 words.
- Never write them from the AI's perspective.

Codebase Context:
${context}`,
          },
          ...historyMessages,
          { role: "user", content: safeQuery },
        ],
      }));

      if (aiRes.ok) {
        const aiData = await aiRes.json();
        let aiContent = aiData.choices?.[0]?.message?.content;
        if (aiContent) {
          // Strip internal thinking/reasoning that some models leak
          aiContent = aiContent
            .replace(/<think>[\s\S]*?<\/think>/gi, '')
            .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '')
            .replace(/<internal>[\s\S]*?<\/internal>/gi, '')
            .replace(/^(User|Assistant|System):\s*/gim, '')
            .replace(/^\[?(Internal|Thinking|Reasoning)\]?:.*$/gim, '')
            .trim();
          aiContent = normalizeAssistantOpening(aiContent);
          response = aiContent;
          console.log("[query] AI responded, length:", aiContent.length, "chars");
        } else {
          console.warn("[query] AI returned empty content:", JSON.stringify(aiData).slice(0, 200));
        }
      } else {
        const errBody = await aiRes.text().catch(() => '');
        console.error("[query] AI error:", aiRes.status, errBody.slice(0, 300));
      }
    }

    // Persist (fire-and-forget)
    createQueryHistory({
      analysis_id: analysisId,
      owner_email: ownerEmail,
      query: safeQuery,
      response,
    }).catch(() => {});

    logUsage(session.userId, "ai_query", {
      analysis_id: analysisId,
      query_length: safeQuery.length,
      response_length: response.length,
    }).catch(() => {});

    return NextResponse.json({ response, remaining: limit.remaining });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { route: "query" },
      extra: { analysisId, query: body?.query?.slice(0, 200) },
    });
    console.error("[query] error:", error.message);
    return NextResponse.json({ error: error.message || "Query failed" }, { status: 500 });
  }
}

/**
 * Handles the GET request for fetching query/conversation history.
 * Returns conversations list or messages for a specific conversation.
 *
 * @param {Request} request - The incoming HTTP request
 * @returns {Promise<NextResponse>} JSON response with conversations or messages
 */
export async function handleQueryGet(request) {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0].trim()
    || headersList.get("x-real-ip")
    || "unknown";
  const { searchParams } = new URL(request.url);
  const analysisId = searchParams.get('analysisId');
  const conversationId = searchParams.get('conversationId');

  if (!analysisId && !conversationId) return NextResponse.json({ error: 'analysisId or conversationId required' }, { status: 400 });

  try {
    const session = await getCurrentSession();
    const ownerEmail = await getSessionOwner(session);
    const rlKey = rateLimitKey("query-get", ip, ownerEmail);
    const limit = await rateLimit(rlKey, ownerEmail ? 60 : 10, 60_000);
    if (!limit.success) {
      return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
    }

    if (!analysisId) {
      return NextResponse.json({ error: "analysisId is required." }, { status: 400 });
    }
    const analysis = await getAnalysisRecord(analysisId).catch(() => null);
    if (!analysis) return NextResponse.json({ error: "Analysis not found." }, { status: 404 });
    if (analysis.owner_email && analysis.owner_email !== ownerEmail) {
      return NextResponse.json({ error: "You do not have access to this analysis." }, { status: 403 });
    }

    // If conversationId provided, return all messages in that conversation
    if (conversationId) {
      const messages = await getConversationMessages(conversationId, { limit: 100 }).catch(() => []);
      return NextResponse.json({ messages });
    }

    // Otherwise return list of conversations for the sidebar
    const conversations = await getConversations(analysisId).catch(() => []);
    return NextResponse.json({ conversations });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Handles the DELETE request for removing query/conversation history.
 * Supports deleting all history, a specific conversation, or a legacy query-based delete.
 *
 * @param {Request} request - The incoming HTTP request
 * @returns {Promise<NextResponse>} JSON response indicating success or error
 */
export async function handleQueryDelete(request) {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0].trim()
    || headersList.get("x-real-ip")
    || "unknown";
  const ct = headersList.get("content-type") || "";
  if (!ct.includes("application/json")) {
    return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });
  }
  const bodySizeCheck = enforceJsonBodySize(headersList);
  if (!bodySizeCheck.ok) {
    return NextResponse.json({ error: bodySizeCheck.error }, { status: bodySizeCheck.status });
  }

  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { analysisId, conversationId, query, deleteAll } = body;

  try {
    const session = await getCurrentSession();
    const ownerEmail = await getSessionOwner(session);
    const rlKey = rateLimitKey("query-delete", ip, ownerEmail);
    const limit = await rateLimit(rlKey, ownerEmail ? 20 : 5, 60_000);
    if (!limit.success) {
      return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
    }
    if (!analysisId) {
      return NextResponse.json({ error: "analysisId is required." }, { status: 400 });
    }
    const analysis = await getAnalysisRecord(analysisId).catch(() => null);
    if (!analysis) return NextResponse.json({ error: "Analysis not found." }, { status: 404 });
    if (analysis.owner_email && analysis.owner_email !== ownerEmail) {
      return NextResponse.json({ error: "You do not have access to this analysis." }, { status: 403 });
    }

    if (deleteAll && analysisId) {
      const { getDb } = await import("../lib/db");
      const { query_history } = await import("../db/schema");
      const { eq } = await import("drizzle-orm");
      const db = getDb();
      await db.delete(query_history).where(eq(query_history.analysis_id, analysisId));
      return NextResponse.json({ success: true, deleted: 'all' });
    }

    if (conversationId) {
      await deleteConversation(conversationId);
      return NextResponse.json({ success: true });
    }

    // Legacy: delete by query text
    if (analysisId && query) {
      await deleteQueryHistory(analysisId, query);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "conversationId or query required" }, { status: 400 });
  } catch (error) {
    console.error("[query DELETE] error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
