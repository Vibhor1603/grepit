"use client";
import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useTheme } from './ThemeProvider';

const AUTH_ERROR_MESSAGES = {
  AccessDenied: 'GitHub denied access to the app.',
  Callback: 'GitHub sign-in could not be completed. Please try again.',
  Configuration: 'Authentication is misconfigured. Recheck the GitHub OAuth app settings.',
  Default: 'Sign-in did not complete. Please try again.',
  OAuthAccountNotLinked: 'This email is already linked to a different sign-in method.',
  OAuthCallback: 'GitHub returned an invalid callback response.',
  OAuthCreateAccount: 'GitHub sign-in could not create a session.',
  SessionRequired: 'Please sign in to continue.',
};

export default function LandingPage() {
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [authConfigured, setAuthConfigured] = useState(true);
  const [mode, setMode] = useState('url'); // 'url' | 'upload'
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();
  const { theme, toggle } = useTheme();

  const startGitHubSignIn = () => {
    if (!authConfigured) {
      setError('GitHub OAuth is not configured yet. Add GITHUB_ID, GITHUB_SECRET, NEXTAUTH_URL, and NEXTAUTH_SECRET first.');
      return;
    }
    const callbackUrl = `${window.location.origin}${window.location.pathname}`;
    signIn('github', { callbackUrl });
  };

  const handleAnalyze = async (url) => {
    const targetUrl = url || repoUrl.trim();
    if (!targetUrl) return;
    if (!targetUrl.match(/^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+/)) {
      setError('Enter a valid GitHub URL (https://github.com/owner/repo)');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: targetUrl, repoName: targetUrl.split('/').pop() })
      });
      const data = await res.json();
      if (res.status === 403 && data.requiresAuth) {
        setLoading(false);
        startGitHubSignIn();
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      // Save to localStorage
      const saved = JSON.parse(localStorage.getItem('vibo-analyses') || '[]');
      saved.unshift({ id: data.id, name: data.repo_name, url: data.repo_url, date: new Date().toISOString() });
      localStorage.setItem('vibo-analyses', JSON.stringify(saved.slice(0, 20)));
      router.push(`/dashboard?id=${data.id}`);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleUpload = async (file) => {
    if (!file) return;
    if (!file.name.endsWith('.zip')) { setError('Please upload a .zip file'); return; }
    if (file.size > 50 * 1024 * 1024) { setError('File too large (max 50MB)'); return; }
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      const saved = JSON.parse(localStorage.getItem('vibo-analyses') || '[]');
      saved.unshift({ id: data.id, name: data.repo_name, url: 'local upload', date: new Date().toISOString() });
      localStorage.setItem('vibo-analyses', JSON.stringify(saved.slice(0, 20)));
      router.push(`/dashboard?id=${data.id}`);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const [recentAnalyses, setRecentAnalyses] = useState([]);

  useEffect(() => {
    setRecentAnalyses(JSON.parse(localStorage.getItem('vibo-analyses') || '[]').slice(0, 5));
    fetch('/api/auth/status')
      .then((res) => res.json())
      .then((data) => setAuthConfigured(Boolean(data.configured)))
      .catch(() => setAuthConfigured(false));
  }, []);

  useEffect(() => {
    const authError = searchParams.get('error');
    if (authError && !session) {
      setError(AUTH_ERROR_MESSAGES[authError] || AUTH_ERROR_MESSAGES.Default);
    }
  }, [searchParams, session]);

  useEffect(() => {
    if (session && error === AUTH_ERROR_MESSAGES.OAuthCallback) {
      setError('');
    }
  }, [session, error]);
  const features = [
    { icon: 'hub', title: 'Architecture Map', desc: 'Visual system topology with layers, modules, and dependency flows.' },
    { icon: 'terminal', title: 'AI Query Console', desc: 'Chat with your codebase. Ask anything about patterns, flows, or decisions.' },
    { icon: 'api', title: 'API Explorer', desc: 'Auto-detect REST endpoints, routes, and middleware chains.' },
    { icon: 'widgets', title: 'Component Breakdown', desc: 'Map UI components, their props, state, and relationships.' },
    { icon: 'security', title: 'Security & Quality Audit', desc: 'Detect secrets, code smells, missing tests, and vulnerabilities.' },
    { icon: 'school', title: 'ELI5 & Guided Tours', desc: 'Plain-English explanations and interactive code walkthroughs.' },
    { icon: 'build', title: 'Setup Guide', desc: 'Auto-generated local dev setup instructions for any repo.' },
    { icon: 'trending_up', title: 'Flow & Performance', desc: 'Trace logic paths, detect bottlenecks, and analyze data flows.' },
    { icon: 'description', title: 'Export Reports', desc: 'Generate professional Markdown audit reports for stakeholders.' },
  ];

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-d-bg text-d-text' : 'bg-cream text-ink'} transition-colors duration-300`}>
      {/* Nav */}
      <nav className={`sticky top-0 z-50 ${theme === 'dark' ? 'bg-d-bg/90 border-d-border' : 'bg-cream/90 border-ink/10'} backdrop-blur-md border-b`}>
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <a href="/" className="text-lg font-bold tracking-tight font-mono">vibo</a>
            <div className="hidden md:flex items-center gap-4 text-sm">
              <a className={`${theme === 'dark' ? 'text-d-muted hover:text-d-text' : 'text-ink-muted hover:text-ink'} transition-colors font-mono`} href="#">docs</a>
              <a className={`${theme === 'dark' ? 'text-d-muted hover:text-d-text' : 'text-ink-muted hover:text-ink'} transition-colors font-mono`} href="#">changelog</a>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Theme toggle */}
            <button onClick={toggle} className={`p-2 rounded-none transition-colors ${theme === 'dark' ? 'hover:bg-d-card text-d-muted' : 'hover:bg-sand text-ink-muted'}`}>
              <span className="material-symbols-outlined text-[18px]">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
            </button>
            {session ? (
              <div className="flex items-center gap-2">
                <img src={session.user?.image} alt="" className="w-7 h-7 rounded-none border-2 border-current" />
                <span className="text-sm font-mono hidden md:block">{session.user?.name}</span>
                <button onClick={() => signOut({ callbackUrl: '/' })} className={`text-xs font-mono underline ${theme === 'dark' ? 'text-d-muted' : 'text-ink-muted'}`}>
                  sign out
                </button>
              </div>
            ) : (
              <button onClick={startGitHubSignIn} className={`btn-brutal px-3 py-1.5 rounded-none text-sm font-mono font-medium ${theme === 'dark' ? 'bg-d-card text-d-text' : 'bg-white text-ink'}`}>
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
                  Sign in
                </span>
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6">
        {/* Hero */}
        <section className="pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-none bg-purple/20 text-sm font-mono mb-6">
            <span className="w-2 h-2 rounded-none bg-blue"></span>
            <span className={theme === 'dark' ? 'text-purple-light' : 'text-ink-light'}>v2.0 — now with multi-source analysis</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-5">
            Understand any<br />
            <span className="text-purple">codebase</span> instantly
          </h1>
          <p className={`text-lg max-w-xl mx-auto leading-relaxed mb-10 ${theme === 'dark' ? 'text-d-muted' : 'text-ink-muted'}`}>
            Paste a GitHub link or upload a ZIP. Get architecture maps, AI insights, security audits, and setup guides — in seconds.
          </p>
          <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-none border text-xs font-mono mb-8 ${theme === 'dark' ? 'border-d-border bg-d-card text-d-muted' : 'border-ink/10 bg-white text-ink-muted'}`}>
            <span className={`w-2 h-2 rounded-none ${session ? 'bg-lime' : sessionStatus === 'loading' ? 'bg-blue' : 'bg-red-500'}`}></span>
            {session
              ? `Signed in as ${session.user?.email || session.user?.name || 'GitHub user'}`
              : sessionStatus === 'loading'
                ? 'Checking sign-in status...'
                : 'Not signed in'}
          </div>

          {/* Input Area */}
          <div className="max-w-2xl mx-auto">
            {/* Mode Toggle */}
            <div className="flex justify-center mb-4">
              <div className={`inline-flex rounded-none overflow-hidden border-2 ${theme === 'dark' ? 'border-d-border' : 'border-ink/15'}`}>
                <button onClick={() => setMode('url')} className={`px-4 py-2 text-sm font-mono transition-colors ${mode === 'url' ? (theme === 'dark' ? 'bg-purple text-ink' : 'bg-ink text-white') : (theme === 'dark' ? 'text-d-muted' : 'text-ink-muted')}`}>
                  GitHub URL
                </button>
                <button onClick={() => setMode('upload')} className={`px-4 py-2 text-sm font-mono transition-colors ${mode === 'upload' ? (theme === 'dark' ? 'bg-purple text-ink' : 'bg-ink text-white') : (theme === 'dark' ? 'text-d-muted' : 'text-ink-muted')}`}>
                  Upload ZIP
                </button>
              </div>
            </div>

            {mode === 'url' ? (
              <>
                <div className={`card-brutal rounded-none overflow-hidden ${theme === 'dark' ? 'bg-d-card' : 'bg-white'}`}>
                  <div className="flex items-center">
                    <div className={`px-4 ${theme === 'dark' ? 'text-d-subtle' : 'text-ink-faint'}`}>
                      <svg className="w-5 h-5" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
                    </div>
                    <input
                      type="text"
                      value={repoUrl}
                      onChange={(e) => { setRepoUrl(e.target.value); setError(''); }}
                      onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                      placeholder="https://github.com/owner/repo"
                      className={`flex-1 py-4 text-[15px] font-mono bg-transparent ${theme === 'dark' ? 'text-d-text placeholder:text-d-subtle' : 'text-ink placeholder:text-ink-faint'}`}
                      disabled={loading}
                    />
                    <button
                      onClick={() => handleAnalyze()}
                      disabled={loading || !repoUrl.trim()}
                      className={`m-2 px-5 py-2.5 rounded-none font-mono font-semibold text-sm btn-brutal transition-all disabled:opacity-40 ${theme === 'dark' ? 'bg-purple text-ink' : 'bg-lime text-ink'}`}
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25"/><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>
                          analyzing...
                        </span>
                      ) : 'analyze →'}
                    </button>
                  </div>
                </div>
                {/* Quick Try */}
                <div className="flex items-center justify-center gap-2 mt-4">
                  <span className={`text-xs font-mono ${theme === 'dark' ? 'text-d-subtle' : 'text-ink-faint'}`}>try:</span>
                  {['facebook/react', 'vercel/next.js', 'denoland/deno'].map(repo => (
                    <button key={repo} onClick={() => { setRepoUrl(`https://github.com/${repo}`); handleAnalyze(`https://github.com/${repo}`); }} disabled={loading}
                      className={`px-3 py-1 rounded-md text-xs font-mono border transition-all disabled:opacity-40 ${theme === 'dark' ? 'border-d-border text-d-muted hover:text-d-text hover:border-d-subtle' : 'border-ink/10 text-ink-muted hover:text-ink hover:border-ink/30'}`}>
                      {repo.split('/')[1]}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files[0]); }}
                onClick={() => fileRef.current?.click()}
                className={`card-brutal rounded-none p-12 text-center cursor-pointer transition-all ${dragOver ? (theme === 'dark' ? 'bg-purple/10 border-purple' : 'bg-lime/20 border-ink') : (theme === 'dark' ? 'bg-d-card' : 'bg-white')} ${loading ? 'pointer-events-none opacity-60' : ''}`}
              >
                <input ref={fileRef} type="file" accept=".zip" className="hidden" onChange={(e) => handleUpload(e.target.files[0])} />
                <span className={`material-symbols-outlined text-4xl mb-3 block ${theme === 'dark' ? 'text-d-muted' : 'text-ink-muted'}`}>upload_file</span>
                <p className={`font-mono text-sm mb-1 ${theme === 'dark' ? 'text-d-text' : 'text-ink'}`}>
                  {loading ? 'Uploading...' : 'Drop a .zip file here or click to browse'}
                </p>
                <p className={`text-xs font-mono ${theme === 'dark' ? 'text-d-subtle' : 'text-ink-faint'}`}>Max 50MB • ZIP files only</p>
              </div>
            )}

            {error && <p className="text-red-500 text-sm font-mono mt-3 text-left">{error}</p>}
          </div>
        </section>

        {/* Recent Analyses */}
        {recentAnalyses.length > 0 && (
          <section className="pb-12">
            <h3 className={`text-xs font-mono uppercase tracking-wider mb-3 ${theme === 'dark' ? 'text-d-subtle' : 'text-ink-faint'}`}>Recent</h3>
            <div className="flex flex-wrap gap-2">
              {recentAnalyses.map((a, i) => (
                <a key={i} href={`/dashboard?id=${a.id}`}
                  className={`px-3 py-1.5 rounded-none text-sm font-mono border transition-colors ${theme === 'dark' ? 'border-d-border text-d-muted hover:text-d-text hover:bg-d-card' : 'border-ink/10 text-ink-muted hover:text-ink hover:bg-sand/50'}`}>
                  {a.name}
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Features */}
        <section className="pb-20">
          <h2 className="text-2xl font-bold tracking-tight mb-2">What you get</h2>
          <p className={`text-sm mb-8 ${theme === 'dark' ? 'text-d-muted' : 'text-ink-muted'}`}>Every analysis includes these tools — no setup required.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {features.map((f, i) => {
              const bgClass = theme === 'dark' 
                ? (i % 3 === 0 ? 'bg-purple text-ink' : i % 3 === 1 ? 'bg-blue text-ink' : 'bg-d-card') 
                : (i % 3 === 0 ? 'bg-purple text-ink' : i % 3 === 1 ? 'bg-lime text-ink' : 'bg-white');
              return (
              <div key={i} className={`card-brutal rounded-none p-5 transition-all hover:-translate-y-0.5 ${bgClass}`}>
                <span className={`material-symbols-outlined text-lg mb-3 block`}>{f.icon}</span>
                <h3 className="font-semibold text-[15px] mb-1">{f.title}</h3>
                <p className={`text-[13px] leading-relaxed ${bgClass.includes('text-ink') ? 'text-ink-light' : (theme === 'dark' ? 'text-d-muted' : 'text-ink-muted')}`}>{f.desc}</p>
              </div>
            )})}
          </div>
        </section>

        {/* Audience Sections */}
        <section className="pb-20">
          <h2 className="text-2xl font-bold tracking-tight mb-8">Built for every level</h2>
          <div className="space-y-4">
            {[
              { level: 'Junior Devs', color: 'blue', items: ['ELI5 Mode — plain-english explanations', 'Jargon Buster tooltips', 'First-PR guide & Good First Issues', 'Interactive code walkthroughs'] },
              { level: 'Mid-Level', color: 'lime', items: ['Refactor suggestions with before/after', 'Test gap analysis', 'Dependency health & outdated packages', 'Auto-generated documentation'] },
              { level: 'Senior & Architects', color: 'purple', items: ['Design pattern recognition & deviations', 'Breaking change predictor', 'Scalability audit', 'Multi-repo comparison'] },
              { level: 'Enterprise & Security', color: 'peach', items: ['Secret scanner for hardcoded keys', 'License compliance audit', 'CVE vulnerability mapping', 'Exportable PDF reports'] },
            ].map((section, i) => {
              const bgColors = {
                blue: 'bg-blue', lime: 'bg-lime', purple: 'bg-purple', peach: 'bg-peach'
              };
              const textColors = {
                blue: 'text-blue', lime: 'text-lime', purple: 'text-purple', peach: 'text-peach'
              };
              return (
              <div key={i} className={`card-brutal rounded-none p-6 ${theme === 'dark' ? 'bg-d-card' : 'bg-white'}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-3 h-3 rounded-none ${bgColors[section.color]}`}></div>
                  <h3 className="font-bold text-lg">{section.level}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {section.items.map((item, j) => (
                    <div key={j} className={`flex items-start gap-2 text-sm ${theme === 'dark' ? 'text-d-muted' : 'text-ink-muted'}`}>
                      <span className={`${textColors[section.color]} mt-0.5`}>→</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )})}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className={`border-t py-8 px-6 ${theme === 'dark' ? 'border-d-border' : 'border-ink/10'}`}>
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className={`text-xs font-mono ${theme === 'dark' ? 'text-d-subtle' : 'text-ink-faint'}`}>© 2024 vibo</span>
          <div className="flex gap-4">
            <a className={`text-xs font-mono ${theme === 'dark' ? 'text-d-subtle hover:text-d-muted' : 'text-ink-faint hover:text-ink-muted'} transition-colors`} href="#">terms</a>
            <a className={`text-xs font-mono ${theme === 'dark' ? 'text-d-subtle hover:text-d-muted' : 'text-ink-faint hover:text-ink-muted'} transition-colors`} href="#">privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
