"use client";
import { useState } from 'react';
import { X, Zap, Check, ArrowRight, ArrowDown, Crown } from 'lucide-react';

/**
 * Plan management modal — handles upgrades and downgrades via Razorpay.
 * Use from anywhere in the dashboard when a feature is gated or from profile.
 */
export default function UpgradeModal({ isOpen, onClose, currentPlan = 'free' }) {
  const [loading, setLoading] = useState(null);

  if (!isOpen) return null;

  const allPlans = [
    {
      id: 'basic',
      name: 'Basic',
      price: '$12',
      period: '/mo',
      features: ['5 repositories', '100 AI queries/day', 'Full security report', 'PDF export', 'Private repos'],
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '$30',
      period: '/mo',
      features: ['15 repositories', '500 AI queries/day', 'Priority queue', 'Large codebase support'],
    },
  ];

  // Show plans the user can switch to (not their current plan)
  const plans = allPlans
    .filter(p => p.id !== currentPlan)
    .map(p => ({
      ...p,
      isDowngrade: (currentPlan === 'pro' && p.id === 'basic'),
      highlighted: (currentPlan === 'free' && p.id === 'basic') || (currentPlan === 'basic' && p.id === 'pro'),
    }));

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleUpgrade = async (planId) => {
    setLoading(planId);
    try {
      if (currentPlan !== 'free') {
        // ─── Existing subscriber: use Update Subscription API (no checkout needed) ───
        const res = await fetch('/api/razorpay/change-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: planId }),
        });
        const data = await res.json();

        if (!res.ok) {
          alert(data.error || 'Failed to change plan');
          setLoading(null);
          return;
        }

        // UPI fallback: Razorpay can't update UPI subs, so we get a new subscription_id for checkout
        if (data.requiresCheckout) {
          const scriptLoaded = await loadRazorpayScript();
          if (!scriptLoaded) { alert('Failed to load payment gateway.'); setLoading(null); return; }

          const options = {
            key: data.key_id,
            subscription_id: data.subscription_id,
            name: 'Grepit',
            description: `${planId.charAt(0).toUpperCase() + planId.slice(1)} Plan — Monthly Subscription`,
            theme: { color: '#E0FC10' },
            handler: async function (response) {
              try {
                const verifyRes = await fetch('/api/razorpay/verify-payment', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_subscription_id: response.razorpay_subscription_id,
                    razorpay_signature: response.razorpay_signature,
                    plan: planId,
                  }),
                });
                const verifyData = await verifyRes.json();
                if (verifyData.success) { window.location.href = '/profile?checkout=success'; }
                else { alert(verifyData.error || 'Payment verification failed'); }
              } catch { alert('Payment verification failed. Contact support.'); }
              setLoading(null);
            },
            modal: { ondismiss: () => setLoading(null) },
          };
          const rzp = new window.Razorpay(options);
          rzp.on('payment.failed', (r) => { alert(`Payment failed: ${r.error.description}`); setLoading(null); });
          rzp.open();
          return;
        }

        // Success — reload to reflect changes
        if (data.type === 'upgrade') {
          window.location.href = '/profile?checkout=success';
        } else {
          // Downgrade scheduled at cycle end
          window.location.href = '/profile?plan_change=scheduled';
        }
        return;
      }

      // ─── New subscriber (free → paid): open Razorpay checkout ───
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        alert('Failed to load payment gateway. Please try again.');
        setLoading(null);
        return;
      }

      const res = await fetch('/api/razorpay/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Failed to create subscription');
        setLoading(null);
        return;
      }

      // Open Razorpay checkout modal for new subscription
      const options = {
        key: data.key_id,
        subscription_id: data.subscription_id,
        name: 'Grepit',
        description: `${planId.charAt(0).toUpperCase() + planId.slice(1)} Plan — Monthly Subscription`,
        prefill: {
          name: data.user?.name || '',
          email: data.user?.email || '',
        },
        theme: {
          color: '#E0FC10',
        },
        handler: async function (response) {
          try {
            const verifyRes = await fetch('/api/razorpay/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_subscription_id: response.razorpay_subscription_id,
                razorpay_signature: response.razorpay_signature,
                plan: planId,
              }),
            });
            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              window.location.href = '/profile?checkout=success';
            } else {
              alert(verifyData.error || 'Payment verification failed');
            }
          } catch {
            alert('Payment verification failed. Contact support if amount was deducted.');
          }
          setLoading(null);
        },
        modal: {
          ondismiss: function () {
            setLoading(null);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        alert(`Payment failed: ${response.error.description}`);
        setLoading(null);
      });
      rzp.open();
    } catch {
      alert('Could not process plan change. Try again.');
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
              <button onClick={() => handleUpgrade(plan.id)} disabled={!!loading}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-[12px] font-medium transition-all disabled:opacity-50 ${
                  plan.isDowngrade
                    ? 'bg-white/[0.04] border border-white/[0.06] text-vb-ink2 hover:bg-white/[0.06]'
                    : plan.highlighted ? 'bg-vb-accent text-vb-bg hover:bg-vb-accent-bright' : 'bg-white/[0.04] border border-white/[0.06] text-vb-ink2 hover:bg-white/[0.06]'
                }`}>
                {loading === plan.id ? (
                  <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-20"/><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                ) : plan.isDowngrade ? (
                  <>Downgrade to {plan.name} <ArrowDown size={12} /></>
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
