"use client";
import { useEffect, useMemo, useState } from 'react';
export default function FileExplorer({ analysis, theme, eli5, initialPath = '', onNavigate }) {
  const d = theme === 'dark';
  const [expanded, setExpanded] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [search, setSearch] = useState('');
  const [insight, setInsight] = useState('');
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [liveCode, setLiveCode] = useState('');
  const [loadingCode, setLoadingCode] = useState(false);
  const [codeSource, setCodeSource] = useState('analysis-cache');
  const [codeError, setCodeError] = useState('');
  const fileTree = analysis?.file_tree || [];
  const fileIntel = analysis?.results?.files || [];
  const selectedFileIntel = fileIntel.find((file) => file.path === selectedFile);
  const repoBaseUrl = analysis?.repo_url;
  const repoRevision = analysis?.results?.incremental?.revision || 'HEAD';
  const matchingFiles = useMemo(
    () => fileIntel.filter((file) => !search.trim() || file.path.toLowerCase().includes(search.trim().toLowerCase())),
    [fileIntel, search],
  );

  useEffect(() => {
    if (!selectedFile && matchingFiles[0]?.path) {
      setSelectedFile(matchingFiles[0].path);
    }
  }, [matchingFiles, selectedFile]);

  useEffect(() => {
    if (!initialPath) return;
    const exact = fileIntel.find((file) => file.path === initialPath);
    const prefix = fileIntel.find((file) => file.path.startsWith(initialPath));
    const next = exact?.path || prefix?.path;
    if (next && next !== selectedFile) {
      setSelectedFile(next);
      setInsight('');
    }
  }, [fileIntel, initialPath, selectedFile]);

  useEffect(() => {
    if (!selectedFileIntel || !selectedFile) {
      setLiveCode('');
      setCodeError('');
      setCodeSource('analysis-cache');
      return;
    }

    let cancelled = false;
    setLiveCode(selectedFileIntel.code || '');
    setCodeError('');
    setCodeSource(selectedFileIntel.truncated ? 'analysis-preview' : 'analysis-cache');

    if (!analysis?.id) return undefined;

    const loadCode = async () => {
      setLoadingCode(true);
      try {
        const res = await fetch(`/api/file?id=${encodeURIComponent(analysis.id)}&path=${encodeURIComponent(selectedFile)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not load source code.');
        if (!cancelled) {
          setLiveCode(data.code || '');
          setCodeSource(data.source || 'analysis-cache');
        }
      } catch (error) {
        if (!cancelled) {
          setCodeError(error.message);
        }
      } finally {
        if (!cancelled) {
          setLoadingCode(false);
        }
      }
    };

    loadCode();
    return () => {
      cancelled = true;
    };
  }, [analysis?.id, selectedFile, selectedFileIntel]);

  // Build tree structure
  const tree = {};
  fileTree.forEach(f => {
    const parts = f.path.split('/');
    let current = tree;
    parts.forEach((part, i) => {
      if (i === parts.length - 1 && f.type === 'blob') {
        current[part] = { _file: true, size: f.size, path: f.path };
      } else {
        if (!current[part]) current[part] = {};
        current = current[part];
      }
    });
  });

  const toggleDir = (path) => setExpanded(prev => ({ ...prev, [path]: !prev[path] }));

  const getFileInsight = async () => {
    if (!selectedFile) return;
    setLoadingInsight(true);
    try {
      const res = await fetch('/api/file', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisId: analysis?.id, filePath: selectedFile, eli5 })
      });
      const data = await res.json();
      setInsight(data.response || data.error || '');
    } catch (e) { setInsight('Could not load insight.'); }
    setLoadingInsight(false);
  };

  const handleSelectFile = (filePath) => {
    setSelectedFile(filePath);
    setInsight('');
  };

  const relatedViews = useMemo(() => {
    if (!selectedFileIntel) return [];
    const views = [];
    if ((selectedFileIntel.functions || []).length > 0 || (selectedFileIntel.classes || []).length > 0 || (selectedFileIntel.methods || []).length > 0) {
      views.push({ label: 'Open symbol view', tab: 'symbols' });
    }
    if ((selectedFileIntel.endpoints || []).length > 0 || selectedFile.includes('/api/')) {
      views.push({ label: 'Open API view', tab: 'api' });
    }
    if (/(component|components|\.jsx$|\.tsx$)/i.test(selectedFile)) {
      views.push({ label: 'Open component view', tab: 'components' });
    }
    if ((selectedFileIntel.imports || []).length > 0) {
      views.push({ label: 'Open architecture view', tab: 'architecture' });
    }
    return views;
  }, [selectedFile, selectedFileIntel]);

  const detailSections = useMemo(() => {
    if (!selectedFileIntel) return [];

    const sections = [];

    if ((selectedFileIntel.functions || []).length > 0) {
      sections.push({
        title: 'Functions',
        tone: d ? 'border-d-border bg-purple/15' : 'border-ink/10 bg-cream',
        content: selectedFileIntel.functions.slice(0, 8).map((item) => ({
          primary: item.name,
          secondary: (item.args || []).length > 0 ? `args: ${item.args.join(', ')}` : null,
        })),
        empty: 'No functions inferred.',
      });
    }

    if ((selectedFileIntel.classes || []).length > 0 || (selectedFileIntel.methods || []).length > 0) {
      sections.push({
        title: 'Classes & Methods',
        tone: d ? 'border-d-border bg-blue/15' : 'border-ink/10 bg-cream',
        content: [
          ...(selectedFileIntel.classes || []).slice(0, 5).map((item) => ({ primary: item.name, secondary: null })),
          ...(selectedFileIntel.methods || []).slice(0, 6).map((item) => ({ primary: item.name, secondary: null })),
        ],
        empty: 'No classes or methods inferred.',
      });
    }

    if ((selectedFileIntel.selectors || []).length > 0 || (selectedFileIntel.customProperties || []).length > 0 || (selectedFileIntel.animations || []).length > 0) {
      sections.push({
        title: 'Stylesheet Signals',
        tone: d ? 'border-d-border bg-peach/15' : 'border-ink/10 bg-cream',
        content: [
          ...(selectedFileIntel.selectors || []).slice(0, 10).map((item) => ({ primary: item, secondary: 'selector' })),
          ...(selectedFileIntel.customProperties || []).slice(0, 8).map((item) => ({ primary: item, secondary: 'custom property' })),
          ...(selectedFileIntel.animations || []).slice(0, 6).map((item) => ({ primary: item, secondary: 'animation' })),
        ],
        empty: 'No stylesheet patterns inferred.',
      });
    }

    if ((selectedFileIntel.topLevelKeys || []).length > 0) {
      sections.push({
        title: 'Top-Level Keys',
        tone: d ? 'border-d-border bg-lime/15' : 'border-ink/10 bg-cream',
        content: selectedFileIntel.topLevelKeys.slice(0, 12).map((item) => ({ primary: item, secondary: 'key' })),
        empty: 'No keys inferred.',
      });
    }

    if ((selectedFileIntel.headings || []).length > 0 || (selectedFileIntel.tags || []).length > 0) {
      sections.push({
        title: 'Document Structure',
        tone: d ? 'border-d-border bg-blue/15' : 'border-ink/10 bg-cream',
        content: [
          ...(selectedFileIntel.headings || []).slice(0, 10).map((item) => ({ primary: item, secondary: 'heading' })),
          ...(selectedFileIntel.tags || []).slice(0, 10).map((item) => ({ primary: item, secondary: 'tag' })),
        ],
        empty: 'No structure inferred.',
      });
    }

    sections.push({
      title: 'Imports & References',
      tone: d ? 'border-d-border bg-lime/15' : 'border-ink/10 bg-cream',
      content: (selectedFileIntel.imports || []).slice(0, 10).map((item) => ({ primary: item, secondary: null })),
      empty: 'No imports inferred.',
    });

    return sections;
  }, [d, selectedFileIntel]);

  const renderNode = (node, path = '', depth = 0) => {
    return Object.entries(node).sort(([aK, aV], [bK, bV]) => {
      const aIsDir = !aV._file; const bIsDir = !bV._file;
      if (aIsDir && !bIsDir) return -1; if (!aIsDir && bIsDir) return 1;
      return aK.localeCompare(bK);
    }).map(([name, value]) => {
      const fullPath = path ? `${path}/${name}` : name;
      const matchesSearch = !search.trim() || fullPath.toLowerCase().includes(search.trim().toLowerCase());
      if (!matchesSearch && value._file) return null;
      if (value._file) {
        return (
          <button key={fullPath} onClick={() => handleSelectFile(fullPath)}
            className={`w-full flex items-center gap-2 py-1 px-2 rounded text-[13px] font-mono transition-colors ${selectedFile === fullPath ? (d ? 'bg-purple/10 text-purple' : 'bg-purple/20 text-ink') : (d ? 'text-d-muted hover:bg-d-card' : 'text-ink-muted hover:bg-sand/50')}`}
            style={{ paddingLeft: `${depth * 16 + 8}px` }}>
            <span className="material-symbols-outlined text-[14px]">description</span>
            <span className="truncate">{name}</span>
            <span className={`ml-auto text-[10px] ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>{value.size > 1024 ? `${(value.size/1024).toFixed(1)}K` : `${value.size}B`}</span>
          </button>
        );
      }
      const hasVisibleChildren = Object.keys(value).some((childName) => {
        const childPath = fullPath ? `${fullPath}/${childName}` : childName;
        return !search.trim() || childPath.toLowerCase().includes(search.trim().toLowerCase());
      });
      if (!matchesSearch && !hasVisibleChildren) return null;
      const isExpanded = search.trim() ? true : expanded[fullPath];
      return (
        <div key={fullPath}>
          <button onClick={() => toggleDir(fullPath)}
            className={`w-full flex items-center gap-2 py-1 px-2 rounded text-[13px] font-mono transition-colors ${d ? 'text-d-text hover:bg-d-card' : 'text-ink hover:bg-sand/50'}`}
            style={{ paddingLeft: `${depth * 16 + 8}px` }}>
            <span className="material-symbols-outlined text-[14px]">{isExpanded ? 'folder_open' : 'folder'}</span>
            <span>{name}/</span>
          </button>
          {isExpanded && renderNode(value, fullPath, depth + 1)}
        </div>
      );
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">File Explorer</h1>
      <div className={`card-brutal rounded-none p-3 ${d ? 'bg-d-card' : 'bg-white'}`}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search files or folders..."
          className={`w-full px-3 py-2 rounded-none text-[13px] font-mono border ${d ? 'bg-d-bg border-d-border text-d-text placeholder:text-d-subtle' : 'bg-cream border-ink/10 text-ink placeholder:text-ink-faint'}`}
        />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(260px,320px)_minmax(0,2.2fr)_minmax(260px,320px)] gap-4 items-start">
        <div className={`card-brutal rounded-none p-4 max-h-[72vh] overflow-y-auto ${d ? 'bg-blue/12' : 'bg-white'}`}>
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <div className={`text-[10px] font-mono uppercase tracking-[0.2em] ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>Repository Tree</div>
              <div className="text-sm mt-1">{matchingFiles.length} visible files</div>
            </div>
            <span className={`text-[11px] font-mono ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>Click to open</span>
          </div>
          {renderNode(tree)}
        </div>
        <div className={`card-brutal rounded-none p-5 overflow-hidden min-w-0 ${d ? 'bg-purple/12' : 'bg-white'}`}>
          {selectedFile ? (
            <>
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-mono text-sm font-semibold mb-1 break-all">{selectedFile}</h3>
                  <div className={`text-[12px] ${d ? 'text-d-muted' : 'text-ink-muted'}`}>{selectedFileIntel?.summary || 'Source preview'}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {repoBaseUrl && (
                    <a
                      href={`${repoBaseUrl}/blob/${repoRevision}/${selectedFile}`}
                      target="_blank"
                      rel="noreferrer"
                      className={`px-3 py-2 border-2 text-[12px] font-mono ${d ? 'border-white bg-d-bg text-d-text' : 'border-black bg-cream text-ink'}`}
                    >
                      Open on GitHub
                    </a>
                  )}
                  <button
                    onClick={getFileInsight}
                    className={`px-3 py-2 border-2 text-[12px] font-mono ${d ? 'border-white bg-lime text-ink' : 'border-black bg-lime text-ink'}`}
                  >
                    Analyze this file
                  </button>
                </div>
              </div>
              {selectedFileIntel && (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {[
                      selectedFileIntel.language,
                      selectedFileIntel.fileKind,
                      `${selectedFileIntel.lineCount || 0} lines`,
                      `${selectedFileIntel.size || 0} bytes`,
                      codeSource === 'github-live' ? 'live source' : null,
                    ].filter(Boolean).map((chip) => (
                      <span key={chip} className={`px-2.5 py-1 text-[11px] font-mono border-2 ${d ? 'border-white bg-d-bg' : 'border-black bg-cream'}`}>{chip}</span>
                    ))}
                  </div>
                  {loadingCode && (
                    <div className={`text-[12px] font-mono ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>Loading latest file contents...</div>
                  )}
                  {codeError && (
                    <div className={`text-[12px] font-mono ${d ? 'text-peach' : 'text-red-500'}`}>{codeError}</div>
                  )}
                  {relatedViews.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {relatedViews.map((view) => (
                        <button
                          key={view.tab}
                          onClick={() => onNavigate?.(view.tab, { path: selectedFile })}
                          className={`px-2.5 py-1 text-[11px] font-mono border-2 ${d ? 'border-white bg-d-bg hover:bg-blue/12' : 'border-black bg-cream hover:bg-sand'}`}
                        >
                          {view.label}
                        </button>
                      ))}
                    </div>
                  )}
                  {liveCode && (
                    <div className={`border-2 ${d ? 'border-d-border bg-black text-green-200' : 'border-ink/10 bg-ink text-cream'} overflow-auto max-h-[72vh]`}>
                      <div className="grid grid-cols-[auto_1fr] text-[12px] font-mono">
                        {liveCode.split('\n').map((line, index) => (
                          <div key={index} className="contents">
                            <div className={`px-3 py-0.5 text-right select-none ${d ? 'text-d-subtle bg-d-bg' : 'text-ink-faint bg-black/20'}`}>{index + 1}</div>
                            <pre className="px-3 py-0.5 whitespace-pre-wrap break-all">{line || ' '}</pre>
                          </div>
                        ))}
                      </div>
                      {selectedFileIntel.truncated && codeSource !== 'github-live' && <div className="px-3 py-2 text-[11px] font-mono border-t border-white/20">Preview truncated for very large files.</div>}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className={`text-center py-12 ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>
              <span className="material-symbols-outlined text-3xl mb-2 block">touch_app</span>
              <p className="text-sm font-mono">Click a file to inspect its code</p>
            </div>
          )}
        </div>
        <div className={`card-brutal rounded-none p-5 ${d ? 'bg-lime/10' : 'bg-white'}`}>
          {selectedFileIntel ? (
            <div className="space-y-4">
              <div>
                <div className={`text-[10px] font-mono uppercase tracking-[0.2em] mb-2 ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>Why this file matters</div>
                <p className={`text-sm leading-relaxed ${d ? 'text-d-muted' : 'text-ink-muted'}`}>{selectedFileIntel.why}</p>
              </div>
              {detailSections.map((section) => (
                <div key={section.title} className={`border-2 p-4 ${section.tone}`}>
                  <div className={`text-[10px] font-mono uppercase tracking-[0.2em] mb-2 ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>{section.title}</div>
                  {section.content.length > 0 ? section.content.map((item, index) => (
                    <div key={index} className="text-[12px] font-mono mb-2">
                      <button
                        type="button"
                        onClick={() => onNavigate?.('symbols', { symbol: item.primary })}
                        className={`text-left ${section.title === 'Functions' || section.title === 'Classes & Methods' ? (d ? 'hover:text-blue' : 'hover:text-purple') : ''}`}
                        disabled={!(section.title === 'Functions' || section.title === 'Classes & Methods')}
                      >
                        {item.primary}
                      </button>
                      {item.secondary && <div className={`${d ? 'text-d-subtle' : 'text-ink-faint'}`}>{item.secondary}</div>}
                    </div>
                  )) : <div className={`text-sm ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>{section.empty}</div>}
                </div>
              ))}
              {(selectedFileIntel.schemas?.request?.length > 0 || selectedFileIntel.schemas?.response?.length > 0) && (
                <div className={`border-2 p-4 ${d ? 'border-d-border bg-peach/15' : 'border-ink/10 bg-cream'}`}>
                  <div className={`text-[10px] font-mono uppercase tracking-[0.2em] mb-2 ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>Request / Response</div>
                  <div className="space-y-3">
                    {selectedFileIntel.schemas?.request?.length > 0 && <div className="text-[12px] font-mono">request: {selectedFileIntel.schemas.request.join(', ')}</div>}
                    {selectedFileIntel.schemas?.response?.length > 0 && <div className="text-[12px] font-mono">response: {selectedFileIntel.schemas.response.join(', ')}</div>}
                  </div>
                </div>
              )}
              <div className={`border-2 p-4 ${d ? 'border-d-border bg-blue/15' : 'border-ink/10 bg-cream'}`}>
                <div className={`text-[10px] font-mono uppercase tracking-[0.2em] mb-2 ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>AI Insight</div>
                {loadingInsight ? (
                  <div className="flex items-center gap-2"><svg className={`w-4 h-4 animate-spin ${d ? 'text-d-subtle' : 'text-ink-faint'}`} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-20"/><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg><span className={`text-sm font-mono ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>thinking...</span></div>
                ) : insight ? (
                  <p className={`text-[13px] leading-relaxed whitespace-pre-wrap ${d ? 'text-d-muted' : 'text-ink-muted'}`}>{insight}</p>
                ) : (
                  <p className={`text-sm ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>Open the file first, then ask for a focused explanation if you need more context.</p>
                )}
              </div>
            </div>
          ) : (
            <div className={`text-center py-12 ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>
              <span className="material-symbols-outlined text-3xl mb-2 block">info</span>
              <p className="text-sm font-mono">File metadata and usage details appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
