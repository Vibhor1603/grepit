"use client";
import { Lock, Zap } from 'lucide-react';

/**
 * Inline upgrade CTA — shown when a feature is gated behind a paid plan.
 * Calls onUpgrade callback which should open the UpgradeModal.
 */
export function UpgradeInline({ feature = "this feature", plan = "Pro", onUpgrade }) {
  return (
    <button
      onClick={onUpgrade}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-medium text-vb-ink3 bg-c-overlay-2 border border-c-line hover:border-vb-accent/20 hover:text-vb-accent hover:bg-vb-accent/[0.04] transition-all group"
    >
      <Lock size={11} className="text-vb-ink4 group-hover:text-vb-accent transition-colors" />
      <span>{plan}+ feature</span>
      <Zap size={10} className="text-vb-accent opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

/**
 * Overlay CTA — blurs content behind it and shows upgrade prompt.
 */
export function UpgradeOverlay({ feature = "Full Security Report", plan = "Pro", children, onUpgrade }) {
  return (
    <div className="relative">
      <div className="blur-[3px] opacity-50 pointer-events-none select-none">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-vb-bg/60 backdrop-blur-[1px] rounded-lg">
        <div className="text-center space-y-3 p-6">
          <div className="w-10 h-10 mx-auto rounded-xl bg-vb-accent/[0.06] border border-vb-accent/15 flex items-center justify-center">
            <Lock size={16} className="text-vb-accent" />
          </div>
          <p className="text-[13px] text-vb-ink font-medium">{feature}</p>
          <p className="text-[11px] text-vb-ink3 max-w-[200px] mx-auto">Upgrade to {plan} to unlock</p>
          <button
            onClick={onUpgrade}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium bg-vb-accent text-vb-bg hover:bg-vb-accent-bright transition-all"
          >
            <Zap size={12} />
            Upgrade
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Banner CTA — shown at the bottom of a section.
 */
export function UpgradeBanner({ message = "Unlock the full experience", plan = "Pro", onUpgrade }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg border border-vb-accent/10 bg-vb-accent/[0.02]">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-vb-accent/[0.08] border border-vb-accent/15 flex items-center justify-center">
          <Lock size={13} className="text-vb-accent" />
        </div>
        <div>
          <p className="text-[12px] text-vb-ink font-medium">{message}</p>
          <p className="text-[10px] text-vb-ink4">Available on {plan} and above</p>
        </div>
      </div>
      <button
        onClick={onUpgrade}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-vb-accent text-vb-bg hover:bg-vb-accent-bright transition-all"
      >
        <Zap size={11} />
        Upgrade
      </button>
    </div>
  );
}
