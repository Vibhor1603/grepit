/**
 * Landing page configuration.
 * Edit this file to change any text, features, pricing, screenshots, or testimonials
 * displayed on the homepage. No need to touch the component code.
 */

export const SITE_CONFIG = {
  // Hero section
  hero: {
    tagline: 'Understand any codebase instantly.',
    taglineAccent: 'codebase', // word highlighted in accent color
    subtitle: 'Paste a GitHub link. Get architecture maps, AI-powered insights, security audits, and a chat that actually knows the code.',
    inputPlaceholder: 'https://github.com/owner/repo',
    analyzeButton: 'Analyze',
    suggestedRepos: ['facebook/react', 'vercel/next.js', 'denoland/deno'],
    stats: [
      { value: '40+', label: 'languages' },
      { value: '< 30s', label: 'analysis time' },
      { value: 'Free', label: 'for public repos' },
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
        desc: 'Generate architecture and flow diagrams on demand. Mermaid-powered, dark-themed.',
        color: '#7ca8e8',
      },
      {
        icon: 'FolderTree',
        title: 'Full File Explorer',
        desc: 'Browse source code with syntax highlighting, search, and live GitHub fetching.',
        color: '#7dd3a8',
      },
    ],
  },

  // Screenshots / product showcase
  screenshots: {
    label: 'See it in action',
    title: 'A complete intelligence dashboard',
    items: [
      { src: '/screenshots/dashboard-chat.png', alt: 'AI Chat — ask anything about the codebase', caption: 'AI Chat' },
      { src: '/screenshots/dashboard-explore.png', alt: 'File explorer with syntax highlighting', caption: 'Code Explorer' },
      { src: '/screenshots/dashboard-architecture.png', alt: 'Architecture map with dependency flows', caption: 'Architecture' },
      { src: '/screenshots/dashboard-security.png', alt: 'Security audit with severity tags', caption: 'Security Audit' },
    ],
  },

  // How it works
  steps: {
    label: 'How it works',
    title: 'From link to full understanding',
    subtitle: 'Four steps. Under a minute. Zero configuration.',
    items: [
      { title: 'Paste a link', desc: 'GitHub URL or upload a ZIP. Public or private, any language.' },
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
      { quote: 'Dropped a legacy codebase I inherited into Vibo and understood the whole thing in 10 minutes. Would have taken me a week otherwise.', name: 'Marcus R.', role: 'Senior Engineer', avatar: 'MR' },
      { quote: 'The security audit caught a hardcoded API key in a repo we were about to acquire. That alone justified the tool.', name: 'Sofia L.', role: 'CTO, Seed-stage startup', avatar: 'SL' },
      { quote: 'I use Vibo every time I start at a new client. The architecture map makes it trivially easy to explain the codebase to stakeholders.', name: 'Ananya K.', role: 'Freelance Engineer', avatar: 'AK' },
    ],
  },

  // Pricing
  pricing: {
    label: 'Pricing',
    title: 'Simple, transparent pricing',
    subtitle: 'Start free. Upgrade when you need private repos and unlimited AI.',
    plans: [
      {
        name: 'Free',
        price: '$0',
        period: 'forever',
        cta: 'Get started free',
        featured: false,
        features: [
          'Public repos only',
          'Unlimited analyses',
          'Full dashboard access',
          'AI chat — 20 queries/day',
          'Markdown export',
        ],
      },
      {
        name: 'Pro',
        price: '$12',
        period: '/month',
        cta: 'Subscribe for $12/mo',
        featured: true,
        features: [
          'Everything in Free',
          'Private repos',
          'Unlimited AI chat',
          'PDF export & sharing',
          'Priority analysis queue',
          'Health badge for README',
        ],
      },
    ],
  },

  // CTA section
  cta: {
    title: 'Ready to try it?',
    subtitle: 'Free for public repos. No credit card. No install. Just paste a GitHub URL and see what Vibo finds.',
    button: 'Analyze a repo',
  },
};
