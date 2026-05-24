"use client";
import { useState, useEffect } from 'react';
import { Monitor } from 'lucide-react';

/**
 * Full-screen centered modal on mobile/tablet suggesting desktop use.
 * Shows once per session. Dismissed with "Got it" button.
 */
export default function MobileNotice() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const isMobile = window.innerWidth < 1024;
    const dismissed = sessionStorage.getItem('grepit-mobile-notice-dismissed');
    if (isMobile && !dismissed) {
      setShow(true);
    }
  }, []);

  const dismiss = () => {
    setShow(false);
    sessionStorage.setItem('grepit-mobile-notice-dismissed', 'true');
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
      <div className="w-full max-w-[320px] bg-[#111113] border border-white/[0.08] rounded-2xl p-6 shadow-[0_32px_80px_rgba(0,0,0,0.7)] text-center">
        <div className="w-12 h-12 mx-auto rounded-xl bg-[#E0FC10]/[0.08] border border-[#E0FC10]/20 flex items-center justify-center mb-4">
          <Monitor size={20} className="text-[#E0FC10]" />
        </div>
        <h3 className="text-[15px] font-semibold text-[#eaeaec] mb-2">Best on desktop</h3>
        <p className="text-[12px] text-[#787884] leading-relaxed mb-5">
          Grepit is designed for larger screens. The code explorer, diagrams, and chat work best on a laptop or desktop.
        </p>
        <button
          onClick={dismiss}
          className="w-full py-2.5 rounded-xl text-[13px] font-medium bg-[#E0FC10] text-[#0a0a0c] hover:bg-[#eafd60] transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
