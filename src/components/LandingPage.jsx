"use client";
import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession, signIn, signOut } from 'next-auth/react';

/* ─── Auth error map ─── */
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

const FEATURES = [
  { icon: '⬡', title: 'Architecture Map', desc: 'Visual topology with layers, modules, and dependency flows. See how your code is actually organized at a glance.', tag: 'always included' },
  { icon: '◈', title: 'AI Query Console', desc: 'Ask plain-English questions about the codebase. Answers are grounded in the real code, not hallucinated.', tag: '20 queries/day free' },
  { icon: '◎', title: 'API Explorer', desc: 'Auto-detect REST endpoints, routes, and middleware chains with inferred request/response schemas.', tag: 'always included' },
  { icon: '⊛', title: 'Security Audit', desc: 'Detect hardcoded secrets, unsafe patterns, missing tests, and duplicate code — severity-tagged and linked to exact file lines.', tag: 'always included' },
  { icon: '↗', title: 'PDF Export & Sharing', desc: 'Generate professional audit reports as PDFs or shareable links. Perfect for due diligence, onboarding, or stakeholder reviews.', tag: 'pro' },
  { icon: '◬', title: 'Setup Guide', desc: 'Auto-generated local dev setup instructions. Lists required tools, environment variables, and entry-point files for any repo.', tag: 'always included' },
];

const STEPS = [
  { num: '01', title: 'Paste or upload', desc: 'Drop a GitHub URL or upload a ZIP. Supports public repos, private repos (with auth), and local projects.' },
  { num: '02', title: 'Parse & analyze', desc: 'Vibo extracts every file, symbol, import, endpoint, and pattern. 40+ languages parsed in under 30 seconds.' },
  { num: '03', title: 'AI enrichment', desc: "Groq's LLM enriches the analysis with summaries, security insights, and natural-language explanations of complex code." },
  { num: '04', title: 'Explore & share', desc: 'Navigate the interactive dashboard, query the AI, export a PDF report, or embed a health badge in your README.' },
];

const TESTIMONIALS = [
  { quote: 'Dropped a legacy codebase I inherited into Vibo and understood the whole thing in 10 minutes. Would have taken me a week otherwise.', initials: 'MR', name: 'Marcus R.', role: 'Senior Engineer, Stripe' },
  { quote: 'The security audit caught a hardcoded API key in a repo we were about to acquire. That alone was worth the subscription.', initials: 'SL', name: 'Sofia L.', role: 'CTO, Seed-stage startup' },
  { quote: 'I use Vibo every time I start at a new client. The PDF report makes it trivially easy to explain the architecture to non-technical stakeholders.', initials: 'AK', name: 'Ananya K.', role: 'Freelance engineer' },
];

const PLANS = [
  {
    name: 'FREE', price: '0', period: 'forever', featured: false,
    cta: 'Get started free',
    features: ['Public repos only','Unlimited analyses','All dashboard views','Markdown export','AI chat — 20 queries/day'],
    missing: ['Private repos','PDF export','Health badge'],
  },
  {
    name: 'PRO', price: '19', period: 'per month · cancel anytime', featured: true,
    cta: 'Start 7-day free trial',
    features: ['Public + private repos','Unlimited analyses','All dashboard views','PDF export + sharing','AI chat — unlimited','Health score + README badge','Webhook re-analysis on push'],
    missing: ['Team access'],
  },
  {
    name: 'TEAM', price: '49', period: 'per month · up to 5 members', featured: false,
    cta: 'Try Team plan',
    features: ['Everything in Pro','5 team members included','Shared analysis history','Priority AI queue','SSO / GitHub org login','+$8/mo per additional seat'],
    missing: [],
  },
];

async function parseJsonResponse(res) {
  const raw = await res.text();
  if (!raw) return {};
  try { return JSON.parse(raw); }
  catch { throw new Error(`Server returned an invalid response (HTTP ${res.status}).`); }
}

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.vb-reveal');
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
}

export default function LandingPage() {
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [error, setError] = useState('');
  const [authConfigured, setAuthConfigured] = useState(true);
  const [mode, setMode] = useState('url');
  const [dragOver, setDragOver] = useState(false);
  const [recentAnalyses, setRecentAnalyses] = useState([]);
  const fileRef = useRef(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  useReveal();

  // Progress messages while analyzing
  useEffect(() => {
    if (!loading) { setLoadingMsg(''); return; }
    const stages = [
      'Connecting to GitHub...',
      'Fetching repository tree...',
      'Indexing files...',
      'Building code intelligence...',
      'Mapping architecture...',
      'Running security scan...',
      'Enhancing with AI...',
      'Almost there...',
    ];
    let idx = 0;
    setLoadingMsg(stages[0]);
    const interval = setInterval(() => {
      idx = Math.min(idx + 1, stages.length - 1);
      setLoadingMsg(stages[idx]);
    }, 4000);
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    setRecentAnalyses(JSON.parse(localStorage.getItem('vibo-analyses') || '[]').slice(0, 5));
    fetch('/api/auth/status').then(r => r.json()).then(d => setAuthConfigured(Boolean(d.configured))).catch(() => setAuthConfigured(false));
  }, []);

  useEffect(() => {
    const e = searchParams.get('error');
    if (e && !session) setError(AUTH_ERRORS[e] || AUTH_ERRORS.Default);
  }, [searchParams, session]);

  const startSignIn = () => {
    if (!authConfigured) { setError('GitHub OAuth not configured. Add GITHUB_ID, GITHUB_SECRET, NEXTAUTH_URL, NEXTAUTH_SECRET.'); return; }
    signIn('github', { callbackUrl: `${window.location.origin}${window.location.pathname}` });
  };

  const saveAndRedirect = (data) => {
    const saved = JSON.parse(localStorage.getItem('vibo-analyses') || '[]');
    saved.unshift({ id: data.id, name: data.repo_name, url: data.repo_url || 'local upload', date: new Date().toISOString() });
    localStorage.setItem('vibo-analyses', JSON.stringify(saved.slice(0, 20)));
    router.push(`/dashboard?id=${data.id}`);
  };

  const handleAnalyze = async (url) => {
    const target = url || repoUrl.trim();
    if (!target) return;
    if (!target.match(/^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+/)) { setError('Enter a valid GitHub URL (https://github.com/owner/repo)'); return; }
    setLoading(true); setError('');
    try {
      let res, data;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 120000); // 2 min timeout
        res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ repoUrl: target, repoName: target.split('/').pop() }), signal: controller.signal });
        clearTimeout(timeout);
        data = await parseJsonResponse(res);
      } catch (networkErr) {
        if (networkErr?.name === 'AbortError') throw new Error('Analysis timed out. This repo might be too large. Try a smaller repository or a specific branch.');
        if (networkErr instanceof Error && !/Failed to fetch|Load failed|NetworkError|invalid response/i.test(networkErr.message)) throw networkErr;
        throw new Error('Could not reach the server. Check that the app is running and try again.');
      }
      if (res.status === 403 && data.requiresAuth) { setLoading(false); setError('This is a private repository. Signing you in with GitHub to access it...'); setTimeout(() => startSignIn(), 1500); return; }
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      saveAndRedirect(data);
    } catch (err) { setError(err.message); setLoading(false); }
  };

  const handleUpload = async (file) => {
    if (!file) return;
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

  return (
    <div className="min-h-screen bg-vb-bg text-vb-ink">

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 h-14 bg-vb-bg/80 backdrop-blur-xl border-b border-white/[0.06] flex items-center px-8 gap-8 z-[100]">
        <div className="font-semibold text-[18px] tracking-tight cursor-pointer" onClick={() => router.push('/')}>
          vi<span className="text-vb-accent">b</span>o
        </div>
        <div className="hidden md:flex gap-6">
          {['features', 'how it works', 'pricing'].map((label, i) => (
            <a key={i} href={['#features', '#how', '#pricing'][i]} className="text-[13px] text-vb-ink3 hover:text-vb-ink transition-colors duration-200">
              {label}
            </a>
          ))}
          <a href="#" className="text-[13px] text-vb-ink3 hover:text-vb-ink transition-colors duration-200">docs</a>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {session ? (
            <div className="flex items-center gap-3">
              {session.user?.image && <img src={session.user.image} alt="" className="w-7 h-7 rounded-full border border-white/[0.1]" />}
              <span className="text-[13px] text-vb-ink2 hidden md:block">{session.user?.name}</span>
              <button onClick={() => signOut({ callbackUrl: '/' })} className="text-[13px] text-vb-ink3 hover:text-vb-ink px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-all duration-200">sign out</button>
            </div>
          ) : (
            <>
              <button onClick={startSignIn} className="text-[13px] text-vb-ink3 hover:text-vb-ink px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-all duration-200">Sign in</button>
              <button onClick={startSignIn} className="text-[13px] font-medium text-vb-bg bg-vb-accent px-4 py-1.5 rounded-lg hover:bg-vb-accent-bright transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(224,252,16,0.2)]">Try free →</button>
            </>
          )}
        </div>
      </nav>

      {/* HERO */}
      <section className="min-h-screen flex flex-col items-center justify-center px-8 pt-[120px] pb-24 relative text-center">
        {/* Subtle gradient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] pointer-events-none opacity-50"
          style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 20%, rgba(224,252,16,0.15) 0%, rgba(224,252,16,0.05) 40%, transparent 70%)' }} />

        <div className="inline-flex items-center gap-2 text-[12px] text-vb-accent bg-vb-accent/[0.08] border border-vb-accent/[0.2] px-4 py-1.5 rounded-full mb-10">
          <span className="w-1.5 h-1.5 rounded-full bg-vb-accent animate-pulse-dot" />
          v2.0 — multi-source analysis · now with PDF export
        </div>

        <h1 className="font-semibold tracking-tight leading-[1.05] max-w-[800px] mb-6"
          style={{ fontSize: 'clamp(48px, 6vw, 80px)' }}>
          Understand any{' '}
          <span className="text-vb-accent">codebase</span>{' '}instantly.
        </h1>

        <p className="text-[17px] text-vb-ink2 max-w-[520px] leading-[1.8] mb-12">
          Paste a GitHub link or upload a ZIP. Get architecture maps, AI insights, security audits, and setup guides — in seconds.
        </p>

        {/* Input area */}
        <div className="w-full max-w-[640px]">
          {/* Mode tabs */}
          <div className="flex w-fit mb-0">
            {['url', 'upload'].map((m) => (
              <button key={m} onClick={() => setMode(m)}
                className={`text-[13px] px-4 py-2 rounded-t-lg border border-b-0 transition-all duration-200 ${
                  mode === m ? 'bg-vb-bg2 text-vb-ink border-white/[0.08]' : 'text-vb-ink3 border-transparent hover:text-vb-ink2'
                }`}>
                {m === 'url' ? 'GitHub URL' : 'Upload ZIP'}
              </button>
            ))}
          </div>

          {mode === 'url' ? (
            <div className="flex border border-white/[0.08] rounded-b-xl rounded-tr-xl bg-vb-bg2 overflow-hidden transition-all duration-300 focus-within:border-vb-accent/30 focus-within:shadow-[0_0_0_3px_rgba(224,252,16,0.05)]">
              <input type="text" value={repoUrl || ''}
                onChange={e => { setRepoUrl(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
                placeholder="https://github.com/owner/repo" disabled={loading}
                className="flex-1 bg-transparent border-none outline-none px-5 py-4 text-[14px] text-vb-ink placeholder:text-vb-ink4 caret-vb-accent"
              />
              <button onClick={() => handleAnalyze()} disabled={loading || !repoUrl.trim()}
                className="text-[14px] font-medium bg-vb-accent text-vb-bg px-7 whitespace-nowrap hover:bg-vb-accent-bright disabled:opacity-40 disabled:hover:bg-vb-accent transition-all duration-200">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-20"/>
                      <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    {loadingMsg || 'analyzing...'}
                  </span>
                ) : 'analyze →'}
              </button>
            </div>
          ) : (
            <div onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files[0]); }}
              onClick={() => fileRef.current?.click()}
              className={`border border-white/[0.08] rounded-b-xl rounded-tr-xl bg-vb-bg2 p-12 text-center cursor-pointer transition-all duration-300 ${
                dragOver ? 'border-vb-accent/40 bg-vb-accent/[0.03]' : 'hover:border-white/[0.12]'
              } ${loading ? 'pointer-events-none opacity-60' : ''}`}>
              <input ref={fileRef} type="file" accept=".zip" className="hidden" onChange={e => handleUpload(e.target.files[0])} />
              <div className="text-3xl mb-3 text-vb-ink4">↑</div>
              <p className="text-[14px] text-vb-ink2 mb-1">{loading ? 'Uploading...' : 'Drop a .zip file here or click to browse'}</p>
              <p className="text-[12px] text-vb-ink4">Max 50MB • ZIP files only</p>
            </div>
          )}

          {/* Quick repos */}
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <span className="text-[12px] text-vb-ink4">try:</span>
            {['facebook/react', 'vercel/next.js', 'denoland/deno', 'torvalds/linux', 'microsoft/vscode'].map(repo => (
              <button key={repo} onClick={() => { setMode('url'); setRepoUrl(`https://github.com/${repo}`); }} disabled={loading}
                className="text-[12px] text-vb-ink3 bg-white/[0.03] border border-white/[0.06] px-3 py-1 rounded-lg hover:border-vb-accent/30 hover:text-vb-accent transition-all duration-200 disabled:opacity-40">
                {repo.split('/')[1]}
              </button>
            ))}
          </div>
          {error && <p className="text-vb-red text-[13px] mt-3 text-left">{error}</p>}
        </div>

        {/* Stats */}
        <div className="mt-16 flex items-center gap-6 flex-wrap justify-center">
          {[['12,400+', 'repos analyzed'], ['40+', 'file types supported'], ['< 30s', 'average analysis time'], ['', 'No credit card required']].map(([val, label], i) => (
            <div key={i} className="flex items-center gap-6">
              {i > 0 && <div className="w-px h-5 bg-white/[0.08]" />}
              <span className="text-[13px] text-vb-ink3">
                {val && <strong className="text-vb-ink2">{val}</strong>} {label}
              </span>
            </div>
          ))}
        </div>

        {/* Recent analyses */}
        {recentAnalyses.length > 0 && (
          <div className="mt-10 w-full max-w-[640px] text-left">
            <p className="text-[11px] text-vb-ink4 uppercase tracking-widest mb-3">recent</p>
            <div className="flex flex-wrap gap-2">
              {recentAnalyses.map((a, i) => (
                <a key={i} href={`/dashboard?id=${a.id}`}
                  className="text-[12px] text-vb-ink2 bg-white/[0.03] border border-white/[0.06] px-3 py-1.5 rounded-lg hover:text-vb-ink hover:border-white/[0.12] transition-all duration-200">
                  {a.name}
                </a>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* FEATURES */}
      <section id="features" className="relative py-28 px-8 max-w-[1100px] mx-auto">
        <div className="vb-reveal">
          <p className="text-[11px] text-vb-ink4 tracking-[3px] uppercase mb-3">what you get</p>
          <h2 className="text-[36px] font-semibold tracking-tight leading-tight mb-4">Every analysis includes</h2>
          <p className="text-[15px] text-vb-ink2 max-w-[500px] leading-relaxed">Works on any public repo instantly. Private repos with GitHub sign-in. No setup required.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-14 vb-reveal">
          {FEATURES.map((f, i) => (
            <div key={i} className="p-7 bg-white/[0.02] border border-white/[0.06] rounded-2xl hover:bg-white/[0.04] hover:border-white/[0.1] hover:-translate-y-0.5 transition-all duration-300">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[18px] mb-5 bg-white/[0.04] border border-white/[0.08]">{f.icon}</div>
              <div className="text-[15px] font-semibold text-vb-ink mb-2">{f.title}</div>
              <p className="text-[13px] text-vb-ink3 leading-relaxed mb-4">{f.desc}</p>
              <span className={`inline-block text-[11px] px-2.5 py-1 rounded-md border ${
                f.tag === 'pro' ? 'bg-vb-violet/10 text-vb-violet border-vb-violet/20' : 'bg-vb-accent/[0.08] text-vb-accent border-vb-accent/20'
              }`}>
                {f.tag}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="relative py-28 px-8 max-w-[1100px] mx-auto border-t border-white/[0.06]">
        <div className="vb-reveal">
          <p className="text-[11px] text-vb-ink4 tracking-[3px] uppercase mb-3">how it works</p>
          <h2 className="text-[36px] font-semibold tracking-tight leading-tight mb-4">Four steps to full clarity</h2>
          <p className="text-[15px] text-vb-ink2 max-w-[500px] leading-relaxed">From zero to a complete understanding of any codebase in under a minute.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-14 vb-reveal">
          {STEPS.map((s, i) => (
            <div key={i} className="p-6 bg-white/[0.02] border border-white/[0.06] rounded-2xl hover:bg-white/[0.04] transition-all duration-300 relative">
              <div className="text-[11px] text-vb-ink4 tracking-widest mb-4">{s.num}</div>
              <div className="text-[15px] font-semibold text-vb-ink mb-2">{s.title}</div>
              <p className="text-[13px] text-vb-ink3 leading-relaxed">{s.desc}</p>
              {i < STEPS.length - 1 && (
                <span className="absolute right-[-12px] top-8 text-[14px] text-vb-ink4 z-[2] hidden md:block">→</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="relative py-28 px-8 max-w-[1100px] mx-auto border-t border-white/[0.06]">
        <div className="vb-reveal">
          <p className="text-[11px] text-vb-ink4 tracking-[3px] uppercase mb-3">used by developers</p>
          <h2 className="text-[36px] font-semibold tracking-tight leading-tight">What people are saying</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-14 vb-reveal">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="p-6 bg-white/[0.02] border border-white/[0.06] rounded-2xl hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-300">
              <p className="text-[14px] text-vb-ink2 leading-relaxed mb-5 italic">
                <span className="text-vb-accent not-italic">"</span>{t.quote}
              </p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-[11px] font-semibold text-vb-ink2">{t.initials}</div>
                <div>
                  <div className="text-[13px] font-medium text-vb-ink">{t.name}</div>
                  <div className="text-[11px] text-vb-ink4">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="relative py-28 px-8 max-w-[1100px] mx-auto border-t border-white/[0.06]">
        <div className="vb-reveal">
          <p className="text-[11px] text-vb-ink4 tracking-[3px] uppercase mb-3">pricing</p>
          <h2 className="text-[36px] font-semibold tracking-tight leading-tight mb-4">Simple, honest pricing</h2>
          <p className="text-[15px] text-vb-ink2 max-w-[500px] leading-relaxed">Public repos are always free. Upgrade only when you need private repos, unlimited AI, or team features.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-14 vb-reveal">
          {PLANS.map((plan, i) => (
            <div key={i} className={`relative rounded-2xl p-7 transition-all duration-300 ${
              plan.featured ? 'bg-white/[0.04] border-2 border-vb-violet/40' : 'bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1]'
            }`}>
              {plan.featured && (
                <div className="absolute top-[-12px] left-1/2 -translate-x-1/2 text-[10px] font-semibold bg-vb-violet text-white px-3 py-1 rounded-full tracking-wide">MOST POPULAR</div>
              )}
              <div className="text-[13px] text-vb-ink3 mb-4 tracking-wide">{plan.name}</div>
              <div className="text-[44px] font-semibold tracking-tight text-vb-ink leading-none">
                <sup className="text-[18px] align-super">$</sup>{plan.price}
              </div>
              <div className="text-[12px] text-vb-ink4 mt-2 mb-6">{plan.period}</div>
              <button onClick={startSignIn} className={`w-full flex items-center justify-center py-2.5 px-5 rounded-xl text-[13px] font-medium mb-6 transition-all duration-200 ${
                plan.featured
                  ? 'bg-vb-accent text-vb-bg hover:bg-vb-accent-bright hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(224,252,16,0.2)]'
                  : 'bg-white/[0.04] border border-white/[0.08] text-vb-ink2 hover:bg-white/[0.06] hover:border-white/[0.12]'
              }`}>
                {plan.cta}
              </button>
              <ul className="space-y-2.5">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-start gap-2 text-[13px] text-vb-ink2">
                    <span className="text-vb-accent text-[11px] mt-[2px] flex-shrink-0">✓</span>{f}
                  </li>
                ))}
                {plan.missing.map((f, j) => (
                  <li key={j} className="flex items-start gap-2 text-[13px] text-vb-ink4">
                    <span className="text-[11px] mt-[2px] flex-shrink-0">—</span>{f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="relative py-24 px-8 border-t border-white/[0.06] text-center">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 80% at 50% 50%, rgba(224,252,16,0.08) 0%, rgba(34,211,238,0.03) 40%, transparent 70%)' }} />
        <div className="relative vb-reveal">
          <h2 className="text-[44px] font-semibold tracking-tight leading-tight mb-5">
            Understand any codebase in <span className="text-vb-accent">30 seconds.</span>
          </h2>
          <p className="text-[16px] text-vb-ink2 mb-10">Free for public repos. No install. No config. Just paste a URL.</p>
          <div className="flex items-center gap-4 justify-center flex-wrap">
            <button onClick={startSignIn} className="text-[14px] font-medium bg-vb-accent text-vb-bg py-3 px-7 rounded-xl hover:bg-vb-accent-bright hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(224,252,16,0.2)] transition-all duration-200">Analyze a repo now →</button>
            <button className="text-[13px] text-vb-ink2 bg-white/[0.04] border border-white/[0.08] py-3 px-6 rounded-xl hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-200">Read the docs</button>
          </div>
          <p className="text-[12px] text-vb-ink4 mt-4">No credit card required · Public repos always free · Cancel anytime</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.06] pt-16 pb-10 px-8">
        <div className="max-w-[1100px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr] gap-12 mb-12">
            <div>
              <div className="text-[20px] font-semibold tracking-tight mb-3">vi<span className="text-vb-accent">b</span>o</div>
              <p className="text-[13px] text-vb-ink3 leading-relaxed max-w-[260px] mb-5">AI-powered codebase understanding. Paste a GitHub link, get a complete picture in seconds.</p>
            </div>
            {[
              { title: 'Product', links: ['Features', 'Pricing', 'Changelog', 'Roadmap'] },
              { title: 'Developers', links: ['Documentation', 'API Reference', 'GitHub', 'Status'] },
              { title: 'Company', links: ['About', 'Blog', 'Privacy', 'Terms'] },
            ].map((col, i) => (
              <div key={i}>
                <div className="text-[11px] font-medium text-vb-ink4 tracking-widest uppercase mb-4">{col.title}</div>
                <ul className="space-y-2.5">
                  {col.links.map((link, j) => (
                    <li key={j}><a href="#" className="text-[13px] text-vb-ink3 hover:text-vb-ink transition-colors duration-200">{link}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-white/[0.06] pt-7 flex items-center justify-between flex-wrap gap-4">
            <span className="text-[12px] text-vb-ink4">© 2025 Vibo. Built for developers.</span>
            <div className="flex items-center gap-1.5 text-[12px] text-vb-ink4">
              <span className="w-1.5 h-1.5 rounded-full bg-vb-accent animate-pulse-dot" />
              All systems operational
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
