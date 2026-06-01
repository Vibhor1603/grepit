# Grepit — Complete Product & Technical Documentation

> **Grepit** is an AI-powered codebase intelligence platform. Users paste a repository URL or upload a folder, and Grepit analyzes the entire codebase — extracting architecture, dependencies, security issues, and building a queryable AI that answers questions grounded in the actual code.

---

## Table of Contents

1. [Product Overview](#product-overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Features](#features)
5. [Analysis Pipeline](#analysis-pipeline)
6. [AI Chat System](#ai-chat-system)
7. [Vector Embeddings & Semantic Search](#vector-embeddings--semantic-search)
8. [Code Intelligence Engine](#code-intelligence-engine)
9. [Codebase Index & Query System](#codebase-index--query-system)
10. [Authentication & Security](#authentication--security)
11. [Billing & Subscriptions](#billing--subscriptions)
12. [Rate Limiting & Token Budgets](#rate-limiting--token-budgets)
13. [Database Schema](#database-schema)
14. [API Routes](#api-routes)
15. [Frontend Architecture](#frontend-architecture)
16. [Plans & Pricing](#plans--pricing)
17. [Email Notifications](#email-notifications)
18. [Deployment & Infrastructure](#deployment--infrastructure)
19. [Environment Variables](#environment-variables)
20. [Local Development](#local-development)

---

## Product Overview

Grepit solves the problem of understanding unfamiliar codebases. Instead of spending hours reading through files, developers paste a repo URL and get:

- An AI that answers questions about the code with citations to exact files and lines
- Architecture maps and dependency graphs generated automatically
- Security audits with severity-tagged findings
- A full file explorer with syntax highlighting
- System health reports with actionable recommendations

**Key differentiator:** Grepit indexes the codebase once and answers queries using ~15K tokens per question (vs. 200K+ tokens when tools like Claude/GPT re-read the entire codebase every time).

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  Next.js 16 (React 19) — App Router — Vercel Hosting            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │ Landing  │ │Dashboard │ │ Profile  │ │ Sign-in/Sign-up  │   │
│  │  Page    │ │ Layout   │ │  Page    │ │   (Clerk)        │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                    API Routes (Next.js)
                              │
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND                                   │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌─────────────┐  │
│  │  Analyze   │ │  Stream    │ │  Diagram   │ │   Billing   │  │
│  │ Controller │ │ Controller │ │ Controller │ │  (Webhooks) │  │
│  └────────────┘ └────────────┘ └────────────┘ └─────────────┘  │
│                                                                   │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌─────────────┐  │
│  │ Code Intel │ │ Embeddings │ │  Codebase  │ │Subscription │  │
│  │  Engine    │ │  (Vector)  │ │   Index    │ │    Gate     │  │
│  └────────────┘ └────────────┘ └────────────┘ └─────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │  Neon    │ │ Upstash  │ │OpenRouter│ │   Dodo   │          │
│  │PostgreSQL│ │  Redis   │ │   AI     │ │ Payments │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │  Clerk   │ │  Sentry  │ │  Resend  │ │ PostHog  │          │
│  │  Auth    │ │ Errors   │ │  Email   │ │Analytics │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Next.js 16 (App Router) | Full-stack React with API routes |
| UI | React 19, Tailwind CSS, Framer Motion | Component rendering, styling, animations |
| Auth | Clerk | OAuth (GitHub, Google), email/password, session management |
| Database | Neon PostgreSQL + Drizzle ORM | Persistent storage, vector search (pgvector) |
| Cache | Upstash Redis | Rate limiting, subscription cache, token budgets |
| AI | OpenRouter (configured chat model) | Chat, embeddings, analysis enrichment |
| Billing | Dodo Payments | Subscriptions, checkout, webhooks |
| Monitoring | Sentry | Error tracking, performance monitoring |
| Email | Resend | Transactional emails |
| Analytics | PostHog, Vercel Analytics | Product analytics, speed insights |
| Hosting | Vercel | Edge deployment, serverless functions |

---

## Features

### 1. AI Chat
- Streaming responses via Server-Sent Events (SSE)
- Grounded in actual code — answers cite specific files and lines
- Conversation history with multiple chat threads per analysis
- Follow-up question suggestions on every response
- Mermaid diagram generation (flowchart, sequence, class, ER, state)
- Thinking block stripping (removes internal reasoning from output)

### 2. Code Analysis
- Supports 40+ programming languages
- Extracts functions, classes, methods, imports for each file
- Detects API endpoints (Next.js routes, Express, Spring, Django, Flask, etc.)
- Infers file purpose (controller, model, service, component, test, config)
- Builds dependency graphs and call graphs
- Identifies security issues (hardcoded secrets, unsafe patterns)
- Measures code quality (duplicates, long files, unused symbols)

### 3. File Explorer
- Full file tree with folder accordion navigation
- Syntax highlighting via Prism React Renderer
- Inline code explanation (hover/tap on functions)
- Live file fetching from GitHub

### 4. System Health Tab
- Tech stack detection
- Entry point identification
- Security audit with severity tags (critical, warning, info)
- Performance signals (heavy files, nested loops)
- Code quality metrics (duplicates, naming issues)
- PDF export (paid plans)

### 5. Architecture Diagrams
- AI-generated Mermaid diagrams
- Multiple types: flowchart, sequence, class, ER, state
- Dark-themed rendering
- Fullscreen view with zoom

### 6. Chat Sharing
- Generate shareable links for conversations
- Public access without sign-in
- Expiration support

### 7. Subscription Management
- Dodo Customer Portal integration (update card, cancel, view invoices)
- Plan upgrade/downgrade with prorated billing
- Undo cancellation before period ends

---

## Analysis Pipeline

The analysis pipeline runs when a user submits a repository URL. Here's the complete flow:

```
User submits URL
       │
       ▼
┌─────────────────┐
│ Validate & Auth │ Rate limit, subscription gate, normalize URL
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ GitHub Snapshot  │ Fetch file tree, languages, repo metadata
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Filter & Limit  │ Remove node_modules, .git, vendor, build outputs
└────────┬────────┘ Hard limit: 5000 source files max
         │
         ▼
┌─────────────────────────────────────────────┐
│           PARALLEL PROCESSING                │
│                                              │
│  ┌──────────────┐    ┌───────────────────┐  │
│  │ Code Intel   │    │ Component Enrich  │  │
│  │ (all files)  │    │ (≤500 files only) │  │
│  └──────┬───────┘    └───────────────────┘  │
│         │                                    │
└─────────┼────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────┐
│           PARALLEL PROCESSING                │
│                                              │
│  ┌──────────────┐  ┌──────────┐  ┌───────┐ │
│  │Codebase Index│  │AI Enhance│  │Embed  │ │
│  │(tree+graph)  │  │(summaries│  │(vector│ │
│  │              │  │ via LLM) │  │search)│ │
│  └──────────────┘  └──────────┘  └───────┘ │
│                                              │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
              ┌────────────────┐
              │ Merge & Persist│ Save to PostgreSQL
              └────────────────┘
```

**Key implementation details:**
- Overall timeout: 50 seconds (Vercel's 60s limit minus buffer)
- Large repos (>1000 files): skip component enrichment
- Huge repos (>3000 files): save partial results immediately, limit code-intel scope
- Deduplication: if a PROCESSING analysis exists for the same repo (< 2 min old), return it
- Pre-indexed repos: public suggested repos are cloned for new users (instant)
- Incremental: reuses file analysis from previous runs if file hash matches

---

## AI Chat System

### Request Flow

```
User sends query
       │
       ▼
POST /api/query/stream
       │
       ▼
┌─────────────────┐
│ Auth + Gates    │ Session, ownership, subscription gate
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Token Budget    │ Check daily usage vs plan limit
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Rate Limit      │ Per-user sliding window (Upstash)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Context Build   │ Vector search → file metadata fallback
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Stream to AI    │ OpenRouter SSE with fallback routing
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Post-process    │ Strip thinking blocks, persist history, record tokens
└─────────────────┘
```

### Context Building Strategy

1. **Primary: Vector search** — Embeds the query, searches pgvector for semantically similar code chunks (top 10)
2. **Fallback: File metadata** — If embeddings aren't available, uses file summaries and first 8K chars of code from top 8 files
3. **Always included:** Repository name, summary, languages, file tree (first 120 paths)
4. **User-tagged files:** If user attached specific files, their full code (up to 30K chars) is included with priority

### AI Configuration

- **Primary model:** configured chat model (1M context, $0.20/MTok input)
- **Fallback models:** Additional entries in `OPENROUTER_CHAT_MODELS` (comma-separated chain)
- **Routing:** OpenRouter native `route: "fallback"` — auto-retries next model on failure
- **Temperature:** 0.25 (deterministic but not robotic)
- **Max tokens:** 16,000 (allows detailed documentation-style responses)
- **Context cap:** 150K characters

---

## Vector Embeddings & Semantic Search

### How It Works

1. **At analysis time:** Each file's code is split into chunks (~200 lines, 20-line overlap)
2. **Embedding:** Chunks are embedded via OpenRouter using the model configured in `OPENROUTER_EMBEDDING_MODEL` (typically 1536 dimensions)
3. **Storage:** Vectors stored in Neon PostgreSQL using pgvector extension
4. **At query time:** User's question is embedded → cosine similarity search → top chunks returned

### Chunking Strategy

- Files < 100 lines → single chunk (includes file path + summary as prefix)
- Files > 100 lines → overlapping chunks of 200 lines with 20-line overlap
- Max 10 chunks per file
- Batch embedding: 50 chunks per API call

### Search

```sql
SELECT file_path, start_line, end_line, content,
       1 - (embedding <=> query_vector::vector) as similarity
FROM code_embeddings
WHERE analysis_id = ?
ORDER BY embedding <=> query_vector::vector
LIMIT 10
```

---

## Code Intelligence Engine

The code intelligence engine (`src/lib/code-intel.js`) parses every file in the repository and extracts structured information.

### Language Support

| Language | Parser | Extracts |
|----------|--------|----------|
| JavaScript/TypeScript | Custom regex | Functions, classes, methods, imports, exports, arrow functions |
| Python | Custom regex | Functions (def), classes, imports (from/import) |
| Go | Custom regex | Functions, methods (receiver), structs, imports |
| Java | Custom regex | Classes, interfaces, enums, methods, annotations, imports |
| CSS/SCSS/Less | Custom regex | Selectors, custom properties, animations, @imports |
| HTML | Custom regex | Tags |
| JSON | JSON.parse | Top-level keys |
| YAML/TOML | Custom regex | Top-level keys |
| Markdown | Custom regex | Headings |
| Generic (Rust, Ruby, C#, PHP, Swift, Kotlin, Elixir, C/C++, Scala) | Custom regex | Functions, classes, imports, methods |

### What Gets Extracted Per File

- `path`, `hash`, `ext`, `language`
- `functions[]` — name, kind, args, returns, usedBy
- `classes[]` — name, kind, methods
- `methods[]` — name, kind, args
- `imports[]` — module specifiers
- `endpoints[]` — HTTP method, path, file, description
- `schemas` — request/response shapes (for API routes)
- `summary` — inferred file purpose
- `why` — human-readable description of contents
- `callNames[]` — which symbols this file calls
- `code` — first 40K chars of source

### Outputs

- **Symbol index:** Map of all named symbols → file location
- **Dependency graph:** Import edges between files
- **Call graph:** Function call edges
- **Security report:** Hardcoded secrets, unsafe patterns
- **Quality report:** Duplicates, long files, unused symbols, naming issues
- **Performance signals:** Heavy files, nested loops

---

## Codebase Index & Query System

The codebase index (`src/lib/codebase-index.js`) builds a hybrid tree+graph structure for fast file retrieval at query time.

### Index Structure

1. **Directory tree** — hierarchical folder structure with file counts
2. **File nodes** — each file with its imports, importers, calls, calledBy
3. **Resolved dependency graph** — import specifiers resolved to actual file paths
4. **File call graph** — which files call functions in which other files
5. **Traversal anchors** — top 12 most-connected files (architectural hubs)

### Query Algorithm (4 phases)

1. **Seed:** Score files by direct term matches (path, filename, symbols, metadata)
2. **Tree expansion:** Boost siblings, descendants, and parent context of seed files
3. **Graph traversal:** Walk dependency/call edges (max 2 hops) to find connected modules
4. **Blend:** Combine direct (1.45x weight) + tree + graph scores → rank

### Special Boosting

- **Hub files** (imported by 3+ others): connectivity bonus
- **Entry points** (index, main, app, server, route, page): +2 boost
- **Config files** (config, env, settings): +1.5 boost
- **Basic stemming:** "streaming" → also searches "stream"

---

## Authentication & Security

### Clerk Integration

- OAuth providers: GitHub, Google
- Email/password with verification codes
- Session management via middleware
- Custom sign-in page (not Clerk's hosted UI)

### Middleware (`src/middleware.js`)

- Runs on every request (except static files)
- Public routes: `/`, `/sign-in`, `/sign-up`, `/api/auth`, `/api/dodo/webhook`, `/share/*`, legal pages
- Protected routes: everything else → `auth.protect()`
- IP-based global rate limit: 200 requests/minute per IP (Upstash Redis pipeline)

### Access Control

- Analysis records are scoped by `owner_email`
- Users can only query their own analyses
- Shared chats have public tokens (no auth required)
- Webhook endpoint verifies HMAC signature

---

## Billing & Subscriptions

### Provider: Dodo Payments

- Hosted checkout for new subscriptions (free → paid)
- Server-side plan changes for upgrades/downgrades (charges saved card)
- Customer Portal for payment method management and cancellation
- Webhook-driven entitlement system (source of truth)

### Subscription Lifecycle

```
Free → Checkout → subscription.active webhook → Grant entitlement
                                                        │
                                              ┌─────────┴─────────┐
                                              │                     │
                                        Renewal                 Cancel
                                              │                     │
                                   subscription.renewed    subscription.updated
                                              │            (cancel_at_next_billing_date)
                                   Extend entitlement              │
                                                          Period ends
                                                                    │
                                                         subscription.cancelled
                                                                    │
                                                          Revoke → Free
```

### Webhook Events Handled

| Event | Action |
|-------|--------|
| `subscription.active` | Grant entitlement (plan + end date) |
| `subscription.renewed` | Extend entitlement to next billing date |
| `subscription.plan_changed` | Update plan + clear scheduled changes |
| `subscription.on_hold` | Set status to past_due, revoke to free |
| `subscription.cancelled` | Revoke to free (immediate or end-of-term) |
| `subscription.expired` | Revoke to free |
| `subscription.updated` | Handle cancel_at_next_billing_date flag |
| `payment.succeeded` | Log only |
| `payment.failed` | Log only |

### Entitlement Model

Access is determined by `entitlement_plan` + `entitlement_ends_at`:
- If plan is not "free" AND ends_at is in the future → user has that plan
- If ends_at has passed → check for scheduled downgrade, otherwise revert to free
- Cached in Redis for 60 seconds to avoid DB hits on every request

---

## Rate Limiting & Token Budgets

### Three Layers

1. **IP global** (middleware): 200 req/min — prevents DDoS
2. **Plan-aware per-action** (Upstash sliding window): varies by plan and action
3. **Token budget** (daily): controls AI cost per user

### Per-Action Limits by Plan

| Action | Free | Starter | Pro |
|--------|------|---------|-----|
| Analyze | 3/day | 15/day | 50/day |
| Query/Stream | 30/hour | 120/hour | 300/hour |
| Diagram | 3/hour | 20/hour | 100/hour |
| File view | 30/hour | 200/hour | 1000/hour |

### Token Budget

- Free: 150K tokens/day
- Starter: 750K tokens/day
- Pro: 3M tokens/day
- Tracked via Redis INCRBY with 24h TTL (auto-resets daily)
- Approximate calculation: (input context chars + output chars) / 4

---

## Database Schema

### Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `analyses` | Stored analysis results | id, owner_email, repo_url, status, summary, languages, file_tree, architecture, results |
| `query_history` | Chat messages | analysis_id, conversation_id, query, response |
| `conversations` | Denormalized chat metadata | conversation_id, analysis_id, title, message_count, last_activity_at |
| `subscriptions` | Billing state | user_id, entitlement_plan, entitlement_ends_at, dodo_subscription_id, scheduled_change_* |
| `webhook_events` | Idempotency + audit | provider_event_id (unique), event_type, payload, processed |
| `usage_logs` | Feature usage tracking | user_id, feature, metadata |
| `shared_chats` | Public share links | token (unique), conversation_id, shared_by, expires_at |
| `code_embeddings` | Vector search (pgvector) | analysis_id, file_path, start_line, end_line, content, embedding (vector 1536) |

---

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/analyze` | POST, GET | Start analysis / fetch results |
| `/api/query/stream` | POST | AI chat (SSE streaming) |
| `/api/diagram` | POST | Generate Mermaid diagram |
| `/api/file` | GET | Fetch file content from GitHub |
| `/api/profile/subscription` | GET | Get user's plan status |
| `/api/profile/analyses` | GET | List user's analyses |
| `/api/profile/delete-account` | DELETE | Delete account + all data |
| `/api/dodo/create-checkout` | POST | Create Dodo checkout session |
| `/api/dodo/change-plan` | POST | Upgrade/downgrade (charges saved card) |
| `/api/dodo/preview-change` | POST | Preview prorated charge amount |
| `/api/dodo/cancel` | POST | Schedule cancellation at period end |
| `/api/dodo/undo-cancel` | POST | Undo scheduled cancellation |
| `/api/dodo/customer-portal` | POST | Create Customer Portal session |
| `/api/dodo/webhook` | POST | Receive Dodo payment events |
| `/api/dodo/verify-checkout` | POST | Verify checkout (webhook fallback) |
| `/api/auth/connect-github` | GET | GitHub OAuth for private repos |
| `/api/auth/check-email` | POST | Disposable email check |
| `/api/share/create` | POST | Create shareable chat link |
| `/api/share/[token]` | GET | Fetch shared chat data |
| `/api/admin/*` | Various | Admin endpoints (pre-indexing) |

---

## Frontend Architecture

### Key Components

| Component | File | Purpose |
|-----------|------|---------|
| LandingPage | `src/components/LandingPage.jsx` | Homepage with hero, features, pricing |
| DashboardLayout | `src/components/DashboardLayout.jsx` | Main analysis dashboard (chat, explore, system) |
| SystemTab | `src/components/SystemTab.jsx` | Health report, security audit, PDF export |
| UpgradeModal | `src/components/UpgradeModal.jsx` | Plan change UI |
| CodeViewer | `src/components/CodeViewer.jsx` | Syntax-highlighted file viewer |
| SharedMarkdown | `src/components/SharedMarkdown.jsx` | Markdown renderer for shared chats |
| MobileNotice | `src/components/MobileNotice.jsx` | "Best on desktop" popup |

### State Management

- **React Query** (TanStack Query): Server state caching (analyses, subscription, chat history)
- **Local state** (useState): UI state (active tab, modals, loading)
- **URL params** (useSearchParams): Analysis ID, checkout callbacks

### Design System

- Background: `#0a0a0c` (near-black)
- Surface: `#111113`
- Accent: `#E0FC10` (lime green)
- Text: `#eaeaec` (primary), `#787884` (muted), `#4a4a54` (dim)
- Font: System font stack (SF Pro, -apple-system)
- Borders: `white/[0.06]` to `white/[0.12]`

---

## Plans & Pricing

| | Free | Starter ($15/mo) | Pro ($30/mo) |
|---|---|---|---|
| Repositories | 2 | 3 | 7 |
| Tokens/day | 150K | 750K | 3M |
| Messages/chat | 12 | 30 | 80 |
| Chat conversations | 5 | 50 | 200 |
| Private repos | Yes | Yes | Yes |
| Security report | Basic | Full | Full |
| PDF export | No | Yes | Yes |
| Re-analysis | 1/week | Unlimited | Unlimited |
| Chat sharing | 2 total | Unlimited | Unlimited |
| Priority queue | No | No | Yes |
| Large codebase | No | No | Yes |

---

## Email Notifications

Currently sent via Resend:

1. **Plan upgrade confirmation** — Welcome to Starter/Pro
2. **Plan downgrade/cancellation** — Subscription ended
3. **Payment failed** — Update payment method CTA

---

## Deployment & Infrastructure

- **Hosting:** Vercel (auto-deploy from Git)
- **Database:** Neon PostgreSQL (serverless, connection pooling)
- **Cache:** Upstash Redis (REST API, edge-compatible)
- **CDN:** Vercel Edge Network
- **Monitoring:** Sentry (errors + performance)
- **Analytics:** PostHog (product), Vercel Analytics (web vitals)

---

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_APP_URL` | Yes | App URL for redirects |
| `DATABASE_URL` | Yes | Neon PostgreSQL connection |
| `OPENROUTER_API_KEY` | Yes | AI chat + embeddings |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk auth (client) |
| `CLERK_SECRET_KEY` | Yes | Clerk auth (server) |
| `UPSTASH_REDIS_REST_URL` | Yes | Rate limiting + caching |
| `UPSTASH_REDIS_REST_TOKEN` | Yes | Redis auth |
| `DODO_PAYMENTS_API_KEY` | Yes | Billing |
| `DODO_PAYMENTS_WEBHOOK_SECRET` | Yes | Webhook verification |
| `DODO_STARTER_PRODUCT_ID` | Yes | Starter plan product |
| `DODO_PRO_PRODUCT_ID` | Yes | Pro plan product |
| `DODO_ENVIRONMENT` | Yes | `test_mode` or `live_mode` |
| `NEXT_PUBLIC_GITHUB_OAUTH_CLIENT_ID` | Yes | Private repo access |
| `GITHUB_OAUTH_CLIENT_SECRET` | Yes | GitHub OAuth |
| `RESEND_API_KEY` | Optional | Transactional email |
| `NEXT_PUBLIC_SENTRY_DSN` | Optional | Error tracking |
| `NEXT_PUBLIC_POSTHOG_KEY` | Optional | Product analytics |
| `CDE_KEY` | Optional | Disposable email blocking |
| `ADMIN_SECRET` | Optional | Admin endpoint auth |

---

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Copy env template
cp .env.example .env.local
# Fill in real values (see Environment Variables section)

# 3. Run database migrations
npm run db:generate
npm run db:migrate

# 4. Start dev server
npm run dev
# → http://localhost:3000

# 5. (Optional) For webhook testing
ngrok http 3000
# Update Dodo webhook URL to ngrok URL
```

### Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |
| `npm run test` | Run tests (Vitest) |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:migrate` | Apply migrations to database |

---

*Last updated: May 27, 2026*
