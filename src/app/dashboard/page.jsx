import { Suspense } from 'react';
import DashboardLayout from '../../components/DashboardLayout';

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-cream dark:bg-d-bg">
        <div className="text-center">
          <svg className="w-5 h-5 animate-spin mx-auto mb-2 text-ink-faint" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-20"/>
            <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span className="text-sm font-mono text-ink-faint">loading...</span>
        </div>
      </div>
    }>
      <DashboardLayout />
    </Suspense>
  );
}
