"use client";
import { useState } from 'react';
import { X, Check, ArrowRight, ArrowDown, Crown, AlertTriangle, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import { PLANS } from '../config/plans';

/**
 * Plan management modal — handles upgrades and downgrades via Dodo Payments.
 * 
 * Upgrades: Shows prorated charge preview → user confirms → charges saved card.
 * Downgrades: Shows confirmation → schedules at next billing date.
 */
export default function UpgradeModal({ isOpen, onClose, currentPlan = 'free' }) {
  const [loading, setLoading] = useState(null);
  const [confirmDowngrade, setConfirmDowngrade] = useState(null);
  const [upgradePreview, setUpgradePreview] = useState(null); // { planId, amount, currency }

  if (!isOpen) return null;

  const plans = Object.entries(PLANS)
    .filter(([id]) => id !== 'free' && id !== currentPlan)
    .map(([id, plan]) => ({
      id,
      name: plan.name,
      price: plan.price,
      period: plan.period,
      features: plan.features,
      isDowngrade: currentPlan === 'pro' && id === 'basic',
      highlighted: (currentPlan === 'free' && id === 'basic') || (currentPlan === 'basic' && id === 'pro'),
    }));

  // Step 1: User clicks upgrade → fetch preview amount
  const handleUpgradeClick = async (planId) => {
    const plan = plans.find(p => p.id === planId);

    // Downgrades: show inline confirmation
    if (plan?.isDowngrade) {
      if (confirmDowngrade !== planId) {
        setConfirmDowngrade(planId);
        return;
      }
      // Already confirmed — execute
      return executeChange(planId);
    }

    // Starter → Pro only: fetch prorated preview before confirming
    // Free → any plan: go straight to checkout (Dodo page shows the price)
    const isStarterToPro = currentPlan === 'basic' && planId === 'pro';
    if (isStarterToPro) {
      // If already showing preview for this plan, execute
      if (upgradePreview?.planId === planId) {
        return executeChange(planId);
      }

      // Fetch prorated amount
      setLoading(planId);
      try {
        const res = await fetch('/api/dodo/preview-change', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: planId }),
        });
        const data = await res.json();

        if (data.available && data.amount) {
          setUpgradePreview({ planId, amount: data.amount });
        } else {
          // Preview not available — show generic confirmation
          setUpgradePreview({ planId, amount: null });
        }
      } catch {
        // If preview fails, still allow upgrade with generic message
        setUpgradePreview({ planId, amount: null });
      }
      setLoading(null);
      return;
    }

    // All other cases (free → basic, free → pro): go straight to checkout
    return executeChange(planId);
  };

  // Step 2: Execute the actual plan change
  const executeChange = async (planId) => {
    setLoading(planId);
    setConfirmDowngrade(null);
    setUpgradePreview(null);

    try {
      // Free users → Dodo checkout page (new subscription)
      // Paid users → change-plan API (uses saved payment method)
      if (currentPlan === 'free') {
        const res = await fetch('/api/dodo/create-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: planId }),
        });
        const data = await res.json();

        if (!res.ok) {
          toast.error(data.error || 'Failed to create checkout.', { duration: 5000 });
          setLoading(null);
          return;
        }

        if (data.url) {
          window.location.href = data.url;
        } else {
          toast.error('Checkout could not be created.', { duration: 5000 });
          setLoading(null);
        }
      } else {
        const res = await fetch('/api/dodo/change-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: planId }),
        });
        const data = await res.json();

        if (!res.ok) {
          toast.error(data.error || 'Failed to change plan', { duration: 5000 });
          setLoading(null);
          return;
        }

        toast.success(data.message || 'Plan changed successfully', { duration: 5000 });
        const delay = data.type === 'upgrade' ? 4000 : 1500;
        const redirectUrl = data.type === 'upgrade' ? '/profile?upgrade=pending' : '/profile';
        setTimeout(() => window.location.href = redirectUrl, delay);
      }
    } catch {
      toast.error('Something went wrong. Try again.', { duration: 5000 });
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-[480px] bg-[#111113] border border-white/[0.08] rounded-2xl p-6 shadow-[0_32px_80px_rgba(0,0,0,0.7)] animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Crown size={16} className="text-vb-accent" />
            <h3 className="text-[16px] font-semibold text-vb-ink">Change your plan</h3>
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

              {/* Upgrade confirmation with prorated amount */}
              {upgradePreview?.planId === plan.id && (
                <div className="mb-3 p-3 rounded-lg bg-vb-accent/[0.04] border border-vb-accent/20">
                  <div className="flex items-start gap-2">
                    <CreditCard size={14} className="text-vb-accent mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[11px] text-vb-accent font-medium">
                        {upgradePreview.amount
                          ? `You'll be charged ${upgradePreview.amount} now`
                          : 'Prorated difference will be charged'}
                      </p>
                      <p className="text-[10px] text-vb-ink3 mt-0.5">
                        Charged to your saved payment method. Then {plan.price}{plan.period} on renewal.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Downgrade confirmation */}
              {confirmDowngrade === plan.id && (
                <div className="mb-3 p-3 rounded-lg bg-amber-500/[0.06] border border-amber-500/20">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[11px] text-amber-200 font-medium">Are you sure?</p>
                      <p className="text-[10px] text-vb-ink3 mt-0.5">
                        You&apos;ll keep your current plan until the end of your billing cycle, then switch to {plan.name}.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <button onClick={() => handleUpgradeClick(plan.id)} disabled={!!loading}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-[12px] font-medium transition-all disabled:opacity-50 ${
                  plan.isDowngrade
                    ? confirmDowngrade === plan.id
                      ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                      : 'bg-white/[0.04] border border-white/[0.06] text-vb-ink2 hover:bg-white/[0.06]'
                    : upgradePreview?.planId === plan.id
                      ? 'bg-vb-accent text-vb-bg hover:bg-vb-accent-bright'
                      : plan.highlighted ? 'bg-vb-accent text-vb-bg hover:bg-vb-accent-bright' : 'bg-white/[0.04] border border-white/[0.06] text-vb-ink2 hover:bg-white/[0.06]'
                }`}>
                {loading === plan.id ? (
                  <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-20"/><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                ) : plan.isDowngrade ? (
                  confirmDowngrade === plan.id
                    ? <>Confirm downgrade</>
                    : <>Downgrade to {plan.name} <ArrowDown size={12} /></>
                ) : upgradePreview?.planId === plan.id ? (
                  <>Confirm & pay <ArrowRight size={12} /></>
                ) : (
                  <>Upgrade to {plan.name} <ArrowRight size={12} /></>
                )}
              </button>

              {(confirmDowngrade === plan.id || upgradePreview?.planId === plan.id) && (
                <button onClick={() => { setConfirmDowngrade(null); setUpgradePreview(null); }}
                  className="w-full mt-2 flex items-center justify-center py-2 text-[11px] text-vb-ink4 hover:text-vb-ink3 transition-colors">
                  Never mind
                </button>
              )}
            </div>
          ))}
        </div>

        <p className="text-[10px] text-vb-ink4 text-center mt-4">Cancel anytime. No long-term commitment.</p>
      </div>
    </div>
  );
}
