# Grepit Brand System v2

---

## What This Document Is

This is the brand reference for Grepit.
It defines: what Grepit is, who it is for, what it is not, how it is positioned against competitors, how it speaks, and what it must never say.
Every decision in this document has a reason. If the reason isn't here, the rule isn't here.

---

## What Grepit Is — One Paragraph

Grepit is a codebase understanding tool. You paste a GitHub repository URL, Grepit analyzes the entire codebase, and returns a navigable architecture map, an auto-generated onboarding path through the code, and an AI that answers questions grounded in the actual source files — with specific file paths and line numbers. It is built for developers who need to understand a codebase they didn't write, faster than reading it manually.

---

## The One Problem It Solves

Every developer has spent days — sometimes weeks — trying to understand a codebase before they can contribute to it. The code is all there. The problem is orientation: which file matters, how systems connect, where a request actually goes, why something was built this way.

Grepit solves orientation. Not code generation. Not autocomplete. Orientation.

This distinction is the entire brand.

---

## Core Metaphor: Repositories Are Cities

This metaphor is used throughout the product and all communication.

A repository is not a collection of files. It is a living operational system with:
- Districts (feature domains, module clusters)
- Infrastructure (auth layer, database layer, API layer)
- Traffic (request flows between systems)
- Bottlenecks (high-coupling files, complexity hotspots)
- Operational hubs (files imported by many others — the central nodes)
- Entry points (where all traffic begins)

Grepit builds the map. You navigate the city.

**Where this metaphor appears:**
- Landing page copy
- Onboarding tooltips
- Empty states
- Feature descriptions
- Social media content

**Where this metaphor does not appear:**
- Error messages (use plain direct language)
- Pricing descriptions (be literal)
- Legal/privacy content (be precise)

---

## Who Grepit Is For

### Primary User: The Developer Inheriting A Codebase

Specific situations:
- Joined a new company and is onboarding to an existing product
- Took on a client project and received a repository with no documentation
- Is a freelancer ramping up on a new codebase every few weeks
- Returned to their own project after 6 months away
- Is reviewing a codebase before acquisition or partnership

**What they feel before Grepit:** Overwhelmed. They know the answer is somewhere in the code. They don't know where to start. They don't want to bother colleagues with basic questions. They're reading file after file without a map.

**What they feel after Grepit:** Oriented. They know what the major systems are, how they connect, and where to start. They can ask specific questions and get answers that cite actual code.

**What they are not:** Beginners learning to code. Grepit is not an educational tool. The user already understands code — they just don't understand this specific codebase yet.

### Secondary User: The Engineering Manager Or Tech Lead

Specific situations:
- Needs to audit a codebase before making architectural decisions
- Is onboarding a new team member and wants to share an orientation map
- Needs to explain the system to a non-technical stakeholder
- Is reviewing a contractor's work

**What they need:** A fast, accurate overview of what exists and how it connects — without reading every file themselves.

### Who Grepit Is Not For (explicitly)

- Developers who want AI to write code for them → use Cursor or GitHub Copilot
- Developers who want autocomplete → use Copilot
- Non-technical people who want to understand software in general → too advanced
- Enterprise teams who need SOC 2 compliance and custom contracts → not yet

---

## Positioning Against Competitors

This section exists because "we're different" is not enough. Every category below has a specific, honest answer.

### vs. Claude Code / GitHub Copilot / Cursor

**Their focus:** Writing, editing, and generating code inside the IDE.
**Grepit's focus:** Understanding an existing codebase from the outside — before you write a single line.

**Key difference:** Cursor can answer questions about code if you paste it in. Grepit indexes the entire repository once and maintains a persistent architecture understanding across sessions. You don't re-explain the codebase every time.

**Honest overlap:** A developer using Cursor heavily can get some of what Grepit offers by pasting files and asking questions. Grepit's advantage is that it does this automatically for the entire repository, builds a navigable visual map, and generates the onboarding path without any prompting. Cursor requires the developer to know what to ask. Grepit answers questions the developer didn't know to ask.

**What to never say:** "Better than Cursor." They serve different moments. Say: "Cursor is for writing code. Grepit is for understanding systems."

### vs. DeepWiki

**Their focus:** Auto-generating wiki documentation from a repository.
**Grepit's focus:** Interactive architectural understanding — the ability to ask questions, navigate the graph, and trace request flows in real time.

**Key difference:** DeepWiki produces a document. Grepit produces an interactive environment. Reading a wiki is passive. Navigating Grepit's architecture canvas is active exploration.

**What to never say:** "DeepWiki but better." Say: "DeepWiki gives you a document. Grepit gives you a map you can navigate."

### vs. Sourcegraph

**Their focus:** Enterprise-grade code search across large multi-repository environments.
**Grepit's focus:** Architecture understanding and onboarding for a single repository.

**Key difference:** Sourcegraph is for finding code. Grepit is for understanding what that code does, how it connects, and how to navigate it.

**Honest overlap:** Both involve searching a codebase. Sourcegraph wins on search depth and multi-repo scale. Grepit wins on architecture visualization, onboarding paths, and AI-powered explanation.

**Who to target:** Individuals and small teams, not enterprises. Sourcegraph's customer is an enterprise engineering org. Grepit's customer is a single developer or a small team.

### vs. Glean

**Their focus:** Enterprise knowledge search across all tools (Slack, Notion, Jira, code, docs).
**Grepit's focus:** Deep understanding of a single codebase.

**They are not direct competitors.** Glean is a horizontal knowledge layer. Grepit is a vertical code intelligence tool. A company might use both.

---

## Positioning Statement

For developers who inherit codebases they didn't write, Grepit is the tool that replaces days of manual reading with a navigable architecture map, an AI that answers questions grounded in the actual code, and a guided onboarding path — so you understand the system before you touch it.

---

## Primary Headline Options

Use one of these as the hero headline. Do not write variations that introduce new concepts.

1. `Understand any codebase in minutes.`
2. `The map before the code.`
3. `Finally understand how the system actually works.`

Headline 1 is the default. Clearest value proposition. No metaphor required.

**Rules for the headline:**
- Never mention AI in the headline
- Never use "powered by"
- Never use "next-generation" or "revolutionary"
- Never use a question as the headline

---

## How Grepit Speaks — Voice And Tone

### The Voice

Grepit speaks like a senior engineer who is also a clear writer. Precise, direct, technically accurate, no hype. They respect the reader's intelligence and don't over-explain. They don't use exclamation marks to signal enthusiasm. Their enthusiasm is in the quality of what they built.

### Tone By Context

| Context | Tone | Example |
|---|---|---|
| Landing page | Confident, direct, no fluff | "Understand any codebase in minutes." |
| Onboarding | Guiding, practical, specific | "Start here — this is the entry point for all user requests." |
| Error messages | Clear, honest, actionable | "Repository too large. Grepit supports up to 5,000 source files." |
| Empty states | Inviting, specific to context | "Paste a GitHub URL to see your architecture map." |
| AI responses | Precise, always citing files | "The authentication flow begins in src/middleware.js line 23." |
| Pricing page | Literal, no jargon | "3 repositories. 150,000 AI tokens per day. PDF export not included." |
| Toast notifications | Minimal, no personality | "Analysis complete." / "Repository deleted." / "Link copied." |

### What Grepit Never Says

| Never say | Say instead |
|---|---|
| "Powered by AI" | (say nothing — the AI is how it works, not what it is) |
| "Cutting-edge" | (say nothing — specifics prove it) |
| "Revolutionary" | (say nothing) |
| "Unlock the power of" | "Understand your codebase" |
| "Seamlessly" | (remove the word entirely) |
| "Robust" | (say what it specifically does) |
| "Next-generation" | (say nothing) |
| "Dive into" | "Start with" or "Open" |
| "ChatGPT for code" | "AI that reads your actual codebase" |
| "Magic" | (say what it technically does) |
| "Smart" as an adjective for features | (say what it specifically does) |

### Formatting Rules For Copy

- Sentence case for all headings and CTAs, not Title Case
- One space after periods
- No Oxford comma in UI copy (use it in documentation)
- File paths always in monospace: `src/lib/code-intel.js`
- Numbers under 10 spelled out in sentences, numerals in UI elements
- Avoid passive voice in product copy: "Grepit analyzes" not "is analyzed by"

---

## Naming And Capitalization

| Item | Correct |
|---|---|
| Product name | Grepit (not GREPIT, not grepit) |
| Architecture canvas | "architecture canvas" (lowercase, no trademark symbol) |
| Start Here path | "Start Here path" (Start Here is always capitalized as a proper name) |
| Health report | "health report" (lowercase) |
| AI chat | "AI chat" (not "assistant", not "chatbot") |
| The analysis | "analysis" (not "scan", not "audit" except in health report context) |

---

## Trust — How It Is Expressed In Communication

Trust is not communicated through privacy policy pages. It is expressed through specific, factual statements placed near the actions that require trust.

### Statements That Must Appear In Context

**Near the URL input on landing page:**
`"Your code is analyzed on isolated serverless functions. No human sees your repository."`

**When connecting a private repository:**
`"Private repository — analyzed with your OAuth token, stored encrypted, deleted on request."`

**When analysis completes:**
`"Analysis stored in your account. Delete it anytime from your dashboard."`

**In onboarding, first session:**
`"Grepit stores your repository index so you don't re-analyze every session. You control what stays and what gets deleted."`

### What Grepit Does Not Claim

Never claim:
- "We never store your code" — it does store an index and embeddings
- "100% private" — it uses third-party infrastructure (Vercel, Neon)
- "Enterprise-grade security" — until SOC 2 is achieved

Be specific and accurate. Vague trust statements are worse than none.

---

## Emotional Goal

A developer who uses Grepit for the first time should finish their session thinking:

**"I finally understand this codebase."**

Not:
- "That was a cool demo."
- "Interesting AI tool."
- "I could see how this might be useful."

The measure of success is orientation, not impression.
Every product and brand decision should be evaluated against this goal.

---

## Long-Term Direction

Grepit is not an AI chatbot that happens to read code.
It is a system understanding tool that uses AI as the mechanism.

The progression:

**Now:** Repository understanding — one repo, one developer, fast orientation.

**Next:** Engineering memory — the architecture knowledge persists and accumulates. Re-analyzing after changes shows what shifted. The Start Here path updates. The team builds shared orientation over time.

**Later:** Organizational intelligence — multiple repositories, shared team knowledge, understanding that spans systems, teams, and time.

This progression should be visible in how Grepit talks about itself today. The language is already that of a system, not a chatbot. The "repositories are cities" metaphor scales to an organization being a network of cities — infrastructure, districts, interconnected systems.

This is the direction. Build toward it in every feature decision.

---

## Anti-Patterns — Things That Undermine The Brand

| Anti-pattern | Why it hurts | What to do instead |
|---|---|---|
| AI-first messaging | Positions Grepit as a GPT wrapper, invites comparison to ChatGPT | Lead with the problem solved and the outcome, not the technology |
| Feature list marketing | Makes Grepit look like a dashboard tool | Lead with the experience and the specific moment of value |
| Generic loading states | Undermines the "alive system" feeling | Show real work happening — files parsed, nodes appearing |
| Generic error messages | Breaks trust when something goes wrong | Every error names the specific cause and offers a specific fix |
| Over-designed animations | Makes the product feel like a demo, not a tool | Animation explains, never decorates |
| Comparison tables that position against Cursor | Cursor users aren't the target for switching — they use both | Target people who don't use Cursor yet, or who use it for a different job |
