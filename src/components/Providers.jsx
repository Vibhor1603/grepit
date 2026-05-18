"use client";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "./ThemeProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export default function Providers({ children }) {
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
      appearance={{
        layout: {
          socialButtonsPlacement: 'top',
          socialButtonsVariant: 'blockButton',
          showOptionalFields: false,
        },
        variables: {
          colorPrimary: '#E0FC10',
          colorBackground: '#141416',
          colorInputBackground: '#1a1a1e',
          colorInputText: '#eaeaec',
          colorText: '#eaeaec',
          colorTextSecondary: '#b0b0b8',
          colorDanger: '#ef4444',
          colorSuccess: '#22c55e',
          colorNeutral: '#eaeaec',
          colorTextOnPrimaryBackground: '#0a0a0c',
          borderRadius: '10px',
          fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Display, system-ui, sans-serif',
          fontSize: '14px',
        },
        elements: {
          rootBox: 'w-full',
          card: 'bg-[#141416] border border-white/[0.1] rounded-2xl shadow-[0_32px_80px_rgba(0,0,0,0.7)] !text-[#eaeaec]',
          headerTitle: '!text-[#eaeaec] text-[18px] font-semibold',
          headerSubtitle: '!text-[#787884] text-[13px]',
          socialButtonsBlockButton: '!bg-[#1a1a1e] !border-white/[0.08] !text-[#eaeaec] rounded-xl hover:!bg-[#222226] hover:!border-white/[0.14] transition-all',
          socialButtonsBlockButtonText: '!text-[#b0b0b8] text-[13px]',
          dividerLine: '!bg-white/[0.06]',
          dividerText: '!text-[#4a4a54] text-[11px] uppercase tracking-wider',
          formFieldLabel: '!text-[#b0b0b8] text-[12px] font-medium',
          formFieldInput: '!bg-[#1a1a1e] !border-white/[0.08] !text-[#eaeaec] rounded-xl placeholder:!text-[#4a4a54] focus:!border-[#E0FC10]/30',
          formButtonPrimary: '!bg-[#E0FC10] !text-[#0a0a0c] font-semibold rounded-xl hover:!bg-[#eafd60] transition-all',
          footerActionText: '!text-[#787884]',
          footerActionLink: '!text-[#E0FC10] hover:!text-[#eafd60]',
          identityPreview: '!bg-[#1a1a1e] !border-white/[0.06] rounded-xl',
          identityPreviewText: '!text-[#eaeaec]',
          identityPreviewEditButton: '!text-[#E0FC10]',
          otpCodeFieldInput: '!bg-[#1a1a1e] !border-white/[0.08] !text-[#eaeaec]',
          alert: '!bg-[#ef4444]/10 !border-[#ef4444]/20 rounded-xl',
          alertText: '!text-[#ef4444] text-[13px]',
          badge: '!bg-[#E0FC10]/10 !text-[#E0FC10] !border-[#E0FC10]/20 text-[10px]',
          formFieldAction: '!text-[#E0FC10]',
          formFieldInputShowPasswordButton: '!text-[#787884] hover:!text-[#b0b0b8]',
          modalBackdrop: 'bg-black/70 backdrop-blur-sm',
          modalContent: '!bg-transparent',
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}
