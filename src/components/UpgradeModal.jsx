"use client";
import { useState, useEffect } from 'react';
import { X, Check, ArrowRight, ArrowDown, Crown, AlertTriangle, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import { PLANS } from '../config/plans';

/**
 * Plan management modal — handles upgrades and downgrades via Dodo Payments.
 * 
 * Free → Starter/Pro: redirect to Dodo checkout page
 * Starter → Pro: show charge preview → confirm → charge saved card
 * Pro → Starter: show confirmation → schedule downgrade at end of cycle
 */
export default function UpgradeModal({ isOpen, onClose, currentPlan = 'free' }) {
  const [loading, setLoading] = useState(null);
  const [confirmDowngrade, setConfirmDowngrade] = useState(null);
  const [upgradePreview, setUpgradePreview] = useState(null); // { planId, amount }

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setLoading(null);
      setConfirmDowngrade(null);
      setUpgradePreview(null);
    }
  }, [isOpen]);

  // Reset loading state when user returns from checkout (e.g., back button)
  useEffect(() => {
    if (!isOpen) return;
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && loading) {
        onClose();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const plans = Object.entries(PLANS)
    .filter(([id]) => id !== 'free' && id !== currentPlan)
    .map(([id, plan]) => ({
      id,
      name: plan.name,
      price: plan.price,
      period: plan.period,
      features: plan.features,
      isDowngrade: currentPlan === 'pro' && id === 'starter',
      highlighted: true,
    }))
    .sort((a, b) => {
      if (a.id === 'starter') return -1;
      if (b.id === 'starter') return 1;
      return 0;
    });

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  // Step 1: User clicks a plan button
  const handlePlanClick = async (planId) => {
    const plan = plans.find(p => p.id === planId);

    // Downgrade: show confirmation first
    if (plan?.isDowngrade) {
      if (confirmDowngrade !== planId) {
        setConfirmDowngrade(planId);
        return;
      }
      return executeChange(planId);
    }

    // Starter → Pro: fetch charge preview before confirming
    if (currentPlan === 'starter' && planId === 'pro') {
      if (upgradePreview?.planId === planId) {
        return executeChange(planId);
      }

      setLoading(planId);
      try {
        const res = await fetch('/api/dodo/preview-change', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: planId }),
        });
        const data = await res.json();
        setUpgradePreview({ planId, amount: data.available ? data.amount : null });
      } catch {
        setUpgradePreview({ planId, amount: null });
      }
      setLoading(null);
      return;
    }

    // Free → any plan: go straight to Dodo checkout
    return executeChange(planId);
  };

  // Step 2: Execute the actual plan change
  const executeChange = async (planId) => {
    setLoading(planId);
    setConfirmDowngrade(null);
    setUpgradePreview(null);

    try {
      if (currentPlan === 'free') {
        const res = await fetch('/api/dodo/create-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: planId }),
        });
        const data = await res.json();

        if (!res.ok) {
          toast.error(data.error || 'Failed to create checkout.', { duration: 10000 });
          setLoading(null);
          return;
        }

        if (data.url) {
          window.location.href = data.url;
        } else {
          toast.error('Checkout could not be created.', { duration: 10000 });
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
          toast.error(data.error || 'Failed to change plan.', { duration: 10000 });
          setLoading(null);
          return;
        }

        toast.success(data.message || 'Plan changed successfully.', { duration: 10000 });
        const delay = data.type === 'upgrade' ? 4000 : 1500;
        const redirectUrl = data.type === 'upgrade' ? '/profile?upgrade=pending' : '/profile';
        setTimeout(() => { window.location.href = redirectUrl; }, delay);
      }
    } catch {
      toast.error('Something went wrong. Try again.', { duration: 10000 });
      setLoading(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm p-0 md:p-4"
      onClick={handleClose}
    >
      <div
        className="w-full max-h-[85vh] md:max-h-[90vh] md:max-w-[520px] bg-[#111113] border border-white/[0.08] rounded-t-2xl md:rounded-2xl shadow-[0_32px_80px_rgba(0,0,0,0.7)] animate-slide-up overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 md:px-7 pt-5 md:pt-6 pb-3 md:pb-4 sticky top-0 bg-[#111113] z-10">
          <div className="flex items-center gap-2.5">
            <Crown size={16} className="text-vb-accent" />
            <h3 className="text-[15px] md:text-[18px] font-semibold text-vb-ink">Change your plan</h3>
          </div>
          <button
            onClick={handleClose}
            disabled={!!loading}
            className="p-1.5 rounded-lg text-vb-ink4 hover:text-vb-ink3 hover:bg-white/[0.04] transition-all disabled:opacity-30"
          >
            <X size={18} />
          </button>
        </div>

        {/* Plans */}
        <div className="px-5 md:px-7 pb-5 md:pb-7 space-y-3 md:space-y-4">
          {plans.map(plan => (
            <div
              key={plan.id}
              className={`p-4 md:p-5 rounded-xl border transition-all ${
                plan.highlighted
                  ? 'border-vb-accent/20 bg-vb-accent/[0.02]'
                  : 'border-white/[0.06] bg-white/[0.02]'
              }`}
            >
              {/* Plan header */}
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] md:text-[15px] font-semibold text-vb-ink">{plan.name}</span>
                  {plan.id === 'pro' && (
                    <span className="text-[8px] md:text-[9px] font-medium bg-vb-accent/10 text-vb-accent px-1.5 md:px-2 py-0.5 rounded-full border border-vb-accent/20">
                      Best value
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-[20px] md:text-[24px] font-bold text-vb-ink">{plan.price}</span>
                  <span className="text-[11px] md:text-[12px] text-vb-ink4">{plan.period}</span>
                </div>
              </div>

              {/* Features */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5 md:gap-y-2 mb-4 md:mb-5">
                {plan.features.map((f, i) => (
                  <span key={i} className="flex items-center gap-1.5 md:gap-2 text-[11px] md:text-[12px] text-vb-ink3">
                    <Check size={10} className="text-vb-accent shrink-0" strokeWidth={3} />{f}
                  </span>
                ))}
              </div>

              {/* Upgrade charge preview (Starter → Pro) */}
              {upgradePreview?.planId === plan.id && (
                <div className="mb-3 md:mb-4 p-3 md:p-4 rounded-xl bg-vb-accent/[0.05] border border-vb-accent/20">
                  <div className="flex items-start gap-2.5 md:gap-3">
                    <CreditCard size={15} className="text-vb-accent mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[12px] md:text-[13px] text-vb-accent font-semibold mb-0.5 md:mb-1">
                        {upgradePreview.amount
                          ? `You'll pay ${upgradePreview.amount} today`
                          : "You'll only pay the difference for the remaining days"}
                      </p>
                      <p className="text-[11px] md:text-[12px] text-vb-ink3 leading-relaxed">
                        This covers the price difference for the rest of your current billing cycle. From your next renewal, you&apos;ll be charged {plan.price}{plan.period}.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Downgrade confirmation */}
              {confirmDowngrade === plan.id && (
                <div className="mb-3 md:mb-4 p-3 md:p-4 rounded-xl bg-amber-500/[0.06] border border-amber-500/20">
                  <div className="flex items-start gap-2.5 md:gap-3">
                    <AlertTriangle size={15} className="text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[12px] md:text-[13px] text-amber-200 font-semibold mb-0.5 md:mb-1">Are you sure?</p>
                      <p className="text-[11px] md:text-[12px] text-vb-ink3 leading-relaxed">
                        You&apos;ll keep your current plan until the end of your billing cycle, then switch to {plan.name}. No refund for the remaining days.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action button */}
              <button
                onClick={() => handlePlanClick(plan.id)}
                disabled={!!loading}
                className={`w-full flex items-center justify-center gap-2 py-2.5 md:py-3 rounded-xl text-[12px] md:text-[13px] font-semibold transition-all disabled:opacity-50 ${
                  plan.isDowngrade
                    ? confirmDowngrade === plan.id
                      ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                      : 'bg-white/[0.04] border border-white/[0.06] text-vb-ink2 hover:bg-white/[0.06]'
                    : 'bg-vb-accent text-vb-bg hover:bg-vb-accent-bright'
                }`}
              >
                {loading === plan.id ? (
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-20"/>
                    <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                ) : plan.isDowngrade ? (
                  confirmDowngrade === plan.id ? <>Confirm downgrade</> : <>Downgrade to {plan.name} <ArrowDown size={12} /></>
                ) : upgradePreview?.planId === plan.id ? (
                  <>Confirm & pay <ArrowRight size={12} /></>
                ) : (
                  <>Upgrade to {plan.name} <ArrowRight size={12} /></>
                )}
              </button>

              {(confirmDowngrade === plan.id || upgradePreview?.planId === plan.id) && (
                <button
                  onClick={() => { setConfirmDowngrade(null); setUpgradePreview(null); }}
                  className="w-full mt-2 flex items-center justify-center py-1.5 md:py-2 text-[11px] md:text-[12px] text-vb-ink4 hover:text-vb-ink3 transition-colors"
                >
                  Never mind
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 md:px-7 py-3 md:py-4 border-t border-white/[0.04] bg-white/[0.01] sticky bottom-0">
          <p className="text-[10px] md:text-[11px] text-vb-ink4 text-center">Cancel anytime from your profile. No long-term commitment.</p>
        </div>
      </div>
    </div>
  );
}
