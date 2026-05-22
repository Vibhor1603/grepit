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
    amount_paise: 0,

    // Limits
    maxRepos: 1,
    maxAiQueriesPerDay: 15,
    maxDiagramsPerHour: 10,
    maxFileViewsPerHour: 30,
    maxTokensPerDay: 50_000,
    maxRepoFiles: 2000,
    maxChatConversations: 5,
    maxMessagesPerChat: 12,

    // Features
    pdfExport: false,
    privateRepos: true,
    fullSecurityReport: false,
    priorityQueue: false,
    customBranding: false,

    // Rate limits (requests per window)
    rateLimit: {
      analyze: { max: 3, windowMs: 86_400_000 },   // 3/day
      query: { max: 15, windowMs: 3_600_000 },     // 15/hour
      stream: { max: 15, windowMs: 3_600_000 },    // 15/hour
      diagram: { max: 3, windowMs: 3_600_000 },    // 3/hour
      file: { max: 30, windowMs: 3_600_000 },      // 30/hour
    },

    // Display
    cta: 'Get started free',
    featured: false,
    features: [
      '1 repository',
      '15 AI queries/day',
      'starter health report',
      'Code explorer',
      'Architecture diagrams',
    ],
  },

  starter: {
    name: 'starter',
    price: '$12',
    period: '/month',
    amount_paise: 1200,

    // Limits
    maxRepos: 3,
    maxAiQueriesPerDay: 100,
    maxDiagramsPerHour: 50,
    maxFileViewsPerHour: 200,
    maxTokensPerDay: 400_000,
    maxRepoFiles: 5000,
    maxChatConversations: 50,
    maxMessagesPerChat: 30,

    // Features
    pdfExport: true,
    privateRepos: true,
    fullSecurityReport: true,
    priorityQueue: false,
    customBranding: false,

    // Rate limits
    rateLimit: {
      analyze: { max: 15, windowMs: 86_400_000 },
      query: { max: 60, windowMs: 3_600_000 },
      stream: { max: 60, windowMs: 3_600_000 },
      diagram: { max: 20, windowMs: 3_600_000 },
      file: { max: 200, windowMs: 3_600_000 },
    },

    // Display
    cta: 'Upgrade to Starter',
    featured: true,
    features: [
      '3 repositories',
      '100 AI queries/day',
      'Full security report',
      'PDF export',
      'Unlimited re-analysis',
      'Unlimited sharing',
    ],
  },

  pro: {
    name: 'Pro',
    price: '$30',
    period: '/month',
    amount_paise: 3000,

    // Limits
    maxRepos: 7,
    maxAiQueriesPerDay: 500,
    maxDiagramsPerHour: 100,
    maxFileViewsPerHour: 1000,
    maxTokensPerDay: 2_000_000,
    maxRepoFiles: 10000,
    maxChatConversations: 200,
    maxMessagesPerChat: 80,

    // Features
    pdfExport: true,
    privateRepos: true,
    fullSecurityReport: true,
    priorityQueue: true,
    customBranding: false,

    // Rate limits
    rateLimit: {
      analyze: { max: 50, windowMs: 86_400_000 },
      query: { max: 200, windowMs: 3_600_000 },
      stream: { max: 200, windowMs: 3_600_000 },
      diagram: { max: 100, windowMs: 3_600_000 },
      file: { max: 1000, windowMs: 3_600_000 },
    },

    // Display
    cta: 'Go Pro',
    featured: false,
    features: [
      'Everything in starter',
      '500 AI queries/day',
      '7 repositories',
      'Large codebase support',
      'Priority analysis queue',
      'Priority support',
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
 * Resolve plan name from plan identifier.
 */
export function getPlanByPriceId(priceId) {
  if (!priceId) return 'free';
  // Direct plan name match
  if (PLANS[priceId]) return priceId;
  return 'free';
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
