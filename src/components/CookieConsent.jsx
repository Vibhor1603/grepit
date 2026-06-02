"use client";
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Cookie consent banner — required by GDPR for non-essential cookies (PostHog analytics).
 * Shows once, stores preference in localStorage. Only shows in production.
 */
export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show in production and if not already consented
    if (process.env.NEXT_PUBLIC_APP_ENV !== 'prod') return;
    const consent = localStorage.getItem('grepit-cookie-consent');
    if (!consent) {
      // Delay showing to not interrupt initial page load
      setTimeout(() => setVisible(true), 2000);
    }
  }, []);

  const accept = () => {
    localStorage.setItem('grepit-cookie-consent', 'accepted');
    setVisible(false);
    // Initialize PostHog now that user consented
    try {
      const posthog = require('posthog-js').default;
      if (posthog && !posthog.__loaded) {
        // Trigger re-initialization
        window.location.reload();
      }
    } catch {}
  };

  const decline = () => {
    localStorage.setItem('grepit-cookie-consent', 'declined');
    setVisible(false);
    // Opt out of PostHog if it was somehow initialized
    try {
      const posthog = require('posthog-js').default;
      if (posthog?.opt_out_capturing) posthog.opt_out_capturing();
    } catch {}
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-[380px] z-[300] animate-slide-up">
      <div className="bg-c-surface border border-c-line rounded-lg p-4 shadow-[0_14px_34px_rgba(0,0,0,0.34)]">
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-c-accent mb-1">Privacy controls</p>
            <p className="text-[12.5px] text-c-text-2 leading-relaxed">
              We use essential cookies for auth, and optional analytics to improve product quality.
            </p>
          </div>
          <button onClick={decline} className="text-vb-ink4 hover:text-vb-ink3 transition-colors flex-shrink-0 mt-0.5">
            <X size={14} />
          </button>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <button onClick={accept}
            style={{ transition: 'background-color 160ms var(--ease-out-strong), transform 160ms var(--ease-out-strong)' }}
            className="flex-1 py-2 rounded-md text-[12px] font-medium bg-vb-accent text-vb-bg hover:bg-vb-accent-bright">
            Accept all
          </button>
          <button onClick={decline}
            style={{ transition: 'background-color 160ms var(--ease-out-strong), border-color 160ms var(--ease-out-strong), transform 160ms var(--ease-out-strong)' }}
            className="flex-1 py-2 rounded-md text-[12px] font-medium text-vb-ink3 bg-c-overlay-3 border border-c-line hover:bg-white/[0.06]">
            Essential only
          </button>
        </div>
        <a href="/privacy" className="block text-[10px] text-vb-ink4 hover:text-vb-accent mt-2 text-left transition-colors">
          Read our Privacy Policy
        </a>
      </div>
    </div>
  );
}
