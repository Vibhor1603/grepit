"use client";
import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useUser, SignOutButton } from '@clerk/nextjs';
import { ViboMark } from './ViboLogo';
import { SITE_CONFIG } from '../lib/landing-config';
import { MessageSquare, Code2, Shield, Zap, Lock, ArrowRight, Check, X, Sparkles, Terminal, BarChart3, Layers, ArrowUpRight, UserCircle } from 'lucide-react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import dynamic from 'next/dynamic';
import { trackAnalysisStarted, trackAnalysisFailed, trackCheckoutStarted, trackUpgradeClicked } from '../lib/analytics';

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

/* ─── FEATURE DEEP-DIVE ─── */

function FeatureSpotlight({ heading, description, children, reverse = false, onCta }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const textY = useTransform(scrollYProgress, [0, 1], [60, -60]);
  const mockY = useTransform(scrollYProgress, [0, 1], [30, -30]);

  return (
    <div ref={ref} className="min-h-[60vh] flex items-center py-20 px-6 md:px-8">
      <div className={`max-w-[1060px] mx-auto flex flex-col ${reverse ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-12 md:gap-20`}>
        <motion.div className="flex-1" style={{ y: textY }}>
          <h3 className="text-[26px] md:text-[32px] font-semibold tracking-tight leading-[1.15] text-[#eaeaec] mb-4">
            {heading}
          </h3>
          <p className="text-[14px] text-[#b0b0b8] leading-[1.7] mb-6 max-w-[400px]">
            {description}
          </p>
          <motion.button
            onClick={onCta}
            whileHover={{ x: 4 }}
            className="inline-flex items-center gap-2 text-[13px] font-medium text-[#E0FC10] hover:text-[#eafd60] transition-colors">
            Try it free <ArrowRight size={14} />
          </motion.button>
        </motion.div>
        <motion.div className="flex-1 max-w-[500px] w-full" style={{ y: mockY }}>
          {children}
        </motion.div>
      </div>
    </div>
  );
}

function FeatureDeepDive({ onCta }) {
  return (
    <section className="relative z-[1] py-20" id="features">
      <FeatureSpotlight
        heading="AI that actually reads your code"
        description="Not a generic chatbot. Grepit indexes your entire codebase and answers questions grounded in real files, real functions, real logic. Every response cites the exact source."
        onCta={onCta}>
        <MockChatUI />
      </FeatureSpotlight>
      <FeatureSpotlight
        heading="Security audit in seconds"
        description="Hardcoded secrets, unsafe patterns, missing validation — all caught instantly. Severity-tagged, linked to exact lines, with actionable fix suggestions."
        reverse
        onCta={onCta}>
        <MockSecurityReport />
      </FeatureSpotlight>
      <FeatureSpotlight
        heading="Architecture diagrams on demand"
        description="Generate flow diagrams, dependency graphs, and system maps with a single click. Dark-themed, Mermaid-powered, and always up to date with your code."
        onCta={onCta}>
        <MockMermaidDiagram />
      </FeatureSpotlight>
    </section>
  );
}

/* ─── COST COMPARISON ─── */

function AnimatedBar({ label, cost, maxCost, color, delay = 0 }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-40px' });
  const width = (cost / maxCost) * 100;

  return (
    <motion.div ref={ref} className="mb-6"
      initial={{ opacity: 0, x: -30 }}
      animate={isInView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[13px] text-[#b0b0b8] font-medium">{label}</span>
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
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let frame;
    let start = 0;
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
    { label: 'Claude Code', cost: 125, color: 'linear-gradient(90deg, #ef4444, #f97316)' },
    { label: 'Cursor (with API keys)', cost: 60, color: 'linear-gradient(90deg, #f97316, #eab308)' },
    { label: 'GitHub Copilot Workspace', cost: 19, color: 'linear-gradient(90deg, #eab308, #a3a3a3)' },
    { label: 'Grepit', cost: 12, color: 'linear-gradient(90deg, #E0FC10, #b8d00e)' },
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
            Other tools burn 3-5M tokens per session to index and query. Grepit pre-indexes once — each query uses under 5K tokens.
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
            Based on average monthly usage. Claude Code estimate: 3-5M tokens/session × daily use.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── WHY GREPIT — Orbital / Fan Layout ─── */

function WhyGrepit() {
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
            Why teams choose Grepit
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

/* ─── HOW IT WORKS — Vertical Timeline ─── */

function HowItWorks() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start 0.8', 'end 0.6'] });
  const lineHeight = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  const steps = [
    { icon: Terminal, title: 'Paste a link', desc: 'GitHub URL or upload a ZIP. Public or private, any language.' },
    { icon: Sparkles, title: 'Instant analysis', desc: '40+ file types parsed. Architecture, APIs, security — all extracted in seconds.' },
    { icon: Code2, title: 'AI enrichment', desc: 'LLM-powered summaries, insights, and natural-language explanations layered on top.' },
    { icon: BarChart3, title: 'Explore & ask', desc: 'Interactive dashboard. Chat with the AI. Export reports. Understand everything.' },
  ];

  return (
    <section ref={containerRef} className="relative z-[1] py-28 px-6 md:px-8" id="how">
      <div className="max-w-[600px] mx-auto">
        <div className="text-center mb-16">
          <motion.p initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-[10px] text-[#E0FC10] tracking-[3px] uppercase mb-3 font-medium">How it works</motion.p>
          <motion.h2 initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
            className="text-[28px] md:text-[36px] font-semibold tracking-tight leading-tight mb-3">
            From link to full understanding
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
            className="text-[12px] text-[#787884] max-w-[360px] mx-auto leading-relaxed">
            Four steps. Under a minute. Zero configuration.
          </motion.p>
        </div>

        <div className="relative">
          {/* Background line */}
          <div className="absolute left-[19px] top-0 bottom-0 w-px bg-white/[0.04]" />
          {/* Animated glowing line */}
          <motion.div
            className="absolute left-[19px] top-0 w-px bg-gradient-to-b from-[#E0FC10] to-[#E0FC10]/20"
            style={{ height: lineHeight }}
          />

          <div className="space-y-12">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="flex items-start gap-6 relative">
                  {/* Node */}
                  <div className="relative z-10 w-10 h-10 rounded-full bg-[#111113] border border-white/[0.08] flex items-center justify-center flex-shrink-0">
                    <Icon size={16} className="text-[#E0FC10]" strokeWidth={1.8} />
                    <motion.div
                      className="absolute inset-0 rounded-full border border-[#E0FC10]/20"
                      animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0, 0.4] }}
                      transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.4 }}
                    />
                  </div>
                  {/* Content */}
                  <div className="pt-1.5">
                    <h4 className="text-[14px] font-semibold text-[#eaeaec] mb-1">{step.title}</h4>
                    <p className="text-[12px] text-[#787884] leading-relaxed">{step.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── PRICING — Stacked Depth Cards ─── */

function PricingSection({ handlePricingAction, subscribing }) {
  const plans = [
    {
      name: 'Free', price: '$0', period: 'forever', cta: 'Get started free', featured: false,
      features: ['1 repository', '15 AI queries/day', 'Basic health report', 'Code explorer', 'Architecture diagrams', 'Markdown export'],
    },
    {
      name: 'Basic', price: '$12', originalPrice: '$15', period: '/month', cta: 'Upgrade to Basic', featured: true,
      features: ['3 repositories', '100 AI queries/day', 'Full security report', 'PDF export', 'Unlimited re-analysis', 'Unlimited sharing'],
    },
    {
      name: 'Pro', price: '$30', period: '/month', cta: 'Go Pro', featured: false,
      features: ['Everything in Basic', '500 AI queries/day', '7 repositories', 'Large codebase support', 'Priority analysis queue', 'Priority support'],
    },
  ];

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

      // Detect payment provider based on geo
      let paymentProvider = 'lemonsqueezy';
      try {
        const providerRes = await fetch('/api/billing/provider');
        const providerData = await providerRes.json();
        paymentProvider = providerData.provider;
      } catch {}

      if (paymentProvider === 'lemonsqueezy') {
        // International: redirect to LemonSqueezy
        const res = await fetch('/api/lemonsqueezy/create-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: planName.toLowerCase() }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error || 'Something went wrong'); setSubscribing(null); return; }
        if (data.url) { window.location.href = data.url; }
        else { setError('Could not create checkout'); setSubscribing(null); }
        return;
      }

      // India: Razorpay modal
      if (!document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
        });
      }

      // Create subscription
      const res = await fetch('/api/razorpay/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planName.toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Something went wrong'); setSubscribing(null); return; }

      // Open Razorpay modal for subscription
      const options = {
        key: data.key_id,
        subscription_id: data.subscription_id,
        name: 'Grepit',
        description: `${planName} Plan — Monthly Subscription`,
        prefill: { name: data.user?.name || '', email: data.user?.email || '' },
        theme: { color: '#E0FC10' },
        handler: async function (response) {
          const verifyRes = await fetch('/api/razorpay/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_subscription_id: response.razorpay_subscription_id,
              razorpay_signature: response.razorpay_signature,
              plan: planName.toLowerCase(),
            }),
          });
          const verifyData = await verifyRes.json();
          if (verifyData.success) { window.location.href = '/profile?checkout=success'; }
          else { setError(verifyData.error || 'Payment verification failed'); }
          setSubscribing(null);
        },
        modal: { ondismiss: () => setSubscribing(null) },
      };
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (resp) => { setError(`Payment failed: ${resp.error.description}`); setSubscribing(null); });
      rzp.open();
    } catch { setError('Could not start checkout. Try again.'); }
    finally { /* setSubscribing handled in callbacks */ }
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
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[11px] text-[#4a4a54]">try:</span>
              {hero.suggestedRepos.map(repo => (
                <button key={repo} onClick={() => { setMode('url'); setRepoUrl(`https://github.com/${repo}`); }} disabled={loading}
                  className="text-[11px] text-[#4a4a54] hover:text-[#E0FC10] transition-colors disabled:opacity-40">{repo.split('/')[1]}</button>
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

      {/* FEATURE DEEP-DIVE */}
      <FeatureDeepDive onCta={scrollToInput} />

      {/* COST COMPARISON */}
      <CostComparison />

      {/* WHY GREPIT */}
      <WhyGrepit />

      {/* HOW IT WORKS */}
      <HowItWorks />

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
            className="relative overflow-visible">
            {/* Coming soon badge — hangs off the right edge */}
            <div className="absolute -top-4 z-10 flex items-center gap-2 px-4 py-1.5 rounded-md bg-[#0a0a0c] border border-[#E0FC10]/25 shadow-[0_4px_12px_rgba(0,0,0,0.4)]" style={{ right: '-40px' }}>
              <span className="w-2 h-2 rounded-full bg-[#E0FC10] animate-pulse" />
              <span className="text-[12px] text-[#E0FC10] font-medium">More features coming soon</span>
            </div>
            <div className="rounded-2xl border border-white/[0.08] overflow-hidden bg-[#111113] shadow-[0_16px_48px_rgba(0,0,0,0.4)]">
            {/* Header */}
            <div className="grid grid-cols-[1.8fr_1fr_1fr_1fr] border-b border-white/[0.08]">
              <div className="p-5 flex items-center">
                <span className="text-[13px] text-[#787884] font-medium uppercase tracking-wider">Features</span>
              </div>
              <div className="p-5 text-center border-l border-white/[0.06]">
                <span className="text-[14px] text-[#b0b0b8] font-semibold">Free</span>
                <p className="text-[11px] text-[#4a4a54] mt-0.5">$0</p>
              </div>
              <div className="p-5 text-center border-l border-white/[0.06] bg-[#E0FC10]/[0.03] relative">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#E0FC10]/60 to-transparent" />
                <span className="text-[14px] text-[#E0FC10] font-bold">Basic</span>
                <p className="text-[11px] text-[#E0FC10]/60 mt-0.5">$12/mo</p>
              </div>
              <div className="p-5 text-center border-l border-white/[0.06]">
                <span className="text-[14px] text-[#b0b0b8] font-semibold">Pro</span>
                <p className="text-[11px] text-[#4a4a54] mt-0.5">$30/mo</p>
              </div>
            </div>
            {/* Rows */}
            {[
              { feature: 'Repositories', free: '1', pro: '3', team: '7' },
              { feature: 'AI queries per day', free: '15', pro: '100', team: '500' },
              { feature: 'Token budget per day', free: '50K', pro: '400K', team: '2M' },
              { feature: 'Messages per chat', free: '12', pro: '30', team: '80' },
              { feature: 'Re-analysis frequency', free: '1 / week', pro: 'Unlimited', team: 'Unlimited' },
              { feature: 'Chat sharing', free: '2 total', pro: 'Unlimited', team: 'Unlimited' },
              { feature: 'Private repositories', free: true, pro: true, team: true },
              { feature: 'Full security report', free: false, pro: true, team: true },
              { feature: 'PDF export', free: false, pro: true, team: true },
              { feature: 'Large codebase support', free: false, pro: false, team: true },
              { feature: 'Priority analysis queue', free: false, pro: false, team: true },
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
            <span className="text-[11px] text-[#787884]">© {new Date().getFullYear()} Grepit. All rights reserved.</span>
            <span className="text-[11px] text-[#787884]">Built for developers who value their time.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
