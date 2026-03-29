import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { rateLimit } from "../../../lib/rateLimit";
import { buildQueryResponse } from "../../../lib/analysis";
import { createQueryHistory, getAnalysisRecord } from "../../../lib/analysis-store";
import { isGroqConfigured } from "../../../lib/env";
import { buildGroqReasoningRequest, getGroqApiUrl, getGroqDefaultHeaders, getGroqModel } from "../../../lib/groq";
import { getCurrentSession, getSessionOwner } from "../../../lib/server-session";

const STOP_WORDS = new Set(["the", "and", "for", "with", "this", "that", "from", "what", "where", "when", "how", "why", "does", "into", "about", "show", "give", "tell", "please", "repo", "project", "codebase", "code"]);

function extractNeedles(query) {
  return [...new Set(
    query
      .toLowerCase()
      .split(/[^a-z0-9_./-]+/)
      .map((part) => part.trim())
      .filter((part) => part.length > 2 && !STOP_WORDS.has(part)),
  )].slice(0, 12);
}

function scoreRelevantFiles(files, needles) {
  return files
    .map((file) => {
      const haystack = [
        file.path,
        file.summary,
        file.why,
        ...(file.functions || []).map((item) => item.name),
        ...(file.classes || []).map((item) => item.name),
        ...(file.methods || []).map((item) => item.name),
        ...(file.imports || []),
        ...(file.selectors || []),
        ...(file.topLevelKeys || []),
        ...(file.headings || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const score = needles.reduce((total, needle) => {
        if (file.path?.toLowerCase().includes(needle)) return total + 5;
        if (haystack.includes(needle)) return total + 2;
        return total;
      }, 0);

      return { file, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((entry) => entry.file);
}

function scoreRelevantSymbols(symbols, needles) {
  return symbols
    .map((symbol) => ({
      symbol,
      score: needles.reduce((total, needle) => {
        if (symbol.name?.toLowerCase().includes(needle)) return total + 5;
        if (symbol.file?.toLowerCase().includes(needle)) return total + 2;
        return total;
      }, 0),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((entry) => entry.symbol);
}

export async function POST(request) {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "unknown";

  const limit = rateLimit(`query:${ip}`, 5, 60000);
  if (!limit.success) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again in ${Math.ceil(limit.resetIn / 1000)}s.`, remaining: 0 },
      { status: 429 },
    );
  }

  try {
    const { query, analysisId } = await request.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    if (query.length > 2000) {
      return NextResponse.json({ error: "Query too long (max 2000 characters)" }, { status: 400 });
    }

    const session = await getCurrentSession();
    const ownerEmail = getSessionOwner(session);
    let analysis = null;
    if (analysisId) {
      analysis = await getAnalysisRecord(analysisId);
      if (analysis?.owner_email && analysis.owner_email !== ownerEmail) {
        return NextResponse.json({ error: "You do not have access to this analysis." }, { status: 403 });
      }
    }

    let response = buildQueryResponse(analysis, query);
    if (isGroqConfigured() && analysis) {
      const files = analysis?.results?.files || [];
      const symbols = analysis?.results?.symbolIndex || [];
      const needles = extractNeedles(query);
      const relevantFiles = scoreRelevantFiles(files, needles);
      const relevantSymbols = scoreRelevantSymbols(symbols, needles);
      const context = `Repository: ${analysis.repo_name}
Summary: ${analysis.summary}
Languages: ${JSON.stringify(analysis.languages)}
Architecture: ${JSON.stringify(analysis.architecture)}
File tree (first 80): ${JSON.stringify((analysis.file_tree || []).slice(0, 80).map((f) => f.path))}
Relevant files: ${JSON.stringify(relevantFiles.map((file) => ({
  path: file.path,
  summary: file.summary,
  why: file.why,
  functions: (file.functions || []).map((item) => item.name).slice(0, 8),
  classes: (file.classes || []).map((item) => item.name).slice(0, 6),
  methods: (file.methods || []).map((item) => item.name).slice(0, 8),
  selectors: (file.selectors || []).slice(0, 8),
  topLevelKeys: (file.topLevelKeys || []).slice(0, 8),
  headings: (file.headings || []).slice(0, 8),
  imports: (file.imports || []).slice(0, 8),
  code: (file.code || "").slice(0, 2500),
})))}
Relevant symbols: ${JSON.stringify(relevantSymbols)}`;
      const shouldUseCodeInterpreter = /(calculate|count|compare|estimate|diff|coverage|metrics?|complexity|analy[sz]e)/i.test(query);
      const groqRes = await fetch(getGroqApiUrl(), {
        method: "POST",
        headers: getGroqDefaultHeaders(),
        body: JSON.stringify(buildGroqReasoningRequest({
          maxCompletionTokens: 1800,
          temperature: 0.25,
          useCodeInterpreter: shouldUseCodeInterpreter,
          messages: [
            {
              role: "system",
              content: `You are an expert code architect analyzing a codebase. Be concise, useful, and specific. Use markdown with short headings and bullets when helpful. Do not invent files or behavior.\nModel: ${getGroqModel()}\n\nCodebase Context:\n${context}`,
            },
            { role: "user", content: query },
          ],
        })),
      });

      if (groqRes.ok) {
        const groqData = await groqRes.json();
        response = groqData.choices?.[0]?.message?.content || response;
      }
    }

    await createQueryHistory({
      analysis_id: analysisId || null,
      owner_email: ownerEmail,
      query,
      response,
    });

    return NextResponse.json({ response, remaining: limit.remaining });
  } catch (error) {
    console.error("Query error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
