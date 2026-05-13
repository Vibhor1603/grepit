import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { rateLimit, rateLimitKey } from "../../../lib/rateLimit";
import { buildQueryResponse } from "../../../lib/analysis";
import { createQueryHistory, getAnalysisRecord, getRecentQueries, deleteQueryHistory } from "../../../lib/analysis-store";
import { isGroqConfigured } from "../../../lib/env";
import { buildGroqReasoningRequest, getGroqModel, groqFetch } from "../../../lib/groq";
import { getCurrentSession, getSessionOwner } from "../../../lib/server-session";
import { queryCodebase } from "../../../lib/codebase-index";
// ── Context builder ────────────────────────────────────────────────────────
// Hard-cap at ~48,000 chars (~12,000 tokens) before sending to Groq.
// Priority order: summary → languages → architecture → file tree → files → symbols
const MAX_CONTEXT_CHARS = 48_000;

function buildContext(analysis, relevantFiles, relevantSymbols) {
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

function buildTraversalContext(analysis, queryResult) {
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

// ── Route handler ──────────────────────────────────────────────────────────
export async function POST(request) {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0].trim()
    || headersList.get("x-real-ip")
    || "unknown";

  // Content-Type guard
  const ct = headersList.get("content-type") || "";
  if (!ct.includes("application/json")) {
    return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });
  }

  // Parse body
  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  const { query, analysisId } = body;

  // Input validation
  if (!query || typeof query !== "string" || query.trim().length === 0) {
    return NextResponse.json({ error: "query is required and cannot be empty" }, { status: 400 });
  }
  if (query.length > 2000) {
    return NextResponse.json({ error: "query too long (max 2000 characters)" }, { status: 400 });
  }
  if (!analysisId || typeof analysisId !== "string") {
    return NextResponse.json({ error: "analysisId is required" }, { status: 400 });
  }
  if (!/^[0-9a-f-]{36}$/i.test(analysisId)) {
    return NextResponse.json({ error: "analysisId is invalid" }, { status: 400 });
  }

  // Auth + ownership check BEFORE rate limiting
  const session    = await getCurrentSession();
  const ownerEmail = getSessionOwner(session);

  const analysis = await getAnalysisRecord(analysisId).catch(() => null);
  if (!analysis) {
    return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
  }
  if (analysis.owner_email && analysis.owner_email !== ownerEmail) {
    return NextResponse.json({ error: "You do not have access to this analysis." }, { status: 403 });
  }

  // Rate limit — authed users get 20/min, anonymous get 5/min
  const isAuthed = Boolean(ownerEmail);
  const rlKey    = rateLimitKey("query", ip, ownerEmail);
  const limit    = rateLimit(rlKey, isAuthed ? 20 : 5, 60_000);
  if (!limit.success) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again in ${Math.ceil(limit.resetIn / 1000)}s.`, remaining: 0 },
      { status: 429 },
    );
  }

  try {
    let response = buildQueryResponse(analysis, query);

    if (isGroqConfigured()) {
      const queryResult = queryCodebase(analysis, query, { maxFiles: 6, maxSymbols: 10, maxGraphDepth: 2 });

      // Build context from query results
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

      console.log("[query] Sending to Groq, context length:", context.length, "chars");

      const groqRes = await groqFetch(buildGroqReasoningRequest({
        maxCompletionTokens: 1800,
        temperature: 0.25,
        messages: [
          {
            role: "system",
            content: `You are an expert code analyst helping a developer understand a codebase. 

SCOPE:
- You can ONLY answer questions about THIS specific codebase based on the context provided.
- If the user asks about something not in the codebase context (general programming, unrelated topics, external services), respond: "This doesn't appear to be part of the analyzed codebase. I can only help with questions about the files and code in this repository."
- If a function/file the user asks about doesn't exist in the context, say so clearly.

RESPONSE GUIDELINES:
- Give thorough, explanatory answers. Cover the "what", "why", and "how".
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

FORMATTING:
- Tables for: comparisons, file-to-purpose mappings, endpoint lists, config options
- Code blocks for: showing actual implementation code from the codebase
- Mermaid diagrams for: architecture overviews, request flows, data flows
- Bullet lists for: step-by-step processes, feature lists, dependencies

Always end with:

## Follow-up questions
- [specific relevant question about this codebase]
- [specific relevant question about this codebase]
- [specific relevant question about this codebase]

Codebase Context:
${context}`,
          },
          ...historyMessages,
          { role: "user", content: query },
        ],
      }));

      if (groqRes.ok) {
        const groqData = await groqRes.json();
        let aiContent = groqData.choices?.[0]?.message?.content;
        if (aiContent) {
          // Strip internal thinking/reasoning that some models leak
          aiContent = aiContent
            .replace(/<think>[\s\S]*?<\/think>/gi, '')
            .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '')
            .replace(/<internal>[\s\S]*?<\/internal>/gi, '')
            .replace(/^(User|Assistant|System):\s*/gim, '')
            .replace(/^\[?(Internal|Thinking|Reasoning)\]?:.*$/gim, '')
            .trim();
          response = aiContent;
          console.log("[query] Groq responded, length:", aiContent.length, "chars");
        } else {
          console.warn("[query] Groq returned empty content:", JSON.stringify(groqData).slice(0, 200));
        }
      } else {
        const errBody = await groqRes.text().catch(() => '');
        console.error("[query] Groq error:", groqRes.status, errBody.slice(0, 300));
      }
    }

    // Persist (fire-and-forget)
    createQueryHistory({
      analysis_id: analysisId,
      owner_email: ownerEmail,
      query,
      response,
    }).catch(() => {});

    return NextResponse.json({ response, remaining: limit.remaining });
  } catch (error) {
    console.error("[query] error:", error.message);
    return NextResponse.json({ error: error.message || "Query failed" }, { status: 500 });
  }
}

// GET handler — fetch query history for an analysis
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const analysisId = searchParams.get('analysisId');
  if (!analysisId) return NextResponse.json({ error: 'analysisId required' }, { status: 400 });

  try {
    const history = await getRecentQueries(analysisId, 20).catch(() => []);
    return NextResponse.json({ history });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE handler — delete a specific query from history
export async function DELETE(request) {
  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { analysisId, query } = body;
  if (!analysisId || !query) {
    return NextResponse.json({ error: "analysisId and query required" }, { status: 400 });
  }

  try {
    await deleteQueryHistory(analysisId, query);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[query DELETE] error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
