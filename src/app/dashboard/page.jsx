import { Suspense } from 'react';
import DashboardLayout from '../../components/DashboardLayout';

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-vb-bg">
        <div className="flex flex-col items-center gap-3">
          <svg className="w-5 h-5 animate-spin text-vb-ink3" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-20"/>
            <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span className="text-[13px] text-vb-ink3">Loading...</span>
        </div>
      </div>
    }>
      <DashboardLayout />
    </Suspense>
  );
}
