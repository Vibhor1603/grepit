"use client";
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ViboMark } from '../components/ViboLogo';
import { ArrowLeft, Home } from 'lucide-react';

const MESSAGES = [
  "This page went to grab coffee and never came back.",
  "404: File not found. Just like my motivation on Mondays.",
  "You've reached the void. It's cozy here, but there's nothing to see.",
  "This URL is as empty as a developer's fridge at 2am.",
  "Looks like this page got garbage collected.",
  "segfault: page not found in memory (or anywhere else).",
  "git blame: nobody wrote this page. That's the problem.",
  "Error: Cannot read property 'page' of undefined.",
];

const SUBTEXTS = [
  "The page you're looking for doesn't exist, was moved, or is hiding from its responsibilities.",
  "Either you typed the URL wrong, or we broke something. Both are equally likely.",
  "This is not the page you're looking for. *waves hand*",
  "We checked everywhere. Under the couch cushions. Behind the server rack. Nothing.",
];

export default function NotFound() {
  const router = useRouter();
  const [message] = useState(() => MESSAGES[Math.floor(Math.random() * MESSAGES.length)]);
  const [subtext] = useState(() => SUBTEXTS[Math.floor(Math.random() * SUBTEXTS.length)]);
  const [path, setPath] = useState('/unknown');
  const [glitchActive, setGlitchActive] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);

  // Get path on client only
  useEffect(() => {
    setPath(window.location.pathname);
  }, []);

  // Blinking cursor effect
  useEffect(() => {
    const interval = setInterval(() => setCursorVisible(v => !v), 530);
    return () => clearInterval(interval);
  }, []);

  // Random glitch effect
  useEffect(() => {
    const glitch = setInterval(() => {
      setGlitchActive(true);
      setTimeout(() => setGlitchActive(false), 150);
    }, 4000 + Math.random() * 3000);
    return () => clearInterval(glitch);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0c] flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 50% 40% at 50% 50%, rgba(224,252,16,0.03) 0%, transparent 70%)' }} />

      {/* Floating 404 in background */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[280px] md:text-[400px] font-bold text-white/[0.02] select-none pointer-events-none tracking-tighter ${glitchActive ? 'translate-x-[2px] skew-x-1' : ''}`}
        style={{ transition: glitchActive ? 'none' : 'transform 0.3s' }}>
        404
      </div>

      {/* Content */}
      <div className="relative z-10 text-center max-w-[480px]">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-10">
          <ViboMark size={20} />
          <span className="text-[16px] font-semibold text-[#eaeaec] tracking-tight">grep<span className="text-[#E0FC10]">it</span></span>
        </div>

        {/* Terminal-style error */}
        <div className="bg-[#111113] border border-white/[0.06] rounded-xl p-5 mb-8 text-left font-mono shadow-[0_16px_48px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-[9px] h-[9px] rounded-full bg-[#ff5f57]" />
            <span className="w-[9px] h-[9px] rounded-full bg-[#febc2e]" />
            <span className="w-[9px] h-[9px] rounded-full bg-[#28c840]" />
            <span className="text-[9px] text-[#4a4a54] ml-2">terminal — 404</span>
          </div>
          <div className="space-y-1.5">
            <p className="text-[11px] text-[#787884]">
              <span className="text-[#E0FC10]">$</span> curl {path}
            </p>
            <p className={`text-[12px] text-[#ef4444] ${glitchActive ? 'opacity-60' : ''}`}>
              <span className="text-[#787884]">error:</span> {message}
              <span className={`inline-block w-[7px] h-[14px] bg-[#E0FC10] ml-0.5 align-middle ${cursorVisible ? 'opacity-100' : 'opacity-0'}`} />
            </p>
          </div>
        </div>

        {/* Subtext */}
        <p className="text-[13px] text-[#787884] leading-relaxed mb-8">
          {subtext}
        </p>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => router.back()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[12px] font-medium text-[#b0b0b8] bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.1] transition-all">
            <ArrowLeft size={13} /> Go back
          </button>
          <button onClick={() => router.push('/')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[12px] font-medium text-[#0a0a0c] bg-[#E0FC10] hover:bg-[#eafd60] transition-all hover:shadow-[0_4px_12px_rgba(224,252,16,0.15)]">
            <Home size={13} /> Take me home
          </button>
        </div>
      </div>
    </div>
  );
}
