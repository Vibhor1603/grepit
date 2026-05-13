import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { rateLimit, rateLimitKey } from "../../../lib/rateLimit";
import { getAnalysisRecord } from "../../../lib/analysis-store";
import { isGroqConfigured } from "../../../lib/env";
import { groqFetch, getGroqModel } from "../../../lib/groq";
import { getCurrentSession, getSessionOwner } from "../../../lib/server-session";

export async function POST(request) {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";

  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { analysisId, mode } = body;
  if (!analysisId) return NextResponse.json({ error: "analysisId required" }, { status: 400 });

  const session = await getCurrentSession();
  const ownerEmail = getSessionOwner(session);

  const rlKey = rateLimitKey("diagram", ip, ownerEmail);
  const limit = rateLimit(rlKey, 5, 60_000);
  if (!limit.success) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  if (!isGroqConfigured()) return NextResponse.json({ error: "AI not configured" }, { status: 503 });

  try {
    const analysis = await getAnalysisRecord(analysisId);
    if (!analysis) return NextResponse.json({ error: "Analysis not found" }, { status: 404 });

    const arch = analysis.architecture || analysis.results || {};
    const context = [
      `Repository: ${analysis.repo_name}`,
      `Tech stack: ${JSON.stringify(arch.techStack || [])}`,
      `Layers: ${JSON.stringify((arch.layers || []).slice(0, 6).map(l => ({ name: l.name, modules: (l.modules || []).slice(0, 5) })))}`,
      `API endpoints: ${JSON.stringify((arch.apiEndpoints || []).slice(0, 10).map(e => `${e.method} ${e.path}`))}`,
      `Components: ${JSON.stringify((arch.components || []).slice(0, 10).map(c => c.name))}`,
    ].join('\n');

    const prompt = mode || 'Show the high-level architecture';

    const res = await groqFetch({
      model: getGroqModel(),
        messages: [
          {
            role: "system",
            content: `You are a diagram expert. Output ONLY valid Mermaid code. No markdown fences, no explanation, no extra text.

DESIGN PRINCIPLES:
- Clean, readable, well-spaced diagrams
- Use short, clear labels (2-4 words max per node)
- Group related items with subgraph blocks
- Limit to 8-12 nodes maximum for clarity
- Use consistent naming: camelCase IDs, Title Case labels

SYNTAX RULES:
- Start with diagram type: flowchart LR, sequenceDiagram, classDiagram, stateDiagram-v2, or erDiagram
- For flowcharts: use LR (left-right) for wide diagrams, TD (top-down) for tall ones
- Node IDs: ONLY lowercase letters and numbers, no spaces, no special chars: api, db, auth, frontend
- Node labels in square brackets ONLY: id[Label Text Here]
- NEVER put URLs, file paths, or parentheses in node labels
- Arrow syntax: A --> B or A -->|short label| B
- Edge labels must be 1-3 words only, no slashes or special chars
- NO parentheses () in any node definition
- Subgraph syntax: subgraph Title\\n  nodes...\\nend

STYLE (append ONLY at the very last lines, after ALL nodes and subgraphs):
- classDef primary fill:#1a1a2e,stroke:#E0FC10,stroke-width:2px,color:#eaeaec
- classDef secondary fill:#16161a,stroke:#787884,stroke-width:1px,color:#b0b0b8
- classDef accent fill:#1a1a2e,stroke:#7ca8e8,stroke-width:1.5px,color:#eaeaec
- Apply classes ONLY on the very last lines: class nodeId primary
- NEVER put class/classDef lines before or between subgraph blocks

EXAMPLE (flowchart):
flowchart LR
  subgraph Client
    ui[Web App]
  end
  subgraph Server
    api[API Layer]
    auth[Auth Service]
    db[(Database)]
  end
  ui -->|requests| api
  api -->|validates| auth
  api -->|reads/writes| db
  class ui primary
  class api accent
  class auth,db secondary

Codebase:
${context}`,
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 1200,
        stream: false,
    });

    if (!res.ok) {
      return NextResponse.json({ error: "AI request failed" }, { status: 500 });
    }

    const data = await res.json();
    let mermaidCode = data.choices?.[0]?.message?.content?.trim();
    if (!mermaidCode) return NextResponse.json({ error: "Empty response" }, { status: 500 });

    // Strip markdown fences if the LLM wrapped it
    mermaidCode = mermaidCode.replace(/^```mermaid\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '').trim();

    return NextResponse.json({ mermaid: mermaidCode });
  } catch (error) {
    console.error("[diagram] error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
