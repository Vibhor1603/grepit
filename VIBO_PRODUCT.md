# Vibo — Product Overview

Vibo is an AI-powered tool that helps developers understand any codebase instantly. Paste a GitHub link or upload a ZIP file, and Vibo gives you a full breakdown of the project — its architecture, components, APIs, security issues, and more — without reading a single line of code first.

---

## What Vibo Does

You give it a repository. It gives you a complete picture of what that repository is, how it's structured, and how to work with it.

Works for any codebase — JavaScript, Python, Go, Java, Rust, and more. Public or private GitHub repos, or local projects uploaded as a ZIP.

---

## Core Features

### Architecture Map
Detects the layers of a project — frontend, API, data, config, documentation — and shows how they connect. See which modules exist, how many files are in each, and how they depend on each other.

### AI Query Console
Ask plain-English questions about the codebase and get answers grounded in the actual code. Things like:
- "What does this repo do?"
- "Where is authentication handled?"
- "What are the riskiest files?"
- "How does the API flow work?"

The AI uses real file contents and symbols to answer — it doesn't guess. Authenticated users get 20 queries/min; anonymous users get 5.

### API Explorer
Automatically detects all API endpoints. Shows the HTTP method, route path, which file handles it, and the inferred request and response shapes.

### Component Breakdown
For frontend projects, maps out every UI component — what props it accepts, what it renders, and where it's used across the codebase.

### Security & Quality Audit
Flags potential issues automatically:
- Hardcoded secrets or API keys
- Unsafe code patterns (eval, dangerouslySetInnerHTML, broad SQL)
- Missing tests or test coverage
- Duplicate code and unused symbols
- Heavy or overly complex files
- Performance risks

### Setup Guide
Auto-generates local development instructions for any project. Lists required tools, environment variables, and steps to get it running.

### Export Reports
Generate a clean Markdown report of the full analysis — useful for sharing with teammates, writing documentation, or onboarding new developers.

---

## How You Use It

1. Go to the landing page
2. Paste a GitHub URL or upload a ZIP file
3. Click Analyze
4. Explore the dashboard

If the repo is private, Vibo will ask you to sign in with GitHub first. After that, it can access private repos using your GitHub token.

---

## The Dashboard

Once analysis is complete, you land on a dashboard with a sidebar of tabs. The tabs adapt to what was found — if no API endpoints were detected, the API tab won't appear.

**Always visible:**
- Overview — project summary, tech stack, stat cards, quick links
- File Explorer — browse the full file tree, read source code, get AI file insights
- Security Audit — all issues severity-tagged, with links to the relevant files

**Shown when relevant:**
- Architecture — layers, modules, dependency graph
- API Explorer — all detected endpoints with request/response shapes
- UI Components — component map with props, children, usage sites
- Setup Guide — auto-generated local dev instructions

Every tab is cross-linked. Click a file in the Security Audit and it opens in the File Explorer. Everything connects.

---

## Pricing

| Plan | Price | What you get |
|------|-------|-------------|
| Free | $0/forever | Public repos, unlimited analyses, all dashboard views, Markdown export, 20 AI queries/day |
| Pro | $19/month | Everything free + private repos, PDF export, unlimited AI, health badge, webhook re-analysis |
| Team | $49/month | Everything Pro + 5 members, shared history, priority AI, SSO |

---

## Inputs Supported

- **GitHub URL** — any public repo, or private repos when signed in
- **ZIP file** — upload a local project (max 50MB)

Supports 40+ file types including JS, TS, Python, Go, Java, Rust, CSS, HTML, JSON, YAML, Markdown, SQL, and more.

---

## What's Been Removed

These features were cut to reduce complexity and improve focus:

- **ELI5 mode** — removed. The AI console handles beginner questions naturally.
- **Symbol Explorer tab** — removed from the dashboard. Symbol data still powers the AI and search behind the scenes.
- **Flow Analysis tab** — removed. The diagrams were unreliable without a real AST parser and were causing confusion.
- **Audience sections on landing** — removed. Single clear CTA converts better.

---

## What Makes It Different

Most code tools require you to already understand the codebase to use them. Vibo is designed for the moment *before* that — when you're looking at something new and need to get up to speed fast. It reads the code so you don't have to start from zero.
