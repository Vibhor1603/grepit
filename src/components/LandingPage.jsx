"use client";
import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useUser, SignOutButton } from '@clerk/nextjs';
import { ViboMark } from './ViboLogo';
import { SITE_CONFIG } from '../lib/landing-config';
import { getAllPlans, PLANS } from '../config/plans';
import { MessageSquare, Code2, Shield, Zap, Lock, ArrowRight, Check, X, Sparkles, Terminal, BarChart3, Layers, ArrowUpRight, UserCircle } from 'lucide-react';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { trackAnalysisStarted, trackAnalysisFailed, trackCheckoutStarted, trackUpgradeClicked } from '../lib/analytics';
import { NewEngineerAnswer, TechLeadAnswer, FreelancerAnswer, OSSContributorAnswer } from './UseCaseAnswers';

const GridBackground = dynamic(() => import('./GridBackground'), { ssr: false });

const AUTH_ERRORS = {
  AccessDenied: 'GitHub denied access.',
  Callback: 'GitHub sign-in could not be completed. Try again.',
  Configuration: 'Auth is misconfigured. Check GitHub OAuth settings.',
  Default: 'Sign-in did not complete. Try again.',
  OAuthAccountNotLinked: 'This email is linked to a different sign-in method.',
  OAuthCallback: 'GitHub returned an invalid callback.',
  OAuthCreateAccount: 'GitHub sign-in could not create a session.',
  SessionRequired: 'Please sign in to continue.',
};

async function parseJsonResponse(res) {
  const raw = await res.text();
  if (!raw) return {};
  try { return JSON.parse(raw); }
  catch { throw new Error(`Server returned an invalid response (HTTP ${res.status}).`); }
}

/* ─── Branded "grepit" text — matches the logo: Grep in white, it in accent ─── */
function GrepitText({ className = '' }) {
  return (
    <span className={`font-semibold tracking-tight ${className}`}>
      Grep<span className="text-[#E0FC10]">it</span>
    </span>
  );
}

function Section({ children, className = '', delay = 0 }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.section ref={ref} className={className}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}>
      {children}
    </motion.section>
  );
}

/* ─── MOCK UI COMPONENTS ─── */

function MockWindowChrome({ title = 'grepit' }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.06] bg-[#111113]">
      <span className="w-[10px] h-[10px] rounded-full bg-[#ff5f57]" />
      <span className="w-[10px] h-[10px] rounded-full bg-[#febc2e]" />
      <span className="w-[10px] h-[10px] rounded-full bg-[#28c840]" />
      <span className="text-[10px] text-[#4a4a54] ml-3 font-mono tracking-wide">{title}</span>
    </div>
  );
}

function MockChatUI() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#111113] overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.6)]">
      <MockWindowChrome title="grepit — ai chat" />
      <div className="p-5 space-y-4">
        {/* User message */}
        <div className="flex justify-end">
          <div className="bg-white/[0.05] border border-white/[0.08] rounded-xl rounded-tr-sm px-4 py-3 max-w-[80%]">
            <p className="text-[13px] text-[#eaeaec]">How does the auth middleware work?</p>
          </div>
        </div>
        {/* AI response */}
        <div className="flex justify-start">
          <div className="bg-[#0a0a0c] border border-white/[0.06] rounded-xl rounded-tl-sm px-4 py-3 max-w-[90%]">
            <p className="text-[13px] text-[#b0b0b8] leading-[1.7] mb-3">
              The auth middleware uses <span className="text-[#E0FC10] font-medium">Clerk</span> to protect routes. It intercepts every request and validates the session token before allowing access to protected endpoints.
            </p>
            {/* Code block */}
            <div className="rounded-lg bg-[#0a0a0c] border border-white/[0.08] p-3 font-mono text-[11px] leading-[1.8]">
              <span style={{ color: '#E0FC10' }}>export default</span>{' '}
              <span style={{ color: '#eaeaec' }}>clerkMiddleware(</span>
              <span style={{ color: '#4a4a54' }}>{'// protects all routes'}</span>
              <br />
              <span style={{ color: '#eaeaec' }}>{'  (auth, req) => '}</span>
              <span style={{ color: '#E0FC10' }}>{'{'}</span>
              <br />
              <span style={{ color: '#eaeaec' }}>{'    '}</span>
              <span style={{ color: '#E0FC10' }}>if</span>
              <span style={{ color: '#eaeaec' }}>{' (!auth.userId) '}</span>
              <span style={{ color: '#E0FC10' }}>return</span>
              <span style={{ color: '#eaeaec' }}>{' auth.'}</span>
              <span style={{ color: '#7dd3a8' }}>redirectToSignIn</span>
              <span style={{ color: '#eaeaec' }}>();</span>
              <br />
              <span style={{ color: '#E0FC10' }}>{'  }'}</span>
              <span style={{ color: '#eaeaec' }}>);</span>
            </div>
            {/* Follow-up chips */}
            <div className="flex gap-2 mt-3 flex-wrap">
              {['Show route config', 'What about API routes?', 'Security concerns?'].map(q => (
                <span key={q} className="text-[10px] px-2.5 py-1 rounded-full border border-white/[0.08] text-[#787884] bg-white/[0.02]">{q}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MockMermaidDiagram() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#111113] overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.6)]">
      <MockWindowChrome title="grepit — architecture" />
      <div className="p-6 flex items-center justify-center">
        <svg width="420" height="180" viewBox="0 0 420 180" fill="none" className="w-full h-auto">
          {/* Nodes */}
          <rect x="10" y="70" width="70" height="36" rx="8" stroke="#E0FC10" strokeWidth="1.5" fill="rgba(224,252,16,0.04)" />
          <text x="45" y="92" textAnchor="middle" fill="#eaeaec" fontSize="10" fontFamily="monospace">Request</text>

          <rect x="110" y="70" width="80" height="36" rx="8" stroke="#7cc8d4" strokeWidth="1.5" fill="rgba(124,200,212,0.04)" />
          <text x="150" y="92" textAnchor="middle" fill="#eaeaec" fontSize="10" fontFamily="monospace">Middleware</text>

          <rect x="220" y="70" width="76" height="36" rx="8" stroke="#b4a0d4" strokeWidth="1.5" fill="rgba(180,160,212,0.04)" />
          <text x="258" y="92" textAnchor="middle" fill="#eaeaec" fontSize="10" fontFamily="monospace">Controller</text>

          <rect x="326" y="70" width="76" height="36" rx="8" stroke="#7dd3a8" strokeWidth="1.5" fill="rgba(125,211,168,0.04)" />
          <text x="364" y="92" textAnchor="middle" fill="#eaeaec" fontSize="10" fontFamily="monospace">Database</text>

          <rect x="220" y="130" width="76" height="36" rx="8" stroke="#E0FC10" strokeWidth="1.5" fill="rgba(224,252,16,0.04)" />
          <text x="258" y="152" textAnchor="middle" fill="#eaeaec" fontSize="10" fontFamily="monospace">Response</text>

          {/* Arrows */}
          <path d="M80 88 L110 88" stroke="#4a4a54" strokeWidth="1" markerEnd="url(#arrowhead)" />
          <path d="M190 88 L220 88" stroke="#4a4a54" strokeWidth="1" markerEnd="url(#arrowhead)" />
          <path d="M296 88 L326 88" stroke="#4a4a54" strokeWidth="1" markerEnd="url(#arrowhead)" />
          <path d="M258 106 L258 130" stroke="#4a4a54" strokeWidth="1" markerEnd="url(#arrowhead)" />

          {/* Arrow marker */}
          <defs>
            <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#4a4a54" />
            </marker>
          </defs>
        </svg>
      </div>
    </div>
  );
}

function MockFileExplorer() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#111113] overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.6)]">
      <MockWindowChrome title="grepit — explorer" />
      <div className="p-4 font-mono text-[11px] space-y-1">
        {[
          { name: 'src/', type: 'folder', open: true, indent: 0 },
          { name: 'components/', type: 'folder', open: true, indent: 1 },
          { name: 'Dashboard.tsx', type: 'file', lang: '#7cc8d4', indent: 2, selected: true },
          { name: 'Sidebar.tsx', type: 'file', lang: '#7cc8d4', indent: 2 },
          { name: 'Chart.tsx', type: 'file', lang: '#7cc8d4', indent: 2 },
          { name: 'lib/', type: 'folder', open: false, indent: 1 },
          { name: 'hooks/', type: 'folder', open: false, indent: 1 },
          { name: 'middleware.ts', type: 'file', lang: '#E0FC10', indent: 1 },
          { name: 'package.json', type: 'file', lang: '#7dd3a8', indent: 0 },
          { name: 'tsconfig.json', type: 'file', lang: '#b4a0d4', indent: 0 },
        ].map((item, i) => (
          <div key={i}
            className={`flex items-center gap-2 px-2 py-1 rounded-md ${item.selected ? 'bg-[#E0FC10]/[0.06] border border-[#E0FC10]/20' : ''}`}
            style={{ paddingLeft: `${item.indent * 16 + 8}px` }}>
            {item.type === 'folder' ? (
              <span className="text-[#787884]">{item.open ? '▾' : '▸'}</span>
            ) : (
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.lang }} />
            )}
            <span className={item.selected ? 'text-[#eaeaec]' : 'text-[#b0b0b8]'}>{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockSecurityReport() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#111113] overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.6)]">
      <MockWindowChrome title="grepit — security audit" />
      <div className="p-5">
        {/* Health score */}
        <div className="flex items-center gap-5 mb-5">
          <div className="relative w-20 h-20 flex-shrink-0">
            <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
              <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="6" />
              <circle cx="40" cy="40" r="34" fill="none" stroke="#E0FC10" strokeWidth="6"
                strokeDasharray={`${87 * 2.136} ${(100 - 87) * 2.136}`}
                strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[18px] font-bold text-[#eaeaec]">87</span>
            </div>
          </div>
          <div>
            <p className="text-[14px] font-semibold text-[#eaeaec]">Health Score</p>
            <p className="text-[11px] text-[#787884]">3 issues found · 2 warnings</p>
          </div>
        </div>
        {/* Issue cards */}
        <div className="space-y-2">
          {[
            { severity: '#ef4444', title: 'Hardcoded API key', file: 'src/lib/api.ts:24' },
            { severity: '#febc2e', title: 'Missing input validation', file: 'src/routes/user.ts:18' },
            { severity: '#febc2e', title: 'No rate limiting on endpoint', file: 'src/routes/auth.ts:7' },
          ].map((issue, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: issue.severity }} />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-[#eaeaec] font-medium">{issue.title}</p>
                <p className="text-[10px] text-[#4a4a54] font-mono">{issue.file}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── PRODUCT SHOWCASE (Horizontal Scroll Sticky) ─── */

function ProductShowcase() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start start', 'end end'] });
  const x = useTransform(scrollYProgress, [0, 1], ['0%', '-75%']);

  const panels = [
    { caption: 'AI Chat', subtitle: 'Ask anything about the code. Get grounded answers with file citations.', component: <MockChatUI /> },
    { caption: 'Architecture', subtitle: 'Auto-generated diagrams showing how your code connects.', component: <MockMermaidDiagram /> },
    { caption: 'File Explorer', subtitle: 'Browse source with syntax highlighting and live search.', component: <MockFileExplorer /> },
    { caption: 'Security Audit', subtitle: 'Instant vulnerability scan with severity-tagged findings.', component: <MockSecurityReport /> },
  ];

  return (
    <section ref={containerRef} className="relative z-[1]" style={{ height: `${panels.length * 100}vh` }}>
      <div className="sticky top-0 h-screen flex items-center overflow-hidden">
        <div className="absolute top-24 left-8 md:left-16 z-10">
          <p className="text-[10px] text-[#E0FC10] tracking-[3px] uppercase mb-3 font-medium">See it in action</p>
          <h2 className="text-[28px] md:text-[36px] font-semibold tracking-tight leading-tight text-[#eaeaec]">
            A complete intelligence<br />dashboard
          </h2>
        </div>

        {/* Progress dots */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {panels.map((_, i) => (
            <motion.div
              key={i}
              style={{
                opacity: useTransform(
                  scrollYProgress,
                  [i / panels.length, (i + 0.5) / panels.length, (i + 1) / panels.length],
                  [0.3, 1, 0.3]
                ),
                scaleX: useTransform(
                  scrollYProgress,
                  [i / panels.length, (i + 0.5) / panels.length, (i + 1) / panels.length],
                  [1, 2.5, 1]
                ),
              }}
              className="h-1 w-4 rounded-full bg-[#E0FC10] origin-left"
            />
          ))}
        </div>

        <motion.div className="flex gap-8 pl-[5vw] pt-20" style={{ x }}>
          {panels.map((panel, i) => (
            <motion.div key={i} className="flex-shrink-0 w-[85vw] md:w-[55vw] flex items-center gap-8">
              <div className="hidden md:block w-[200px] flex-shrink-0">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.1 }}>
                  <p className="text-[16px] font-semibold text-[#eaeaec] mb-2">{panel.caption}</p>
                  <p className="text-[12px] text-[#787884] leading-relaxed">{panel.subtitle}</p>
                </motion.div>
              </div>
              <div className="flex-1 max-w-[600px]">
                {panel.component}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ─── PERSISTENT MEMORY — "Your codebase, on speed dial" ─── */

function PersistentMemory({ onCta }) {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start end', 'end start'] });
  const leftX = useTransform(scrollYProgress, [0, 0.5, 1], [-60, 0, -20]);
  const rightX = useTransform(scrollYProgress, [0, 0.5, 1], [60, 0, 20]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);

  const withoutgrepit = [
    { q: 'how does auth work in this codebase?', tokens: '~180K tokens', time: '45s', bad: true },
    { q: 'wait, what was the middleware again?', tokens: '~180K tokens', time: '45s', bad: true },
    { q: 'explain the payment flow', tokens: '~180K tokens', time: '45s', bad: true },
  ];

  const withgrepit = [
    { q: 'how does auth work?', tokens: '~4K tokens', time: '2s', bad: false },
    { q: 'what does the middleware do?', tokens: '~4K tokens', time: '2s', bad: false },
    { q: 'explain the payment flow', tokens: '~4K tokens', time: '2s', bad: false },
  ];

  return (
    <section ref={containerRef} className="relative z-[1] py-32 px-6 md:px-8 overflow-hidden" id="features">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[#E0FC10]/[0.02] rounded-full blur-[120px]" />
      </div>

      <div className="max-w-[1060px] mx-auto">
        <div className="text-center mb-20">
          <motion.p initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-[10px] text-[#E0FC10] tracking-[3px] uppercase mb-3 font-medium">The problem</motion.p>
          <motion.h2 initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
            className="text-[32px] md:text-[48px] font-semibold tracking-tight leading-[1.1] mb-5">
            Stop re-explaining your<br />codebase every session
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
            className="text-[15px] text-[#787884] max-w-[520px] mx-auto leading-relaxed">
            Every time you ask Claude or GPT about your code, it re-reads everything from scratch. 
            That&apos;s 100K-500K tokens per question. grepit indexes once, answers forever.
          </motion.p>
        </div>

        <motion.div style={{ opacity }} className="grid md:grid-cols-2 gap-6">
          {/* Without grepit */}
          <motion.div style={{ x: leftX }}
            className="rounded-2xl border border-red-500/20 bg-red-500/[0.03] overflow-hidden">
            <div className="px-5 py-4 border-b border-red-500/10 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500/60" />
              <span className="text-[11px] font-medium text-red-400/80 uppercase tracking-wider">Without grepit</span>
              <span className="ml-auto text-[10px] text-red-400/40 font-mono">Claude / GPT / Cursor</span>
            </div>
            <div className="p-5 space-y-3">
              {withoutgrepit.map((item, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-[11px] text-[#787884] font-mono mt-0.5">›</span>
                    <span className="text-[12px] text-[#b0b0b8]">{item.q}</span>
                  </div>
                  <div className="flex items-center gap-3 pl-4">
                    <span className="text-[10px] font-mono text-red-400/70 bg-red-500/10 px-2 py-0.5 rounded">{item.tokens}</span>
                    <span className="text-[10px] text-[#4a4a54]">{item.time} wait</span>
                    <span className="text-[10px] text-red-400/50 ml-auto">context lost on refresh ↻</span>
                  </div>
                </motion.div>
              ))}
              <div className="pt-2 flex items-center gap-2">
                <div className="flex-1 h-px bg-red-500/10" />
                <span className="text-[10px] text-red-400/50 font-mono">~540K tokens/session · $2-8 per session</span>
                <div className="flex-1 h-px bg-red-500/10" />
              </div>
            </div>
          </motion.div>

          {/* With grepit */}
          <motion.div style={{ x: rightX }}
            className="rounded-2xl border border-[#E0FC10]/20 bg-[#E0FC10]/[0.02] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E0FC10]/10 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#E0FC10] animate-pulse" />
              <span className="text-[11px] font-medium text-[#E0FC10]/80 uppercase tracking-wider">With grepit</span>
              <span className="ml-auto text-[10px] text-[#E0FC10]/40 font-mono">indexed once, answers forever</span>
            </div>
            <div className="p-5 space-y-3">
              {withgrepit.map((item, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 + 0.1 }}
                  className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-[11px] text-[#E0FC10]/60 font-mono mt-0.5">›</span>
                    <span className="text-[12px] text-[#b0b0b8]">{item.q}</span>
                  </div>
                  <div className="flex items-center gap-3 pl-4">
                    <span className="text-[10px] font-mono text-[#E0FC10]/70 bg-[#E0FC10]/10 px-2 py-0.5 rounded">{item.tokens}</span>
                    <span className="text-[10px] text-[#4a4a54]">{item.time} response</span>
                    <span className="text-[10px] text-[#E0FC10]/40 ml-auto">permanent memory ✓</span>
                  </div>
                </motion.div>
              ))}
              <div className="pt-2 flex items-center gap-2">
                <div className="flex-1 h-px bg-[#E0FC10]/10" />
                <span className="text-[10px] text-[#E0FC10]/50 font-mono">~12K tokens/session · $0.04 per session</span>
                <div className="flex-1 h-px bg-[#E0FC10]/10" />
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="text-center mt-14">
          <p className="text-[14px] text-[#787884] mb-5">
            Analyze once. Ask anything. Forever. <span className="text-[#E0FC10]">Use your AI tools for actual work.</span>
          </p>
          <motion.button onClick={onCta} whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.98 }}
            className="inline-flex items-center gap-2 text-[13px] font-medium bg-[#E0FC10] text-[#0a0a0c] py-3 px-7 rounded-xl hover:bg-[#eafd60] transition-all">
            Try it free — no credit card <ArrowRight size={14} />
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── KNOW WHAT YOU'RE SHIPPING — Outcome stories ─── */

/* ─── USE CASES — Premium tabbed showcase ─── */

function UseCases({ onCta }) {
  const [activeTab, setActiveTab] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const tabsRef = useRef(null);

  const features = [
    {
      label: 'AI Chat',
      title: 'Ask anything about your code',
      desc: 'Grounded answers with file citations. Every response anchored to your actual source — no hallucinations, no generic advice.',
      mock: <MockChatUI />,
    },
    {
      label: 'Security',
      title: 'Catch issues before they ship',
      desc: 'Hardcoded secrets, unsafe patterns, missing validation — all flagged with severity and exact line numbers. Full audit in under a minute.',
      mock: <MockSecurityReport />,
    },
    {
      label: 'Architecture',
      title: 'Visualize how your code connects',
      desc: 'Auto-generated dependency graphs, flow diagrams, and system maps. Always in sync with your code, ready to share with stakeholders.',
      mock: <MockMermaidDiagram />,
    },
    {
      label: 'Explorer',
      title: 'Browse like you wrote it',
      desc: 'Full file tree with syntax highlighting, live search, and inline explanations. Navigate any codebase like you have been in it for years.',
      mock: <MockFileExplorer />,
    },
  ];

  // Autoplay rotation
  useEffect(() => {
    if (!autoplay) return;
    const interval = setInterval(() => {
      setActiveTab(prev => (prev + 1) % features.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [autoplay, features.length]);

  const active = features[activeTab];

  return (
    <section className="relative z-[1] py-32 px-6 md:px-8 overflow-hidden" id="features">
      <div className="max-w-[1100px] mx-auto">
        <div className="text-center mb-16">
          <motion.p initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-[10px] text-[#E0FC10] tracking-[3px] uppercase mb-3 font-medium">What it does</motion.p>
          <motion.h2 initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
            className="text-[34px] md:text-[48px] font-semibold tracking-tight leading-[1.05]">
            Four tools.<br />One analysis.
          </motion.h2>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl bg-[#111113] border border-white/[0.06] overflow-hidden">

          {/* Tab bar — top */}
          <div ref={tabsRef} className="relative flex border-b border-white/[0.06] bg-[#0d0d0f]">
            {features.map((f, i) => (
              <button key={i}
                onClick={() => { setActiveTab(i); setAutoplay(false); }}
                onMouseEnter={() => setAutoplay(false)}
                className={`relative flex-1 px-6 py-4 text-left transition-colors ${
                  activeTab === i ? 'text-[#eaeaec]' : 'text-[#787884] hover:text-[#b0b0b8]'
                }`}>
                <div className="flex items-center gap-2 mb-0.5">
                  {activeTab === i && (
                    <motion.div layoutId="active-dot"
                      className="w-1.5 h-1.5 rounded-full bg-[#E0FC10]"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
                  )}
                  {activeTab !== i && <div className="w-1.5 h-1.5 rounded-full bg-white/[0.1]" />}
                  <span className={`text-[12px] font-medium ${activeTab === i ? 'text-[#eaeaec]' : ''}`}>{f.label}</span>
                </div>
                {activeTab === i && autoplay && (
                  <motion.div
                    className="absolute bottom-0 left-0 h-px bg-[#E0FC10]"
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 5, ease: 'linear' }}
                    key={activeTab}
                  />
                )}
                {activeTab === i && !autoplay && (
                  <div className="absolute bottom-0 left-0 right-0 h-px bg-[#E0FC10]" />
                )}
              </button>
            ))}
          </div>

          {/* Content area */}
          <div className="grid md:grid-cols-[0.8fr_1.2fr] gap-0 min-h-[460px]">
            {/* Left: description */}
            <div className="p-10 md:p-12 flex flex-col justify-center border-b md:border-b-0 md:border-r border-white/[0.06]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
                  <h3 className="text-[24px] md:text-[28px] font-semibold text-[#eaeaec] leading-tight tracking-tight mb-4">
                    {active.title}
                  </h3>
                  <p className="text-[14px] text-[#787884] leading-[1.7] mb-7">
                    {active.desc}
                  </p>
                  <motion.button onClick={onCta} whileHover={{ x: 4 }}
                    className="inline-flex items-center gap-2 text-[13px] font-medium text-[#E0FC10] hover:text-[#eafd60] transition-colors">
                    Try it free <ArrowRight size={14} />
                  </motion.button>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Right: mock preview */}
            <div className="relative p-8 md:p-10 bg-gradient-to-br from-[#0d0d0f] to-[#0a0a0c] flex items-center justify-center overflow-hidden">
              {/* Subtle grid background */}
              <div className="absolute inset-0 opacity-[0.4]" style={{
                backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)',
                backgroundSize: '24px 24px'
              }} />

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, scale: 0.96, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -8 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="relative w-full max-w-[480px]">
                  {active.mock}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── TOKEN DRAIN — Live counter ─── */

function TokenDrain() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: false, margin: '-100px' });
  const [tokens, setTokens] = useState(0);
  const [cost, setCost] = useState(0);
  const [running, setRunning] = useState(false);
  const frameRef = useRef(null);
  const startRef = useRef(null);

  const TARGET_TOKENS = 180000;
  const DURATION = 4000;

  const runDrain = () => {
    if (running) return;
    setRunning(true);
    setTokens(0);
    setCost(0);
    startRef.current = performance.now();

    const animate = (now) => {
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / DURATION, 1);
      const eased = 1 - Math.pow(1 - progress, 2);
      const t = Math.round(eased * TARGET_TOKENS);
      setTokens(t);
      setCost(((t / 1_000_000) * 3).toFixed(4));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setRunning(false);
      }
    };
    frameRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (isInView && !running && tokens === 0) runDrain();
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [isInView]); // eslint-disable-line

  return (
    <section ref={ref} className="relative z-[1] py-28 px-6 md:px-8">
      <div className="max-w-[800px] mx-auto">
        <div className="text-center mb-16">
          <motion.p initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-[10px] text-[#E0FC10] tracking-[3px] uppercase mb-3 font-medium">The token problem</motion.p>
          <motion.h2 initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
            className="text-[30px] md:text-[42px] font-semibold tracking-tight leading-tight mb-4">
            This is what happens when you ask<br /><span className="text-red-400">&ldquo;how does auth work?&rdquo;</span>
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
            className="text-[14px] text-[#787884] max-w-[480px] mx-auto leading-relaxed">
            Your AI tool reads your entire codebase to answer one question. Every. Single. Time.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-2xl border border-white/[0.08] bg-[#111113] overflow-hidden">
          {/* Terminal header */}
          <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center gap-2 bg-[#0d0d0f]">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-amber-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
            </div>
            <span className="ml-2 text-[11px] text-[#4a4a54] font-mono">claude-3-sonnet — context window</span>
          </div>

          <div className="p-8">
            {/* Token counter */}
            <div className="text-center mb-8">
              <div className="text-[11px] text-[#4a4a54] font-mono mb-2 uppercase tracking-wider">tokens consumed</div>
              <div className="text-[64px] md:text-[80px] font-bold font-mono leading-none text-red-400 tabular-nums">
                {tokens.toLocaleString()}
              </div>
              <div className="text-[13px] text-[#787884] mt-2 font-mono">
                ≈ <span className="text-red-400">${cost}</span> for this one question
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-3 rounded-full bg-white/[0.04] overflow-hidden mb-3">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-400"
                style={{ width: `${(tokens / TARGET_TOKENS) * 100}%` }}
                transition={{ duration: 0.05 }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-[#4a4a54] font-mono mb-8">
              <span>0</span>
              <span className="text-red-400/60">reading your entire codebase...</span>
              <span>180K</span>
            </div>

            {/* Divider */}
            <div className="border-t border-white/[0.06] pt-8">
              <div className="text-center mb-4">
                <span className="text-[11px] text-[#4a4a54] uppercase tracking-wider">vs. grepit</span>
              </div>
              <div className="flex items-center justify-center gap-8">
                <div className="text-center">
                  <div className="text-[32px] font-bold font-mono text-[#E0FC10]">4K</div>
                  <div className="text-[11px] text-[#4a4a54]">tokens per query</div>
                </div>
                <div className="text-[#4a4a54] text-2xl">vs</div>
                <div className="text-center">
                  <div className="text-[32px] font-bold font-mono text-red-400">180K</div>
                  <div className="text-[11px] text-[#4a4a54]">tokens per query</div>
                </div>
              </div>
              <div className="text-center mt-6">
                <span className="text-[12px] text-[#E0FC10]/60 font-mono">45× cheaper per question</span>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="text-center mt-6">
          <button onClick={runDrain} disabled={running}
            className="text-[11px] text-[#4a4a54] hover:text-[#787884] transition-colors font-mono disabled:opacity-30">
            {running ? 'draining...' : '↺ replay'}
          </button>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── FEATURE DEEP-DIVE (kept for backward compat, now replaced) ─── */

function FeatureDeepDive({ onCta }) {
  return null; // Replaced by PersistentMemory + KnowWhatYoureShipping
}

/* ─── POSITIONING — We don't write code ─── */

/* ─── EFFICIENCY — Why grepit saves you money ─── */

function DivisionOfLabour({ onCta }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section ref={ref} className="relative z-[1] py-32 px-6 md:px-8 overflow-hidden" id="features">
      <div className="max-w-[1100px] mx-auto">
        <div className="text-center mb-20">
          <motion.p initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-[10px] text-[#E0FC10] tracking-[3px] uppercase mb-3 font-medium">Work smarter</motion.p>
          <motion.h2 initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
            className="text-[34px] md:text-[52px] font-semibold tracking-tight leading-[1.05] mb-5">
            Your AI tools are expensive<br />at the wrong things.
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
            className="text-[15px] text-[#787884] max-w-[520px] mx-auto leading-relaxed">
            Every time you ask your AI about your codebase, it re-reads everything from scratch. That&apos;s hundreds of thousands of tokens — per question. <GrepitText /> indexes once and answers forever.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {/* Left card: The expensive way */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="relative rounded-2xl bg-[#111113] border border-white/[0.06] overflow-hidden">

            <div className="p-7 border-b border-white/[0.06]">
              <div className="text-[10px] font-mono text-[#4a4a54] uppercase tracking-wider mb-3">The expensive way</div>
              <h3 className="text-[16px] font-medium text-[#eaeaec] leading-snug">
                Re-read the entire codebase for every question
              </h3>
            </div>

            <div className="p-7 bg-[#0d0d0f]">
              <div className="font-mono text-[11px] space-y-2.5">
                <motion.div initial={{ opacity: 0 }} animate={isInView ? { opacity: 1 } : {}} transition={{ delay: 0.4 }}>
                  <span className="text-[#787884]">$ </span>
                  <span className="text-[#b0b0b8]">how does the payment flow work?</span>
                </motion.div>
                <motion.div initial={{ opacity: 0 }} animate={isInView ? { opacity: 1 } : {}} transition={{ delay: 0.7 }}
                  className="flex items-center gap-2 text-[#4a4a54]">
                  <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-20" />
                    <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  reading 50K–200K tokens of context...
                </motion.div>
                <motion.div initial={{ opacity: 0 }} animate={isInView ? { opacity: 1 } : {}} transition={{ delay: 1.0 }}
                  className="text-[#787884] leading-relaxed pl-3 border-l border-white/[0.06]">
                  the payment flow starts in checkout.js...
                  <div className="mt-1 text-[#4a4a54] text-[10px]">context lost on next session</div>
                </motion.div>
              </div>

              <motion.div initial={{ opacity: 0 }} animate={isInView ? { opacity: 1 } : {}} transition={{ delay: 1.2 }}
                className="mt-6 pt-5 border-t border-white/[0.06]">
                <div className="text-[10px] text-[#4a4a54] font-mono uppercase tracking-wider mb-1">per question</div>
                <div className="text-[28px] font-semibold text-[#ef4444] leading-none tabular-nums">~$0.15–0.50</div>
                <div className="text-[11px] text-[#4a4a54] mt-1">adds up fast at 10+ questions/day</div>
              </motion.div>
            </div>
          </motion.div>

          {/* Right card: The grepit way */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            className="relative rounded-2xl bg-[#111113] border border-[#E0FC10]/15 overflow-hidden shadow-[0_0_60px_rgba(224,252,16,0.04)]">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#E0FC10]/50 to-transparent" />

            <div className="p-7 border-b border-white/[0.06]">
              <div className="text-[10px] font-mono text-[#E0FC10]/60 uppercase tracking-wider mb-3">The <GrepitText className="text-[10px]" /> way</div>
              <h3 className="text-[16px] font-medium text-[#eaeaec] leading-snug">
                Index once. Query forever. Cite exact files.
              </h3>
            </div>

            <div className="p-7 bg-[#0d0d0f]">
              <div className="font-mono text-[11px] space-y-2.5">
                <motion.div initial={{ opacity: 0 }} animate={isInView ? { opacity: 1 } : {}} transition={{ delay: 0.5 }}>
                  <span className="text-[#787884]">$ </span>
                  <span className="text-[#b0b0b8]">how does the payment flow work?</span>
                </motion.div>
                <motion.div initial={{ opacity: 0 }} animate={isInView ? { opacity: 1 } : {}} transition={{ delay: 0.7 }}
                  className="text-[#E0FC10]/60 flex items-center gap-1.5">
                  <Check size={11} strokeWidth={2.5} />
                  ~4K tokens · pre-indexed · instant
                </motion.div>
                <motion.div initial={{ opacity: 0 }} animate={isInView ? { opacity: 1 } : {}} transition={{ delay: 0.9 }}
                  className="text-[#787884] leading-relaxed pl-3 border-l border-[#E0FC10]/15">
                  the payment flow starts in checkout.js, calls the billing API in...
                  <div className="mt-1 text-[#4a4a54] text-[10px]">[src/app/api/dodo/create-checkout/route.js:52]</div>
                </motion.div>
              </div>

              <motion.div initial={{ opacity: 0 }} animate={isInView ? { opacity: 1 } : {}} transition={{ delay: 1.2 }}
                className="mt-6 pt-5 border-t border-white/[0.06]">
                <div className="text-[10px] text-[#4a4a54] font-mono uppercase tracking-wider mb-1">starts at</div>
                <div className="text-[28px] font-semibold text-[#E0FC10] leading-none tabular-nums">{PLANS.starter.price}/mo</div>
                <div className="text-[11px] text-[#4a4a54] mt-1">{PLANS.starter.maxAiQueriesPerDay} queries/day · flat rate</div>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Bottom tagline */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mt-12 text-center">
          <p className="text-[14px] text-[#787884] mb-5">
            Let your AI tools focus on writing code. Let <GrepitText /> handle everything else.
          </p>
          <motion.button onClick={onCta} whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.98 }}
            className="inline-flex items-center gap-2 text-[13px] font-medium bg-[#E0FC10] text-[#0a0a0c] py-3 px-7 rounded-xl hover:bg-[#eafd60] transition-all">
            Try it free — no credit card <ArrowRight size={14} />
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── SUPPORTED TECH — Infinite scrolling marquee with real icons ─── */

function SupportedTech() {
  // Using devicon CDN for real framework/language icons
  const cdnBase = 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons';
  const techs = [
    { name: 'JavaScript', icon: `${cdnBase}/javascript/javascript-original.svg` },
    { name: 'TypeScript', icon: `${cdnBase}/typescript/typescript-original.svg` },
    { name: 'Python', icon: `${cdnBase}/python/python-original.svg` },
    { name: 'Go', icon: `${cdnBase}/go/go-original.svg` },
    { name: 'Rust', icon: `${cdnBase}/rust/rust-original.svg` },
    { name: 'Java', icon: `${cdnBase}/java/java-original.svg` },
    { name: 'C#', icon: `${cdnBase}/csharp/csharp-original.svg` },
    { name: 'Ruby', icon: `${cdnBase}/ruby/ruby-original.svg` },
    { name: 'PHP', icon: `${cdnBase}/php/php-original.svg` },
    { name: 'Swift', icon: `${cdnBase}/swift/swift-original.svg` },
    { name: 'Kotlin', icon: `${cdnBase}/kotlin/kotlin-original.svg` },
    { name: 'C++', icon: `${cdnBase}/cplusplus/cplusplus-original.svg` },
    { name: 'React', icon: `${cdnBase}/react/react-original.svg` },
    { name: 'Next.js', icon: `${cdnBase}/nextjs/nextjs-original.svg` },
    { name: 'Vue', icon: `${cdnBase}/vuejs/vuejs-original.svg` },
    { name: 'Svelte', icon: `${cdnBase}/svelte/svelte-original.svg` },
    { name: 'Angular', icon: `${cdnBase}/angular/angular-original.svg` },
    { name: 'Django', icon: `${cdnBase}/django/django-plain.svg` },
    { name: 'Rails', icon: `${cdnBase}/rails/rails-plain.svg` },
    { name: 'Flutter', icon: `${cdnBase}/flutter/flutter-original.svg` },
    { name: 'Tailwind', icon: `${cdnBase}/tailwindcss/tailwindcss-original.svg` },
    { name: 'Docker', icon: `${cdnBase}/docker/docker-original.svg` },
    { name: 'GraphQL', icon: `${cdnBase}/graphql/graphql-plain.svg` },
    { name: 'Terraform', icon: `${cdnBase}/terraform/terraform-original.svg` },
    { name: 'Elixir', icon: `${cdnBase}/elixir/elixir-original.svg` },
    { name: 'Scala', icon: `${cdnBase}/scala/scala-original.svg` },
    { name: 'Dart', icon: `${cdnBase}/dart/dart-original.svg` },
    { name: 'Lua', icon: `${cdnBase}/lua/lua-original.svg` },
    { name: 'Haskell', icon: `${cdnBase}/haskell/haskell-original.svg` },
    { name: 'Bash', icon: `${cdnBase}/bash/bash-original.svg` },
  ];

  const track = [...techs, ...techs];

  return (
    <section className="relative z-[1] py-20 overflow-hidden">
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-40 bg-gradient-to-r from-[#0a0a0c] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-40 bg-gradient-to-l from-[#0a0a0c] to-transparent z-10 pointer-events-none" />

      <div className="text-center mb-10">
        <p className="text-[11px] text-[#787884] font-medium">
          Works with <span className="text-[#E0FC10] font-semibold">40+</span> languages and frameworks
        </p>
      </div>

      {/* Row 1 — scrolls left, slow */}
      <div className="flex gap-4 mb-4 animate-[marquee_80s_linear_infinite] hover:[animation-play-state:paused]" style={{ width: 'max-content' }}>
        {track.map((tech, i) => (
          <div key={`a-${i}`} className="flex-shrink-0 flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-white/[0.06] bg-[#111113] hover:border-[#E0FC10]/20 transition-all duration-300 cursor-default group">
            <img src={tech.icon} alt={tech.name} width={18} height={18} className="opacity-70 group-hover:opacity-100 transition-opacity" loading="lazy" />
            <span className="text-[11px] text-[#787884] font-medium whitespace-nowrap group-hover:text-[#b0b0b8] transition-colors">{tech.name}</span>
          </div>
        ))}
      </div>

      {/* Row 2 — scrolls right, slightly different speed */}
      <div className="flex gap-4 animate-[marquee_90s_linear_infinite_reverse] hover:[animation-play-state:paused]" style={{ width: 'max-content' }}>
        {[...track].reverse().map((tech, i) => (
          <div key={`b-${i}`} className="flex-shrink-0 flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-white/[0.06] bg-[#111113] hover:border-[#E0FC10]/20 transition-all duration-300 cursor-default group">
            <img src={tech.icon} alt={tech.name} width={18} height={18} className="opacity-70 group-hover:opacity-100 transition-opacity" loading="lazy" />
            <span className="text-[11px] text-[#787884] font-medium whitespace-nowrap group-hover:text-[#b0b0b8] transition-colors">{tech.name}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── COST COMPARISON ─── */

function AnimatedBar({ label, cost, maxCost, color, delay = 0, branded = false }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: false, margin: '-40px' });
  const width = (cost / maxCost) * 100;

  return (
    <motion.div ref={ref} className="mb-6"
      initial={{ opacity: 0, x: -30 }}
      animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[13px] text-[#b0b0b8] font-medium">
          {branded ? <><GrepitText /> <span className="font-normal">Starter</span></> : label}
        </span>
        <span className="text-[13px] text-[#787884] font-mono">{cost === 0 ? '$0' : `~$${cost}/mo`}</span>
      </div>
      <div className="h-8 rounded-lg bg-white/[0.03] border border-white/[0.04] overflow-hidden relative">
        <motion.div
          className="h-full rounded-lg"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={isInView ? { width: `${Math.max(width, 3)}%` } : { width: 0 }}
          transition={{ duration: 1.2, delay: delay + 0.2, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </motion.div>
  );
}

function AnimatedCounter({ target }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: false });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) { setCount(0); return; }
    let frame;
    const duration = 2000;
    const startTime = performance.now();
    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [isInView, target]);

  return <span ref={ref}>{count}</span>;
}

function CostComparison() {
  const tools = [
    { label: 'Claude Code (heavy use)', cost: 125, color: 'linear-gradient(90deg, #ef4444, #f97316)' },
    { label: 'Cursor (with API keys)', cost: 60, color: 'linear-gradient(90deg, #f97316, #eab308)' },
    { label: 'GitHub Copilot Workspace', cost: 19, color: 'linear-gradient(90deg, #eab308, #a3a3a3)' },
    { label: 'grepit Starter', cost: 12, color: 'linear-gradient(90deg, #E0FC10, #b8d00e)', branded: true },
  ];

  return (
    <section className="relative z-[1] py-28 px-6 md:px-8">
      <div className="max-w-[700px] mx-auto">
        <div className="text-center mb-16">
          <motion.p initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-[10px] text-[#E0FC10] tracking-[3px] uppercase mb-3 font-medium">Stop burning tokens</motion.p>
          <motion.h2 initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
            className="text-[30px] md:text-[40px] font-semibold tracking-tight leading-tight mb-4">
            Save up to <span className="text-[#E0FC10]"><AnimatedCounter target={95} />%</span> on<br />codebase queries
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
            className="text-[13px] text-[#787884] max-w-[440px] mx-auto leading-relaxed">
            Other tools re-read your entire codebase on every question. <GrepitText /> pre-indexes once — each query uses under 5K tokens.
          </motion.p>
        </div>
        {tools.map((tool, i) => (
          <AnimatedBar key={tool.label} {...tool} maxCost={150} delay={i * 0.1} />
        ))}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="mt-10 text-center">
          <p className="text-[12px] text-[#4a4a54]">
            Based on average monthly usage for active developers. Claude Code estimate: 3-5M tokens/session × daily use at Sonnet pricing. Cursor estimate includes personal API key costs.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── USE CASE SCENARIOS — Who uses grepit ─── */

function UseCaseScenarios({ onCta }) {
  const [activeScenario, setActiveScenario] = useState(0);
  const [autoplay, setAutoplay] = useState(true);

  // Auto-rotate every 6 seconds
  useEffect(() => {
    if (!autoplay) return;
    const interval = setInterval(() => {
      setActiveScenario(prev => (prev + 1) % 4);
    }, 6000);
    return () => clearInterval(interval);
  }, [autoplay]);

  const scenarios = [
    {
      persona: 'New engineer',
      title: 'First week at a new company',
      scenario: 'You just joined a team with a 150K-line monorepo. No onboarding docs. The senior dev is on vacation. You need to ship a fix by Friday.',
      question: 'Walk me through the payment processing pipeline — from checkout to webhook confirmation.',
      answer: 'The payment flow has 4 stages:\n\n1. Frontend calls POST /api/checkout which creates a Stripe session\n2. User completes payment on Stripe\'s hosted page\n3. Stripe sends a webhook to POST /api/webhooks/stripe\n4. The webhook handler verifies the signature, updates the order status in the DB, and triggers the fulfillment queue',
      file: 'src/app/api/checkout/route.ts:34',
      followUps: ['Show the webhook handler', 'What happens if payment fails?', 'Where is the fulfillment queue?'],
    },
    {
      persona: 'Tech lead',
      title: 'Architecture review before a rewrite',
      scenario: 'Your team is planning a migration from a legacy service. You need to map every dependency, every API consumer, and every shared module before you can scope the work.',
      question: 'Which services depend on the UserService module and what methods do they call?',
      answer: 'UserService is imported by 7 modules:\n\n• AuthController — calls getUserById, validateSession\n• BillingService — calls getUserSubscription, updatePlan\n• NotificationWorker — calls getUserEmail, getPreferences\n• AdminDashboard — calls listUsers, suspendUser\n• AnalyticsService — calls getUserMetadata\n• OnboardingFlow — calls createUser, sendVerification\n• APIGateway — calls authenticateRequest',
      file: 'src/services/UserService.ts:1',
      followUps: ['Show the dependency graph', 'Which methods are unused?', 'What would break if we split this?'],
    },
    {
      persona: 'Freelancer',
      title: 'Evaluating a client\'s codebase',
      scenario: 'A potential client wants you to estimate a feature. They sent you the repo. You have 30 minutes before the call to understand their stack, identify risks, and sound credible.',
      question: 'Give me a high-level summary of this project — stack, architecture, and any red flags.',
      answer: 'Stack: Next.js 14 (App Router), PostgreSQL via Prisma, Redis for caching, deployed on Vercel.\n\nArchitecture: 3 main domains — auth (Clerk), billing (Stripe), and content (CMS). 52 API routes, 23 React Server Components.\n\nRed flags:\n• No rate limiting on any public endpoint\n• 3 hardcoded API keys in config files\n• No error boundaries — unhandled rejections crash the app\n• Test coverage: 0%',
      file: 'Security audit · 4 issues found',
      followUps: ['Show me the hardcoded keys', 'Generate architecture diagram', 'Export as PDF'],
    },
    {
      persona: 'Open source contributor',
      title: 'Understanding a project before contributing',
      scenario: 'You want to contribute to a popular library but the codebase is complex. You need to understand the internal architecture before you can write a meaningful PR.',
      question: 'How does the plugin system work? Where would I add a new plugin?',
      answer: 'The plugin system uses a registry pattern:\n\n1. Plugins implement the IPlugin interface (src/types/plugin.ts)\n2. They register via registerPlugin() in src/core/registry.ts\n3. The engine calls plugin.init() during startup, then plugin.transform() on each input\n\nTo add a new plugin:\n• Create a file in src/plugins/\n• Implement IPlugin with init() and transform()\n• Register it in src/plugins/index.ts exports',
      file: 'src/core/registry.ts:12',
      followUps: ['Show IPlugin interface', 'List existing plugins', 'Show a simple plugin example'],
    },
  ];

  const active = scenarios[activeScenario];
  // Rich JSX answers with code snippets and diagrams
  const answerComponents = [<NewEngineerAnswer />, <TechLeadAnswer />, <FreelancerAnswer />, <OSSContributorAnswer />];
  const activeAnswerJsx = answerComponents[activeScenario];

  return (
    <section className="relative z-[1] py-32 px-6 md:px-8 overflow-hidden">
      <div className="max-w-[1100px] mx-auto">
        <div className="text-center mb-16">
          <motion.p initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-[10px] text-[#E0FC10] tracking-[3px] uppercase mb-3 font-medium">Use cases</motion.p>
          <motion.h2 initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
            className="text-[34px] md:text-[48px] font-semibold tracking-tight leading-[1.05]">
            How people use <GrepitText className="text-[34px] md:text-[48px]" />
          </motion.h2>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl bg-[#111113] border border-white/[0.06] overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.5)]">

          {/* Persona tabs */}
          <div className="flex border-b border-white/[0.06] bg-[#0d0d0f]">
            {scenarios.map((s, i) => (
              <button key={i}
                onClick={() => { setActiveScenario(i); setAutoplay(false); }}
                className={`relative flex-1 min-w-[120px] px-4 py-3.5 text-center transition-colors ${
                  activeScenario === i ? 'text-[#eaeaec]' : 'text-[#4a4a54] hover:text-[#787884]'
                }`}>
                <div className="text-[11px] font-medium">{s.persona}</div>
                {activeScenario === i && (
                  <motion.div layoutId="scenario-indicator"
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#E0FC10]"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
                )}
                {activeScenario === i && autoplay && (
                  <motion.div
                    className="absolute bottom-0 left-0 h-[2px] bg-[#E0FC10]/40"
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 6, ease: 'linear' }}
                    key={`progress-${activeScenario}`}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="grid md:grid-cols-[0.9fr_1.1fr] gap-0">
            {/* Left: scenario */}
            <div className="p-8 md:p-10 flex flex-col justify-center border-b md:border-b-0 md:border-r border-white/[0.06]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeScenario}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
                  <h3 className="text-[20px] md:text-[24px] font-semibold text-[#eaeaec] leading-tight tracking-tight mb-4">
                    {active.title}
                  </h3>
                  <p className="text-[13px] text-[#787884] leading-[1.7]">
                    {active.scenario}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Right: product-style chat mock */}
            <div className="bg-[#0a0a0c] overflow-hidden">
              {/* Mini window chrome */}
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.06] bg-[#111113]">
                <span className="w-[8px] h-[8px] rounded-full bg-[#ff5f57]" />
                <span className="w-[8px] h-[8px] rounded-full bg-[#febc2e]" />
                <span className="w-[8px] h-[8px] rounded-full bg-[#28c840]" />
                <span className="text-[9px] text-[#4a4a54] ml-2 font-mono">grepit — ai chat</span>
              </div>

              <div className="p-5 md:p-6 max-h-[420px] overflow-y-auto">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeScenario}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4">
                    {/* User message */}
                    <div className="flex justify-end">
                      <div className="bg-white/[0.05] border border-white/[0.08] rounded-xl rounded-tr-sm px-4 py-3 max-w-[85%]">
                        <p className="text-[12px] text-[#eaeaec] leading-[1.6]">{active.question}</p>
                      </div>
                    </div>
                    {/* AI response */}
                    <div className="flex justify-start">
                      <div className="bg-[#111113] border border-white/[0.06] rounded-xl rounded-tl-sm px-4 py-3 max-w-[95%]">
                        {activeAnswerJsx}
                        {/* File citation */}
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#E0FC10]/60 mb-3 px-2 py-1 rounded bg-[#E0FC10]/[0.04] border border-[#E0FC10]/10 w-fit">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                            <polyline points="13 2 13 9 20 9" />
                          </svg>
                          {active.file}
                        </div>
                        {/* Follow-up chips */}
                        <div className="flex gap-2 flex-wrap">
                          {active.followUps.map(q => (
                            <span key={q} className="text-[10px] px-2.5 py-1 rounded-full border border-white/[0.08] text-[#787884] bg-white/[0.02] hover:border-[#E0FC10]/20 hover:text-[#b0b0b8] transition-colors cursor-default">{q}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-10 text-center">
          <motion.button onClick={onCta} whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.98 }}
            className="inline-flex items-center gap-2 text-[13px] font-medium bg-[#E0FC10] text-[#0a0a0c] py-3 px-7 rounded-xl hover:bg-[#eafd60] transition-all">
            Try it on your codebase <ArrowRight size={14} />
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── WHY GREPIT — Orbital / Fan Layout ─── */

function Whygrepit() {
  const items = [
    { icon: Zap, title: 'Instant understanding', desc: 'No setup, no config, paste a link' },
    { icon: MessageSquare, title: 'Grounded answers', desc: 'AI responses cite actual files, not hallucinations' },
    { icon: Shield, title: 'Full security audit', desc: 'Hardcoded secrets, unsafe patterns, missing tests' },
    { icon: Layers, title: 'Works with any language', desc: '40+ languages, any framework' },
    { icon: Lock, title: 'Private & secure', desc: 'Your code never leaves the analysis pipeline' },
    { icon: ArrowRight, title: 'Export everything', desc: 'PDF reports, markdown, shareable links' },
  ];

  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section className="relative z-[1] py-28 px-6 md:px-8 overflow-hidden">
      <div className="max-w-[900px] mx-auto">
        <div className="text-center mb-16">
          <motion.p initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-[10px] text-[#E0FC10] tracking-[3px] uppercase mb-3 font-medium">What you get</motion.p>
          <motion.h2 initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
            className="text-[30px] md:text-[38px] font-semibold tracking-tight leading-tight">
            Why teams choose <GrepitText />
          </motion.h2>
        </div>

        <div ref={ref} className="relative">
          {/* Cards fanning out */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {items.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 40, rotate: -2 + i * 0.8 }}
                  animate={isInView ? { opacity: 1, y: 0, rotate: 0 } : {}}
                  transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}>
                  <motion.div
                    whileHover={{ y: -6, scale: 1.02 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className="p-5 rounded-2xl bg-[#111113] border border-white/[0.06] hover:border-[#E0FC10]/20 transition-colors duration-300 cursor-default h-full">
                    <div className="w-9 h-9 rounded-lg bg-[#E0FC10]/[0.06] border border-[#E0FC10]/15 flex items-center justify-center mb-3">
                      <Icon size={16} className="text-[#E0FC10]" strokeWidth={1.8} />
                    </div>
                    <h4 className="text-[14px] font-semibold text-[#eaeaec] mb-1">{item.title}</h4>
                    <p className="text-[12px] text-[#787884] leading-relaxed">{item.desc}</p>
                  </motion.div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── HOW IT WORKS — Zigzag ladder with hand-drawn arrows ─── */

function HowItWorks() {
  const steps = [
    { num: '01', title: 'Drop a link', desc: 'GitHub URL, private repo, or ZIP. Any language, any size. Just paste and go.' },
    { num: '02', title: 'Indexed in under a minute', desc: 'Architecture, dependencies, APIs, security — all extracted and structured.' },
    { num: '03', title: 'Ask anything, forever', desc: 'Your codebase is now queryable. Every answer cites the exact file and line.' },
    { num: '04', title: 'Export and share', desc: 'PDF reports, shareable links, architecture diagrams — ready for your team.' },
  ];

  return (
    <section className="relative z-[1] py-32 px-6 md:px-8" id="how">
      <div className="max-w-[800px] mx-auto">
        <div className="text-center mb-24">
          <motion.p initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-[10px] text-[#E0FC10] tracking-[3px] uppercase mb-3 font-medium">How it works</motion.p>
          <motion.h2 initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
            className="text-[34px] md:text-[48px] font-semibold tracking-tight leading-[1.05]">
            From link to full understanding.
          </motion.h2>
        </div>

        {/* Zigzag ladder layout */}
        <div className="relative">
          {steps.map((step, i) => {
            const isRight = i % 2 === 1;
            return (
              <div key={i} className="relative">
                {/* Curved arrow from this card to the next */}
                {i < steps.length - 1 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 + i * 0.1, duration: 0.5 }}
                    className="absolute left-1/2 -translate-x-1/2 -bottom-[72px] z-10">
                    <svg width="60" height="50" viewBox="0 0 120 80" fill="none" overflow="visible">
                      <defs>
                        <marker id={`ah-${i}`} markerWidth="14" markerHeight="12" refX="7" refY="6" orient="auto" overflow="visible">
                          <polygon points="0 0, 14 6, 0 12" fill="#E0FC10" />
                        </marker>
                      </defs>
                      <path
                        d={isRight
                          ? 'M80 0 C78 20, 50 40, 42 70'
                          : 'M40 0 C42 20, 70 40, 78 70'}
                        stroke="#E0FC10"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        fill="none"
                        markerEnd={`url(#ah-${i})`}
                      />
                    </svg>
                  </motion.div>
                )}

                {/* Step card */}
                <motion.div
                  initial={{ opacity: 0, x: isRight ? 40 : -40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.7, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                  className={`relative mb-24 ${isRight ? 'md:ml-auto md:mr-0' : 'md:mr-auto md:ml-0'} md:w-[55%]`}>
                  <motion.div
                    whileHover={{ y: -4 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className="relative p-8 rounded-2xl bg-[#111113] border border-white/[0.08] hover:border-[#E0FC10]/20 transition-colors overflow-hidden group">
                    {/* Large accent number */}
                    <div className="absolute -top-2 -right-2 text-[80px] font-bold text-[#E0FC10]/[0.1] leading-none select-none group-hover:text-[#E0FC10]/[0.18] transition-colors duration-500">
                      {step.num}
                    </div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-7 h-7 rounded-full bg-[#E0FC10]/[0.08] border border-[#E0FC10]/20 flex items-center justify-center">
                          <span className="text-[9px] font-bold text-[#E0FC10]">{step.num}</span>
                        </div>
                        <h3 className="text-[18px] font-semibold text-[#eaeaec] tracking-tight">{step.title}</h3>
                      </div>
                      <p className="text-[13px] text-[#787884] leading-relaxed pl-10">{step.desc}</p>
                    </div>
                  </motion.div>
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─── PRICING — Stacked Depth Cards ─── */

function PricingSection({ handlePricingAction, subscribing }) {
  const plans = getAllPlans().map(p => ({
    name: p.name,
    price: p.price,
    period: p.id === 'free' ? 'forever' : p.period,
    cta: p.cta,
    featured: p.featured,
    features: p.features,
  }));

  return (
    <section className="relative z-[1] py-28 px-6 md:px-8" id="pricing">
      <div className="max-w-[900px] mx-auto">
        <div className="text-center mb-16">
          <motion.p initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-[10px] text-[#E0FC10] tracking-[3px] uppercase mb-3 font-medium">Pricing</motion.p>
          <motion.h2 initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
            className="text-[30px] md:text-[38px] font-semibold tracking-tight leading-tight mb-4">
            Simple, transparent pricing
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
            className="text-[13px] text-[#787884] max-w-[380px] mx-auto leading-relaxed">
            Start free. Upgrade when you need more queries, private repos, or larger codebases.
          </motion.p>
        </div>

        <div className="flex flex-col md:flex-row items-center md:items-stretch justify-center gap-5">
          {plans.map((plan, i) => {
            const isPro = plan.featured;
            return (
              <motion.div key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                className={`w-full md:w-[280px] ${isPro ? 'md:-mt-4 md:mb-0' : ''}`}>
                <motion.div
                  whileHover={{ y: -6 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className={`relative rounded-2xl overflow-hidden h-full ${
                    isPro
                      ? 'bg-[#111113] border border-[#E0FC10]/20 shadow-[0_0_60px_rgba(224,252,16,0.06)]'
                      : 'bg-[#111113] border border-white/[0.06] hover:border-white/[0.1]'
                  }`}>
                  {isPro && <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#E0FC10]/50 to-transparent" />}
                  <div className="relative z-10 p-7">
                    <div className="flex items-center gap-2 mb-4">
                      <span className={`text-[11px] uppercase tracking-wider font-medium ${isPro ? 'text-[#E0FC10]' : 'text-[#4a4a54]'}`}>{plan.name}</span>
                      {isPro && <span className="text-[9px] font-medium bg-[#E0FC10]/10 text-[#E0FC10] px-2 py-0.5 rounded-full border border-[#E0FC10]/20">Popular</span>}
                    </div>
                    <div className="mb-6">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[40px] font-semibold tracking-tight leading-none text-[#eaeaec]">{plan.price}</span>
                        <span className="text-[13px] text-[#4a4a54]">{plan.period}</span>
                        {plan.originalPrice && (
                          <span className="text-[16px] font-medium text-[#787884] line-through ml-2">{plan.originalPrice}</span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => handlePricingAction(plan.name)} disabled={!!subscribing}
                      className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-[13px] font-medium mb-6 transition-all duration-200 disabled:opacity-50 ${
                        isPro ? 'bg-[#E0FC10] text-[#0a0a0c] hover:bg-[#eafd60]' : 'bg-white/[0.04] border border-white/[0.08] text-[#b0b0b8] hover:bg-white/[0.06]'
                      }`}>
                      {subscribing === plan.name.toLowerCase() ? 'Redirecting...' : plan.cta}
                      {subscribing !== plan.name.toLowerCase() && <ArrowUpRight size={13} />}
                    </button>
                    <ul className="space-y-3">
                      {plan.features.map((f, j) => (
                        <li key={j} className="flex items-center gap-2.5">
                          <Check size={14} className={`flex-shrink-0 ${isPro ? 'text-[#E0FC10]' : 'text-[#4a4a54]'}`} strokeWidth={2.5} />
                          <span className="text-[13px] text-[#787884]">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─── TESTIMONIALS ─── */

function TestimonialDeck({ items }) {
  // Duplicate items enough times to fill the viewport and create seamless loop
  const track = [...items, ...items, ...items, ...items];

  return (
    <div className="relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#0a0a0c] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#0a0a0c] to-transparent z-10 pointer-events-none" />

      <div className="flex gap-5 py-2 animate-[marquee_20s_linear_infinite] hover:[animation-play-state:paused]"
        style={{ width: 'max-content' }}>
        {track.map((t, i) => (
          <div key={i}
            className="flex-shrink-0 w-[380px] p-7 rounded-2xl bg-[#111113] border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.4)] cursor-default hover:scale-[1.02] hover:-translate-y-1 transition-transform duration-200">
            <div className="text-[40px] leading-none mb-3 text-[#E0FC10]/20">&ldquo;</div>
            <p className="text-[14px] text-[#b0b0b8] leading-[1.8] mb-6">{t.quote}</p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#E0FC10]/[0.08] border border-[#E0FC10]/20 flex items-center justify-center text-[11px] font-bold text-[#E0FC10]">
                {t.avatar}
              </div>
              <div>
                <div className="text-[13px] font-medium text-[#eaeaec]">{t.name}</div>
                <div className="text-[11px] text-[#4a4a54]">{t.role}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── MAIN COMPONENT ─── */

export default function LandingPage() {
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [error, setError] = useState('');
  const [needsGithub, setNeedsGithub] = useState(false);
  const [subscribing, setSubscribing] = useState(null); // null or plan name being subscribed
  const [mode, setMode] = useState('url');
  const [dragOver, setDragOver] = useState(false);
  const [inputHighlight, setInputHighlight] = useState(false);
  const fileRef = useRef(null);
  const inputRef = useRef(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isSignedIn } = useUser();

  const { hero, testimonials, cta } = SITE_CONFIG;

  // Scroll to input and highlight it — used by CTA buttons throughout the page
  const scrollToInput = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      setInputHighlight(true);
      inputRef.current?.focus();
      setTimeout(() => setInputHighlight(false), 2000);
    }, 600);
  };

  const connectGithubForRepo = async () => {
    const pending = repoUrl.trim();
    if (!pending || !user) return;
    const clientId = process.env.NEXT_PUBLIC_GITHUB_OAUTH_CLIENT_ID;
    const redirectUri = process.env.NEXT_PUBLIC_GITHUB_OAUTH_REDIRECT_URI;
    if (!clientId || !redirectUri) { setError("GitHub OAuth is not configured. Contact the admin."); return; }
    const state = `${user.id}:${encodeURIComponent(pending)}`;
    const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
    authorizeUrl.searchParams.set("client_id", clientId);
    authorizeUrl.searchParams.set("scope", "repo");
    authorizeUrl.searchParams.set("redirect_uri", redirectUri);
    authorizeUrl.searchParams.set("state", state);
    window.location.href = authorizeUrl.toString();
  };

  useEffect(() => {
    const resumeParam = searchParams.get("resume");
    if (resumeParam && isSignedIn) { setRepoUrl(resumeParam); setTimeout(() => handleAnalyze(resumeParam), 1000); return; }
    const pending = sessionStorage.getItem("grepit-pending-repo");
    if (pending && isSignedIn) { sessionStorage.removeItem("grepit-pending-repo"); setRepoUrl(pending); setTimeout(() => handleAnalyze(pending), 1500); return; }
    const pendingUpload = sessionStorage.getItem("grepit-pending-upload");
    if (pendingUpload && isSignedIn) {
      sessionStorage.removeItem("grepit-pending-upload");
      // Scroll to input and show message to re-upload
      setTimeout(() => { scrollToInput(); setError("You're signed in! Please re-select your file to start the analysis."); }, 500);
    }
  }, [isSignedIn]); // eslint-disable-line

  useEffect(() => {
    if (!loading) { setLoadingMsg(''); return; }
    const stages = ['Connecting...', 'Fetching tree...', 'Indexing...', 'Building intelligence...', 'Architecture...', 'Security scan...', 'AI enrichment...', 'Almost there...'];
    let idx = 0; setLoadingMsg(stages[0]);
    const interval = setInterval(() => { idx = Math.min(idx + 1, stages.length - 1); setLoadingMsg(stages[idx]); }, 3500);
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    const e = searchParams.get('error');
    if (e && !isSignedIn) setError(AUTH_ERRORS[e] || AUTH_ERRORS.Default);
  }, [searchParams, isSignedIn]);

  const saveAndRedirect = (data) => {
    const saved = JSON.parse(localStorage.getItem('grepit-analyses') || '[]');
    saved.unshift({ id: data.id, name: data.repo_name, url: data.repo_url || 'local upload', date: new Date().toISOString() });
    localStorage.setItem('grepit-analyses', JSON.stringify(saved.slice(0, 20)));
    router.push(`/dashboard?id=${data.id}`);
  };

  const handleAnalyze = async (url) => {
    const target = url || repoUrl.trim();
    if (!target) return;
    if (!isSignedIn) {
      // Save pending repo so it auto-triggers after sign-in
      sessionStorage.setItem("grepit-pending-repo", target);
      router.push('/sign-in');
      return;
    }
    if (!target.match(/^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+/)) { setError('Enter a valid GitHub URL (https://github.com/owner/repository)'); return; }
    setLoading(true); setError('');
    try {
      trackAnalysisStarted(target, 'github');
      let res, data;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 120000);
        res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ repoUrl: target, repoName: target.split('/').pop() }), signal: controller.signal });
        clearTimeout(timeout);
        data = await parseJsonResponse(res);
      } catch (networkErr) {
        if (networkErr?.name === 'AbortError') throw new Error('This is a large codebase and is taking longer than expected. Please try again — it may work on the second attempt as partial results are cached.');
        if (networkErr instanceof Error && !/Failed to fetch|Load failed|NetworkError|invalid response/i.test(networkErr.message)) throw networkErr;
        throw new Error('Could not reach the server.');
      }
      if (res.status === 403 && data.requiresAuth) {
        setLoading(false);
        if (data.requiresGithub) { setNeedsGithub(true); setError(""); }
        else { setError("This is a private repository. Sign in to access it."); setTimeout(() => router.push("/sign-in"), 1500); }
        return;
      }
      if (!res.ok) throw new Error(data.message || data.error || "Analysis failed");
      saveAndRedirect(data);
    } catch (err) { trackAnalysisFailed(target, err.message); setError(err.message); setLoading(false); }
  };

  const handleUpload = async (file) => {
    if (!file) return;
    if (!isSignedIn) {
      // Can't persist file across navigation, but save intent
      sessionStorage.setItem("grepit-pending-upload", "true");
      router.push('/sign-in');
      return;
    }
    if (!file.name.endsWith('.zip')) { setError('Please upload a .zip file'); return; }
    if (file.size > 50 * 1024 * 1024) { setError('File too large (max 50MB)'); return; }
    setLoading(true); setError('');
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await parseJsonResponse(res);
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      saveAndRedirect(data);
    } catch (err) { setError(err.message); setLoading(false); }
  };

  const handleFolderUpload = async (dataTransferItems) => {
    if (!isSignedIn) {
      sessionStorage.setItem("grepit-pending-upload", "true");
      router.push('/sign-in');
      return;
    }
    setLoading(true); setError('');
    try {
      const files = [];
      const readEntries = async (entry, path = '') => {
        if (entry.isFile) {
          const file = await new Promise(resolve => entry.file(resolve));
          const relativePath = path + entry.name;
          // Safety: skip hidden files, node_modules, .git, etc.
          if (/node_modules|\.git\/|\.next\/|dist\/|build\/|__pycache__|\.DS_Store/i.test(relativePath)) return;
          if (file.size > 5 * 1024 * 1024) return; // Skip files > 5MB
          files.push({ file, path: relativePath });
        } else if (entry.isDirectory) {
          const reader = entry.createReader();
          const entries = await new Promise(resolve => reader.readEntries(resolve));
          for (const child of entries) {
            await readEntries(child, path + entry.name + '/');
          }
        }
      };

      for (let i = 0; i < dataTransferItems.length; i++) {
        const entry = dataTransferItems[i].webkitGetAsEntry?.();
        if (entry) await readEntries(entry);
      }

      if (files.length === 0) { setError('No valid files found in folder'); setLoading(false); return; }
      if (files.length > 10000) { setError('Too many files (max 10,000). Try a smaller project.'); setLoading(false); return; }

      // Calculate total size
      const totalSize = files.reduce((sum, f) => sum + f.file.size, 0);
      if (totalSize > 50 * 1024 * 1024) { setError('Folder too large (max 50MB total)'); setLoading(false); return; }

      const fd = new FormData();
      for (const { file, path } of files) {
        fd.append('files', file, path);
      }
      fd.append('folderName', dataTransferItems[0].webkitGetAsEntry?.()?.name || 'upload');

      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await parseJsonResponse(res);
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      saveAndRedirect(data);
    } catch (err) { setError(err.message); setLoading(false); }
  };

  const handlePricingAction = async (planName) => {
    if (!isSignedIn) { router.push('/sign-in'); return; }
    if (planName === 'Free' || planName === 'free') { scrollToInput(); return; }
    setSubscribing(planName.toLowerCase());
    try {
      trackCheckoutStarted(planName.toLowerCase());

      // Single provider: Dodo Payments (handles both INR and USD)
      const res = await fetch('/api/dodo/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planName.toLowerCase() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Could not start checkout. Please try again or contact support@grepit.co');
        setSubscribing(null);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        setError('Checkout could not be created. Please try again.');
        setSubscribing(null);
      }
    } catch {
      setError('Could not start checkout. Check your connection and try again.');
      setSubscribing(null);
    }
  };

  const taglineParts = hero.tagline.split(hero.taglineAccent);

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-[#eaeaec] relative">
      <GridBackground />

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 h-16 bg-[#0a0a0c]/70 backdrop-blur-xl border-b border-white/[0.06] flex items-center px-6 md:px-10 z-[100]">
        <div className="cursor-pointer flex items-center gap-2.5" onClick={() => router.push('/')}>
          <ViboMark size={22} />
          <span className="text-[20px] font-semibold tracking-tight">grep<span className="text-[#E0FC10]">it</span></span>
        </div>
        <div className="hidden md:flex gap-7 ml-10">
          {[['Features', '#features'], ['How it works', '#how'], ['Pricing', '#pricing']].map(([label, href]) => (
            <a key={href} href={href} className="text-[13px] text-[#787884] hover:text-[#E0FC10] transition-colors duration-200">{label}</a>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3">
          {isSignedIn ? (
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-[#eaeaec] font-medium hidden md:block">{user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split('@')[0]}</span>
              <button onClick={() => router.push('/profile')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-[#E0FC10] bg-[#E0FC10]/[0.08] border border-[#E0FC10]/20 hover:bg-[#E0FC10]/[0.14] transition-all duration-200">
                <UserCircle size={14} /> Profile
              </button>
              <SignOutButton><button className="text-[12px] text-[#787884] hover:text-[#eaeaec] px-3 py-1.5 rounded-lg border border-white/[0.08] hover:border-white/[0.14] bg-white/[0.03] hover:bg-white/[0.05] transition-all duration-200">Sign out</button></SignOutButton>
            </div>
          ) : (
            <>
              <button onClick={() => router.push('/sign-in')} className="text-[13px] text-[#787884] hover:text-[#E0FC10] transition-colors duration-200 hidden md:block">Sign in</button>
              <button onClick={() => router.push('/sign-in?mode=signup')} className="text-[12px] font-medium text-[#0a0a0c] bg-[#E0FC10] px-4 py-2 rounded-lg hover:bg-[#eafd60] transition-all duration-200 hover:shadow-[0_4px_12px_rgba(224,252,16,0.15)]">Get started free</button>
            </>
          )}
        </div>
      </nav>

      {/* HERO */}
      <section className="min-h-[94vh] flex flex-col items-center justify-center px-6 md:px-8 pt-[160px] pb-32 relative text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-[2]">
          {/* Product Hunt badge */}
          <a href="https://www.producthunt.com/products/grepit-understand-any-codebase/reviews/new?utm_source=badge-product_review&utm_medium=badge&utm_source=badge-grepit-understand-any-codebase" target="_blank" rel="noopener noreferrer" className="inline-block mb-6 md:mb-8 hover:opacity-90 transition-opacity">
            <img src="https://api.producthunt.com/widgets/embed-image/v1/product_review.svg?product_id=1232130&theme=dark" alt="grepit on Product Hunt" width="250" height="54" className="w-[160px] md:w-[200px] h-auto" />
          </a>
          <h1 className="font-semibold tracking-tight leading-[1.05] max-w-[820px] mb-7 mx-auto"
            style={{ fontSize: 'clamp(48px, 6vw, 80px)' }}>
            {taglineParts[0]}<span className="text-[#E0FC10]">{hero.taglineAccent}</span>{taglineParts[1]}
          </h1>
          <p className="text-[18px] text-[#b0b0b8] max-w-[540px] leading-[1.7] mb-12 mx-auto">{hero.subtitle}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[620px] relative z-[2]">
          <div className="flex items-center gap-1 mb-3">
            {[['url', 'GitHub URL'], ['upload', 'Upload']].map(([m, label]) => (
              <button key={m} onClick={() => setMode(m)}
                className={`text-[12px] px-3.5 py-1.5 rounded-lg font-medium transition-all duration-200 ${
                  mode === m ? 'bg-[#E0FC10]/[0.1] text-[#E0FC10] border border-[#E0FC10]/20' : 'text-[#4a4a54] hover:text-[#787884] border border-transparent'
                }`}>{label}</button>
            ))}
            <div className="hidden md:flex ml-auto items-center gap-2">
              <span className="text-[11px] text-[#787884]">try:</span>
              {hero.suggestedRepos.map(repo => (
                <button key={repo} onClick={() => { setMode('url'); setRepoUrl(`https://github.com/${repo}`); }} disabled={loading}
                  className="text-[11px] text-[#787884] hover:text-[#E0FC10] transition-colors disabled:opacity-40">{repo.split('/')[1]}</button>
              ))}
            </div>
          </div>

          {mode === 'url' ? (
            <div className={`flex items-center border rounded-xl bg-[#111113]/90 backdrop-blur-sm overflow-hidden transition-all duration-300 focus-within:border-[#E0FC10]/40 focus-within:shadow-[0_0_0_3px_rgba(224,252,16,0.06)] hover:border-white/[0.14] ${inputHighlight ? 'border-[#E0FC10]/50 shadow-[0_0_0_4px_rgba(224,252,16,0.1)] ring-1 ring-[#E0FC10]/30' : 'border-white/[0.1]'}`}>
              <input ref={inputRef} type="text" value={repoUrl || ''}
                onChange={e => { setRepoUrl(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
                placeholder={hero.inputPlaceholder} disabled={loading}
                className="flex-1 bg-transparent border-none outline-none px-5 py-4 text-[14px] text-[#eaeaec] placeholder:text-[#4a4a54] caret-[#E0FC10]"
              />
              <button onClick={() => handleAnalyze()} disabled={loading || !repoUrl.trim()}
                className="flex items-center gap-2 text-[13px] font-medium bg-[#E0FC10] text-[#0a0a0c] px-5 py-2.5 mr-2 rounded-lg whitespace-nowrap hover:bg-[#eafd60] disabled:opacity-40 transition-all duration-200 hover:shadow-[0_2px_8px_rgba(224,252,16,0.2)]">
                {loading ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-20"/><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    <span className="text-[12px]">{loadingMsg}</span>
                  </>
                ) : (<>{hero.analyzeButton} <ArrowRight size={14} /></>)}
              </button>
            </div>
          ) : (
            <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); const items = e.dataTransfer.items; if (items?.[0]?.webkitGetAsEntry?.()?.isDirectory) { handleFolderUpload(e.dataTransfer.items); } else { handleUpload(e.dataTransfer.files[0]); } }}
              onClick={() => fileRef.current?.click()}
              className={`border border-white/[0.1] rounded-xl bg-[#111113]/90 backdrop-blur-sm p-8 text-center cursor-pointer transition-all duration-300 ${dragOver ? 'border-[#E0FC10]/40 bg-[#E0FC10]/[0.03]' : 'hover:border-white/[0.14]'} ${loading ? 'pointer-events-none opacity-60' : ''}`}>
              <input ref={fileRef} type="file" accept=".zip" className="hidden" onChange={e => handleUpload(e.target.files[0])} />
              <p className="text-[13px] text-[#b0b0b8] mb-1">{loading ? 'Uploading...' : 'Drop a .zip or folder here, or click to browse'}</p>
              <p className="text-[11px] text-[#4a4a54]">Max 50MB · .zip files or project folders</p>
            </div>
          )}
          {error && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 text-center"><p className="text-red-400 text-[12px]">{error}</p></motion.div>}
          {/* Mobile suggested repos — shown as chips below input */}
          <div className="flex md:hidden flex-wrap items-center justify-center gap-2 mt-3">
            <span className="text-[10px] text-[#4a4a54]">try:</span>
            {hero.suggestedRepos.slice(0, 3).map(repo => (
              <button key={repo} onClick={() => { setMode('url'); setRepoUrl(`https://github.com/${repo}`); }} disabled={loading}
                className="text-[10px] text-[#787884] hover:text-[#E0FC10] px-2 py-1 rounded-md border border-white/[0.06] bg-white/[0.02] transition-colors disabled:opacity-40">{repo.split('/')[1]}</button>
            ))}
          </div>
          {needsGithub && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 text-center">
              <p className="text-[13px] text-[#b0b0b8] mb-2">This repository is private — connect your GitHub to continue</p>
              <button onClick={connectGithubForRepo}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#E0FC10] text-[#0a0a0c] text-[12px] font-semibold hover:bg-[#eafd60] transition-all">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                Connect GitHub →
              </button>
            </motion.div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 0.6 }}
          className="mt-14 flex items-center gap-6 flex-wrap justify-center relative z-[2]">
          {hero.stats.map((s, i) => (
            <div key={i} className="flex items-center gap-6">
              {i > 0 && <div className="w-px h-4 bg-white/[0.08]" />}
              <span className="text-[12px] text-[#787884]"><strong className="text-[#eaeaec] font-medium">{s.value}</strong> {s.label}</span>
            </div>
          ))}
        </motion.div>
      </section>

      {/* PRODUCT SHOWCASE */}
      <ProductShowcase />

      {/* HOW IT WORKS */}
      <HowItWorks />

      {/* SUPPORTED TECH — scrolling marquee */}
      <SupportedTech />

      {/* USE CASES */}
      <UseCaseScenarios onCta={scrollToInput} />

      {/* COST COMPARISON */}
      <CostComparison />

      {/* WHY GREPIT */}
      <Whygrepit />

      {/* TESTIMONIALS */}
      <section className="relative py-28 px-6 md:px-8 z-[1] overflow-hidden">
        <div className="max-w-[900px] mx-auto text-center mb-14">
          <motion.p initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="text-[10px] text-[#E0FC10] tracking-[3px] uppercase mb-3 font-medium">{testimonials.label}</motion.p>
          <motion.h2 initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }}
            className="text-[30px] md:text-[38px] font-semibold tracking-tight leading-tight bg-gradient-to-b from-white to-white/70 bg-clip-text text-transparent">
            {testimonials.title}
          </motion.h2>
        </div>
        <TestimonialDeck items={testimonials.items} />
      </section>

      {/* PRICING */}
      <PricingSection handlePricingAction={handlePricingAction} subscribing={subscribing} />

      {/* PLAN COMPARISON */}
      <section className="relative z-[1] py-24 px-6 md:px-8">
        <div className="max-w-[1060px] mx-auto">
          <div className="text-center mb-14">
            <motion.p initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="text-[10px] text-[#E0FC10] tracking-[3px] uppercase mb-3 font-medium">Compare plans</motion.p>
            <motion.h2 initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
              className="text-[28px] md:text-[36px] font-semibold tracking-tight leading-tight">
              Everything at a glance
            </motion.h2>
          </div>

          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
            className="relative">
            {/* Coming soon badge */}
            <div className="absolute -top-4 right-0 md:right-[-40px] z-10 hidden md:flex items-center gap-2 px-3 md:px-4 py-1.5 rounded-md bg-[#0a0a0c] border border-[#E0FC10]/25 shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
              <span className="text-[10px] md:text-[12px] text-[#E0FC10] font-medium">More features coming soon</span>
            </div>

            {/* Mobile: simplified feature list per plan */}
            <div className="md:hidden space-y-4">
              {[
                { name: 'Starter', price: PLANS.starter.price, accent: true, features: ['3 repositories', '500K tokens/day', '30 messages/chat', 'Full security report', 'PDF export', 'Unlimited re-analysis'] },
                { name: 'Pro', price: PLANS.pro.price, accent: false, features: ['7 repositories', '2M tokens/day', '80 messages/chat', 'Everything in Starter', 'Large codebase support', 'Priority queue & support'] },
              ].map((plan) => (
                <div key={plan.name} className={`rounded-xl border p-5 ${plan.accent ? 'border-[#E0FC10]/20 bg-[#E0FC10]/[0.02]' : 'border-white/[0.06] bg-[#111113]'}`}>
                  <div className="flex items-baseline justify-between mb-4">
                    <span className={`text-[14px] font-semibold ${plan.accent ? 'text-[#E0FC10]' : 'text-[#eaeaec]'}`}>{plan.name}</span>
                    <span className="text-[18px] font-bold text-[#eaeaec]">{plan.price}<span className="text-[11px] text-[#4a4a54] font-normal">/mo</span></span>
                  </div>
                  <div className="space-y-2">
                    {plan.features.map((f, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Check size={12} className={plan.accent ? 'text-[#E0FC10]' : 'text-[#787884]'} strokeWidth={2.5} />
                        <span className="text-[12px] text-[#b0b0b8]">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: full comparison table */}
            <div className="hidden md:block rounded-2xl border border-white/[0.08] overflow-x-auto bg-[#111113] shadow-[0_16px_48px_rgba(0,0,0,0.4)]">
            <div className="min-w-[600px]">
            {/* Header */}
            <div className="grid grid-cols-[1.8fr_1fr_1fr_1fr] border-b border-white/[0.08]">
              <div className="p-3 md:p-5 flex items-center">
                <span className="text-[11px] md:text-[13px] text-[#787884] font-medium uppercase tracking-wider">Features</span>
              </div>
              <div className="p-5 text-center border-l border-white/[0.06]">
                <span className="text-[14px] text-[#b0b0b8] font-semibold">Free</span>
                <p className="text-[11px] text-[#4a4a54] mt-0.5">$0</p>
              </div>
              <div className="p-5 text-center border-l border-white/[0.06] bg-[#E0FC10]/[0.03] relative">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#E0FC10]/60 to-transparent" />
                <span className="text-[14px] text-[#E0FC10] font-bold">starter</span>
                <p className="text-[11px] text-[#E0FC10]/60 mt-0.5">{PLANS.starter.price}/mo</p>
              </div>
              <div className="p-5 text-center border-l border-white/[0.06]">
                <span className="text-[14px] text-[#b0b0b8] font-semibold">Pro</span>
                <p className="text-[11px] text-[#4a4a54] mt-0.5">{PLANS.pro.price}/mo</p>
              </div>
            </div>
            {/* Rows */}
            {[
              { feature: 'Repositories', free: String(PLANS.free.maxRepos), pro: String(PLANS.starter.maxRepos), team: String(PLANS.pro.maxRepos) },
              { feature: 'Daily token budget', free: '150K', pro: '750K', team: '3M' },
              { feature: 'Messages per chat', free: String(PLANS.free.maxMessagesPerChat), pro: String(PLANS.starter.maxMessagesPerChat), team: String(PLANS.pro.maxMessagesPerChat) },
              { feature: 'Re-analysis frequency', free: '1 / week', pro: 'Unlimited', team: 'Unlimited' },
              { feature: 'Chat sharing', free: '2 total', pro: 'Unlimited', team: 'Unlimited' },
              { feature: 'Private repositories', free: PLANS.free.privateRepos, pro: PLANS.starter.privateRepos, team: PLANS.pro.privateRepos },
              { feature: 'Full security report', free: PLANS.free.fullSecurityReport, pro: PLANS.starter.fullSecurityReport, team: PLANS.pro.fullSecurityReport },
              { feature: 'PDF export', free: PLANS.free.pdfExport, pro: PLANS.starter.pdfExport, team: PLANS.pro.pdfExport },
              { feature: 'Large codebase support', free: false, pro: false, team: true },
              { feature: 'Priority analysis queue', free: PLANS.free.priorityQueue, pro: PLANS.starter.priorityQueue, team: PLANS.pro.priorityQueue },
              { feature: 'Priority support', free: false, pro: false, team: true },
            ].map((row, i) => (
              <div key={i} className={`grid grid-cols-[1.8fr_1fr_1fr_1fr] transition-colors hover:bg-white/[0.02] ${i % 2 === 0 ? 'bg-white/[0.01]' : ''} ${i < 10 ? 'border-b border-white/[0.04]' : ''}`}>
                <div className="px-5 py-4 flex items-center">
                  <span className="text-[13px] text-[#eaeaec]">{row.feature}</span>
                </div>
                {['free', 'pro', 'team'].map(plan => (
                  <div key={plan} className={`px-5 py-4 flex items-center justify-center border-l border-white/[0.04] ${plan === 'pro' ? 'bg-[#E0FC10]/[0.02]' : ''}`}>
                    {typeof row[plan] === 'boolean' ? (
                      row[plan] ? (
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center ${plan === 'pro' ? 'bg-[#E0FC10]/15' : 'bg-white/[0.06]'}`}>
                          <Check size={14} className={plan === 'pro' ? 'text-[#E0FC10]' : 'text-[#b0b0b8]'} strokeWidth={2.5} />
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-full flex items-center justify-center bg-white/[0.03]">
                          <X size={12} className="text-[#4a4a54]" />
                        </div>
                      )
                    ) : (
                      <span className={`text-[13px] font-semibold ${plan === 'pro' ? 'text-[#E0FC10]' : 'text-[#eaeaec]'}`}>{row[plan]}</span>
                    )}
                  </div>
                ))}
              </div>
            ))}
            </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <Section className="relative py-28 px-6 md:px-8 text-center z-[1]">
        <div className="max-w-[560px] mx-auto relative">
          {/* Gradient glow behind */}
          <div className="absolute inset-0 -z-10 blur-[100px] opacity-20 bg-gradient-to-r from-[#E0FC10]/40 via-transparent to-[#E0FC10]/40 rounded-full" />
          <h2 className="text-[36px] md:text-[44px] font-semibold tracking-tight leading-tight mb-5">{cta.title}</h2>
          <p className="text-[16px] text-[#787884] mb-9 leading-relaxed">{cta.subtitle}</p>
          <motion.button onClick={scrollToInput}
            whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.98 }}
            className="inline-flex items-center gap-2 text-[14px] font-medium bg-[#E0FC10] text-[#0a0a0c] py-3.5 px-8 rounded-xl hover:bg-[#eafd60] hover:shadow-[0_8px_24px_rgba(224,252,16,0.15)] transition-all duration-200">
            {cta.button} <ArrowRight size={16} />
          </motion.button>
        </div>
      </Section>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.06] py-10 px-6 md:px-8 relative z-[1]">
        <div className="max-w-[1100px] mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <ViboMark size={18} />
              <span className="text-[14px] font-semibold text-[#eaeaec] tracking-tight">grep<span className="text-[#E0FC10]">it</span></span>
            </div>
            <div className="flex items-center gap-6">
              <Link href="/privacy" className="text-[12px] text-[#b0b0b8] hover:text-[#E0FC10] transition-colors duration-200">Privacy</Link>
              <Link href="/terms" className="text-[12px] text-[#b0b0b8] hover:text-[#E0FC10] transition-colors duration-200">Terms</Link>
              <Link href="/refund" className="text-[12px] text-[#b0b0b8] hover:text-[#E0FC10] transition-colors duration-200">Refunds</Link>
              <Link href="/faq" className="text-[12px] text-[#b0b0b8] hover:text-[#E0FC10] transition-colors duration-200">FAQ</Link>
              <a href="mailto:support@grepit.co" className="text-[12px] text-[#b0b0b8] hover:text-[#E0FC10] transition-colors duration-200">Contact</a>
            </div>
          </div>
          <div className="mt-6 pt-5 border-t border-white/[0.04] flex flex-col md:flex-row items-center justify-between gap-3">
            <span className="text-[11px] text-[#787884]">© {new Date().getFullYear()} grepit. All rights reserved.</span>
            <span className="text-[11px] text-[#787884]">Built for developers who value their time.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
