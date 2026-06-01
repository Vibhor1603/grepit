"use client";
import { createContext, useCallback, useContext, useState } from "react";
import { Monitor } from "lucide-react";

const MobileNoticeContext = createContext(null);

function isMobileViewport() {
  return typeof window !== "undefined" && window.innerWidth < 1024;
}

function isDismissed() {
  try {
    return sessionStorage.getItem("grepit-mobile-notice-dismissed") === "true";
  } catch {
    return false;
  }
}

function MobileNoticeModal({ onDismiss }) {
  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
      <div className="w-full max-w-[320px] bg-c-surface border border-c-line-2 rounded-2xl p-6 shadow-[0_32px_80px_rgba(0,0,0,0.7)] text-center">
        <div className="w-12 h-12 mx-auto rounded-xl bg-c-accent/[0.08] border border-[var(--c-accent)]/20 flex items-center justify-center mb-4">
          <Monitor size={20} className="text-c-accent" />
        </div>
        <h3 className="text-[15px] font-semibold text-c-text mb-2">Best on desktop</h3>
        <p className="text-[12px] text-c-text-3 leading-relaxed mb-5">
          Grepit is designed for larger screens. The code explorer, diagrams, and chat work best on a laptop or desktop.
        </p>
        <button
          type="button"
          onClick={onDismiss}
          className="w-full py-2.5 rounded-xl text-[13px] font-medium bg-c-accent text-[var(--c-bg)] hover:bg-c-accent-bright transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

export function MobileNoticeProvider({ children }) {
  const [pending, setPending] = useState(null);

  const promptMobileNotice = useCallback(() => {
    if (!isMobileViewport() || isDismissed()) return Promise.resolve();
    return new Promise((resolve) => setPending({ resolve }));
  }, []);

  const dismiss = useCallback(() => {
    try {
      sessionStorage.setItem("grepit-mobile-notice-dismissed", "true");
    } catch {}
    pending?.resolve();
    setPending(null);
  }, [pending]);

  return (
    <MobileNoticeContext.Provider value={{ promptMobileNotice }}>
      {children}
      {pending ? <MobileNoticeModal onDismiss={dismiss} /> : null}
    </MobileNoticeContext.Provider>
  );
}

export function useMobileNotice() {
  const ctx = useContext(MobileNoticeContext);
  if (!ctx) {
    return { promptMobileNotice: async () => {} };
  }
  return ctx;
}
