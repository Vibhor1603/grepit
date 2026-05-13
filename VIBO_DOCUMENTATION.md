# Vibo Code Analyst — Complete Project Documentation

---

## Quick Start Guide for New Developers

If you're new to this codebase, here's the fastest way to get oriented:

1. **Read this file first** — it covers everything.
2. **Understand the folder structure** (next section) — it tells you where everything lives.
3. **Run the app locally** — `npm install` → copy `.env.example` to `.env.local` → fill in values → `npm run dev`.
4. **Start from the landing page** (`src/components/LandingPage.jsx`) — this is where users begin.
5. **Follow the data** — Landing page → `/api/analyze` → Supabase → Dashboard. That's the core loop.
6. **When adding a feature**, figure out which layer it touches: frontend component, API route, or lib utility. Each lives in its own folder.

---

## Directory Structure

```
Vibo-code-analyst/
├── .env.example              # Template for environment variables
├── .env.local                # Your actual secrets (git-ignored)
├── package.json              # Dependencies and scripts
├── next.config.mjs           # Next.js configuration
├── tailwind.config.mjs       # Tailwind theme (colors, fonts, shadows, animations)
├── postcss.config.mjs        # PostCSS setup for Tailwind
├── prisma.config.ts          # Prisma configuration
├── dev.db                    # Local SQLite dev database
├── supabase/
│   └── schema.sql            # Database tables, indexes, and RLS policies
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── index.css             # Global styles + Tailwind layers + design system classes
│   ├── app/                  # Next.js App Router (pages + API routes)
│   │   ├── layout.jsx        # Root layout — wraps everything in Providers
│   │   ├── page.jsx          # Home page — renders LandingPage
│   │   ├── dashboard/
│   │   │   └── page.jsx      # Dashboard page — renders DashboardLayout
│   │   └── api/              # All backend API routes
│   │       ├── analyze/route.js   # POST: analyze a repo | GET: fetch analysis
│   │       ├── upload/route.js    # POST: upload and analyze a ZIP file
│   │       ├── query/route.js     # POST: ask AI questions about a codebase
│   │       ├── search/route.js    # POST: search files and symbols
│   │       ├── file/route.js      # GET: fetch file code | POST: get AI file insight
│   │       ├── report/route.js    # GET: export analysis as markdown/JSON
│   │       └── auth/
│   │           ├── [...nextauth]/ # NextAuth route handler
│   │           └── status/route.js # GET: check if GitHub OAuth is configured
│   ├── pages/
│   │   └── api/auth/
│   │       └── [...nextauth].js   # NextAuth Pages Router handler (legacy compat)
│   ├── components/
│   │   ├── LandingPage.jsx        # Full landing page (hero, features, pricing, footer)
│   │   ├── DashboardLayout.jsx    # Dashboard shell (sidebar, tabs, content)
│   │   ├── ClickSpark.jsx         # Click animation — lime sparks on every click
│   │   ├── Providers.jsx          # SessionProvider + ThemeProvider wrapper
│   │   ├── ThemeProvider.jsx      # Theme context (dark-first, always dark)
│   │   ├── QueryWidget.jsx        # Floating AI chat widget
│   │   └── views/                 # Dashboard tab views
│   │       ├── Overview.jsx
│   │       ├── FileExplorer.jsx
│   │       ├── Architecture.jsx
│   │       ├── ApiExplorer.jsx
│   │       ├── ComponentBreakdown.jsx
│   │       ├── SecurityAudit.jsx
│   │       ├── SetupGuide.jsx
│   │       └── QueryConsole.jsx
│   ├── lib/                       # Server-side utilities and business logic
│   │   ├── ai.js                  # AI utility placeholder
│   │   ├── analysis.js            # Core analysis builder + Groq enrichment
│   │   ├── analysis-store.js      # Supabase CRUD for analyses and query history
│   │   ├── auth.js                # NextAuth config (GitHub OAuth)
│   │   ├── code-intel.js          # Code parser — extracts symbols, endpoints, quality
│   │   ├── env.js                 # Environment variable checks
│   │   ├── github.js              # GitHub API client (repo, tree, file fetching)
│   │   ├── groq.js                # Groq API request builders
│   │   ├── rateLimit.js           # Sliding-window rate limiter (per-user when authed)
│   │   ├── repository-snapshot.js # ZIP extraction for GitHub and uploads
│   │   ├── server-session.js      # Server-side session helpers
│   │   └── supabase.js            # Supabase client factory
│   └── assets/                    # Static images
```

**Rule of thumb:** If it's a page, it's in `src/app/`. If it's a reusable UI piece, it's in `src/components/`. If it's server logic, it's in `src/lib/`. If it's an API endpoint, it's in `src/app/api/`.

> **Removed:** `stitch_v2/`, `src/stitch-ui/`, `SymbolExplorer.jsx`, `FlowAnalysis.jsx` — all deleted as dead/unreliable code.

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router + Pages Router) | 16.2.1 |
| UI | React | 19.2.4 |
| Styling | Tailwind CSS | 3.4.19 |
| Fonts | IBM Plex Mono + Instrument Sans | Google Fonts |
| Auth | NextAuth.js (GitHub OAuth) | 4.24.13 |
| Database | Supabase (PostgreSQL) | 2.100.0 |
| AI | Groq API (model: `openai/gpt-oss-120b`) | — |
| ORM | Prisma | 7.5.0 |
| ZIP Handling | JSZip | 3.10.1 |

---

## Architecture Overview

Vibo is a **full-stack Next.js app** that analyzes codebases and presents the results in an interactive dashboard. The architecture has three layers:

```
┌─────────────────────────────────────────────────┐
│  FRONTEND (React + Tailwind)                    │
│  Landing Page → Dashboard → 7 Adaptive Tabs     │
│  + Floating AI Chat Widget + ClickSpark FX      │
├─────────────────────────────────────────────────┤
│  API LAYER (Next.js Route Handlers)             │
│  /api/analyze  /api/upload  /api/query          │
│  /api/search   /api/file    /api/report         │
│  /api/auth/*                                    │
├─────────────────────────────────────────────────┤
│  DATA + SERVICES                                │
│  Supabase (PostgreSQL) │ GitHub API │ Groq API  │
│  Sliding-window rate limiter │ Code intelligence│
└─────────────────────────────────────────────────┘
```

---

## Core Feature Flows

### 1. Analyze a GitHub Repository

```
User enters GitHub URL on landing page
        │
        ▼
Frontend validates URL format (regex check)
        │
        ▼
POST /api/analyze { repoUrl, repoName }
        │
        ├── Content-Type: application/json check (returns 415 if wrong)
        ├── Session fetched first → rate limit keyed by email (authed) or IP (anon)
        ├── Rate limit: 10 req/min per identity
        ├── JSON parse with explicit error handling
        ├── URL length cap (300 chars), normalizeGitHubRepoUrl validation
        ├── Create analysis record in Supabase (status: PROCESSING)
        │
        ▼
Download repo as ZIP from GitHub API
        │
        ├── Extract ZIP → parse text files (40+ extensions)
        ├── Skip binary files, files > 400KB, __MACOSX/
        │
        ▼
Build code intelligence (code-intel.js)
        │
        ├── Parse each file by language (JS, Python, Go, Java, CSS, etc.)
        ├── Extract: functions, classes, methods, imports, endpoints
        ├── Build: symbol index, dependency graph, call graph
        ├── Detect: duplicates, security issues, performance risks
        │
        ▼
Enrich with Groq AI (if GROQ_API_KEY is set)
        │
        ├── Send file metadata + code samples to Groq
        ├── Get back: enhanced summary, capabilities, security issues, flows
        │
        ▼
Update Supabase record (status: COMPLETED)
        │
        ▼
Frontend saves to localStorage, redirects to /dashboard?id=<uuid>
```

**Edge cases:**
- **Wrong Content-Type:** Returns 415 before any processing.
- **Invalid JSON body:** Returns 400 "Invalid JSON body" — this was the source of the previous fetch TypeError.
- **Private repo without auth:** Returns 403 with `requiresAuth: true`. Frontend auto-triggers GitHub sign-in.
- **Invalid GitHub URL:** Returns 400 from `normalizeGitHubRepoUrl`.
- **Rate limit hit:** Returns 429 with `resetIn` ms. Authenticated users have their own bucket separate from IP.
- **GitHub API failure:** Analysis record is deleted (cleanup). Error returned to user.
- **Groq unavailable:** Analysis completes without AI enrichment. Heuristic summaries used instead.
- **Very large repos:** File tree capped at 5,000 files. Text files capped at 400KB each. Code preview capped at 40KB.

### 2. Upload a ZIP File

```
User drops/selects a .zip file (max 50MB)
        │
        ▼
Frontend validates: must be .zip, must be < 50MB
        │
        ▼
POST /api/upload (FormData with file)
        │
        ├── Session fetched first → rate limit keyed by email or IP
        ├── Rate limit: 5 req/min per identity
        ├── File type + size validation
        ├── Extract ZIP, build code intelligence, Groq enrichment
        ├── Store in Supabase
        │
        ▼
Redirect to /dashboard?id=<uuid>
```

### 3. GitHub Authentication

```
User clicks "Sign in" on landing page
        │
        ▼
NextAuth redirects to GitHub OAuth consent screen
  (scopes: read:user, user:email, repo)
        │
        ▼
GitHub returns authorization code
        │
        ▼
NextAuth exchanges code for access token
        │
        ├── JWT callback: stores access token in JWT
        ├── Session callback: exposes token + user ID to session
        │
        ▼
User redirected back to app (session now available)
```

**Why `repo` scope?** Allows analyzing private repositories.

**Edge cases:**
- **OAuth not configured:** `/api/auth/status` returns `{ configured: false }`. Sign-in button shows an error instead of redirecting.
- **Auth errors:** URL param `?error=<code>` parsed into friendly messages for 8 error types.

### 4. AI Query

```
User types a question in the chat widget
        │
        ▼
POST /api/query { query, analysisId }
        │
        ├── Content-Type check (415 if wrong)
        ├── Body parsed, then validated:
        │   - query: required, non-empty string, max 2000 chars
        │   - analysisId: required, must match UUID format /^[0-9a-f-]{36}$/i
        ├── Analysis fetched + ownership verified BEFORE rate limiting
        ├── Rate limit: 20/min for authed users, 5/min for anonymous
        │
        ▼
Score and rank relevant files (top 6) and symbols (top 10)
  Scoring: +5 path match, +3 symbol name match, +2 content match,
           +2 import-graph proximity (file imported by a matched file)
        │
        ▼
Build context string (hard-capped at 48,000 chars / ~12,000 tokens)
        │
        ▼
Fetch last 3 Q&A pairs from query_history → prepend as conversation history
        │
        ▼
Send to Groq via groqFetch() — retries on 429/503, max 2 concurrent calls
        │
        ▼
Store in query_history (fire-and-forget, doesn't block response)
        │
        ▼
Return { response, remaining }
```

**Key behaviours:**
- `analysisId` is **required** — queries without it are rejected with 400.
- Ownership check happens **before** rate limiting.
- Authenticated users get 4× the rate limit (20 vs 5 per minute).
- Conversation memory: last 3 Q&A pairs are injected so follow-up questions work.
- Query history write is fire-and-forget — a DB failure won't break the response.
- Groq failures fall back to `buildQueryResponse()` heuristic — never a 500.

### 5. File Viewing and AI Insight

```
GET /api/file?id=<analysisId>&path=<filePath>
        ├── Rate limit: 60/min per identity
        ├── Ownership check
        ├── Try live GitHub fetch, fall back to analysis cache
        └── Return { path, code, truncated, source }

POST /api/file { analysisId, filePath }
        ├── Content-Type check
        ├── Rate limit: 20/min per identity
        ├── eli5 param removed — no longer accepted
        ├── Build local insight, optionally enrich with Groq
        └── Return { response }
```

### 6. Search

```
POST /api/search { analysisId, q }
        ├── Content-Type check
        ├── q max 200 chars
        ├── Rate limit: 20/min per identity
        ├── Ownership check
        └── Return { fileMatches (max 20), symbolMatches (max 30) }
```

### 7. Export Report

```
GET /api/report?id=<uuid>&format=markdown|json
        ├── Rate limit: 10/min per identity
        ├── 404 if analysis not found
        ├── Ownership check
        └── Return markdown or { markdown, shareToken }
```

---

## API Endpoints Reference

### POST `/api/analyze`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| repoUrl | string | Yes | Full GitHub URL, max 300 chars |
| repoName | string | No | Defaults to repo name from URL |

**Responses:** 200, 400 (bad input), 415 (wrong Content-Type), 403 (private repo / no access), 429 (rate limit), 500

### GET `/api/analyze?id=<uuid>`
Fetch a single analysis or list all for the current user.

### POST `/api/upload`
FormData with `file` field. ZIP only, max 50MB.

### POST `/api/query`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| query | string | Yes | Non-empty, max 2000 chars |
| analysisId | string | **Yes** | UUID format required |

**Responses:** 200 `{ response, remaining }`, 400, 403, 404, 415, 429, 500

### POST `/api/search`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| analysisId | string | Yes | UUID |
| q | string | Yes | Max 200 chars |

### GET `/api/file?id=<uuid>&path=<filePath>`
Fetch source code. Rate limited at 60/min.

### POST `/api/file`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| analysisId | string | Yes | UUID |
| filePath | string | Yes | Path within the repo |

Note: `eli5` parameter removed.

### GET `/api/report?id=<uuid>&format=markdown|json`
Export analysis as markdown. Rate limited at 10/min.

### GET `/api/auth/status`
Returns `{ configured: true/false }`.

---

## Frontend Features

### Landing Page (`/`)

Full marketing page with:
- **Sticky nav** — logo, feature/how/pricing anchor links, sign in + "Try free" buttons
- **Hero** — large mono headline, version badge with pulsing dot, violet radial glow
- **GitHub URL input** with Enter-to-submit and analyze button
- **ZIP upload** with drag-and-drop
- **Mode toggle** — GitHub URL / Upload ZIP tabs with lime underline indicator
- **Quick-try chips** — react, next.js, deno, linux, vscode
- **Social proof strip** — 12,400+ repos analyzed, 40+ file types, <30s average
- **Recent analyses** — from localStorage, max 5 shown
- **Ticker/marquee** — infinite scrolling strip of feature names
- **Features section** — 6-card grid with colored top bars, feature tags (free/pro)
- **How it works** — 4-step grid with arrow connectors
- **Testimonials** — 3 cards with avatar initials
- **Pricing** — 3-tier cards (Free / Pro / Team), featured Pro with violet gradient
- **Badge section** — health score badge preview + README embed code
- **CTA banner** — full-width with violet radial glow
- **Footer** — 4-column grid (brand, Product, Developers, Company) + status indicator
- **ClickSpark animation** — lime spark lines radiate from every click (canvas-based, fixed viewport)
- **Scroll reveal** — sections fade up as they enter the viewport (`.vb-reveal`)
- **Auth error handling** — 8 OAuth error types mapped to friendly messages
- **Network error handling** — fetch errors show "Could not reach the server" instead of raw TypeError

### Dashboard (`/dashboard?id=<uuid>`)

Sidebar + main content layout. Tabs adapt to what the analysis found.

**Always-visible tabs:**
- Overview
- File Explorer
- Security Audit

**Conditional tabs:**
- Architecture — if layers or dependency graph detected
- API Explorer — if server endpoints detected
- UI Components / Structure Map — if components detected
- Setup Guide — if setup signals detected

**Removed tabs (vs earlier versions):**
- ~~Symbol Explorer~~ — removed (data still powers AI and search)
- ~~Flow Analysis~~ — removed (unreliable without real AST)
- ~~ELI5 toggle~~ — removed entirely

**Dashboard features:**
- **Health score** in sidebar — 0–100, lime bar, issue count
- **Stat cards** on overview — files, lines, components, languages, issues
- **Tab state in URL** — `?tab=security` for deep linking
- **5-minute localStorage cache** for analysis data
- **Floating AI chat widget** (QueryWidget) — always accessible
- **Sign in / sign out** in topbar
- **Status chip** — "✓ DONE" when analysis loaded

---

## Rate Limiting

Sliding-window implementation in `src/lib/rateLimit.js`. Stale entries pruned every 2 minutes.

**Key design:** Rate limit keys are built with `rateLimitKey(prefix, ip, ownerEmail)`. When a user is authenticated, the key uses their email — so limits are per-user, not per-IP. This prevents bypassing limits by rotating IPs and gives authenticated users their own independent bucket.

| Endpoint | Anon limit | Authed limit | Window |
|----------|-----------|--------------|--------|
| `/api/analyze` | 10/min | 10/min | 60s |
| `/api/upload` | 5/min | 5/min | 60s |
| `/api/query` | 5/min | **20/min** | 60s |
| `/api/search` | 20/min | 20/min | 60s |
| `/api/file` GET | 60/min | 60/min | 60s |
| `/api/file` POST | 20/min | 20/min | 60s |
| `/api/report` | 10/min | 10/min | 60s |

---

## Input Validation (All Endpoints)

Every mutating endpoint now validates before doing any work:

1. **Content-Type** — must be `application/json` (returns 415 otherwise). This was the root cause of the "fetch TypeError" — when the server returned an HTML error page, `res.json()` threw a SyntaxError.
2. **JSON parse** — wrapped in try/catch, returns 400 "Invalid JSON body" on failure.
3. **Field types** — all required fields checked for correct type.
4. **Length caps** — repoUrl ≤ 300 chars, query ≤ 2000 chars, search q ≤ 200 chars.
5. **UUID format** — analysisId validated against `/^[0-9a-f-]{36}$/i` before any DB call.
6. **Ownership** — analysis `owner_email` checked against session email. Returns 403 if mismatch.

---

## Design System

The UI is a **neo-brutalist dark-first** design using IBM Plex Mono (display/code) and Instrument Sans (body).

### Color Palette (Tailwind tokens)

| Token | Value | Use |
|-------|-------|-----|
| `vb-bg` | `#080810` | Page background |
| `vb-bg1` | `#0F0F1A` | Card / sidebar background |
| `vb-bg2` | `#161625` | Hover states, inner panels |
| `vb-bg3` | `#1E1E32` | Active tab backgrounds |
| `vb-border` | `#2A2A44` | All borders |
| `vb-border2` | `#3A3A58` | Hover border states |
| `vb-lime` | `#C8F135` | Primary accent — buttons, active states, health bar |
| `vb-violet` | `#8B5CF6` | Secondary accent — AI, featured elements |
| `vb-cyan` | `#22D3EE` | Tertiary accent — file types, API methods |
| `vb-amber` | `#F59E0B` | Warning states |
| `vb-red` | `#EF4444` | Error / high severity |
| `vb-ink` | `#F2F2FF` | Primary text |
| `vb-ink2` | `#9494B8` | Secondary text |
| `vb-ink3` | `#55556E` | Muted / placeholder text |

### CSS Component Classes

| Class | Purpose |
|-------|---------|
| `.vb-btn-primary` | Lime-filled action button |
| `.vb-btn-ghost` | Bordered ghost button |
| `.vb-card` | Module card with border |
| `.vb-stat-card` | Stat display card |
| `.vb-nav-item` | Sidebar nav button with lime left-border active state |
| `.vb-feature-card` | Landing page feature card with colored top bar |
| `.vb-health-bar-bg/fill` | Health score progress bar |
| `.vb-sev-high/med/low` | Security issue severity badges |
| `.vb-reveal` | Scroll-reveal element (fades up when entering viewport) |
| `.workspace-card/panel/button/chip/input/code` | Dashboard view components |
| `.btn-brutal / .card-brutal` | Legacy classes used by view components |
| `.markdown-brutal` | Markdown rendering in AI responses |

### Grid Overlay
`body::before` renders a fixed 40×40px grid of faint lines — the signature neo-brutalist texture. Opacity 0.35.

### ClickSpark
`ClickSpark.jsx` wraps the entire landing page. On every click, 8 lime spark lines radiate outward on a fixed canvas overlay (`z-index: 99990`, `pointer-events: none`). Implemented with `requestAnimationFrame` and canvas 2D.

---

## Database Schema

### `analyses`
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

### `query_history`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | Auto-generated |
| analysis_id | UUID (FK) | Cascade delete |
| owner_email | text | Nullable |
| query | text | User's question |
| response | text | AI response |
| created_at | timestamptz | Auto |

RLS enabled on both tables. Only `service_role` can read/write.

---

## Groq AI Integration

Optional — app works without it using heuristic fallbacks.

**Used in three places:**
1. **Analysis enrichment** — structured JSON response with summary, capabilities, security issues, setup steps, flow paths.
2. **File insight** — markdown explanation tailored to file type (CSS → selectors, JSON → keys, source → functions).
3. **Query responses** — grounded in relevant files/symbols. Code interpreter auto-enabled for metric queries.

**Model:** `openai/gpt-oss-120b` | **Temperature:** 0.1–0.25 | **Reasoning:** `high`

**Concurrency:** Max 2 simultaneous Groq calls enforced via a module-level semaphore in `groq.js`. Prevents burst traffic from getting the app 429'd by Groq.

**Retry logic:** All Groq calls go through `groqFetch()` in `groq.js`. On 429 or 503, it retries up to 3 times with exponential backoff (respects `retry-after` header if present). A single transient Groq failure will never surface as a 500 to the user.

**Token cap:** Context strings are hard-capped at 48,000 chars (~12,000 tokens) before being sent. Priority order: summary → languages → architecture → file tree → relevant files → relevant symbols. Sections are dropped if they would exceed the cap.

**Conversation memory:** The query endpoint fetches the last 3 Q&A pairs for the same `analysisId` from `query_history` and prepends them as conversation history messages. Follow-up questions now have context from previous turns.

**Scoring improvements:** File relevance scoring in the query endpoint now includes:
- +5 path contains keyword
- +3 any symbol name in the file matches a keyword (new)
- +2 content/metadata contains keyword
- +2 file is directly imported by an already-matched file — import-graph proximity (new)

---

## Environment Variables

### Required
| Variable | Purpose |
|----------|---------|
| `NEXTAUTH_URL` | App URL (e.g., `http://localhost:3000`) |
| `NEXTAUTH_SECRET` | Random string for JWT signing |
| `GITHUB_ID` | GitHub OAuth app client ID |
| `GITHUB_SECRET` | GitHub OAuth app client secret |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |

### Optional
| Variable | Purpose |
|----------|---------|
| `GROQ_API_KEY` | Enables AI-powered summaries, insights, and Q&A |

---

## How to Work on a Feature

### Adding a new dashboard tab
1. Create `src/components/views/YourView.jsx`
2. Import it in `DashboardLayout.jsx`
3. Add to `buildAdaptiveTabs()` with a `show` condition
4. Add a render case in the content area

### Adding a new API endpoint
1. Create `src/app/api/your-endpoint/route.js`
2. Check Content-Type, parse JSON with try/catch, validate inputs
3. Fetch session, build rate limit key with `rateLimitKey(prefix, ip, ownerEmail)`
4. Check ownership before doing any work
5. Use `analysis-store.js` for DB operations

### Changing the design
1. Colors and fonts → `tailwind.config.mjs`
2. Component classes → `src/index.css`
3. The design is dark-only — `ThemeProvider` always applies the `dark` class

---

## Scripts

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start development server on port 3000 |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |

---

## Known Limitations

- **No automated tests** — no test files exist.
- **In-memory rate limiting** — resets on server restart. Not suitable for multi-instance deployments. Upstash Redis is the recommended upgrade path.
- **No streaming** — AI responses are not streamed; user waits for the full response. Planned: `ReadableStream` on `/api/query` + `EventSource` on the frontend.
- **File size caps** — files over 400KB are skipped silently during analysis. No UI indicator yet.
- **GitHub API rate limits** — unauthenticated: 60/hour. Authenticated: 5,000/hour.
- **Single-user sessions** — no team/org support. Analyses scoped to individual email addresses.
- **Theme is dark-only** — the ThemeProvider no longer toggles; the app is always dark.
- **Regex-based symbol extraction** — `code-intel.js` uses regex, not a real AST. Fails silently on TypeScript generics, decorators, and complex arrow functions. Tree-sitter WASM is the correct long-term fix.
- **Substring search only** — `/api/search` uses simple `.includes()`. "authn" won't find "authentication". Postgres `pg_trgm` + `tsvector` is the upgrade path.
