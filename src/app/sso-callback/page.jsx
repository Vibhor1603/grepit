"use client";
import { AuthenticateWithRedirectCallback } from '@clerk/nextjs';

export default function SSOCallback() {
  return (
    <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
      <div className="flex items-center gap-3">
        <svg className="w-5 h-5 animate-spin text-[#E0FC10]" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-20"/>
          <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <span className="text-[14px] text-[#787884]">Signing you in...</span>
      </div>
      <AuthenticateWithRedirectCallback />
    </div>
  );
}
