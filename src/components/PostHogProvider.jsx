"use client";
import posthog from "posthog-js";
import { useUser } from "@clerk/nextjs";
import { useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// Initialize PostHog only once on the client — PRODUCTION ONLY, AFTER CONSENT
let initialized = false;
function initPostHog() {
  if (initialized || typeof window === "undefined") return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  if (process.env.NEXT_PUBLIC_APP_ENV !== "prod") return;
  
  // Respect Do Not Track / Global Privacy Control
  if (navigator.doNotTrack === "1" || navigator.globalPrivacyControl === true) return;
  
  // Only initialize if user has consented (or hasn't declined)
  const consent = localStorage.getItem('vibo-cookie-consent');
  if (consent === 'declined') return;
  
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    person_profiles: "identified_only",
    capture_pageview: false,
    capture_pageleave: true,
    autocapture: true,
    persistence: "localStorage+cookie",
    respect_dnt: true,
  });
  initialized = true;
}

// Separate component for page view tracking (needs Suspense for useSearchParams)
function PostHogPageTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname || !initialized) return;
    const url = window.origin + pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
    posthog.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}

// User identification component
function PostHogIdentify() {
  const { user, isSignedIn } = useUser();

  useEffect(() => {
    if (!initialized) return;
    if (isSignedIn && user) {
      posthog.identify(user.id, {
        email: user.emailAddresses?.[0]?.emailAddress,
        name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
      });
    } else if (!isSignedIn) {
      posthog.reset();
    }
  }, [isSignedIn, user]);

  return null;
}

export default function PostHogProviderWrapper({ children }) {
  useEffect(() => {
    initPostHog();
  }, []);

  return (
    <>
      <Suspense fallback={null}>
        <PostHogPageTracker />
      </Suspense>
      <PostHogIdentify />
      {children}
    </>
  );
}

// Export posthog instance for manual event tracking
export { posthog };
