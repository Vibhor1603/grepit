"use client";
import { useState } from 'react';
export default function FileExplorer({ analysis, theme, eli5 }) {
  const d = theme === 'dark';
  const [expanded, setExpanded] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [insight, setInsight] = useState('');
  const [loadingInsight, setLoadingInsight] = useState(false);
  const fileTree = analysis?.file_tree || [];

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

  const getFileInsight = async (filePath) => {
    setSelectedFile(filePath);
    setLoadingInsight(true);
    try {
      const res = await fetch('/api/query', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: eli5 ? `Explain what the file "${filePath}" does in very simple terms, like explaining to a 5 year old.` : `Give a brief technical summary of what "${filePath}" likely does based on its name and location in the project structure. Be concise (2-3 sentences).`, analysisId: analysis?.id })
      });
      const data = await res.json();
      setInsight(data.response || data.error || '');
    } catch (e) { setInsight('Could not load insight.'); }
    setLoadingInsight(false);
  };

  const renderNode = (node, path = '', depth = 0) => {
    return Object.entries(node).sort(([aK, aV], [bK, bV]) => {
      const aIsDir = !aV._file; const bIsDir = !bV._file;
      if (aIsDir && !bIsDir) return -1; if (!aIsDir && bIsDir) return 1;
      return aK.localeCompare(bK);
    }).map(([name, value]) => {
      const fullPath = path ? `${path}/${name}` : name;
      if (value._file) {
        return (
          <button key={fullPath} onClick={() => getFileInsight(fullPath)}
            className={`w-full flex items-center gap-2 py-1 px-2 rounded text-[13px] font-mono transition-colors ${selectedFile === fullPath ? (d ? 'bg-purple/10 text-purple' : 'bg-purple/20 text-ink') : (d ? 'text-d-muted hover:bg-d-card' : 'text-ink-muted hover:bg-sand/50')}`}
            style={{ paddingLeft: `${depth * 16 + 8}px` }}>
            <span className="material-symbols-outlined text-[14px]">description</span>
            <span className="truncate">{name}</span>
            <span className={`ml-auto text-[10px] ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>{value.size > 1024 ? `${(value.size/1024).toFixed(1)}K` : `${value.size}B`}</span>
          </button>
        );
      }
      return (
        <div key={fullPath}>
          <button onClick={() => toggleDir(fullPath)}
            className={`w-full flex items-center gap-2 py-1 px-2 rounded text-[13px] font-mono transition-colors ${d ? 'text-d-text hover:bg-d-card' : 'text-ink hover:bg-sand/50'}`}
            style={{ paddingLeft: `${depth * 16 + 8}px` }}>
            <span className="material-symbols-outlined text-[14px]">{expanded[fullPath] ? 'folder_open' : 'folder'}</span>
            <span>{name}/</span>
          </button>
          {expanded[fullPath] && renderNode(value, fullPath, depth + 1)}
        </div>
      );
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">File Explorer</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`card-brutal rounded-none p-4 max-h-[600px] overflow-y-auto ${d ? 'bg-d-card' : 'bg-white'}`}>
          {renderNode(tree)}
        </div>
        <div className={`card-brutal rounded-none p-5 ${d ? 'bg-d-card' : 'bg-white'}`}>
          {selectedFile ? (
            <>
              <h3 className="font-mono text-sm font-semibold mb-1">{selectedFile}</h3>
              <div className={`h-px my-3 ${d ? 'bg-d-border' : 'bg-ink/10'}`}></div>
              {loadingInsight ? (
                <div className="flex items-center gap-2"><svg className={`w-4 h-4 animate-spin ${d ? 'text-d-subtle' : 'text-ink-faint'}`} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-20"/><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg><span className={`text-sm font-mono ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>thinking...</span></div>
              ) : (
                <p className={`text-[13px] leading-relaxed ${d ? 'text-d-muted' : 'text-ink-muted'}`}>{insight}</p>
              )}
            </>
          ) : (
            <div className={`text-center py-12 ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>
              <span className="material-symbols-outlined text-3xl mb-2 block">touch_app</span>
              <p className="text-sm font-mono">Click a file to get AI insights</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
