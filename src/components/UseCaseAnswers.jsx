"use client";

/**
 * Rich JSX answers for the UseCaseScenarios section.
 * Separated from LandingPage to avoid str_replace issues with special characters.
 */

export function NewEngineerAnswer() {
  return (
    <>
      <p className="text-[12px] text-c-text-2 leading-[1.8] mb-3">The payment flow has 4 stages:</p>
      <div className="text-[12px] text-c-text-2 leading-[1.8] mb-3 pl-3 border-l border-c-line space-y-1">
        <div>1. Frontend calls <span className="text-c-accent font-medium">POST /api/checkout</span> → creates a Stripe session</div>
        <div>2. User completes payment on Stripe&apos;s hosted page</div>
        <div>3. Stripe sends webhook to <span className="text-c-accent font-medium">POST /api/webhooks/stripe</span></div>
        <div>4. Handler verifies signature → updates order → triggers fulfillment</div>
      </div>
      <div className="rounded-lg bg-c-bg border border-c-line-2 p-3 font-mono text-[10px] leading-[1.8]">
        <span className="text-c-accent">export async function</span> <span className="text-c-text">POST(req) {'{'}</span><br/>
        <span className="text-c-text-3">{'  '}// verify Stripe signature</span><br/>
        <span className="text-c-text">{'  '}const event = stripe.webhooks.</span><span className="text-[#7dd3a8]">constructEvent</span><span className="text-c-text">(body, sig, secret);</span><br/>
        <span className="text-c-text">{'  '}await </span><span className="text-[#7dd3a8]">updateOrderStatus</span><span className="text-c-text">(event.data.object.id);</span><br/>
        <span className="text-c-text">{'}'}</span>
      </div>
    </>
  );
}

export function TechLeadAnswer() {
  return (
    <>
      <p className="text-[12px] text-c-text-2 leading-[1.8] mb-3">UserService dependency graph: 7 consumers:</p>
      <div className="rounded-lg bg-c-bg border border-c-line-2 p-4 mb-3">
        <svg width="100%" height="110" viewBox="0 0 320 110" fill="none" className="w-full">
          {/* Center node */}
          <rect x="110" y="40" width="100" height="30" rx="6" stroke="var(--c-accent)" strokeWidth="1.5" fill="var(--c-accent-soft)" />
          <text x="160" y="59" textAnchor="middle" fill="var(--c-accent)" fontSize="9" fontFamily="monospace">UserService</text>
          {/* Left consumers */}
          <rect x="0" y="0" width="80" height="22" rx="4" stroke="var(--c-text-3)" strokeWidth="1" fill="var(--c-overlay-1)" />
          <text x="40" y="14" textAnchor="middle" fill="var(--c-text-3)" fontSize="7" fontFamily="monospace">AuthCtrl</text>
          <path d="M80 11 L110 50" stroke="#3A4350" strokeWidth="0.7" />

          <rect x="0" y="44" width="80" height="22" rx="4" stroke="var(--c-text-3)" strokeWidth="1" fill="var(--c-overlay-1)" />
          <text x="40" y="58" textAnchor="middle" fill="var(--c-text-3)" fontSize="7" fontFamily="monospace">BillingService</text>
          <path d="M80 55 L110 55" stroke="#3A4350" strokeWidth="0.7" />

          <rect x="0" y="88" width="80" height="22" rx="4" stroke="var(--c-text-3)" strokeWidth="1" fill="var(--c-overlay-1)" />
          <text x="40" y="102" textAnchor="middle" fill="var(--c-text-3)" fontSize="7" fontFamily="monospace">Notifications</text>
          <path d="M80 99 L110 65" stroke="#3A4350" strokeWidth="0.7" />

          {/* Right consumers */}
          <rect x="240" y="0" width="80" height="22" rx="4" stroke="var(--c-text-3)" strokeWidth="1" fill="var(--c-overlay-1)" />
          <text x="280" y="14" textAnchor="middle" fill="var(--c-text-3)" fontSize="7" fontFamily="monospace">AdminPanel</text>
          <path d="M240 11 L210 50" stroke="#3A4350" strokeWidth="0.7" />

          <rect x="240" y="44" width="80" height="22" rx="4" stroke="var(--c-text-3)" strokeWidth="1" fill="var(--c-overlay-1)" />
          <text x="280" y="58" textAnchor="middle" fill="var(--c-text-3)" fontSize="7" fontFamily="monospace">Analytics</text>
          <path d="M240 55 L210 55" stroke="#3A4350" strokeWidth="0.7" />

          <rect x="240" y="88" width="80" height="22" rx="4" stroke="var(--c-text-3)" strokeWidth="1" fill="var(--c-overlay-1)" />
          <text x="280" y="102" textAnchor="middle" fill="var(--c-text-3)" fontSize="7" fontFamily="monospace">Onboarding</text>
          <path d="M240 99 L210 65" stroke="#3A4350" strokeWidth="0.7" />
        </svg>
      </div>
      <p className="text-[11px] text-c-text-3">Most critical: <span className="text-c-text-2">AuthController</span> (every request) and <span className="text-c-text-2">BillingService</span> (plan changes).</p>
    </>
  );
}

export function FreelancerAnswer() {
  return (
    <>
      <div className="flex items-center gap-3 mb-3">
        <div className="relative w-11 h-11 flex-shrink-0">
          <svg viewBox="0 0 44 44" className="w-full h-full -rotate-90">
            <circle cx="22" cy="22" r="18" fill="none" stroke="var(--c-line)" strokeWidth="4" />
            <circle cx="22" cy="22" r="18" fill="none" stroke="#FCA5A5" strokeWidth="4" strokeDasharray={`${62 * 1.13} ${(100 - 62) * 1.13}`} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] font-bold text-c-text">62</span>
          </div>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-c-text">Health Score: 62/100</p>
          <p className="text-[9px] text-c-text-3">3 critical · 5 warnings</p>
        </div>
      </div>
      <div className="space-y-1.5">
        {[
          { sev: '#FCA5A5', text: 'STRIPE_SECRET_KEY hardcoded', loc: 'config/stripe.js:8' },
          { sev: '#FCA5A5', text: 'AWS credentials in plaintext', loc: 'lib/s3.ts:3' },
          { sev: '#FCA5A5', text: 'JWT secret in source code', loc: 'auth/jwt.ts:12' },
          { sev: '#febc2e', text: 'No input validation on /api/users', loc: 'routes/users.ts:45' },
          { sev: '#febc2e', text: 'Missing rate limiting', loc: 'middleware.ts:1' },
        ].map((issue, i) => (
          <div key={i} className="flex items-center gap-2 text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: issue.sev }} />
            <span className="text-c-text-2">{issue.text}</span>
            <span className="text-[#3A4350] font-mono ml-auto text-[9px]">{issue.loc}</span>
          </div>
        ))}
      </div>
    </>
  );
}

export function OSSContributorAnswer() {
  return (
    <>
      <p className="text-[12px] text-c-text-2 leading-[1.8] mb-3">The plugin system uses a registry pattern:</p>
      <div className="rounded-lg bg-c-bg border border-c-line-2 p-3 font-mono text-[10px] leading-[1.8] mb-3">
        <span className="text-c-accent">interface</span> <span className="text-c-text">IPlugin {'{'}</span><br/>
        <span className="text-c-text">{'  '}name: </span><span className="text-[#7cc8d4]">string</span><span className="text-c-text">;</span><br/>
        <span className="text-c-text">{'  '}</span><span className="text-[#7dd3a8]">init</span><span className="text-c-text">(ctx: Context): </span><span className="text-[#7cc8d4]">Promise{'<void>'}</span><span className="text-c-text">;</span><br/>
        <span className="text-c-text">{'  '}</span><span className="text-[#7dd3a8]">transform</span><span className="text-c-text">(input: Node): </span><span className="text-[#7cc8d4]">Node</span><span className="text-c-text">;</span><br/>
        <span className="text-c-text">{'}'}</span>
      </div>
      <p className="text-[11px] text-c-text-3 leading-[1.6]">Create a file in <span className="font-mono text-c-text-2">src/plugins/</span>, implement IPlugin, and export from the barrel file. The engine calls <span className="text-c-accent">init()</span> on startup, then <span className="text-c-accent">transform()</span> on each input.</p>
    </>
  );
}
