// Controller: diagram — extracted from src/app/api/diagram/route.js

import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { rateLimit, rateLimitKey } from "../lib/rateLimit";
import { getAnalysisRecord } from "../lib/analysis-store";
import { isAIConfigured } from "../lib/env";
import { aiFetch, getAIModel } from "../lib/ai";
import { getCurrentSession, getSessionOwner } from "../lib/server-session";

/**
 * Handles the POST request for generating Mermaid diagrams from analysis data.
 * Validates input, checks rate limits, builds context from the analysis architecture,
 * sends to AI for diagram generation, and returns the Mermaid code.
 *
 * @param {Request} request - The incoming HTTP request
 * @returns {Promise<NextResponse>} JSON response with mermaid code or error
 */
export async function handleDiagramPost(request) {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";

  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { analysisId, mode } = body;
  if (!analysisId) return NextResponse.json({ error: "analysisId required" }, { status: 400 });

  const session = await getCurrentSession();
  const ownerEmail = await getSessionOwner(session);

  const rlKey = rateLimitKey("diagram", ip, ownerEmail);
  const limit = await rateLimit(rlKey, 5, 60_000);
  if (!limit.success) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  if (!isAIConfigured()) return NextResponse.json({ error: "AI not configured" }, { status: 503 });

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

    const res = await aiFetch({
      model: getAIModel(),
        messages: [
          {
            role: "system",
            content: `You are a diagram expert. Output ONLY valid Mermaid code. No markdown fences, no explanation, no extra text.

CRITICAL — DIAGRAM TYPE SELECTION:
Choose the BEST diagram type based on what the user asks for. Do NOT default to flowchart for everything:
- "architecture" / "overview" / "how it works" → flowchart LR or TD
- "sequence" / "flow" / "request flow" / "API call" / "auth flow" → sequenceDiagram
- "class diagram" / "UML" / "classes" / "inheritance" → classDiagram
- "ER diagram" / "database" / "schema" / "entities" → erDiagram
- "state" / "lifecycle" / "state machine" → stateDiagram-v2
- "use case" / "actors" / "user interactions" → flowchart TD (with actors as nodes, use cases as rounded nodes)
- "dependency" / "imports" / "module graph" → flowchart LR

If the user explicitly names a diagram type (e.g., "use case diagram", "sequence diagram", "class diagram"), you MUST use that type. Never convert to flowchart.

DESIGN PRINCIPLES:
- Clean, readable, well-spaced diagrams
- Use short, clear labels (2-4 words max per node)
- Group related items with subgraph blocks (flowcharts only)
- Limit to 8-15 nodes maximum for clarity
- Use consistent naming: camelCase IDs, Title Case labels

SYNTAX RULES BY TYPE:

flowchart (LR or TD):
- Node IDs: ONLY lowercase letters and numbers: api, db, auth
- Node labels: id[Label] for rectangles, id([Label]) for rounded, id[(Label)] for cylinder/DB
- Arrows: A --> B or A -->|short label| B
- Subgraphs: subgraph Title\\n  nodes...\\nend

sequenceDiagram:
- participant Name
- Name->>Other: Action description
- Name-->>Other: Response
- Note over Name: annotation
- alt/else/end for conditionals
- loop/end for repetition

classDiagram:
- class ClassName {
    +publicMethod()
    -privateField
    #protectedMethod()
  }
- ClassName <|-- SubClass : inherits
- ClassName *-- Component : composition
- ClassName o-- Associated : aggregation

erDiagram:
- ENTITY {
    type fieldName PK
    type fieldName FK
  }
- ENTITY ||--o{ OTHER : "relationship"

stateDiagram-v2:
- [*] --> StateName
- StateName --> NextState : trigger
- state StateName { inner states }

STYLE (flowcharts only — append at the very last lines):
- classDef primary fill:#1a1a2e,stroke:#E0FC10,stroke-width:2px,color:#eaeaec
- classDef secondary fill:#16161a,stroke:#787884,stroke-width:1px,color:#b0b0b8
- classDef accent fill:#1a1a2e,stroke:#7ca8e8,stroke-width:1.5px,color:#eaeaec
- Apply: class nodeId primary

EXAMPLES:

flowchart LR:
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

sequenceDiagram:
sequenceDiagram
  participant User
  participant API
  participant Auth
  participant DB
  User->>API: POST /login
  API->>Auth: Validate credentials
  Auth->>DB: Query user
  DB-->>Auth: User record
  Auth-->>API: JWT token
  API-->>User: 200 OK + token

classDiagram:
classDiagram
  class Controller {
    +handleRequest()
    +validateInput()
  }
  class Service {
    +processData()
    -repository
  }
  class Repository {
    +findById()
    +save()
  }
  Controller --> Service
  Service --> Repository

Codebase:
${context}`,
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 1500,
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
    Sentry.captureException(error, {
      tags: { route: "diagram" },
      extra: { analysisId, mode },
    });
    console.error("[diagram] error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
