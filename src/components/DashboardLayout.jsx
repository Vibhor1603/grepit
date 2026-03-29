"use client";
import { useState, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useTheme } from './ThemeProvider';
import Overview from './views/Overview';
import Architecture from './views/Architecture';
import ApiExplorer from './views/ApiExplorer';
import ComponentBreakdown from './views/ComponentBreakdown';
import SecurityAudit from './views/SecurityAudit';
import SetupGuide from './views/SetupGuide';
import FlowAnalysis from './views/FlowAnalysis';
import FileExplorer from './views/FileExplorer';
import SymbolExplorer from './views/SymbolExplorer';
import QueryWidget from './QueryWidget';

function hasFramework(techStack, candidates) {
  const lowered = techStack.map((item) => item.toLowerCase());
  return candidates.some((candidate) => lowered.some((item) => item.includes(candidate)));
}

function buildAdaptiveTabs(analysis) {
  const arch = analysis?.architecture || analysis?.results || {};
  const techStack = arch.techStack || [];
  const hasUiLayer = hasFramework(techStack, ['react', 'next', 'vue', 'angular', 'svelte']);
  const hasApiLayer = (arch.apiEndpoints || []).length > 0;
  const hasComponents = (arch.components || []).length > 0;
  const hasCodeIntel = (analysis?.results?.symbolIndex || []).length > 0;
  const hasFlows = (arch.flowPaths || []).length > 0 || (analysis?.results?.callGraph || []).length > 0;
  const hasArchitecture = (arch.layers || []).length > 0 || (analysis?.results?.dependencyGraph || []).length > 0;
  const hasSetup = (arch.setupSteps || []).length > 0 || (arch.requiredTools || []).length > 0;

  return [
    { id: 'overview', label: 'Overview', short: 'Overview', icon: 'dashboard', tone: 'bg-lime', description: 'Project purpose, stack, and major landmarks.', reason: 'Always available so users can orient fast.', show: true },
    { id: 'files', label: 'Files & Code', short: 'Files', icon: 'folder_open', tone: 'bg-blue', description: 'Browse folders, open files, and read real source.', reason: 'Built from the repository tree and indexed file contents.', show: true },
    { id: 'symbols', label: hasUiLayer ? 'Logic & Symbols' : 'Code Intel', short: 'Symbols', icon: 'code', tone: 'bg-purple', description: 'Functions, classes, methods, and usage hints.', reason: 'Shown because symbol extraction found callable code.', show: hasCodeIntel },
    { id: 'architecture', label: hasUiLayer ? 'Architecture & Modules' : 'Architecture', short: 'Architecture', icon: 'hub', tone: 'bg-peach', description: 'Layers, modules, and dependency structure.', reason: 'Shown because the analyzer found layers or imports between modules.', show: hasArchitecture },
    { id: 'api', label: 'API Surface', short: 'API', icon: 'api', tone: 'bg-blue', description: 'Routes, handlers, and inferred request/response shapes.', reason: 'Only appears when server endpoints are detected.', show: hasApiLayer },
    { id: 'components', label: hasUiLayer ? 'UI Components' : 'Structure Map', short: 'Components', icon: 'widgets', tone: 'bg-lime', description: 'Component relationships, props, and where UI pieces connect.', reason: hasUiLayer ? 'Detected a frontend framework with component-style files.' : 'Detected reusable modules that can be grouped visually.', show: hasComponents },
    { id: 'flows', label: hasApiLayer ? 'Request Flows' : 'Flows & Graphs', short: 'Flows', icon: 'route', tone: 'bg-purple', description: 'Execution paths, call graph edges, and system movement.', reason: 'Shown when route paths or call-chain signals exist.', show: hasFlows },
    { id: 'security', label: 'Quality & Risk', short: 'Quality', icon: 'security', tone: 'bg-peach', description: 'Security findings, duplication, testing gaps, and heavy files.', reason: 'Always available so users can spot issues early.', show: true },
    { id: 'setup', label: 'Setup & Run', short: 'Setup', icon: 'build', tone: 'bg-blue', description: 'How to run the project, required tools, and env hints.', reason: hasSetup ? 'Shown because setup signals were inferred from files and scripts.' : 'Always useful for onboarding, but hidden until setup signals exist.', show: hasSetup },
  ].filter((tab) => tab.show);
}

export default function DashboardLayout() {
  const [activeTab, setActiveTab] = useState('overview');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [authConfigured, setAuthConfigured] = useState(true);
  const [eli5, setEli5] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const analysisId = searchParams.get('id');
  const { data: session } = useSession();
  const { theme, toggle } = useTheme();

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams, activeTab]);

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        // Try localStorage cache first
        const cached = localStorage.getItem(`vibo-analysis-${analysisId}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Date.now() - parsed._cachedAt < 300000) {
            setAnalysis(parsed);
            setLoading(false);
          }
        }
        const url = analysisId ? `/api/analyze?id=${analysisId}` : '/api/analyze';
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to load analysis');
        const data = await res.json();
        const result = Array.isArray(data) ? data[0] : data;
        if (result) {
          result._cachedAt = Date.now();
          if (analysisId) localStorage.setItem(`vibo-analysis-${analysisId}`, JSON.stringify(result));
        }
        setAnalysis(result);
      } catch (err) { setError(err.message); }
      finally { setLoading(false); }
    };
    fetchAnalysis();
  }, [analysisId]);

  useEffect(() => {
    fetch('/api/auth/status')
      .then((res) => res.json())
      .then((data) => setAuthConfigured(Boolean(data.configured)))
      .catch(() => setAuthConfigured(false));
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('vibo-sidebar-hidden');
    if (saved === 'true') {
      setSidebarHidden(true);
    }
  }, []);

  const handleSignIn = () => {
    if (!authConfigured) {
      setError('GitHub OAuth is not configured yet. Add GITHUB_ID, GITHUB_SECRET, NEXTAUTH_URL, and NEXTAUTH_SECRET first.');
      return;
    }
    signIn('github', { callbackUrl: window.location.href });
  };

  const toggleSidebar = () => {
    setSidebarHidden((current) => {
      const next = !current;
      localStorage.setItem('vibo-sidebar-hidden', String(next));
      return next;
    });
  };

  const arch = analysis?.architecture || analysis?.results || {};
  const navigationContext = {
    path: searchParams.get('path') || '',
    symbol: searchParams.get('symbol') || '',
    component: searchParams.get('component') || '',
  };
  const dynamicTabs = buildAdaptiveTabs(analysis);
  const activeTabMeta = dynamicTabs.find((tab) => tab.id === activeTab) || dynamicTabs[0];
  const surfaceSignals = [
    (arch.apiEndpoints || []).length > 0 ? `${(arch.apiEndpoints || []).length} endpoints` : null,
    (analysis?.results?.symbolIndex || []).length > 0 ? `${(analysis?.results?.symbolIndex || []).length} symbols` : null,
    (analysis?.results?.dependencyGraph || []).length > 0 ? `${(analysis?.results?.dependencyGraph || []).length} imports` : null,
    (analysis?.results?.testing?.testFiles || []).length > 0 ? `${(analysis?.results?.testing?.testFiles || []).length} tests` : null,
  ].filter(Boolean);

  useEffect(() => {
    if (!dynamicTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(dynamicTabs[0]?.id || 'overview');
    }
  }, [activeTab, dynamicTabs]);

  const navigateTo = (tabId, context = {}) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tabId);
    ['path', 'symbol', 'component'].forEach((key) => params.delete(key));
    Object.entries(context).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    });
    setActiveTab(tabId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const isDark = theme === 'dark';
  const bg = isDark ? 'bg-d-bg' : 'bg-cream';
  const cardBg = isDark ? 'bg-d-card' : 'bg-white';
  const border = isDark ? 'border-d-border' : 'border-ink/10';
  const textPrimary = isDark ? 'text-d-text' : 'text-ink';
  const textMuted = isDark ? 'text-d-muted' : 'text-ink-muted';
  const textFaint = isDark ? 'text-d-subtle' : 'text-ink-faint';

  return (
    <div className={`workspace-shell min-h-screen ${bg} ${textPrimary} transition-colors duration-300`}>
      {/* Top bar */}
      <nav className={`fixed top-0 w-full z-50 border-b ${border} ${isDark ? 'bg-d-bg/70' : 'bg-cream/70'} backdrop-blur-xl`}>
        <div className="px-5 md:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/" className="text-sm font-semibold font-mono tracking-tight">vibo</a>
            <span className={textFaint}>/</span>
            <span className="text-sm font-mono truncate max-w-[280px]">{analysis?.repo_name || '...'}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setEli5(!eli5)}
              className={`workspace-button flex items-center gap-1.5 px-3 py-2 text-xs font-mono ${eli5 ? (isDark ? 'bg-blue/20 text-blue' : 'bg-blue/20 text-ink') : textFaint}`}>
              <span className="material-symbols-outlined text-[14px]">school</span>
              ELI5
            </button>
            <button onClick={toggle} className={`workspace-button p-2.5`}>
              <span className={`material-symbols-outlined text-[16px] ${textMuted}`}>{isDark ? 'light_mode' : 'dark_mode'}</span>
            </button>
            {session ? (
              <div className="flex items-center gap-2">
                <img src={session.user?.image} alt="" className="w-7 h-7 rounded-full ring-1 ring-black/10 dark:ring-white/10" />
                <button onClick={() => signOut({ callbackUrl: '/' })} className={`text-xs font-mono ${textFaint}`}>sign out</button>
              </div>
            ) : (
              <button onClick={handleSignIn} className={`text-xs font-mono ${textFaint}`}>sign in</button>
            )}
          </div>
        </div>
      </nav>

      <div className="flex pt-14 h-screen">
        {/* Sidebar */}
        <aside className={`${sidebarHidden ? 'hidden' : 'hidden md:flex'} flex-col w-72 border-r ${border} ${isDark ? 'bg-d-bg/55' : 'bg-white/55'} backdrop-blur-xl shrink-0 relative`}>
          <div className="flex justify-end px-4 pt-4">
            <button
              onClick={toggleSidebar}
              className={`workspace-button flex items-center justify-center w-10 h-10 ${isDark ? 'text-d-muted' : 'text-ink-muted'}`}
              aria-label="Hide sidebar"
              title="Hide sidebar"
            >
              <span className="material-symbols-outlined text-[18px]">left_panel_close</span>
            </button>
          </div>
          <nav className="flex-1 px-3 pb-4 pt-3 space-y-2 overflow-y-auto">
            {dynamicTabs.map(tab => (
              <button key={tab.id} onClick={() => navigateTo(tab.id)}
                className={`workspace-sidebar-link w-full text-left flex items-start gap-3 px-4 py-4 text-[13px] font-mono transition-all ${
                  activeTab === tab.id
                    ? `active ${isDark ? 'text-d-text' : 'text-ink'}`
                    : `${textMuted} ${isDark ? 'hover:bg-white/5 hover:text-d-text' : 'hover:bg-white/80 hover:text-ink'}`
                }`}>
                <span className={`material-symbols-outlined text-[18px] mt-0.5 ${activeTab === tab.id ? (isDark ? 'text-blue' : 'text-purple') : ''}`}>{tab.icon}</span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold">{tab.label}</span>
                  <span className={`block mt-1 text-[11px] leading-relaxed ${activeTab === tab.id ? (isDark ? 'text-d-muted' : 'text-ink-muted') : textFaint}`}>{tab.description}</span>
                </span>
              </button>
            ))}
          </nav>
          <div className={`p-4 border-t ${border}`}>
            <a href="/" className={`w-full flex items-center justify-center gap-2 px-3 py-3 text-sm font-semibold font-mono transition-all btn-brutal ${isDark ? 'bg-lime text-ink' : 'bg-purple text-ink'}`}>
              <span className="material-symbols-outlined text-[16px]">add</span>
              New analysis
            </a>
          </div>
        </aside>

        {/* Mobile tabs */}
        <div className="md:hidden fixed top-14 w-full z-40 overflow-x-auto">
          <div className={`flex border-b ${border} ${isDark ? 'bg-d-bg/88' : 'bg-cream/88'} backdrop-blur-xl px-3`}>
            {dynamicTabs.map(tab => (
              <button key={tab.id} onClick={() => navigateTo(tab.id)}
                className={`px-4 py-3 text-[11px] font-mono whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id ? `${isDark ? 'border-blue text-d-text' : 'border-ink text-ink'}` : `border-transparent ${textFaint}`}`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main */}
        <main className={`flex-1 overflow-y-auto ${bg}`}>
          <div className="w-full max-w-[1880px] mx-auto px-5 md:px-8 xl:px-10 2xl:px-12 py-6 md:py-8">
            {loading ? (
              <div className="flex items-center justify-center h-60">
                <div className="flex flex-col items-center gap-3">
                  <svg className={`w-5 h-5 animate-spin ${textFaint}`} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-20"/><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  <span className={`text-sm font-mono ${textFaint}`}>loading analysis...</span>
                </div>
              </div>
            ) : error ? (
              <div className="text-center py-20">
                <p className="text-red-500 text-sm font-mono mb-3">{error}</p>
                <a href="/" className={`text-sm font-mono ${textFaint} underline`}>← go back</a>
              </div>
            ) : (
              <>
                {sidebarHidden && (
                  <div className="hidden md:flex justify-start mb-5">
                    <button
                      onClick={toggleSidebar}
                      className={`workspace-button w-11 h-11 flex items-center justify-center ${isDark ? 'text-d-text' : 'text-ink'}`}
                      aria-label="Show navigation"
                      title="Show navigation"
                    >
                      <span className="material-symbols-outlined text-[18px]">left_panel_open</span>
                    </button>
                  </div>
                )}
                {activeTab === 'overview' ? (
                  <section className="mb-6">
                    <div className={`workspace-card p-5 md:p-6`}>
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className={`w-11 h-11 shrink-0 rounded-2xl ${isDark ? 'bg-lime/90 text-ink' : 'bg-lime text-ink'} flex items-center justify-center shadow-sm`}>
                            <span className="material-symbols-outlined text-[20px]">{activeTabMeta?.icon || 'dashboard'}</span>
                          </div>
                          <div className="min-w-0">
                            <div className={`text-[10px] font-mono uppercase tracking-[0.24em] ${textFaint}`}>Project Overview</div>
                            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mt-1">{analysis?.repo_name || 'Workspace'}</h1>
                            <p className={`text-sm mt-1 max-w-3xl ${textMuted}`}>A cleaner, plain-English summary of what this codebase does, where its important parts live, and where to jump next.</p>
                          </div>
                        </div>
                        {surfaceSignals.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {surfaceSignals.map((signal, index) => (
                              <span key={`${signal}-${index}`} className="workspace-chip">{signal}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
                ) : (
                  <section className="mb-6">
                    <div className="workspace-card p-5 md:p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className={`w-11 h-11 shrink-0 rounded-2xl ${isDark ? 'bg-lime/90 text-ink' : 'bg-lime text-ink'} flex items-center justify-center shadow-sm`}>
                            <span className="material-symbols-outlined text-[20px]">{activeTabMeta?.icon || 'dashboard'}</span>
                          </div>
                          <div className="min-w-0">
                            <div className={`text-[10px] font-mono uppercase tracking-[0.24em] ${textFaint}`}>Current Section</div>
                            <h1 className="text-2xl font-black tracking-tight mt-1">{activeTabMeta?.label}</h1>
                            <p className={`text-sm mt-1 max-w-3xl ${textMuted}`}>{activeTabMeta?.description}</p>
                          </div>
                        </div>
                        {activeTabMeta?.reason && <p className={`text-[12px] font-mono max-w-xl ${textFaint}`}>Why this section exists: {activeTabMeta.reason}</p>}
                      </div>
                    </div>
                  </section>
                )}

                {activeTab === 'overview' && <Overview analysis={analysis} theme={theme} eli5={eli5} onNavigate={navigateTo} />}
                {activeTab === 'files' && <FileExplorer analysis={analysis} theme={theme} eli5={eli5} onNavigate={navigateTo} initialPath={navigationContext.path} />}
                {activeTab === 'symbols' && <SymbolExplorer analysis={analysis} theme={theme} onNavigate={navigateTo} initialSymbol={navigationContext.symbol} />}
                {activeTab === 'architecture' && <Architecture analysis={analysis} theme={theme} eli5={eli5} onNavigate={navigateTo} />}
                {activeTab === 'api' && <ApiExplorer analysis={analysis} theme={theme} onNavigate={navigateTo} />}
                {activeTab === 'components' && <ComponentBreakdown analysis={analysis} theme={theme} onNavigate={navigateTo} initialComponent={navigationContext.component} />}
                {activeTab === 'flows' && <FlowAnalysis analysis={analysis} theme={theme} />}
                {activeTab === 'security' && <SecurityAudit analysis={analysis} theme={theme} onNavigate={navigateTo} />}
                {activeTab === 'setup' && <SetupGuide analysis={analysis} theme={theme} onNavigate={navigateTo} />}
              </>
            )}
          </div>
        </main>
      </div>
      {!loading && !error && analysis && <QueryWidget analysis={analysis} theme={theme} eli5={eli5} />}
    </div>
  );
}
