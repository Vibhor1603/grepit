"use client";
import { ClerkProvider, useUser } from "@clerk/nextjs";
import { ThemeProvider } from "./ThemeProvider";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import PostHogProviderWrapper from "./PostHogProvider";
import CookieConsent from "./CookieConsent";
import { MobileNoticeProvider } from "./MobileNotice";
import { migrateLegacyStorage } from "../lib/storage-migrate";

/**
 * Clears all React Query cache when the user changes (sign out → sign in as different user).
 * Prevents stale data from a previous user being shown to the new user.
 */
function CacheClearOnUserChange() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const prevUserId = useRef(null);

  useEffect(() => {
    const currentId = user?.id || null;
    if (prevUserId.current && currentId && prevUserId.current !== currentId) {
      // User changed — clear all cached data
      queryClient.clear();
    }
    prevUserId.current = currentId;
  }, [user?.id, queryClient]);

  return null;
}

export default function Providers({ children }) {
  useEffect(() => {
    migrateLegacyStorage();
  }, []);

  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  }));

  return (
    <ClerkProvider
      afterSignInUrl="/profile"
      afterSignUpUrl="/profile"
      appearance={{
        // Clerk's `variables` are read once at provider-mount, so static
        // hex values here are fine. Most styling is handled by CSS overrides
        // in `index.css` which use CSS vars and flip with the .dark class.
        layout: {
          socialButtonsPlacement: 'top',
          socialButtonsVariant: 'blockButton',
          showOptionalFields: false,
        },
        variables: {
          colorPrimary: '#EEC679',
          colorDanger: '#D45B5B',
          colorSuccess: '#3FA854',
          colorTextOnPrimaryBackground: '#111511',
          borderRadius: '12px',
          fontFamily: 'var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
          fontSize: '14px',
        },
        elements: {
          rootBox: 'w-full',
          card: 'rounded-c-md shadow-c-3 border border-c-line bg-c-surface !text-c-text',
          headerTitle: '!text-c-text text-[18px] font-semibold',
          headerSubtitle: '!text-c-text-3 text-[13px]',
          socialButtonsBlockButton: 'rounded-c-sm border border-c-line bg-c-surface-2 !text-c-text hover:bg-c-surface-3',
          socialButtonsBlockButtonText: '!text-c-text-2 text-[13px]',
          dividerLine: '!bg-c-line',
          dividerText: '!text-c-text-4 text-[11px] uppercase tracking-wider',
          formFieldLabel: '!text-c-text-2 text-[12px] font-medium',
          formFieldInput: 'rounded-c-sm bg-c-bg border border-c-line !text-c-text placeholder:!text-c-text-3 focus:!border-c-accent-line',
          formButtonPrimary: 'rounded-c-sm bg-c-accent !text-c-bg font-semibold hover:opacity-90',
          footerActionText: '!text-c-text-3',
          footerActionLink: '!text-c-accent hover:opacity-90',
          identityPreview: 'rounded-c-sm bg-c-surface-2 border border-c-line',
          identityPreviewText: '!text-c-text',
          identityPreviewEditButton: '!text-c-accent',
          otpCodeFieldInput: 'rounded-c-xs bg-c-surface-2 border border-c-line !text-c-text',
          alert: 'rounded-c-sm bg-c-coral-soft border border-c-coral/20',
          alertText: '!text-c-coral text-[13px]',
          badge: 'rounded-c-xs bg-c-accent-soft !text-c-accent border border-c-accent-line text-[10px]',
          formFieldAction: '!text-c-accent',
          formFieldInputShowPasswordButton: '!text-c-text-3 hover:!text-c-text-2',
          modalBackdrop: 'bg-black/60 backdrop-blur-md',
          modalContent: '!bg-transparent',
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <PostHogProviderWrapper>
            <MobileNoticeProvider>
              <CacheClearOnUserChange />
              {children}
              <CookieConsent />
            </MobileNoticeProvider>
          </PostHogProviderWrapper>
        </ThemeProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}
