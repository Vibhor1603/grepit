/**
 * Landing page configuration.
 * Copy: short, direct, no district/city metaphor.
 */

export const SITE_CONFIG = {
  hero: {
    tagline: "Understand any codebase in ",
    taglineAccent: "minutes",
    taglineSuffix: ".",
    subtitle:
      "Paste a GitHub URL or upload a zip. In under a minute you get an architecture map, a health report with severity-tagged findings, a guided reading path, and answers that cite exact file paths and line numbers.",
    subtitleShort:
      "Paste a repo URL or zip. Map, reading path, and cited answers in under a minute.",
     inputPlaceholder: "https://github.com/owner/repository",
    analyzeButton: "Analyze",
    // Medium-sized, fast to analyze: fullstack app · JS library · Python AI
    suggestedRepos: ["dubinc/dub", "pmndrs/zustand", "BerriAI/litellm"],
    stats: [
      { value: "40+", label: "languages parsed" },
      { value: "Under a minute", label: "first map" },
      { value: "No credit card", label: "to start" },
    ],
  },

  features: {
    label: "What you get",
    title: "Everything you need to read a codebase",
    subtitle: "No setup. Paste a link and explore.",
    items: [
      {
        icon: "GitBranch",
        title: "Architecture map",
        desc: "Subsystems and dependency edges visualized so you see how parts connect.",
        color: "#7cc8d4",
      },
      {
        icon: "Workflow",
        title: "Start Here path",
        desc: "An ordered route through entry points, auth, API, and data. Click each step to open the file.",
        color: "var(--c-accent)",
      },
      {
        icon: "MessageSquare",
        title: "Grounded answers",
        desc: "Ask how the system works. Replies cite the specific file and line.",
        color: "#b4a0d4",
      },
      {
        icon: "ShieldCheck",
        title: "Health report",
        desc: "Secrets, unsafe patterns, and missing tests. Severity-tagged with exact lines.",
        color: "#FCA5A5",
      },
      {
        icon: "FolderTree",
        title: "File explorer",
        desc: "Browse source with syntax highlighting, search, and live fetching.",
        color: "#7dd3a8",
      },
      {
        icon: "Sparkles",
        title: "Inline explain",
        desc: "Hover any function or class for a plain explanation of what it does.",
        color: "#7ca8e8",
      },
    ],
  },

  screenshots: {
    label: "See it in action",
    title: "A complete intelligence dashboard",
    items: [
      { src: "/screenshots/screenshot-1.png", alt: "AI chat about the codebase", caption: "AI chat" },
      { src: "/screenshots/screenshot-2.png", alt: "File explorer with syntax highlighting", caption: "Code explorer" },
      { src: "/screenshots/screenshot-3.png", alt: "Architecture map with dependency flows", caption: "Architecture" },
      { src: "/screenshots/screenshot-4.png", alt: "Security audit with severity tags", caption: "Health report" },
      { src: "/screenshots/screenshot-5.png", alt: "System overview with health score", caption: "System" },
    ],
  },

  steps: {
    label: "How it works",
    title: "From a link to a navigable map",
    subtitle: "Four steps. Under a minute. Zero configuration.",
    items: [
      { title: "Paste a link", desc: "GitHub URL or upload a folder. Public or private, any language." },
      { title: "Analysis runs", desc: "40+ file types parsed. Architecture, APIs, and security findings extracted." },
      { title: "Map is built", desc: "Architecture graph and Start Here path appear as analysis completes." },
      { title: "Health report", desc: "Secrets, unsafe patterns, and missing tests, severity-tagged with exact file:line links." },
      { title: "Explore and ask", desc: "Open files, trace flows, and ask questions. Answers cite the actual code." },
    ],
  },

  testimonials: {
    label: "From developers using grepit",
    title: "What people are saying",
    items: [
      { quote: "Dropped a legacy codebase I inherited into grepit and understood the whole thing in 10 minutes. Would have taken me a week otherwise.", name: "Marcus R.", role: "Senior Engineer", avatar: "MR" },
      { quote: "The health report caught a hardcoded API key in a codebase we were about to acquire. That alone justified the tool.", name: "Sofia L.", role: "CTO, Seed-stage startup", avatar: "SL" },
      { quote: "I use grepit every time I start at a new client. The architecture map makes it trivial to explain the system to stakeholders.", name: "Ananya K.", role: "Freelance Engineer", avatar: "AK" },
    ],
  },

  pricing: {
    label: "Pricing",
    title: "Simple, transparent pricing",
    subtitle: "Start free. Upgrade when you need more repositories or queries.",
  },

  cta: {
    title: "Ready when you are.",
    subtitle: "Free to start. No credit card. Paste a repo URL and see the map.",
    button: "Analyse a codebase",
  },
};
