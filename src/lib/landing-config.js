/**
 * Landing page configuration.
 * Edit this file to change any text, features, pricing, screenshots, or testimonials
 * displayed on the homepage. No need to touch the component code.
 */

export const SITE_CONFIG = {
  // Hero section
  hero: {
    tagline: 'Talk to any codebase.',
    taglineAccent: 'any', // word highlighted in accent color
    subtitle: 'Paste a link. Get architecture maps, security audits, and an AI that answers from the actual code.',
    inputPlaceholder: 'https://github.com/owner/repository or upload a folder',
    analyzeButton: 'Analyze',
    suggestedRepos: ['shadcn-ui/ui', 'pmndrs/zustand', 'hono-js/hono', 't3-oss/create-t3-app', 'colinhacks/zod'],
    stats: [
      { value: '40+', label: 'languages' },
      { value: '< 1m', label: 'analysis time' },
      { value: 'Free', label: 'to start' },
    ],
  },

  // Features section
  features: {
    label: 'Capabilities',
    title: 'Everything you need to read a codebase',
    subtitle: 'No setup. No config files. Just paste a link and explore.',
    items: [
      {
        icon: 'MessageSquare',
        title: 'AI Chat',
        desc: 'Ask anything about the code. Streaming answers grounded in real files — not hallucinated.',
        color: '#E0FC10',
      },
      {
        icon: 'GitBranch',
        title: 'Architecture Map',
        desc: 'Layers, modules, dependency graphs, and call flows — visualized automatically.',
        color: '#7cc8d4',
      },
      {
        icon: 'Sparkles',
        title: 'Inline Code Explain',
        desc: 'Hover any function or class in the viewer. Get a plain-English explanation instantly.',
        color: '#b4a0d4',
      },
      {
        icon: 'ShieldCheck',
        title: 'Security Audit',
        desc: 'Hardcoded secrets, unsafe patterns, missing tests — severity-tagged and linked to exact lines.',
        color: '#ef4444',
      },
      {
        icon: 'Workflow',
        title: 'AI Diagrams',
        desc: 'Generate architecture and flow diagrams on demand. Dark-themed, always up to date.',
        color: '#7ca8e8',
      },
      {
        icon: 'FolderTree',
        title: 'Full File Explorer',
        desc: 'Browse source code with syntax highlighting, search, and live file fetching.',
        color: '#7dd3a8',
      },
    ],
  },

  // Screenshots / product showcase
  screenshots: {
    label: 'See it in action',
    title: 'A complete intelligence dashboard',
    items: [
      { src: '/screenshots/screenshot-1.png', alt: 'AI Chat — ask anything about the codebase', caption: 'AI Chat' },
      { src: '/screenshots/screenshot-2.png', alt: 'File explorer with syntax highlighting', caption: 'Code Explorer' },
      { src: '/screenshots/screenshot-3.png', alt: 'Architecture map with dependency flows', caption: 'Architecture' },
      { src: '/screenshots/screenshot-4.png', alt: 'Security audit with severity tags', caption: 'Security Audit' },
      { src: '/screenshots/screenshot-5.png', alt: 'System overview with health score', caption: 'System' },

    ],
  },

  // How it works
  steps: {
    label: 'How it works',
    title: 'From link to full understanding',
    subtitle: 'Four steps. Under a minute. Zero configuration.',
    items: [
      { title: 'Paste a link', desc: 'Repo URL or upload a folder. Public or private, any language.' },
      { title: 'Instant analysis', desc: '40+ file types parsed. Architecture, APIs, security — all extracted in seconds.' },
      { title: 'AI enrichment', desc: 'LLM-powered summaries, insights, and natural-language explanations layered on top.' },
      { title: 'Explore & ask', desc: 'Interactive dashboard. Chat with the AI. Export reports. Understand everything.' },
    ],
  },

  // Testimonials
  testimonials: {
    label: 'Trusted by developers',
    title: 'What people are saying',
    items: [
      { quote: 'Dropped a legacy codebase I inherited into grepit and understood the whole thing in 10 minutes. Would have taken me a week otherwise.', name: 'Marcus R.', role: 'Senior Engineer', avatar: 'MR' },
      { quote: 'The security audit caught a hardcoded API key in a codebase we were about to acquire. That alone justified the tool.', name: 'Sofia L.', role: 'CTO, Seed-stage startup', avatar: 'SL' },
      { quote: 'I use grepit every time I start at a new client. The architecture map makes it trivially easy to explain the codebase to stakeholders.', name: 'Ananya K.', role: 'Freelance Engineer', avatar: 'AK' },
    ],
  },

  // Pricing
  pricing: {
    label: 'Pricing',
    title: 'Simple, transparent pricing',
    subtitle: 'Start free. Upgrade when you need more repositories, queries, or advanced features.',
  },

  // CTA section
  cta: {
    title: 'Ready to try it?',
    subtitle: 'Free to start. No credit card. No install. Just paste a repo URL and see what grepit finds.',
    button: 'Analyze a codebase',
  },
};
