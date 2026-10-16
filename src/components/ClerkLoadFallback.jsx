"use client";

import { ClerkFailed } from "@clerk/nextjs";
import { useEffect, useState } from "react";

const AUTO_RETRY_KEY = "clerk-js-auto-retry";

function FailedUI() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!sessionStorage.getItem(AUTO_RETRY_KEY)) {
        sessionStorage.setItem(AUTO_RETRY_KEY, "1");
        window.location.reload();
        return;
      }
    } catch {
      // sessionStorage unavailable — fall through to manual retry UI
    }
    setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-[320px] z-[9999] rounded-lg border border-c-line bg-c-surface p-3.5 shadow-[0_14px_34px_rgba(0,0,0,0.34)]"
    >
      <p className="text-[13px] text-c-text mb-2.5">Couldn&apos;t load sign-in</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="h-9 px-3.5 rounded-[8px] bg-c-accent text-c-bg text-[13px] font-semibold hover:opacity-90"
      >
        Retry
      </button>
    </div>
  );
}

/** Shows a retry UI (after one automatic reload) when Clerk JS fails to load. */
export default function ClerkLoadFallback() {
  return (
    <ClerkFailed>
      <FailedUI />
    </ClerkFailed>
  );
}
