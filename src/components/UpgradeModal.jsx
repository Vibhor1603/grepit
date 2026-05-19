"use client";
import { useState } from 'react';
import { X, Zap, Check, ArrowRight, Crown } from 'lucide-react';

/**
 * Upgrade modal — shows plan options and redirects to Stripe checkout.
 * Use from anywhere in the dashboard when a feature is gated.
 */
export default function UpgradeModal({ isOpen, onClose, currentPlan = 'free' }) {
  const [loading, setLoading] = useState(null);

  if (!isOpen) return null;

  const plans = [
    {
      id: 'pro',
      name: 'Pro',
      price: '$12',
      period: '/mo',
      features: ['5 repositories', '150 AI queries/day', 'Full security report', 'PDF export', 'Private repos'],
      highlighted: currentPlan === 'free',
    },
    {
      id: 'team',
      name: 'Team',
      price: '$30',
      period: '/mo',
      features: ['10 repositories', '1,000 AI queries/day', 'Priority queue', 'Large codebase support'],
      highlighted: currentPlan === 'pro',
    },
  ].filter(p => {
    // Don't show plans the user already has or lower
    if (currentPlan === 'pro') return p.id === 'team';
    if (currentPlan === 'team') return false;
    return true;
  });

  const handleUpgrade = async (planId) => {
    setLoading(planId);
    try {
      const returnUrl = window.location.pathname + window.location.search;
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId, returnUrl }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setLoading(null);
    } catch {
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-[480px] bg-[#111113] border border-white/[0.08] rounded-2xl p-6 shadow-[0_32px_80px_rgba(0,0,0,0.7)] animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Crown size={16} className="text-vb-accent" />
            <h3 className="text-[16px] font-semibold text-vb-ink">Upgrade your plan</h3>
          </div>
          <button onClick={onClose} className="p-1 text-vb-ink4 hover:text-vb-ink3 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          {plans.map(plan => (
            <div key={plan.id} className={`p-4 rounded-xl border transition-all ${plan.highlighted ? 'border-vb-accent/20 bg-vb-accent/[0.02]' : 'border-white/[0.06] bg-white/[0.02]'}`}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-[14px] font-semibold text-vb-ink">{plan.name}</span>
                  {plan.highlighted && <span className="ml-2 text-[9px] font-medium bg-vb-accent/10 text-vb-accent px-2 py-0.5 rounded-full border border-vb-accent/20">Recommended</span>}
                </div>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-[22px] font-bold text-vb-ink">{plan.price}</span>
                  <span className="text-[11px] text-vb-ink4">{plan.period}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
                {plan.features.map((f, i) => (
                  <span key={i} className="flex items-center gap-1.5 text-[11px] text-vb-ink3">
                    <Check size={10} className="text-vb-accent" strokeWidth={3} />{f}
                  </span>
                ))}
              </div>
              <button onClick={() => handleUpgrade(plan.id)} disabled={!!loading}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-[12px] font-medium transition-all disabled:opacity-50 ${
                  plan.highlighted ? 'bg-vb-accent text-vb-bg hover:bg-vb-accent-bright' : 'bg-white/[0.04] border border-white/[0.06] text-vb-ink2 hover:bg-white/[0.06]'
                }`}>
                {loading === plan.id ? (
                  <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-20"/><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                ) : (
                  <>Upgrade to {plan.name} <ArrowRight size={12} /></>
                )}
              </button>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-vb-ink4 text-center mt-4">Cancel anytime. No long-term commitment.</p>
      </div>
    </div>
  );
}
