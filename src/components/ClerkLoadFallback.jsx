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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-c-bg/90 p-6">
      <div className="text-center">
        <p className="text-[15px] text-c-text mb-4">Couldn&apos;t load sign-in</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="h-10 px-4 rounded-[8px] bg-c-accent text-c-bg text-[13px] font-semibold hover:opacity-90"
        >
          Retry
        </button>
      </div>
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
