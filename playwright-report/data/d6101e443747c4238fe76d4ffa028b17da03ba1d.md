# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.test.js >> E2E Smoke Tests >> should show sign in button
- Location: tests/e2e/smoke.test.js:10:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: /Sign in/i }).first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('button', { name: /Sign in/i }).first()

```

```yaml
- navigation:
  - button "grepit home":
    - img "grepit logo"
    - text: grep it
  - link "Overview":
    - /url: "#overview"
  - link "Product":
    - /url: "#pipeline"
  - link "Pricing":
    - /url: "#pricing"
  - link "FAQ":
    - /url: /faq
  - button "Switch to dark mode"
- heading "Understand any codebase in minutes." [level=1]
- paragraph: Paste a GitHub URL or upload a zip. In under a minute you get an architecture map, a health report with severity-tagged findings, a guided reading path, and answers that cite exact file paths and line numbers.
- tablist "Input mode":
  - tab "URL" [selected]
  - tab "Upload"
- textbox "GitHub repository URL":
  - /placeholder: https://github.com/owner/repository
- button "Analyze" [disabled]
- paragraph: Drop .zip or folder
- paragraph: Max 50 MB
- paragraph: Try a repo
- button "dubinc/dub"
- button "pmndrs/zustand"
- button "BerriAI/litellm"
- region "Supported languages and frameworks":
  - paragraph: 40+ languages and frameworks
  - text: JavaScript TypeScript Python Go Rust Java React Next.js Vue Django Rails Flutter Docker GraphQL Kotlin Swift Ruby PHP Terraform Elixir JavaScript TypeScript Python Go Rust Java React Next.js Vue Django Rails Flutter Docker GraphQL Kotlin Swift Ruby PHP Terraform Elixir React Next.js Vue Django Rails Flutter Docker GraphQL Kotlin Swift Ruby PHP Terraform Elixir JavaScript TypeScript Python Go Rust Java React Next.js Vue Django Rails Flutter Docker GraphQL Kotlin Swift Ruby PHP Terraform Elixir JavaScript TypeScript Python Go Rust Java
- paragraph: Why grepit
- heading "Not for writing code. For understanding it." [level=2]
- paragraph: Cursor, Copilot, and Claude Code help you write code inside an editor. Grepit helps you inherit, audit, and explain a codebase you did not write, with a persistent map and answers grounded in the full repo.
- paragraph: What grepit is not
- paragraph: IDEs and AI assistants
- paragraph: Built to write and edit code
- list:
  - listitem: You re-paste files and folders every session
  - listitem: Answers guess from whatever context fits in the window
  - listitem: No persistent map of how the repo connects
  - listitem: No default file:line citations
  - listitem: Heavy users burn 3 to 5M tokens per deep session
- paragraph: What grepit is
- paragraph: grepit
- paragraph: Built to read and navigate codebases
- list:
  - listitem: Paste a URL once. The full repo is indexed
  - listitem: Answers pull from indexed source, not your clipboard
  - listitem: Live architecture map and Start Here path
  - listitem: Health report with severity-tagged findings at file:line
  - listitem: Every reply cites src/path:line
  - listitem: Typical query uses under 5K tokens
- paragraph: Tokens per deep question
- paragraph: Others
- paragraph: ~200K+
- paragraph: grepit
- paragraph: <5K
- paragraph: Time to first map
- paragraph: Others
- paragraph: Manual hours
- paragraph: grepit
- paragraph: <60 sec
- paragraph: Monthly cost (active dev)
- paragraph: Others
- paragraph: $60 to $125
- paragraph: grepit
- paragraph: From $12
- region "Clear privacy. No theater.":
  - paragraph: Privacy
  - heading "Clear privacy. No theater." [level=2]
  - paragraph: "Simple promise: only authorized access, minimal retrieval data, and real deletion controls."
  - link "Read full privacy policy":
    - /url: /privacy
  - paragraph: Authorize
  - paragraph: Only repos/files you connect.
  - paragraph: Infer
  - paragraph: Minimal context, not model training.
  - paragraph: Delete
  - paragraph: Analysis/account removal purges linked data.
- paragraph: Token savings
- paragraph: Deep codebase questions normally burn hundreds of thousands of tokens per session. Grepit indexes once and answers from that index, so each query stays small.
- paragraph: 0% fewer tokens
- paragraph: Index once. Query with under 5K tokens each time.
- text: Questions / week 12
- slider "Questions / week 12": "12"
- paragraph: ~2.3M tokens saved / week
- text: Claude Code $125/mo Cursor $60/mo Copilot $19/mo grepit $12/mo
- paragraph: What you can do
- heading "Go from stranger to expert." [level=2]
- paragraph: Grepit is for engineers who inherit a repo and need to ship, not re-paste files into chat and hope the answer is right.
- button "01 · Orient Know where to start":
  - paragraph: 01 · Orient
  - paragraph: Know where to start
- button "02 · Trace Follow any request path":
  - paragraph: 02 · Trace
  - paragraph: Follow any request path
- button "03 · Prove Answer with file:line proof":
  - paragraph: 03 · Prove
  - paragraph: Answer with file:line proof
- text: grepit dashboard 01 · Orient
- paragraph: "Get a Start Here path through the files that matter: auth, routing, data layer. No README roulette."
- paragraph: Start here path
- text: "1"
- paragraph: src/app/layout.tsx
- paragraph: App shell + providers
- text: "2"
- paragraph: src/middleware.ts
- paragraph: Route protection
- text: "3"
- paragraph: src/server/db/schema.ts
- paragraph: Data model
- heading "An onboarding path through the system." [level=2]
- paragraph: "Grepit auto-generates a reading order through the repo: boot surface, auth gate, data layer, API, and billing. Each step opens the file with context on why it matters."
- paragraph: onboarding traversal
- paragraph: 01 / 06
- list:
  - listitem:
    - button "01 src/app/layout.tsx root layout, providers, fonts":
      - text: 01 src/app/layout.tsx
      - paragraph: root layout, providers, fonts
  - listitem:
    - button "02 src/middleware.ts Clerk auth gate + route protection":
      - text: 02 src/middleware.ts
      - paragraph: Clerk auth gate + route protection
  - listitem:
    - 'button "03 src/server/db/schema.ts Drizzle schema: users, subscriptions"':
      - text: 03 src/server/db/schema.ts
      - paragraph: "Drizzle schema: users, subscriptions"
  - listitem:
    - button "04 src/server/api/router.ts tRPC routers grouped by domain":
      - text: 04 src/server/api/router.ts
      - paragraph: tRPC routers grouped by domain
  - listitem:
    - button "05 src/app/(dashboard)/page.tsx first authenticated surface":
      - text: 05 src/app/(dashboard)/page.tsx
      - paragraph: first authenticated surface
  - listitem:
    - button "06 src/server/actions/stripe.ts webhook consumer + subscription writes":
      - text: 06 src/server/actions/stripe.ts
      - paragraph: webhook consumer + subscription writes
- text: src/app/layout.tsx boot surface
- code: "export default function RootLayout({ children, }: { children: React.ReactNode }) { return ( <ClerkProvider> <html lang=\"en\"> <body className={inter.className}> <Providers>{children}</Providers> </body> </html> </ClerkProvider> ); }"
- text: preview · static excerpt auto-cycle on
- paragraph: example onboarding · live data shown when you analyze a repository
- paragraph: From developers using grepit
- heading "What people are saying" [level=2]
- article:
  - paragraph: Dropped a legacy codebase I inherited into grepit and understood the whole thing in 10 minutes. Would have taken me a week otherwise.
  - text: MR
  - paragraph: Marcus R.
  - paragraph: Senior Engineer
- article:
  - paragraph: The health report caught a hardcoded API key in a codebase we were about to acquire. That alone justified the tool.
  - text: SL
  - paragraph: Sofia L.
  - paragraph: CTO, Seed-stage startup
- article:
  - paragraph: I use grepit every time I start at a new client. The architecture map makes it trivial to explain the system to stakeholders.
  - text: AK
  - paragraph: Ananya K.
  - paragraph: Freelance Engineer
- article:
  - paragraph: Dropped a legacy codebase I inherited into grepit and understood the whole thing in 10 minutes. Would have taken me a week otherwise.
  - text: MR
  - paragraph: Marcus R.
  - paragraph: Senior Engineer
- article:
  - paragraph: The health report caught a hardcoded API key in a codebase we were about to acquire. That alone justified the tool.
  - text: SL
  - paragraph: Sofia L.
  - paragraph: CTO, Seed-stage startup
- article:
  - paragraph: I use grepit every time I start at a new client. The architecture map makes it trivial to explain the system to stakeholders.
  - text: AK
  - paragraph: Ananya K.
  - paragraph: Freelance Engineer
- article:
  - paragraph: Dropped a legacy codebase I inherited into grepit and understood the whole thing in 10 minutes. Would have taken me a week otherwise.
  - text: MR
  - paragraph: Marcus R.
  - paragraph: Senior Engineer
- article:
  - paragraph: The health report caught a hardcoded API key in a codebase we were about to acquire. That alone justified the tool.
  - text: SL
  - paragraph: Sofia L.
  - paragraph: CTO, Seed-stage startup
- article:
  - paragraph: I use grepit every time I start at a new client. The architecture map makes it trivial to explain the system to stakeholders.
  - text: AK
  - paragraph: Ananya K.
  - paragraph: Freelance Engineer
- heading "Start free. Upgrade when scale demands it." [level=2]
- paragraph: No credit card required to begin. Limits are explicit. Upgrades take effect instantly. Cancel anytime from your profile.
- text: Free $0/month
- list:
  - listitem: 2 repositories
  - listitem: 150K tokens/day
  - listitem: Basic health report
  - listitem: Code explorer
  - listitem: Architecture diagrams
- button "Current plan" [disabled]
- text: Starter recommended $12/month
- list:
  - listitem: 3 repositories
  - listitem: 750K tokens/day
  - listitem: Full security report
  - listitem: PDF export
  - listitem: Unlimited re-analysis
  - listitem: Unlimited sharing
- button "Upgrade to Starter"
- text: Pro $29/month
- list:
  - listitem: Everything in Starter
  - listitem: 3M tokens/day
  - listitem: 7 repositories
  - listitem: Large codebase support
  - listitem: Priority analysis queue
  - listitem: Priority support
- button "Go Pro"
- paragraph: all plans support private repositories · cancel anytime · taxes calculated at checkout
- heading "Questions engineers ask first." [level=2]
- paragraph: Straight answers before you pay for a tool.
- list:
  - listitem:
    - button "What does grepit actually do?" [expanded]
    - paragraph: It parses your repo, builds an architecture map, and answers questions grounded in source code with file paths and line numbers.
  - listitem:
    - button "Is my code stored?"
    - paragraph: Analysis runs in isolated, short-lived serverless workers. We keep only the structural outputs needed for features (map, findings, grounded snippets), scoped to your account. Repositories are private by default, and no human reviews your code.
  - listitem:
    - button "Does it work on private repos?"
    - paragraph: Yes. Connect GitHub once via OAuth. Any repo you can access becomes analyzable under the same isolated runtime.
  - listitem:
    - button "How long does analysis take?"
    - paragraph: Most repos finish in under a minute. Larger codebases scale with file count. The map starts appearing within the first few hundred milliseconds.
  - listitem:
    - button "What languages are supported?"
    - paragraph: "40+ languages and frameworks: TypeScript, JavaScript, Python, Go, Rust, Java, Ruby, PHP, C/C++, C#, Swift, Kotlin, Elixir, and more."
- heading "Paste a repository. See the architecture." [level=2]
- paragraph: Free to start. Paste a repo URL and get a map, a reading path, and cited answers in under a minute.
- button "Analyze a codebase"
- contentinfo:
  - img "grepit logo"
  - text: grepit
  - paragraph: Understand any codebase in minutes. Paste a repository, see the system.
  - paragraph: "2026"
  - paragraph: Product
  - list:
    - listitem:
      - link "Pricing":
        - /url: /#pricing
    - listitem:
      - link "FAQ":
        - /url: /faq
  - paragraph: Legal
  - list:
    - listitem:
      - link "Privacy":
        - /url: /privacy
    - listitem:
      - link "Terms":
        - /url: /terms
    - listitem:
      - link "Refunds":
        - /url: /refund
  - paragraph: Connect
  - list:
    - listitem:
      - link "Sign in":
        - /url: /sign-in
    - listitem:
      - link "Get started":
        - /url: /sign-in?mode=signup
    - listitem:
      - link "Contact":
        - /url: mailto:support@grepit.co
  - text: © 2026 grepit · all rights reserved
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('E2E Smoke Tests', () => {
  4  |   test('should load landing page', async ({ page }) => {
  5  |     await page.goto('/');
  6  |     await expect(page).toHaveTitle(/grepit/i);
  7  |     await expect(page.getByRole('heading', { name: /Understand/i })).toBeVisible();
  8  |   });
  9  | 
  10 |   test('should show sign in button', async ({ page }) => {
  11 |     await page.goto('/');
  12 |     const signInButton = page.getByRole('button', { name: /Sign in/i }).first();
> 13 |     await expect(signInButton).toBeVisible();
     |                                ^ Error: expect(locator).toBeVisible() failed
  14 |   });
  15 | });
  16 | 
```