"use client";
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { useTheme } from './ThemeProvider';
import Overview from './views/Overview';
import Architecture from './views/Architecture';
import QueryConsole from './views/QueryConsole';
import ApiExplorer from './views/ApiExplorer';
import ComponentBreakdown from './views/ComponentBreakdown';
import SecurityAudit from './views/SecurityAudit';
import SetupGuide from './views/SetupGuide';
import FlowAnalysis from './views/FlowAnalysis';
import FileExplorer from './views/FileExplorer';

export default function DashboardLayout() {
  const [activeTab, setActiveTab] = useState('overview');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [eli5, setEli5] = useState(false);
  const searchParams = useSearchParams();
  const analysisId = searchParams.get('id');
  const { data: session } = useSession();
  const { theme, toggle } = useTheme();

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        // Try localStorage cache first
        const cached = localStorage.getItem(`vibo-analysis-${analysisId}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Date.now() - parsed._cachedAt < 300000) { setAnalysis(parsed); setLoading(false); return; }
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

  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'dashboard' },
    { id: 'files', label: 'Files', icon: 'folder_open' },
    { id: 'architecture', label: 'Architecture', icon: 'hub' },
    { id: 'api', label: 'API Explorer', icon: 'api' },
    { id: 'components', label: 'Components', icon: 'widgets' },
    { id: 'flows', label: 'Flows', icon: 'route' },
    { id: 'security', label: 'Security & Quality', icon: 'security' },
    { id: 'setup', label: 'Setup Guide', icon: 'build' },
    { id: 'query', label: 'AI Query', icon: 'chat' },
  ];

  const isDark = theme === 'dark';
  const bg = isDark ? 'bg-d-bg' : 'bg-cream';
  const cardBg = isDark ? 'bg-d-card' : 'bg-white';
  const border = isDark ? 'border-d-border' : 'border-ink/10';
  const textPrimary = isDark ? 'text-d-text' : 'text-ink';
  const textMuted = isDark ? 'text-d-muted' : 'text-ink-muted';
  const textFaint = isDark ? 'text-d-subtle' : 'text-ink-faint';

  return (
    <div className={`min-h-screen ${bg} ${textPrimary} transition-colors duration-300`}>
      {/* Top bar */}
      <nav className={`fixed top-0 w-full z-50 border-b ${border} ${isDark ? 'bg-d-bg/90' : 'bg-cream/90'} backdrop-blur-md`}>
        <div className="px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/" className="text-sm font-bold font-mono tracking-tight">vibo</a>
            <span className={textFaint}>/</span>
            <span className="text-sm font-mono truncate max-w-[200px]">{analysis?.repo_name || '...'}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* ELI5 Toggle */}
            <button onClick={() => setEli5(!eli5)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono transition-colors ${eli5 ? (isDark ? 'bg-blue/20 text-blue' : 'bg-blue/20 text-ink') : `${textFaint} hover:${textMuted}`}`}>
              <span className="material-symbols-outlined text-[14px]">school</span>
              ELI5
            </button>
            <button onClick={toggle} className={`p-1.5 rounded-md ${isDark ? 'hover:bg-d-card' : 'hover:bg-sand'} transition-colors`}>
              <span className={`material-symbols-outlined text-[16px] ${textMuted}`}>{isDark ? 'light_mode' : 'dark_mode'}</span>
            </button>
            {session ? (
              <img src={session.user?.image} alt="" className="w-6 h-6 rounded-none" />
            ) : (
              <button onClick={() => signIn('github')} className={`text-xs font-mono ${textFaint}`}>sign in</button>
            )}
          </div>
        </div>
      </nav>

      <div className="flex pt-12 h-screen">
        {/* Sidebar */}
        <aside className={`hidden md:flex flex-col w-48 border-r ${border} ${bg} shrink-0`}>
          <nav className="flex-1 p-2 pt-3 space-y-0.5">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-none text-[13px] font-mono transition-all font-bold ${
                  activeTab === tab.id
                    ? `nav-item-active bg-lime text-ink`
                    : `border-3 border-transparent ${textMuted} ${isDark ? 'hover:bg-d-card hover:text-d-text' : 'hover:bg-sand/50 hover:translate-x-1'}`
                }`}>
                <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
          <div className={`p-2 border-t ${border}`}>
            <a href="/" className={`w-full flex items-center justify-center gap-2 px-2.5 py-2.5 rounded-none text-sm font-bold font-mono transition-all btn-brutal bg-purple text-ink`}>
              <span className="material-symbols-outlined text-[16px]">add</span>
              New analysis
            </a>
          </div>
        </aside>

        {/* Mobile tabs */}
        <div className="md:hidden fixed top-12 w-full z-40 overflow-x-auto">
          <div className={`flex border-b ${border} ${isDark ? 'bg-d-bg' : 'bg-cream'} px-2`}>
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 text-[11px] font-mono whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id ? `${isDark ? 'border-purple text-d-text' : 'border-ink text-ink'}` : `border-transparent ${textFaint}`}`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main */}
        <main className={`flex-1 overflow-y-auto ${bg}`}>
          <div className="max-w-5xl mx-auto p-6 md:p-8">
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
                {activeTab === 'overview' && <Overview analysis={analysis} theme={theme} eli5={eli5} />}
                {activeTab === 'files' && <FileExplorer analysis={analysis} theme={theme} eli5={eli5} />}
                {activeTab === 'architecture' && <Architecture analysis={analysis} theme={theme} eli5={eli5} />}
                {activeTab === 'api' && <ApiExplorer analysis={analysis} theme={theme} />}
                {activeTab === 'components' && <ComponentBreakdown analysis={analysis} theme={theme} />}
                {activeTab === 'flows' && <FlowAnalysis analysis={analysis} theme={theme} />}
                {activeTab === 'security' && <SecurityAudit analysis={analysis} theme={theme} />}
                {activeTab === 'setup' && <SetupGuide analysis={analysis} theme={theme} />}
                {activeTab === 'query' && <QueryConsole analysis={analysis} theme={theme} eli5={eli5} />}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
