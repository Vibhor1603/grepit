"use client";
import { useEffect, useCallback, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

/**
 * Handles session expiry gracefully.
 * If a 401 is detected, shows a banner and redirects to sign-in.
 * Preserves the current route so user can return after re-auth.
 */
export function useSessionGuard() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      const currentPath = window.location.pathname + window.location.search;
      router.replace(`/sign-in?redirect_url=${encodeURIComponent(currentPath)}`);
    }
  }, [isLoaded, isSignedIn, router]);

  return { isReady: isLoaded && isSignedIn };
}

/**
 * Rage click protection — debounces a function so it can only be called
 * once within the specified delay. Returns { execute, isLocked }.
 */
export function useRageProtection(delay = 2000) {
  const lockedRef = useRef(false);
  const timerRef = useRef(null);

  const execute = useCallback((fn) => {
    if (lockedRef.current) return false;
    lockedRef.current = true;
    timerRef.current = setTimeout(() => { lockedRef.current = false; }, delay);
    fn();
    return true;
  }, [delay]);

  const isLocked = useCallback(() => lockedRef.current, []);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  return { execute, isLocked };
}

/**
 * Wraps a fetch call to handle 401 (session expired) gracefully.
 * Returns the response or throws with a user-friendly message.
 */
export async function safeFetch(url, options = {}) {
  const res = await fetch(url, options);
  
  if (res.status === 401) {
    // Session expired — store current location and redirect
    const currentPath = window.location.pathname + window.location.search;
    window.location.href = `/sign-in?redirect_url=${encodeURIComponent(currentPath)}&expired=1`;
    throw new Error('SESSION_EXPIRED');
  }

  return res;
}
