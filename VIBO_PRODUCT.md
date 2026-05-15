# Vibo — Product Overview

Vibo is an AI-powered codebase intelligence tool. Paste a GitHub link or upload a ZIP, and Vibo gives you a complete breakdown of the project — architecture, components, APIs, security issues, setup instructions, and an AI you can ask anything about the code. No reading required.

---

## What Vibo Does

You give it a repository. It gives you a full picture of what that repository is, how it's structured, and how to work with it.

Works for any codebase — JavaScript, TypeScript, Python, Go, Java, Rust, Ruby, PHP, C/C++, Swift, Kotlin, Dart, and more. Public or private GitHub repos, or local projects uploaded as a ZIP.

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.2.1 |
| UI | React | 19.2.4 |
| Styling | Tailwind CSS | 3.4.19 |
| Auth | NextAuth.js (GitHub OAuth) | 4.24.13 |
| Database | Neon PostgreSQL (serverless) | — |
| ORM | Drizzle ORM | 0.45.2 |
| AI | Groq API (multi-model fallback) | — |
| Data Fetching | TanStack React Query | 5.100.10 |
| Diagrams | Mermaid | 11.15.0 |
| Syntax Highlighting | Prism React Renderer | 2.4.1 |
| PDF Generation | @react-pdf/renderer | 4.5.1 |
| Icons | Lucide React | 1.6.0 |
| ZIP Handling | JSZip | 3.10.1 |
| Testing | Vitest + Testing Library | 4.1.6 |

---

## Core Features

### 1. AI Chat with Streaming Responses

The primary interface is a full-featured AI chat that answers questions about the analyzed codebase. Responses stream in real-time via Server-Sent Events.

**Key capabilities:**
- Streaming responses with token-by-token rendering
- Model fallback chain: llama-3.3-70b-versatile → gpt-oss-20b → llama-3.1-8b-instant → qwen3-32b
- Conversation memory — last 2-3 Q&A pairs injected as context for follow-up questions
- `@` file mentions — type `@` to attach specific files as context for your question
- Clickable file references in AI responses — backtick references to files/symbols navigate to the Explore tab
- Follow-up question suggestions after each response
- Inline mermaid diagram rendering when the AI generates architecture visuals
- Chat history sidebar with rename, delete, and reload
- Optimistic UI updates for history deletion
- Thinking block stripping — internal reasoning from models is filtered out in real-time
- Diagram generation — questions containing "diagram", "visualize", "draw", etc. auto-route to the diagram endpoint

**Rate limits:** 20 queries/min for authenticated users, 5/min for anonymous.

### 2. Architecture Map

Detects the layers of a project — frontend, API, data, config, documentation — and shows how they connect.

- Architecture layers with module lists (clickable to file explorer)
- Module bar chart showing file distribution
- Dependency graph with from → to relationships
- Call graph showing function-level call relationships
- Query engine visualization — shows how the codebase index works (strategy, phases, file/directory/dependency/call edge counts)
- Codebase index summary stats

### 3. API Explorer

Automatically detects all API endpoints from the codebase.

- HTTP method with color coding (GET=blue, POST=lime, PUT=purple, DELETE=red, PATCH=peach)
- Route path and description
- Source file link (clickable)
- Inferred request and response schemas displayed side-by-side

### 4. Component Breakdown

For frontend projects, maps out every UI component.

- Component list with selection
- Props detection (destructured params, `props.x` access)
- Child component rendering relationships
- Usage sites — which files import and use this component
- Component summary with state/effects/export hints
- All items are clickable for cross-navigation

### 5. Security & Quality Audit

Comprehensive code quality analysis with severity-tagged findings.

- **Security issues** — hardcoded secrets, unsafe patterns (eval, dangerouslySetInnerHTML, broad SQL), each linked to the exact file
- **Code smells** — with file, issue description, and fix suggestion
- **Test gaps** — missing test files, no coverage report detected
- **Unused symbols** — potentially dead code with file locations
- **Duplicate signals** — repeated file bodies, naming inconsistencies
- **Performance risks** — heavy files (by line count), nested loop signals
- **Complexity heatmap** — visual bar chart of the most complex modules

### 6. File Explorer

Full-featured source code browser with live code fetching.

- Repository tree with expand/collapse and file search
- Live source code fetching from GitHub (falls back to analysis cache)
- Source indicator: "github-live" vs "analysis-cache" vs "analysis-preview"
- File metadata panel: language, file kind, line count, functions, classes, methods, imports, selectors, custom properties, top-level keys, headings, document structure
- "Why this file matters" explanation
- AI file insight — click "Analyze this file" for a Groq-powered explanation tailored to the file type
- Related view navigation — jump to API, component, symbol, or architecture views based on file content
- "Open on GitHub" link for each file
- Request/response schema display for API route files

### 7. Setup Guide

Auto-generated local development instructions for any project.

- Numbered setup steps
- Required tools list
- Environment variable notes
- Entry point files (clickable)

### 8. System Tab

Deep technical analysis of the project's infrastructure.

- **Health score** — 0-100 with circular progress visualization, calculated from security issues, test coverage, code quality
- **Security report modal** — full-screen report with PDF download
- **Tech stack detection** — 25+ frameworks/libraries detected (React, Next.js, Vue, Angular, Svelte, Express, Django, Flask, FastAPI, Spring Boot, Gin, Actix, PostgreSQL, MongoDB, Redis, Docker, Kubernetes, Tailwind, TypeScript, GraphQL, Socket.io, JWT, Prisma, Drizzle, etc.)
- **Entry points** — Node.js (package.json scripts), Python (manage.py, app.py), Go (main.go), Rust (main.rs), Java (Application.java), Docker
- **Project configuration** — available scripts, linting rules, formatting, Docker files, CI/CD pipelines
- **Dependencies** — full list with production/dev classification
- **Security & quality issues** — severity-tagged with descriptions

### 9. Code Viewer with Inline Explain

Syntax-highlighted code viewer with intelligent block detection.

- Custom Vibo dark theme matching the app palette
- Language detection from 40+ file extensions
- Block detection — hover over any function/class/method to see an "Explain" button
- Inline AI explanation panel — explains the block in 2-3 sentences
- "Ask in chat" — continue the conversation about a specific code block in the main chat
- In-file search with match count and highlighting
- Font size controls (zoom in/out)
- Line numbers

### 10. AI-Powered Diagrams

Generate architecture diagrams on demand via the chat.

- Mermaid diagram generation from Groq AI
- Supports: flowchart, sequenceDiagram, classDiagram, stateDiagram-v2, erDiagram
- Custom dark theme with Vibo colors (lime accents, dark backgrounds)
- Fullscreen diagram view
- Fallback to raw code display if rendering fails
- Auto-triggered when chat messages contain diagram-related keywords

### 11. PDF Report Export

Generate professional security and health reports as downloadable PDFs.

- Cover page with health score circle, repo name, summary stats
- Issues page grouped by category with severity dots
- File listings per issue category
- "Vibo Certified" badge
- Generated client-side using @react-pdf/renderer

### 12. Markdown Report Export

Export the full analysis as a markdown file.

- Repository overview, tech stack, entry points
- Key folders with purposes
- Security issues with severity
- Suggestions for improvement
- Available as raw markdown or JSON with share token

---

## Dashboard Layout

The dashboard uses a three-panel IDE-style layout:

```
┌──────────────┬─────────────────────────────────┬──────────────┐
│  File Tree   │         Main Content            │   Identity   │
│  (resizable) │                                 │   Profile    │
│              │   Chat | Explore | System       │  (resizable) │
│  - Search    │                                 │              │
│  - Tree nav  │                                 │  - Tech stack│
│  - Health %  │                                 │  - Storage   │
│              │                                 │  - Runtime   │
│              │                                 │  - Hot files │
└──────────────┴─────────────────────────────────┴──────────────┘
```

**Three main tabs:**
- **Chat** — AI conversation with streaming, history sidebar, file mentions
- **Explore** — Code viewer with breadcrumb, search, zoom, syntax highlighting
- **System** — Tech stack, entry points, config, security report

**Panels are:**
- Resizable via drag handles (width persisted to localStorage)
- Collapsible with toggle buttons
- Left panel: file tree with search, auto-expanded first two levels, health score bar
- Right panel: identity profile (tech stack, storage, runtime), high-traffic files, Pro Guard status

---

## How You Use It

1. Go to the landing page
2. Paste a GitHub URL or upload a ZIP file
3. Click Analyze (or press Enter)
4. Explore the dashboard

If the repo is private, Vibo asks you to sign in with GitHub first. After that, it can access private repos using your GitHub token (requires `repo` scope).

---

## Input Sources

### GitHub URL
- Any public repo — no auth required
- Private repos — requires GitHub sign-in
- URL validated with regex before submission
- Quick-try chips: react, next.js, deno, linux, vscode

### ZIP Upload
- Drag-and-drop or file picker
- Max 50MB
- Must be a .zip file
- Extracts and analyzes all text files (40+ extensions)
- Skips binary files, files > 400KB, `__MACOSX/` directories

---

## Analysis Pipeline

```
Input (GitHub URL or ZIP)
        │
        ▼
Download/Extract → Parse text files (40+ extensions)
        │
        ▼
Build Code Intelligence
  ├── Parse each file by language
  ├── Extract: functions, classes, methods, imports, endpoints, selectors
  ├── Build: symbol index, dependency graph, call graph
  ├── Detect: duplicates, security issues, performance risks, test coverage
  └── Build: codebase index for query traversal
        │
        ▼
AI Enrichment (if GROQ_API_KEY set)
  ├── Send file metadata + code samples to Groq
  ├── Get: enhanced summary, capabilities, security issues, flows
  └── Structured JSON response with schema validation
        │
        ▼
Store in Neon PostgreSQL via Drizzle ORM
        │
        ▼
Redirect to Dashboard
```

---

## AI Integration

### Model Fallback Chain
Groq API with automatic model rotation on rate limits or failures:
1. `llama-3.3-70b-versatile` — best quality
2. `openai/gpt-oss-20b` — fast, higher limits
3. `llama-3.1-8b-instant` — very fast fallback
4. `qwen/qwen3-32b` — good quality, tiny TPM limit

### Retry Logic
All Groq calls go through `groqFetch()`:
- 30-second timeout per request
- On 429 (rate limit) or 413 (too large): try next model
- On 503 (server error): retry same model up to 2 times with 1s delay
- Timeout: try next model

### Context Management
- Hard cap at 48,000 chars (~12K tokens) for non-streaming queries
- Hard cap at 40,000 chars (~10K tokens) for streaming queries
- Priority order: summary → languages → architecture → file tree → relevant files → symbols
- File relevance scoring: +5 path match, +3 symbol name match, +2 content match, +2 import-graph proximity
- User-specified files (via `@` mentions) get generous code space (4000 chars each)

### AI Used In
1. **Analysis enrichment** — structured JSON with summary, capabilities, security, flows
2. **File insight** — markdown explanation tailored to file type
3. **Query responses** — grounded in relevant files/symbols with conversation memory
4. **Diagram generation** — Mermaid code from architecture context
5. **Inline code explain** — 2-3 sentence block explanations in the code viewer

---

## Authentication

GitHub OAuth via NextAuth.js with JWT strategy.

- **Scopes:** `read:user`, `user:email`, `repo` (for private repos)
- **Session:** JWT-based, access token stored in token and exposed to server routes
- **Server-side:** `getCurrentSession()`, `getSessionOwner()`, `getGithubAccessToken()` helpers
- **Auth status check:** `/api/auth/status` returns `{ configured: true/false }`
- **Error handling:** 8 OAuth error types mapped to friendly messages on the landing page

---

## Rate Limiting

Sliding-window implementation backed by an in-memory Map. Stale entries pruned every 2 minutes.

**Key design:** When authenticated, rate limit keys use the user's email. This gives each user their own independent bucket regardless of IP.

| Endpoint | Anon limit | Authed limit | Window |
|----------|-----------|--------------|--------|
| `/api/analyze` | 10/min | 10/min | 60s |
| `/api/upload` | 5/min | 5/min | 60s |
| `/api/query` | 5/min | **20/min** | 60s |
| `/api/query/stream` | 5/min | **20/min** | 60s |
| `/api/search` | 20/min | 20/min | 60s |
| `/api/file` GET | 60/min | 60/min | 60s |
| `/api/file` POST | 20/min | 20/min | 60s |
| `/api/report` | 10/min | 10/min | 60s |
| `/api/diagram` | 5/min | 5/min | 60s |

---

## Database

Neon PostgreSQL (serverless) accessed via Drizzle ORM.

### `analyses` table
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | Auto-generated |
| owner_email | text | Nullable — null for anonymous |
| repo_url | text | GitHub URL or `local://<name>` |
| repo_name | text | Repository name |
| source | text | `github` or `upload` |
| status | text | `PENDING`, `PROCESSING`, `COMPLETED` |
| summary | text | AI or heuristic summary |
| total_files | integer | Count of blob entries |
| total_lines | integer | Estimated from total bytes / 40 |
| is_private | boolean | Whether the GitHub repo is private |
| error_message | text | Error details if failed |
| languages | jsonb | `{ "JavaScript": 25000 }` |
| file_tree | jsonb | Array of `{ path, type, size, hash, ext }` |
| architecture | jsonb | Layers, endpoints, components, security, flows |
| results | jsonb | Full code intelligence output |
| created_at / updated_at | timestamptz | Auto |

### `query_history` table
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | Auto-generated |
| analysis_id | UUID (FK) | Cascade delete |
| owner_email | text | Nullable |
| query | text | User's question |
| response | text | AI response |
| created_at | timestamptz | Auto |

Indexed on `owner_email` and `created_at` for analyses, `analysis_id` and `owner_email` for query history.

---

## API Endpoints

### POST `/api/analyze`
Analyze a GitHub repository. Downloads as ZIP, builds code intelligence, enriches with AI, stores result.

### GET `/api/analyze?id=<uuid>`
Fetch a single analysis or list all for the current user.

### POST `/api/upload`
Upload and analyze a ZIP file. FormData with `file` field. Max 50MB.

### POST `/api/query`
AI-powered Q&A (non-streaming). Returns `{ response, remaining }`.

### POST `/api/query/stream`
AI-powered Q&A with SSE streaming. Supports `files` array for `@` mentions.

### GET `/api/query?analysisId=<uuid>`
Fetch chat history for an analysis (last 20 entries).

### DELETE `/api/query`
Delete a specific query or all history for an analysis.

### GET `/api/file?id=<uuid>&path=<filePath>`
Fetch source code. Tries live GitHub fetch, falls back to analysis cache.

### POST `/api/file`
Get AI-powered file insight/explanation.

### POST `/api/search`
Search files and symbols within an analysis. Returns `{ fileMatches, symbolMatches }`.

### GET `/api/report?id=<uuid>&format=markdown|json`
Export analysis as markdown or JSON.

### POST `/api/diagram`
Generate a Mermaid diagram from the analysis context.

### GET `/api/system?id=<uuid>`
Compute tech stack, entry points, conventions, and security report.

### GET `/api/auth/status`
Returns `{ configured: true/false }` for GitHub OAuth.

---

## Landing Page

Full marketing page with:
- Sticky nav with auth state (sign in / user avatar + sign out)
- Hero with gradient glow, version badge (`v2.0 — multi-source analysis · now with PDF export`)
- GitHub URL input with Enter-to-submit
- ZIP upload with drag-and-drop
- Mode toggle tabs (GitHub URL / Upload ZIP)
- Quick-try repo chips (react, next.js, deno, linux, vscode)
- Social proof stats (12,400+ repos, 40+ file types, <30s average)
- Recent analyses from localStorage (max 5)
- Features section — 6-card grid with tags (free/pro)
- How it works — 4-step grid with arrow connectors
- Testimonials — 3 cards
- Pricing — 3-tier cards (Free / Pro / Team)
- CTA banner with gradient glow
- Footer — 4-column grid + status indicator
- Scroll reveal animations (`.vb-reveal`)
- Auth error handling — 8 OAuth error types mapped to friendly messages
- Network error handling — "Could not reach the server" instead of raw TypeError

---

## Pricing

| Plan | Price | What you get |
|------|-------|-------------|
| Free | $0/forever | Public repos, unlimited analyses, all dashboard views, markdown export, 20 AI queries/day |
| Pro | $19/month | Everything free + private repos, PDF export, unlimited AI, health badge, webhook re-analysis |
| Team | $49/month | Everything Pro + 5 members, shared history, priority AI, SSO, +$8/mo per additional seat |

---

## Input Validation

Every mutating endpoint validates before doing any work:

1. **Content-Type** — must be `application/json` (returns 415 otherwise)
2. **JSON parse** — wrapped in try/catch, returns 400 "Invalid JSON body"
3. **Field types** — all required fields checked for correct type
4. **Length caps** — repoUrl ≤ 300, query ≤ 2000, search q ≤ 200
5. **UUID format** — analysisId validated against `/^[0-9a-f-]{36}$/i`
6. **Ownership** — analysis `owner_email` checked against session email (returns 403)

---

## Data Fetching (Frontend)

React Query hooks in `src/hooks/useApi.js`:

| Hook | Purpose | Cache Strategy |
|------|---------|---------------|
| `useAnalysis(id)` | Fetch analysis data | Standard |
| `useFileContent(id, path)` | Fetch file source code | `staleTime: Infinity` (never refetch) |
| `useChatHistory(id)` | Fetch chat history | Refresh every 30s |
| `useDeleteChatHistory()` | Delete with optimistic update | Rollback on error |
| `useExplainCode()` | Inline code block explanation | Mutation |
| `useDiagram()` | Generate mermaid diagram | Mutation |
| `useSystemData(id)` | Fetch system tab data | `staleTime: Infinity` |

---

## Environment Variables

### Required
| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `NEXTAUTH_URL` | App URL (e.g., `http://localhost:3000`) |
| `NEXTAUTH_SECRET` | Random string for JWT signing |
| `GITHUB_ID` | GitHub OAuth app client ID |
| `GITHUB_SECRET` | GitHub OAuth app client secret |

### Optional
| Variable | Purpose |
|----------|---------|
| `GROQ_API_KEY` | Enables AI-powered summaries, insights, diagrams, and Q&A |

---

## What's Been Removed

These features were cut from earlier versions:

- **ELI5 mode** — removed. The AI console handles beginner questions naturally.
- **Symbol Explorer tab** — removed from the dashboard. Symbol data still powers the AI and search.
- **Flow Analysis tab** — removed. Unreliable without a real AST parser.
- **Supabase** — replaced with Neon PostgreSQL + Drizzle ORM.
- **Prisma** — replaced with Drizzle ORM.
- **ClickSpark animation** — removed from the current landing page.
- **QueryWidget (floating chat)** — replaced by the integrated Chat tab in the dashboard.
- **Old view-based dashboard** — replaced by the three-tab IDE-style layout (Chat / Explore / System).

---

## What Makes It Different

Most code tools require you to already understand the codebase to use them. Vibo is designed for the moment *before* that — when you're looking at something new and need to get up to speed fast. It reads the code so you don't have to start from zero.

The AI is grounded in the actual code — it references real files, real functions, and real patterns. It doesn't hallucinate about code that doesn't exist.

---

## Known Limitations

- **In-memory rate limiting** — resets on server restart. Not suitable for multi-instance deployments.
- **File size caps** — files over 400KB are skipped silently during analysis.
- **GitHub API rate limits** — unauthenticated: 60/hour. Authenticated: 5,000/hour.
- **Single-user sessions** — no team/org support yet. Analyses scoped to individual email addresses.
- **Regex-based symbol extraction** — uses regex, not a real AST. Fails on TypeScript generics, decorators, and complex patterns.
- **Substring search only** — `/api/search` uses simple matching. "authn" won't find "authentication".
- **No real-time collaboration** — single-user dashboard experience.
- **Groq dependency** — AI features require Groq API key. App works without it using heuristic fallbacks.
