# Grepit — Product Overview

## What is Grepit?
AI-powered codebase analysis platform. Upload any GitHub repo (public or private) or ZIP file and get instant architecture diagrams, security reports, AI chat, and code exploration.

## Plans
- **Free:** 2 repos, 15 AI queries/day, basic features
- **Basic ($12/mo):** 5 repos, 100 AI queries/day, PDF export, full security report
- **Pro ($30/mo):** 15 repos, 500 AI queries/day, priority queue, large codebase support

## Billing
- Payment gateway: Razorpay (USD subscriptions)
- Architecture: Entitlement-based state machine (our DB is source of truth, not Razorpay)
- Upgrades: Immediate with proration (Razorpay Update Subscription API)
- Downgrades: Deferred to cycle end (no charge/refund)
- Cancellation: Scheduled locally, Razorpay cancelled on next renewal webhook
- Undo cancel: Just clears DB flag (Razorpay sub never touched during cancel)

## Tech Stack
- Framework: Next.js 16 (App Router)
- Auth: Clerk
- Database: Neon PostgreSQL + Drizzle ORM
- AI: OpenRouter (chat + embedding model IDs in env only)
- Payments: Razorpay Subscriptions API
- Rate limiting: Upstash Redis
- Email: Resend
- Analytics: PostHog
- Error tracking: Sentry
- Hosting: Vercel

## Key Architecture Decisions
- Entitlement table is source of truth for access (not Razorpay status)
- Webhook events stored for idempotency
- Scheduled changes (cancel/downgrade) stored in DB, applied on renewal
- GitHub OAuth tokens don't expire (OAuth App, not GitHub App)
- Usage logs in DB for enforcement, PostHog for analytics
