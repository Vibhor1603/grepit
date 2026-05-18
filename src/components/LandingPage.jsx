"use client";
import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser, SignOutButton } from '@clerk/nextjs';
import { ViboLogo, ViboMark } from './ViboLogo';
import { SITE_CONFIG } from '../lib/landing-config';
import { MessageSquare, GitBranch, Sparkles, ShieldCheck, Workflow, FolderTree, Check, ArrowRight, ArrowUpRight, UserCircle } from 'lucide-react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import dynamic from 'next/dynamic';

const GridBackground = dynamic(() => import('./GridBackground'), { ssr: false });

const ICON_MAP = { MessageSquare, GitBranch, Sparkles, ShieldCheck, Workflow, FolderTree };

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

function Stagger({ children, className = '' }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div ref={ref} className={className}
      initial="hidden" animate={isInView ? 'visible' : 'hidden'}
      variants={{ visible: { transition: { staggerChildren: 0.08 } } }}>
      {children}
    </motion.div>
  );
}
const staggerItem = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } } };

function ScreenshotCard({ item, index, total, scrollYProgress }) {
  const start = index / total;
  const end = (index + 1) / total;
  const progress = useTransform(scrollYProgress, [start, end], [0, 1]);
  const scale = useTransform(progress, [0, 1], [1, 0.88]);
  const y = useTransform(progress, [0, 1], [0, -40]);
  const opacity = useTransform(scrollYProgress, 
    [Math.max(0, start - 0.1), start, end - 0.1, end], 
    [index === 0 ? 1 : 0, 1, 1, index === total - 1 ? 1 : 0.4]
  );
  const rotateX = useTransform(progress, [0, 1], [0, -3]);

  return (
    <motion.div
      className="absolute inset-x-0 mx-auto w-full max-w-[1000px] px-4"
      style={{ 
        scale, y, opacity, rotateX,
        zIndex: total - index,
        perspective: '1200px',
      }}>
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-vb-bg1 shadow-[0_32px_100px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.03)]">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
          <span className="w-[11px] h-[11px] rounded-full bg-[#ff5f57]" />
          <span className="w-[11px] h-[11px] rounded-full bg-[#febc2e]" />
          <span className="w-[11px] h-[11px] rounded-full bg-[#28c840]" />
          <span className="text-[10px] text-vb-ink4 ml-3 font-mono tracking-wide">vibo — {item.caption?.toLowerCase()}</span>
        </div>
        <div className="relative h-[360px] md:h-[520px] overflow-hidden bg-vb-bg">
          <img src={item.src} alt={item.alt} className="w-full h-full object-cover"
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
          <div className="hidden items-center justify-center flex-col gap-3 text-center p-8 w-full h-full bg-gradient-to-br from-white/[0.03] to-transparent border-t border-white/[0.04]">
            <div className="w-14 h-14 rounded-2xl bg-vb-accent/[0.06] border border-vb-accent/15 flex items-center justify-center">
              <ViboMark size={24} />
            </div>
            <p className="text-[14px] text-vb-ink2 font-medium">{item.caption}</p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
          <span className="text-[13px] font-medium text-vb-accent">{item.caption}</span>
          <p className="text-[12px] text-vb-ink3 mt-1">{item.alt}</p>
        </div>
      </div>
    </motion.div>
  );
}

function ScreenshotShowcase({ items }) {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start start', 'end end'] });

  return (
    <div ref={containerRef} className="relative" style={{ height: `${items.length * 100}vh` }}>
      <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden relative">
        {items.map((item, i) => (
          <ScreenshotCard key={i} item={item} index={i} total={items.length} scrollYProgress={scrollYProgress} />
        ))}
        {/* Scroll indicator */}
        <motion.div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}>
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] text-vb-ink4 uppercase tracking-wider">Scroll</span>
            <motion.div className="w-px h-4 bg-vb-accent/40"
              animate={{ scaleY: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }} />
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function TestimonialDeck({ items }) {
  const doubled = [...items, ...items, ...items];

  return (
    <div className="relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-vb-bg to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-vb-bg to-transparent z-10 pointer-events-none" />

      <motion.div className="flex gap-5 py-2"
        animate={{ x: ['0%', '-33.33%'] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}>
        {doubled.map((t, i) => (
          <motion.div key={i}
            whileHover={{ scale: 1.03, y: -4 }}
            className="flex-shrink-0 w-[400px] p-7 rounded-2xl bg-[#111113] border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.4)] group cursor-default">
            <div className="text-[40px] leading-none mb-3 text-vb-accent/20">&ldquo;</div>
            <p className="text-[14px] text-vb-ink2 leading-[1.8] mb-6">{t.quote}</p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-vb-accent/[0.08] border border-vb-accent/20 flex items-center justify-center text-[11px] font-bold text-vb-accent">
                {t.avatar}
              </div>
              <div>
                <div className="text-[13px] font-medium text-vb-ink">{t.name}</div>
                <div className="text-[11px] text-vb-ink4">{t.role}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

export default function LandingPage() {
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [error, setError] = useState('');
  const [needsGithub, setNeedsGithub] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [mode, setMode] = useState('url');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isSignedIn } = useUser();

  const { hero, features, screenshots, steps, testimonials, pricing, cta } = SITE_CONFIG;

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
    const pending = sessionStorage.getItem("vibo-pending-repo");
    if (pending && isSignedIn) { sessionStorage.removeItem("vibo-pending-repo"); setRepoUrl(pending); setTimeout(() => handleAnalyze(pending), 1500); }
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
    const saved = JSON.parse(localStorage.getItem('vibo-analyses') || '[]');
    saved.unshift({ id: data.id, name: data.repo_name, url: data.repo_url || 'local upload', date: new Date().toISOString() });
    localStorage.setItem('vibo-analyses', JSON.stringify(saved.slice(0, 20)));
    router.push(`/dashboard?id=${data.id}`);
  };

  const handleAnalyze = async (url) => {
    const target = url || repoUrl.trim();
    if (!target) return;
    if (!isSignedIn) { router.push('/sign-in'); return; }
    if (!target.match(/^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+/)) { setError('Enter a valid GitHub URL (https://github.com/owner/repo)'); return; }
    setLoading(true); setError('');
    try {
      let res, data;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 120000);
        res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ repoUrl: target, repoName: target.split('/').pop() }), signal: controller.signal });
        clearTimeout(timeout);
        data = await parseJsonResponse(res);
      } catch (networkErr) {
        if (networkErr?.name === 'AbortError') throw new Error('Analysis timed out. Try a smaller repository.');
        if (networkErr instanceof Error && !/Failed to fetch|Load failed|NetworkError|invalid response/i.test(networkErr.message)) throw networkErr;
        throw new Error('Could not reach the server.');
      }
      if (res.status === 403 && data.requiresAuth) {
        setLoading(false);
        if (data.requiresGithub) { setNeedsGithub(true); setError(""); }
        else { setError("This is a private repository. Sign in to access it."); setTimeout(() => router.push("/sign-in"), 1500); }
        return;
      }
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      saveAndRedirect(data);
    } catch (err) { setError(err.message); setLoading(false); }
  };

  const handleUpload = async (file) => {
    if (!file) return;
    if (!isSignedIn) { router.push('/sign-in'); return; }
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

  const handlePricingAction = async (planName) => {
    if (!isSignedIn) { router.push('/sign-in'); return; }
    if (planName === 'Free') { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    setSubscribing(true);
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' });
      const data = await res.json();
      if (data.url) { window.location.href = data.url; }
      else { setError(data.error || 'Something went wrong'); }
    } catch { setError('Could not start checkout. Try again.'); }
    finally { setSubscribing(false); }
  };

  const taglineParts = hero.tagline.split(hero.taglineAccent);

  return (
    <div className="min-h-screen bg-vb-bg text-vb-ink relative">
      <GridBackground />

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 h-16 bg-vb-bg/70 backdrop-blur-xl border-b border-white/[0.06] flex items-center px-6 md:px-10 z-[100]">
        <div className="cursor-pointer flex items-center gap-2.5" onClick={() => router.push('/')}>
          <ViboMark size={22} />
          <span className="text-[20px] font-semibold tracking-tight">vi<span className="text-vb-accent">b</span>o</span>
        </div>
        <div className="hidden md:flex gap-7 ml-10">
          {[['Features', '#features'], ['How it works', '#how'], ['Pricing', '#pricing']].map(([label, href]) => (
            <a key={href} href={href} className="text-[13px] text-vb-ink3 hover:text-vb-accent transition-colors duration-200">{label}</a>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3">
          {isSignedIn ? (
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-vb-ink font-medium hidden md:block">{user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split('@')[0]}</span>
              <button onClick={() => router.push('/profile')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-vb-accent bg-vb-accent/[0.08] border border-vb-accent/20 hover:bg-vb-accent/[0.14] transition-all duration-200">
                <UserCircle size={14} /> Profile
              </button>
              <SignOutButton><button className="text-[12px] text-vb-ink3 hover:text-vb-ink px-3 py-1.5 rounded-lg border border-white/[0.08] hover:border-white/[0.14] bg-white/[0.03] hover:bg-white/[0.05] transition-all duration-200">Sign out</button></SignOutButton>
            </div>
          ) : (
            <>
              <button onClick={() => router.push('/sign-in')} className="text-[13px] text-vb-ink3 hover:text-vb-accent transition-colors duration-200 hidden md:block">Sign in</button>
              <button onClick={() => router.push('/sign-in')} className="text-[12px] font-medium text-vb-bg bg-vb-accent px-4 py-2 rounded-lg hover:bg-vb-accent-bright transition-all duration-200 hover:shadow-[0_4px_12px_rgba(224,252,16,0.15)]">Get started free</button>
            </>
          )}
        </div>
      </nav>

      {/* HERO — unchanged */}
      <section className="min-h-[94vh] flex flex-col items-center justify-center px-6 md:px-8 pt-[160px] pb-32 relative text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-[2]">
          <h1 className="font-semibold tracking-tight leading-[1.05] max-w-[820px] mb-7 mx-auto"
            style={{ fontSize: 'clamp(48px, 6vw, 80px)' }}>
            {taglineParts[0]}<span className="text-vb-accent">{hero.taglineAccent}</span>{taglineParts[1]}
          </h1>
          <p className="text-[18px] text-vb-ink2 max-w-[540px] leading-[1.7] mb-12 mx-auto">{hero.subtitle}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[620px] relative z-[2]">
          <div className="flex items-center gap-1 mb-3">
            {[['url', 'GitHub URL'], ['upload', 'Upload ZIP']].map(([m, label]) => (
              <button key={m} onClick={() => setMode(m)}
                className={`text-[12px] px-3.5 py-1.5 rounded-lg font-medium transition-all duration-200 ${
                  mode === m ? 'bg-vb-accent/[0.1] text-vb-accent border border-vb-accent/20' : 'text-vb-ink4 hover:text-vb-ink3 border border-transparent'
                }`}>{label}</button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[11px] text-vb-ink4">try:</span>
              {hero.suggestedRepos.map(repo => (
                <button key={repo} onClick={() => { setMode('url'); setRepoUrl(`https://github.com/${repo}`); }} disabled={loading}
                  className="text-[11px] text-vb-ink4 hover:text-vb-accent transition-colors disabled:opacity-40">{repo.split('/')[1]}</button>
              ))}
            </div>
          </div>

          {mode === 'url' ? (
            <div className="flex items-center border border-white/[0.1] rounded-xl bg-vb-bg2/90 backdrop-blur-sm overflow-hidden transition-all duration-300 focus-within:border-vb-accent/40 focus-within:shadow-[0_0_0_3px_rgba(224,252,16,0.06)] hover:border-white/[0.14]">
              <input type="text" value={repoUrl || ''}
                onChange={e => { setRepoUrl(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
                placeholder={hero.inputPlaceholder} disabled={loading}
                className="flex-1 bg-transparent border-none outline-none px-5 py-4 text-[14px] text-vb-ink placeholder:text-vb-ink4 caret-vb-accent"
              />
              <button onClick={() => handleAnalyze()} disabled={loading || !repoUrl.trim()}
                className="flex items-center gap-2 text-[13px] font-medium bg-vb-accent text-vb-bg px-5 py-2.5 mr-2 rounded-lg whitespace-nowrap hover:bg-vb-accent-bright disabled:opacity-40 transition-all duration-200 hover:shadow-[0_2px_8px_rgba(224,252,16,0.2)]">
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
              onDrop={e => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files[0]); }}
              onClick={() => fileRef.current?.click()}
              className={`border border-white/[0.1] rounded-xl bg-vb-bg2/90 backdrop-blur-sm p-8 text-center cursor-pointer transition-all duration-300 ${dragOver ? 'border-vb-accent/40 bg-vb-accent/[0.03]' : 'hover:border-white/[0.14]'} ${loading ? 'pointer-events-none opacity-60' : ''}`}>
              <input ref={fileRef} type="file" accept=".zip" className="hidden" onChange={e => handleUpload(e.target.files[0])} />
              <p className="text-[13px] text-vb-ink2 mb-1">{loading ? 'Uploading...' : 'Drop a .zip here or click to browse'}</p>
              <p className="text-[11px] text-vb-ink4">Max 50MB</p>
            </div>
          )}
          {error && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 text-center"><p className="text-vb-red text-[12px]">{error}</p></motion.div>}
          {needsGithub && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 text-center">
              <p className="text-[13px] text-vb-ink2 mb-2">This repo is private — connect your GitHub to continue</p>
              <button onClick={connectGithubForRepo}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-vb-accent text-vb-bg text-[12px] font-semibold hover:bg-vb-accent-bright transition-all">
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
              <span className="text-[12px] text-vb-ink3"><strong className="text-vb-ink font-medium">{s.value}</strong> {s.label}</span>
            </div>
          ))}
        </motion.div>
      </section>

      {/* FEATURES — sticky left + scrolling right cards */}
      <section className="relative py-28 px-6 md:px-8 z-[1]" id="features">
        <div className="max-w-[1060px] mx-auto">
          <div className="flex flex-col md:flex-row gap-12 md:gap-20">
            {/* Left — sticky heading */}
            <div className="md:w-[320px] md:sticky md:top-32 md:self-start flex-shrink-0">
              <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
                <p className="text-[10px] text-vb-accent tracking-[3px] uppercase mb-3 font-medium">{features.label}</p>
                <h2 className="text-[28px] md:text-[34px] font-semibold tracking-tight leading-[1.15] mb-4 text-vb-ink">
                  {features.title}
                </h2>
                <p className="text-[13px] text-vb-ink3 leading-relaxed">{features.subtitle}</p>
                <motion.div className="hidden md:block mt-8 w-12 h-px bg-gradient-to-r from-vb-accent/30 to-transparent"
                  initial={{ width: 0 }} whileInView={{ width: 48 }} viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.3 }} />
              </motion.div>
            </div>

            {/* Right — feature cards with staggered scroll reveal */}
            <div className="flex-1 space-y-4">
              {features.items.map((f, i) => {
                const Icon = ICON_MAP[f.icon] || Sparkles;
                return (
                  <motion.div key={i}
                    initial={{ opacity: 0, x: 40 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.5, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}>
                    <motion.div
                      whileHover={{ x: 6, backgroundColor: 'rgba(255,255,255,0.04)' }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      className="group flex items-start gap-4 p-4 rounded-xl border border-transparent hover:border-white/[0.08] cursor-default transition-colors duration-200">
                      <motion.div
                        whileHover={{ rotate: -10, scale: 1.1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 12 }}
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: `${f.color}0a`, border: `1px solid ${f.color}18` }}>
                        <Icon size={18} style={{ color: f.color }} strokeWidth={1.6} />
                      </motion.div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[14px] font-semibold text-vb-ink mb-1">{f.title}</h3>
                        <p className="text-[12px] text-vb-ink3 leading-[1.6]">{f.desc}</p>
                      </div>
                      {/* Hover indicator */}
                      <motion.div className="w-1 self-stretch rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex-shrink-0"
                        style={{ backgroundColor: `${f.color}40` }} />
                    </motion.div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* SCREENSHOTS — stacked sticky scroll */}
      <section className="relative z-[1]">
        <div className="text-center pt-20 pb-10 px-6 md:px-8">
          <p className="text-[10px] text-vb-accent tracking-[3px] uppercase mb-3 font-medium">{screenshots.label}</p>
          <h2 className="text-[28px] md:text-[36px] font-semibold tracking-tight leading-tight">{screenshots.title}</h2>
        </div>
        <ScreenshotShowcase items={screenshots.items} />
      </section>

      {/* HOW IT WORKS — horizontal 4-col with pulsing nodes */}
      <section className="relative py-28 z-[1] overflow-hidden" id="how">
        <div className="px-6 md:px-8 max-w-[900px] mx-auto">
          <div className="text-center mb-14">
            <motion.p initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
              className="text-[10px] text-vb-accent tracking-[3px] uppercase mb-3 font-medium">{steps.label}</motion.p>
            <motion.h2 initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }}
              className="text-[28px] md:text-[36px] font-semibold tracking-tight leading-tight mb-3 bg-gradient-to-b from-white to-white/70 bg-clip-text text-transparent">
              {steps.title}
            </motion.h2>
            <motion.p initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.2 }}
              className="text-[12px] text-vb-ink3 max-w-[360px] mx-auto leading-relaxed">{steps.subtitle}</motion.p>
          </div>

          <div className="relative">
            <motion.div className="absolute top-[20px] left-[5%] right-[5%] h-px bg-white/[0.04] hidden md:block" />
            <motion.div className="absolute top-[20px] left-[5%] h-px bg-gradient-to-r from-vb-accent/30 to-transparent hidden md:block"
              initial={{ width: '0%' }} whileInView={{ width: '90%' }} viewport={{ once: true }}
              transition={{ duration: 1.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }} />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              {steps.items.map((s, i) => {
                const colors = ['#E0FC10', '#7cc8d4', '#b4a0d4', '#7dd3a8'];
                return (
                  <motion.div key={i}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-30px' }}
                    transition={{ duration: 0.5, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                    className="group text-center">
                    <motion.div whileHover={{ scale: 1.15 }}
                      className="relative z-10 w-10 h-10 mx-auto mb-4 rounded-full flex items-center justify-center"
                      style={{ background: `${colors[i]}08`, border: `1px solid ${colors[i]}20` }}>
                      <span className="text-[12px] font-bold" style={{ color: colors[i] }}>{i + 1}</span>
                      <motion.div className="absolute inset-0 rounded-full"
                        style={{ border: `1px solid ${colors[i]}12` }}
                        animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
                        transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.3 }} />
                    </motion.div>
                    <h3 className="text-[12px] font-semibold text-vb-ink mb-1.5">{s.title}</h3>
                    <p className="text-[11px] text-vb-ink3 leading-relaxed">{s.desc}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS — auto-cycling card deck */}
      <section className="relative py-28 px-6 md:px-8 z-[1] overflow-hidden">
        <div className="max-w-[900px] mx-auto text-center mb-14">
          <motion.p initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="text-[10px] text-vb-accent tracking-[3px] uppercase mb-3 font-medium">{testimonials.label}</motion.p>
          <motion.h2 initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }}
            className="text-[30px] md:text-[38px] font-semibold tracking-tight leading-tight bg-gradient-to-b from-white to-white/70 bg-clip-text text-transparent">
            {testimonials.title}
          </motion.h2>
        </div>
        <TestimonialDeck items={testimonials.items} />
      </section>

      {/* PRICING — side by side cards */}
      <section className="relative py-28 px-6 md:px-8 z-[1]" id="pricing">
        <div className="max-w-[780px] mx-auto">
          <div className="text-center mb-14">
            <motion.p initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
              className="text-[10px] text-vb-accent tracking-[3px] uppercase mb-3 font-medium">{pricing.label}</motion.p>
            <motion.h2 initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }}
              className="text-[30px] md:text-[38px] font-semibold tracking-tight leading-tight mb-4 bg-gradient-to-b from-white to-white/70 bg-clip-text text-transparent">
              {pricing.title}
            </motion.h2>
            <motion.p initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.2 }}
              className="text-[13px] text-vb-ink3 max-w-[380px] mx-auto leading-relaxed">{pricing.subtitle}</motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {pricing.plans.map((plan, i) => {
              const isPro = plan.featured;
              return (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.6, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}>
                  <motion.div whileHover={{ y: -5 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className={`relative rounded-2xl overflow-hidden h-full ${
                      isPro ? 'bg-white/[0.03] border border-vb-accent/15' : 'bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1]'
                    }`}>
                    {isPro && <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-vb-accent/40 to-transparent" />}
                    <div className="relative z-10 p-7">
                      <div className="flex items-center gap-2 mb-4">
                        <span className={`text-[11px] uppercase tracking-wider font-medium ${isPro ? 'text-vb-accent' : 'text-vb-ink4'}`}>{plan.name}</span>
                        {isPro && <span className="text-[9px] font-medium bg-vb-accent/10 text-vb-accent px-2 py-0.5 rounded-full border border-vb-accent/20">Popular</span>}
                      </div>
                      <div className="flex items-baseline gap-1.5 mb-6">
                        <span className="text-[40px] font-semibold tracking-tight leading-none text-vb-ink">{plan.price}</span>
                        <span className="text-[13px] text-vb-ink4">{plan.period}</span>
                      </div>
                      <button onClick={() => handlePricingAction(plan.name)} disabled={subscribing}
                        className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-[13px] font-medium mb-6 transition-all duration-200 disabled:opacity-50 ${
                          isPro ? 'bg-vb-accent text-vb-bg hover:bg-vb-accent-bright' : 'bg-white/[0.04] border border-white/[0.08] text-vb-ink2 hover:bg-white/[0.06]'
                        }`}>
                        {subscribing ? 'Redirecting...' : plan.cta}
                        {!subscribing && <ArrowUpRight size={13} />}
                      </button>
                      <ul className="space-y-3">
                        {plan.features.map((f, j) => (
                          <li key={j} className="flex items-center gap-2.5">
                            <Check size={14} className={`flex-shrink-0 ${isPro ? 'text-vb-accent' : 'text-vb-ink4'}`} strokeWidth={2.5} />
                            <span className="text-[13px] text-vb-ink3">{f}</span>
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

      {/* CTA — unchanged */}
      <Section className="relative py-28 px-6 md:px-8 text-center z-[1]">
        <div className="max-w-[560px] mx-auto">
          <h2 className="text-[36px] md:text-[44px] font-semibold tracking-tight leading-tight mb-5">{cta.title}</h2>
          <p className="text-[16px] text-vb-ink3 mb-9 leading-relaxed">{cta.subtitle}</p>
          <motion.button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.98 }}
            className="inline-flex items-center gap-2 text-[14px] font-medium bg-vb-accent text-vb-bg py-3.5 px-8 rounded-xl hover:bg-vb-accent-bright hover:shadow-[0_8px_24px_rgba(224,252,16,0.15)] transition-all duration-200">
            {cta.button} <ArrowRight size={16} />
          </motion.button>
        </div>
      </Section>

      {/* FOOTER — unchanged */}
      <footer className="border-t border-white/[0.06] py-8 px-6 md:px-8 relative z-[1]">
        <div className="max-w-[1100px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ViboMark size={16} />
            <span className="text-[12px] text-vb-ink4">© {new Date().getFullYear()} Vibo. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-5">
            <a href="#" className="text-[12px] text-vb-ink4 hover:text-vb-accent transition-colors duration-200">Privacy</a>
            <a href="#" className="text-[12px] text-vb-ink4 hover:text-vb-accent transition-colors duration-200">Terms</a>
            <a href="mailto:hello@vibo.dev" className="text-[12px] text-vb-ink4 hover:text-vb-accent transition-colors duration-200">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
