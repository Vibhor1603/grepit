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
    <div className="min-h-screen bg-c-bg flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 50% 40% at 50% 50%, var(--c-accent-glow) 0%, transparent 70%)' }} />

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
          <span className="text-[16px] font-semibold text-c-text tracking-tight">grep<span className="text-c-accent">it</span></span>
        </div>

        {/* Terminal-style error */}
        <div className="bg-c-surface border border-c-line rounded-xl p-5 mb-8 text-left font-mono shadow-[0_16px_48px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-[9px] h-[9px] rounded-full bg-[#ff5f57]" />
            <span className="w-[9px] h-[9px] rounded-full bg-[#febc2e]" />
            <span className="w-[9px] h-[9px] rounded-full bg-c-lime" />
            <span className="text-[9px] text-[#3A4350] ml-2">terminal · 404</span>
          </div>
          <div className="space-y-1.5">
            <p className="text-[11px] text-c-text-3">
              <span className="text-c-accent">$</span> curl {path}
            </p>
            <p className={`text-[12px] text-[#FCA5A5] ${glitchActive ? 'opacity-60' : ''}`}>
              <span className="text-c-text-3">error:</span> {message}
              <span className={`inline-block w-[7px] h-[14px] bg-c-accent ml-0.5 align-middle ${cursorVisible ? 'opacity-100' : 'opacity-0'}`} />
            </p>
          </div>
        </div>

        {/* Subtext */}
        <p className="text-[13px] text-c-text-3 leading-relaxed mb-8">
          {subtext}
        </p>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => router.back()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[12px] font-medium text-c-text-2 bg-c-overlay-2 border border-c-line hover:bg-c-overlay-4 hover:border-c-line-3 transition-all">
            <ArrowLeft size={13} /> Go back
          </button>
          <button onClick={() => router.push('/')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[12px] font-medium text-c-bg bg-c-accent hover:bg-c-accent-bright transition-all hover:shadow-[var(--shadow-2)]">
            <Home size={13} /> Take me home
          </button>
        </div>
      </div>
    </div>
  );
}
