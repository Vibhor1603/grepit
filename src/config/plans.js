/**
 * Centralized pricing and plan configuration.
 * Edit this file to change limits, pricing, or features.
 * All plan-related logic across the app reads from here.
 */

export const PLANS = {
  free: {
    name: 'Free',
    price: '$0',
    period: '/month',
    stripe_price_id: null,

    // Limits
    maxRepos: 3,
    maxAiQueriesPerDay: 30,
    maxDiagramsPerHour: 5,
    maxFileViewsPerHour: 50,
    maxTokensPerDay: 500_000,       // ~$0.28 at current AI provider rates
    maxRepoFiles: 2000,             // Max files in a single repo
    maxChatConversations: 10,

    // Features
    pdfExport: false,
    fullHealthReport: true,
    priorityQueue: false,
    customBranding: false,

    // Rate limits (requests per window)
    rateLimit: {
      analyze: { max: 3, windowMs: 86_400_000 },   // 3/day
      query: { max: 20, windowMs: 3_600_000 },     // 20/hour
      stream: { max: 20, windowMs: 3_600_000 },    // 20/hour
      diagram: { max: 5, windowMs: 3_600_000 },    // 5/hour
      file: { max: 50, windowMs: 3_600_000 },      // 50/hour
    },

    // Display
    cta: 'Get started',
    features: [
      '3 repositories',
      '30 AI queries/day',
      'Full health report',
      'Code explorer',
      'Architecture diagrams',
    ],
  },

  pro: {
    name: 'Pro',
    price: '$12',
    period: '/month',
    stripe_price_id: process.env.STRIPE_PRO_PRICE_ID || null,

    // Limits
    maxRepos: 100,
    maxAiQueriesPerDay: 2000,
    maxDiagramsPerHour: 50,
    maxFileViewsPerHour: 500,
    maxTokensPerDay: 2_000_000,     // ~$0.60
    maxRepoFiles: 10000,
    maxChatConversations: 100,

    // Features
    pdfExport: true,
    fullHealthReport: true,
    priorityQueue: true,
    customBranding: false,

    // Rate limits
    rateLimit: {
      analyze: { max: 30, windowMs: 86_400_000 },
      query: { max: 200, windowMs: 3_600_000 },
      stream: { max: 200, windowMs: 3_600_000 },
      diagram: { max: 50, windowMs: 3_600_000 },
      file: { max: 500, windowMs: 3_600_000 },
    },

    // Display
    cta: 'Upgrade to Pro',
    features: [
      'Unlimited repositories',
      '2000 AI queries/day',
      'Full health report',
      'PDF export',
      'Priority analysis queue',
      'Private repo support',
    ],
  },

  team: {
    name: 'Team',
    price: '$29',
    period: '/month per seat',
    stripe_price_id: process.env.STRIPE_TEAM_PRICE_ID || null,

    // Limits
    maxRepos: 500,
    maxAiQueriesPerDay: 10000,
    maxDiagramsPerHour: 200,
    maxFileViewsPerHour: 2000,
    maxTokensPerDay: 10_000_000,
    maxRepoFiles: 50000,
    maxChatConversations: 500,

    // Features
    pdfExport: true,
    fullHealthReport: true,
    priorityQueue: true,
    customBranding: true,

    // Rate limits
    rateLimit: {
      analyze: { max: 100, windowMs: 86_400_000 },
      query: { max: 500, windowMs: 3_600_000 },
      stream: { max: 500, windowMs: 3_600_000 },
      diagram: { max: 200, windowMs: 3_600_000 },
      file: { max: 2000, windowMs: 3_600_000 },
    },

    // Display
    cta: 'Contact us',
    features: [
      'Everything in Pro',
      '10,000 AI queries/day',
      'Team collaboration',
      'Custom branding',
      'Priority support',
      'SSO (coming soon)',
    ],
  },
};

/**
 * Get plan config by name. Defaults to free.
 */
export function getPlan(planName) {
  return PLANS[planName] || PLANS.free;
}

/**
 * Get rate limit for a specific action based on plan.
 */
export function getPlanRateLimit(planName, action) {
  const plan = getPlan(planName);
  return plan.rateLimit[action] || { max: 10, windowMs: 60_000 };
}

/**
 * Check if a feature is available on a plan.
 */
export function hasFeature(planName, feature) {
  const plan = getPlan(planName);
  return Boolean(plan[feature]);
}

/**
 * Get all plans for display (pricing page).
 */
export function getAllPlans() {
  return Object.entries(PLANS).map(([key, plan]) => ({
    id: key,
    ...plan,
  }));
}
