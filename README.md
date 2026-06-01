# Grepit

AI-powered codebase intelligence. Paste a repo URL, get architecture maps, security audits, and an AI that answers from the actual code.

**Live:** [grepit.co](https://grepit.co)

---

## What it does

- Analyzes any GitHub repository or uploaded folder (40+ languages)
- Builds a queryable AI grounded in the actual source code
- Generates architecture diagrams, dependency graphs, and security reports
- Full file explorer with syntax highlighting and inline explanations

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (App Router, React 19) |
| Auth | Clerk (OAuth + email) |
| Database | Neon PostgreSQL + pgvector + Drizzle ORM |
| Cache | Upstash Redis |
| AI | OpenRouter (model IDs set via env only) |
| Billing | Dodo Payments |
| Hosting | Vercel |
| Monitoring | Sentry |
| Email | Resend |
| Analytics | PostHog |

---

## Local Setup

### Prerequisites

- Node.js 18+
- A Neon PostgreSQL database
- Accounts: Clerk, Upstash, OpenRouter (required); Dodo, Resend, PostHog, Sentry (optional for dev)

### Steps

```bash
# 1. Clone and install
git clone <repo-url>
cd Vibo-code-analyst
npm install

# 2. Environment variables
cp .env.example .env.local
# Fill in the required values (see below)

# 3. Database setup
npm run db:generate
npm run db:migrate

# 4. Start dev server
npm run dev
```

App runs at [http://localhost:3000](http://localhost:3000).

### Required Environment Variables

```env
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# Auth (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# AI (OpenRouter — handles chat, diagrams, and embeddings)
OPENROUTER_API_KEY=sk-or-v1-...

# Cache & Rate Limiting (Upstash Redis)
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...

# GitHub OAuth (for private repo access)
NEXT_PUBLIC_GITHUB_OAUTH_CLIENT_ID=...
GITHUB_OAUTH_CLIENT_ID=...
GITHUB_OAUTH_CLIENT_SECRET=...
NEXT_PUBLIC_GITHUB_OAUTH_REDIRECT_URI=http://localhost:3000/api/github-callback
```

### Optional Variables

```env
# Billing (Dodo Payments)
DODO_PAYMENTS_API_KEY=...
DODO_PAYMENTS_WEBHOOK_SECRET=...
DODO_STARTER_PRODUCT_ID=...
DODO_PRO_PRODUCT_ID=...
DODO_ENVIRONMENT=test_mode

# Email (Resend)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=support@grepit.co

# Monitoring (Sentry)
NEXT_PUBLIC_SENTRY_DSN=...
SENTRY_DSN=...

# Analytics (PostHog)
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# Admin
ADMIN_SECRET=...
```

---

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server (hot reload) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |
| `npm run test` | Run tests (Vitest) |
| `npm run db:generate` | Generate Drizzle migration files |
| `npm run db:migrate` | Apply migrations to database |

---

## Project Structure

```
src/
├── app/                    # Next.js App Router pages + API routes
│   ├── api/
│   │   ├── analyze/        # Repository analysis endpoint
│   │   ├── query/stream/   # AI chat (SSE streaming)
│   │   ├── diagram/        # Mermaid diagram generation
│   │   ├── dodo/           # Billing (checkout, webhooks, plan changes)
│   │   ├── profile/        # User profile data
│   │   ├── file/           # GitHub file fetching
│   │   └── share/          # Chat sharing
│   ├── profile/            # Profile page
│   ├── sign-in/            # Auth page
│   ├── share/[token]/      # Public shared chat view
│   └── layout.jsx          # Root layout
├── components/
│   ├── DashboardLayout.jsx # Main analysis dashboard
│   ├── LandingPage.jsx     # Homepage
│   ├── SystemTab.jsx       # Health report + security audit
│   ├── CodeViewer.jsx      # Syntax-highlighted file viewer
│   ├── UpgradeModal.jsx    # Plan management
│   └── ...
├── controllers/
│   ├── analyze.controller.js  # Analysis pipeline logic
│   ├── stream.controller.js   # AI chat logic
│   └── diagram.controller.js  # Diagram generation logic
├── lib/
│   ├── ai.js              # OpenRouter client + fallback routing
│   ├── code-intel.js      # Multi-language code parser
│   ├── codebase-index.js  # Hybrid tree+graph query index
│   ├── embeddings.js      # Vector embedding + pgvector search
│   ├── subscription-gate.js # Access control + entitlements
│   ├── rateLimit.js       # Rate limiting + token budgets
│   ├── billing/dodo.js    # Dodo Payments SDK wrapper
│   ├── analysis-store.js  # Database CRUD for analyses
│   └── email.js           # Transactional email (Resend)
├── config/
│   └── plans.js           # Plan limits, pricing, features
├── db/
│   └── schema.js          # Drizzle schema (all tables)
└── hooks/
    ├── useApi.js          # React Query hooks
    └── usePlan.js         # Current user plan hook
```

---

## Testing Billing Locally

1. Start ngrok: `ngrok http 3000`
2. Update webhook URL in Dodo dashboard to: `https://<your-id>.ngrok-free.app/api/dodo/webhook`
3. Use US test card: `4242 4242 4242 4242` (exp: `06/32`, CVV: `123`)
4. Indian test cards get stuck in "Processing" for server-initiated charges — use US card for plan change testing

---

## Key Architecture Decisions

- **Webhook is source of truth** for subscription state — API routes never grant/revoke entitlements directly
- **Token budget** (not query count) gates AI usage — more predictable cost control
- **Vector embeddings** are the primary retrieval method; keyword index is the fallback
- **Entitlement-based access** — plan is determined by `entitlement_plan` + `entitlement_ends_at`, not subscription status
- **Redis cache** (60s TTL) on subscription lookups — avoids DB hit on every API call
- **Parallel processing** in analysis pipeline — code intel, AI enhancement, and embeddings run concurrently

---

## Documentation

See [GREPIT_DOCUMENTATION.md](./GREPIT_DOCUMENTATION.md) for comprehensive technical documentation covering every system, feature, and integration in detail.

---

## License

Proprietary. All rights reserved.
