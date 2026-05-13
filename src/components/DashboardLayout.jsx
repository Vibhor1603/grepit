"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { MessageSquare, Grid3X3, Terminal, FileText, Folder, ChevronRight, Code2, Shield, Server, Cpu, Layers, Send, Plus, Clock, X, Square, Copy, Check, Trash2 } from 'lucide-react';
import dynamic from 'next/dynamic';

const CodeViewerLazy = dynamic(() => import('./CodeViewer'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-40"><svg className="w-5 h-5 animate-spin text-vb-accent" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-20"/><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></div>,
});

/* ── Copy Button ── */
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button onClick={handleCopy} className="p-1 rounded text-vb-ink4 hover:text-vb-ink2 transition-colors" title="Copy">
      {copied ? <Check size={13} className="text-vb-accent" /> : <Copy size={13} />}
    </button>
  );
}

/* ── Toast ── */
function Toast({ message, type, onDismiss }) {
  useEffect(() => { const t = setTimeout(onDismiss, 4000); return () => clearTimeout(t); }, [onDismiss]);
  const styles = { error: 'border-vb-red/20 bg-vb-red/[0.06] text-vb-red', success: 'border-vb-accent/20 bg-vb-accent/[0.06] text-vb-accent', info: 'border-white/[0.08] bg-white/[0.03] text-vb-ink2' };
  return <div className={`fixed bottom-6 right-6 z-[200] px-4 py-3 rounded-lg border ${styles[type] || styles.info} text-[13px] shadow-[0_8px_24px_rgba(0,0,0,0.5)] backdrop-blur-sm`}>{message}</div>;
}
function useToast() {
  const [toast, setToast] = useState(null);
  const show = useCallback((msg, type = 'info') => setToast({ message: msg, type }), []);
  const dismiss = useCallback(() => setToast(null), []);
  return { toast, show, dismiss };
}

/* ── Helpers ── */
function healthScore(a) { const arch = a?.architecture || {}; return Math.max(10, 100 - ((arch.securityIssues || []).length + (a?.results?.security?.hardcodedSecrets || []).length) * 8); }
function getIdentityProfile(a) { const arch = a?.architecture || a?.results || {}; return { techStack: (arch.techStack || []).slice(0, 3).join(' + ') || 'Unknown', storage: arch.storage || arch.database || 'Not detected', runtime: arch.runtime || 'Not detected' }; }
function getHighTrafficFiles(a) { const f = (a?.results?.files || []).filter(f => f.complexity > 5 || f.lineCount > 100).sort((a, b) => (b.complexity || 0) - (a.complexity || 0)).slice(0, 3).map(f => f.path.split('/').pop()); return f.length > 0 ? f : null; }
function parseFollowUps(content) {
  const patterns = [
    /## Follow-up questions?.*\n/i,
    /\*\*Follow-up questions?.*\*\*\s*\n/i,
    /\*\*Follow-up questions?[^*]*\n/i,
    /\*\*Follow-up:?\*\*\s*\n/i,
    /Follow-up questions?:?\s*\n/i,
    /### Follow-up.*\n/i,
  ];
  let idx = -1;
  let matchLen = 0;
  for (const pat of patterns) {
    const match = content.match(pat);
    if (match && match.index !== undefined) {
      const pos = match.index;
      if (idx === -1 || pos > idx) { idx = pos; matchLen = match[0].length; }
    }
  }
  if (idx === -1) return { body: content, followUps: [] };
  const body = content.slice(0, idx).replace(/---\s*$/, '').trim();
  const rest = content.slice(idx + matchLen);
  const followUps = rest.split('\n')
    .map(l => l.trim())
    .filter(l => l.startsWith('-') || l.startsWith('*') || /^\d+\./.test(l))
    .map(l => l.replace(/^[\s\-*\d.]+/, '').replace(/^\[|\]$/g, '').replace(/\?$/, '?').trim())
    .filter(l => l.length > 5)
    .slice(0, 3);
  return { body, followUps };
}

/* ── Markdown renderer ── */
function MarkdownMessage({ content, onNavigateToFile }) {
  const lines = content.split('\n');
  const elements = [];
  let listBuffer = [], listType = null, tableBuffer = [];
  let codeBlock = false, codeLines = [], codeLang = '';

  // Detect if a backtick reference is a file path or code symbol
  const isFilePath = (text) => /^[\w\-./]+\.(js|ts|jsx|tsx|css|json|md|html|py|rb|go|rs|yaml|yml|toml|sql|sh|env)$/i.test(text) || text.includes('/');
  const isCodeSymbol = (text) => /^[a-zA-Z_$][\w$]*$/.test(text) && text.length > 2;

  const renderInline = (text) => {
    if (!text) return text;
    const result = [];
    let rem = text;
    let k = 0;
    while (rem.length > 0) {
      const cm = rem.match(/^`([^`]+)`/);
      if (cm) {
        const ref = cm[1];
        if (isFilePath(ref) || isCodeSymbol(ref)) {
          // Navigable — underlined, clickable
          result.push(
            <button key={k++} onClick={() => onNavigateToFile?.(ref)} className="inline px-1 py-0.5 text-vb-accent text-[12px] font-mono underline underline-offset-2 decoration-vb-accent/40 hover:decoration-vb-accent cursor-pointer transition-colors">
              {ref}
            </button>
          );
        } else {
          // Regular inline code — no underline, subtle background
          result.push(<code key={k++} className="px-1.5 py-0.5 bg-white/[0.04] rounded text-[12px] font-mono text-vb-ink">{ref}</code>);
        }
        rem = rem.slice(cm[0].length); continue;
      }
      const bm = rem.match(/^\*\*(.+?)\*\*/);
      if (bm) { result.push(<strong key={k++} className="font-semibold text-vb-ink">{bm[1]}</strong>); rem = rem.slice(bm[0].length); continue; }
      const im = rem.match(/^\*(.+?)\*/);
      if (im) { result.push(<em key={k++} className="italic text-vb-ink">{im[1]}</em>); rem = rem.slice(im[0].length); continue; }
      const nx = rem.search(/[`*]/);
      if (nx <= 0) { result.push(<span key={k++}>{nx === 0 ? rem[0] : rem}</span>); if (nx === 0) rem = rem.slice(1); else break; }
      else { result.push(<span key={k++}>{rem.slice(0, nx)}</span>); rem = rem.slice(nx); }
    }
    return result;
  };

  const flushList = (key) => { if (!listBuffer.length) return; const Tag = listType === 'ol' ? 'ol' : 'ul'; elements.push(<Tag key={key} className={`${listType === 'ol' ? 'list-decimal' : 'list-disc'} ml-5 space-y-1.5 mb-3`}>{listBuffer.map((item, i) => <li key={i} className="text-[13px] text-vb-ink2 leading-relaxed">{renderInline(item)}</li>)}</Tag>); listBuffer = []; listType = null; };

  const flushTable = (key) => {
    if (tableBuffer.length < 2) { tableBuffer = []; return; }
    const headers = tableBuffer[0].split('|').map(c => c.trim()).filter(Boolean);
    const dataRows = tableBuffer.slice(1).filter(r => !/^[\s|:-]+$/.test(r)).map(r => r.split('|').map(c => c.trim()).filter(Boolean));
    elements.push(
      <div key={key} className="overflow-x-auto mb-4 rounded-lg border border-vb-accent/15">
        <table className="w-full text-[12px]">
          <thead><tr className="border-b border-vb-accent/20 bg-vb-accent/[0.04]">{headers.map((h, i) => <th key={i} className="px-4 py-2.5 text-left text-vb-accent-bright font-semibold text-[11px] uppercase tracking-wide">{h}</th>)}</tr></thead>
          <tbody>{dataRows.map((row, i) => <tr key={i} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]">{row.map((cell, j) => <td key={j} className="px-4 py-2.5 text-vb-ink2">{renderInline(cell)}</td>)}</tr>)}</tbody>
        </table>
      </div>
    );
    tableBuffer = [];
  };

  const flushCode = (key) => {
    if (!codeLines.length) return;
    if (codeLang === 'mermaid') {
      // Render mermaid diagrams inline
      elements.push(<InlineDiagramRender key={key} mermaidCode={codeLines.join('\n')} />);
    } else {
      elements.push(
        <div key={key} className="mb-4 rounded-lg border border-white/[0.06] overflow-hidden">
          {codeLang && <div className="px-3 py-1.5 border-b border-white/[0.04] bg-white/[0.02] text-[10px] text-vb-ink4 font-mono uppercase tracking-wide">{codeLang}</div>}
          <pre className="p-4 overflow-x-auto bg-[#0c0c0e]"><code className="text-[11px] font-mono text-vb-ink2 leading-[1.6] whitespace-pre">{codeLines.join('\n')}</code></pre>
        </div>
      );
    }
    codeLines = []; codeLang = '';
  };

  lines.forEach((line, i) => {
    if (line.trim().startsWith('```')) { if (codeBlock) { flushCode(`cd-${i}`); codeBlock = false; } else { flushList(`l-${i}`); flushTable(`t-${i}`); codeBlock = true; codeLang = line.trim().slice(3).trim().toLowerCase(); } return; }
    if (codeBlock) { codeLines.push(line); return; }
    if (line.includes('|') && line.trim().startsWith('|')) { flushList(`l-${i}`); tableBuffer.push(line); return; }
    if (tableBuffer.length > 0) flushTable(`t-${i}`);
    const olM = line.match(/^\s*\d+\.\s+(.*)$/), ulM = line.match(/^\s*[-*]\s+(.*)$/);
    if (olM) { if (listType && listType !== 'ol') flushList(`ls-${i}`); listType = 'ol'; listBuffer.push(olM[1]); return; }
    if (ulM) { if (listType && listType !== 'ul') flushList(`ls-${i}`); listType = 'ul'; listBuffer.push(ulM[1]); return; }
    flushList(`l-${i}`);
    if (!line.trim()) return;
    if (/^-{3,}$/.test(line.trim()) || /^={3,}$/.test(line.trim())) return;
    if (/^#{3}\s*(.+)/.test(line)) { elements.push(<h3 key={i} className="text-[14px] font-semibold text-vb-ink mt-4 mb-2">{renderInline(line.replace(/^#{3}\s*/, '').replace(/\*\*/g, ''))}</h3>); return; }
    if (/^#{2}\s*(.+)/.test(line)) { elements.push(<h2 key={i} className="text-[15px] font-semibold text-vb-ink mt-4 mb-2">{renderInline(line.replace(/^#{2}\s*/, '').replace(/\*\*/g, ''))}</h2>); return; }
    if (/^#{1}\s*(.+)/.test(line)) { elements.push(<h1 key={i} className="text-[16px] font-semibold text-vb-ink mt-4 mb-2">{renderInline(line.replace(/^#{1}\s*/, '').replace(/\*\*/g, ''))}</h1>); return; }
    elements.push(<p key={i} className="text-[13px] text-vb-ink2 leading-[1.7] mb-2">{renderInline(line)}</p>);
  });
  flushList('end'); flushTable('te'); flushCode('ce');
  return <div>{elements}</div>;
}

/* ── File Tree Sidebar ── */
function FileTreeSidebar({ analysis, selectedFile, onSelectFile, score }) {
  const [expanded, setExpanded] = useState({});
  const fileTree = analysis?.file_tree || [];

  // Build proper nested tree from file_tree (includes both blob and tree entries)
  const tree = useMemo(() => {
    const root = {};
    fileTree.forEach(f => {
      const parts = f.path.split('/');
      let current = root;
      if (f.type === 'blob') {
        for (let i = 0; i < parts.length - 1; i++) {
          if (!current[parts[i]]) current[parts[i]] = { __children: {} };
          current = current[parts[i]].__children;
        }
        current[parts[parts.length - 1]] = { __file: true, __path: f.path };
      } else if (f.type === 'tree') {
        // Ensure directory exists in structure
        for (let i = 0; i < parts.length; i++) {
          if (!current[parts[i]]) current[parts[i]] = { __children: {} };
          current = current[parts[i]].__children;
        }
      }
    });
    return root;
  }, [fileTree]);

  // Auto-expand first two levels on mount
  useEffect(() => {
    const auto = {};
    Object.keys(tree).forEach(k => {
      if (!tree[k].__file) {
        auto[k] = true;
        Object.keys(tree[k].__children || {}).forEach(ck => { if (!tree[k].__children[ck].__file) auto[`${k}/${ck}`] = true; });
      }
    });
    setExpanded(auto);
  }, [tree]);

  const toggle = (path) => setExpanded(prev => ({ ...prev, [path]: !prev[path] }));

  const renderNode = (node, prefix = '', depth = 0) => {
    const entries = Object.entries(node).filter(([k]) => !k.startsWith('__'));
    const folders = entries.filter(([, v]) => !v.__file).sort((a, b) => a[0].localeCompare(b[0]));
    const files = entries.filter(([, v]) => v.__file).sort((a, b) => a[0].localeCompare(b[0]));
    const indent = depth * 12;
    return [...folders, ...files].map(([name, value]) => {
      if (value.__file) {
        return (
          <button key={value.__path} onClick={() => onSelectFile(value.__path)}
            style={{ paddingLeft: `${indent + 8}px` }}
            className={`w-full flex items-center gap-2 py-[5px] pr-2 rounded-md text-[12px] transition-colors duration-150 ${selectedFile === value.__path ? 'bg-vb-accent/10 text-vb-accent' : 'text-vb-ink2 hover:text-vb-ink hover:bg-white/[0.04]'}`}>
            <FileText size={13} className="flex-shrink-0 opacity-50" />
            <span className="truncate">{name}</span>
          </button>
        );
      }
      const dirPath = prefix ? `${prefix}/${name}` : name;
      return (
        <div key={dirPath}>
          <button onClick={() => toggle(dirPath)}
            style={{ paddingLeft: `${indent + 4}px` }}
            className="w-full flex items-center gap-1.5 py-[5px] pr-2 rounded-md text-[12px] text-vb-ink2 hover:text-vb-ink hover:bg-white/[0.04] transition-colors duration-150">
            <ChevronRight size={11} className={`transition-transform duration-150 flex-shrink-0 text-vb-ink4 ${expanded[dirPath] ? 'rotate-90' : ''}`} />
            <Folder size={13} className="flex-shrink-0 text-vb-accent-dim opacity-70" />
            <span className="truncate font-medium">{name}</span>
          </button>
          {expanded[dirPath] && (
            <div className="relative">
              <div className="absolute top-0 bottom-0 border-l border-white/[0.06]" style={{ left: `${indent + 14}px` }} />
              {renderNode(value.__children || {}, dirPath, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 flex items-center gap-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-[6px]">
          <span className="w-[10px] h-[10px] rounded-full bg-[#ff5f57]" />
          <span className="w-[10px] h-[10px] rounded-full bg-[#febc2e]" />
          <span className="w-[10px] h-[10px] rounded-full bg-[#28c840]" />
        </div>
        <span className="text-[11px] font-medium text-vb-ink3 uppercase tracking-wider">Filesystem</span>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {renderNode(tree)}
      </div>
      <div className="mx-2 mb-3 p-3 border border-white/[0.06] rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-medium text-vb-ink3">Health Index</span>
          <span className="text-[11px] text-vb-ink2 font-mono">{score}%</span>
        </div>
        <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
          <div className="h-full bg-vb-accent rounded-full transition-all duration-700" style={{ width: `${score}%` }} />
        </div>
      </div>
    </div>
  );
}

/* ── Right Panel ── */
function RightPanel({ analysis }) {
  const profile = getIdentityProfile(analysis);
  const highTraffic = getHighTrafficFiles(analysis);
  const displayFiles = highTraffic || ['Dashboard.tsx', 'useAnalysis.ts', 'App.tsx'];
  return (
    <div className="h-full flex flex-col overflow-y-auto">
      <div className="px-4 py-5 border-b border-white/[0.06]">
        <h3 className="text-[11px] font-medium text-vb-ink3 uppercase tracking-wider mb-4">Identity Profile</h3>
        <div className="space-y-4">
          {[{ label: 'Tech Stack', value: profile.techStack, Icon: Code2 }, { label: 'Storage', value: profile.storage, Icon: Server }, { label: 'Runtime', value: profile.runtime, Icon: Cpu }].map(({ label, value, Icon }, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-md bg-vb-accent/[0.06] border border-vb-accent/[0.1] flex items-center justify-center flex-shrink-0 text-vb-accent"><Icon size={13} /></div>
              <div><div className="text-[10px] text-vb-ink3 uppercase tracking-wide">{label}</div><div className="text-[13px] text-vb-ink font-medium mt-0.5">{value}</div></div>
            </div>
          ))}
        </div>
      </div>
      <div className="px-4 py-5 border-b border-white/[0.06]">
        <h3 className="text-[11px] font-medium text-vb-ink3 uppercase tracking-wider mb-3">High-Traffic Files</h3>
        <div className="space-y-2">{displayFiles.map((file, i) => (
          <div key={i} className="flex items-center justify-between px-3 py-2 bg-white/[0.02] border border-white/[0.06] rounded-lg">
            <span className="text-[13px] text-vb-ink2 truncate">{file}</span>
            <X size={12} className="text-vb-ink4 cursor-pointer hover:text-vb-ink3 transition-colors flex-shrink-0" />
          </div>
        ))}</div>
      </div>
      <div className="px-4 py-5 mt-auto">
        <div className="p-4 rounded-lg bg-vb-accent/[0.04] border border-vb-accent/[0.1]">
          <div className="flex items-center gap-2 mb-1.5"><Shield size={14} className="text-vb-accent" /><span className="text-[13px] font-semibold text-vb-accent">Pro Guard</span></div>
          <p className="text-[12px] text-vb-ink3 leading-relaxed">Continuous analysis is active. Your codebase is safe.</p>
        </div>
      </div>
    </div>
  );
}

/* ── Confirmation Modal ── */
function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-vb-bg/80 backdrop-blur-sm">
      <div className="bg-vb-bg2 border border-white/[0.08] rounded-lg p-5 max-w-sm w-full mx-4 shadow-[0_16px_48px_rgba(0,0,0,0.5)]">
        <p className="text-[13px] text-vb-ink2 leading-relaxed mb-5">{message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-[12px] text-vb-ink2 bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.05] hover:border-white/[0.12] transition-colors">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-lg text-[12px] text-vb-red border border-vb-red/20 bg-vb-red/[0.06] hover:bg-vb-red/[0.12] transition-colors">Delete</button>
        </div>
      </div>
    </div>
  );
}

/* ── Chat History Sidebar ── */
function ChatHistorySidebar({ history, onSelect, onNewChat, onDelete, onRename }) {
  const [confirmIdx, setConfirmIdx] = useState(null);
  const [renamingIdx, setRenamingIdx] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const startRename = (item, i) => {
    setRenamingIdx(i);
    setRenameValue(item.displayName || item.query.slice(0, 40));
  };

  const submitRename = (item, i) => {
    if (renameValue.trim()) onRename(item, i, renameValue.trim());
    setRenamingIdx(null);
  };

  return (
    <div className="w-[200px] min-w-[200px] border-r border-white/[0.06] flex flex-col h-full bg-vb-bg1">
      <div className="px-3 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <span className="text-[12px] font-medium text-vb-ink2">Chat History</span>
        <button onClick={onNewChat} className="p-1 rounded-md hover:bg-white/[0.04] text-vb-ink3 hover:text-vb-ink transition-colors" title="New chat">
          <Plus size={14} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {history.length === 0 ? (
          <p className="text-[12px] text-vb-ink4 px-2 py-4 text-center">No previous chats</p>
        ) : history.map((item, i) => (
          <div key={i} className="group flex items-center gap-0.5 rounded-md hover:bg-white/[0.03] transition-colors">
            {renamingIdx === i ? (
              <input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submitRename(item, i); if (e.key === 'Escape') setRenamingIdx(null); }}
                onBlur={() => submitRename(item, i)}
                className="flex-1 px-3 py-1.5 text-[12px] text-vb-ink bg-transparent border border-vb-accent/20 rounded outline-none caret-vb-accent"
              />
            ) : (
              <button onClick={() => onSelect(item)}
                onDoubleClick={() => startRename(item, i)}
                className="flex-1 text-left px-3 py-2 text-[12px] text-vb-ink2 hover:text-vb-ink transition-colors truncate flex items-center gap-2 min-w-0">
                <Clock size={11} className="flex-shrink-0 text-vb-ink4" />
                <span className="truncate">{item.displayName || item.query}</span>
              </button>
            )}
            <button onClick={() => setConfirmIdx(i)} className="opacity-0 group-hover:opacity-100 p-1 mr-1 text-vb-ink4 hover:text-vb-red transition-all" title="Delete">
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>

      {confirmIdx !== null && (
        <ConfirmModal
          message="This chat will be permanently deleted. You won't be able to recover it."
          onConfirm={() => { onDelete(history[confirmIdx], confirmIdx); setConfirmIdx(null); }}
          onCancel={() => setConfirmIdx(null)}
        />
      )}
    </div>
  );
}

/* ── Inline Diagram Render (mermaid-based) ── */
function InlineDiagramRender({ mermaidCode }) {
  const containerRef = useRef(null);
  const [svg, setSvg] = useState('');
  const [failed, setFailed] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!mermaidCode) return;
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          suppressErrors: true,
          logLevel: 'fatal',
          securityLevel: 'loose',
          theme: 'dark',
          themeVariables: {
            primaryColor: '#1a1a2e',
            primaryTextColor: '#eaeaec',
            primaryBorderColor: '#E0FC10',
            lineColor: '#5c5c66',
            secondaryColor: '#16161a',
            tertiaryColor: '#1c1c20',
            background: '#0a0a0c',
            mainBkg: '#1a1a2e',
            nodeBorder: '#E0FC10',
            clusterBkg: '#111113',
            clusterBorder: '#3a3a42',
            titleColor: '#eaeaec',
            edgeLabelBackground: '#111113',
            fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: '13px',
          },
        });

        // Create a temporary hidden container for rendering
        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        tempDiv.style.top = '-9999px';
        document.body.appendChild(tempDiv);

        const id = `dia-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        // Sanitize: move classDef/class lines to end, fix common issues
        let lines = mermaidCode.split('\n');
        const classLines = [];
        const otherLines = [];
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('classDef ') || trimmed.startsWith('class ')) {
            classLines.push(trimmed);
          } else {
            otherLines.push(line);
          }
        }
        // Rejoin with class lines at the very end
        const sanitized = [...otherLines, ...classLines].join('\n')
          .replace(/\|>/g, '|')
          .replace(/[""]/g, '"')
          .replace(/\([^)]*\/[^)]*\)/g, (m) => '[' + m.slice(1, -1).replace(/[\/\\<>]/g, ' ') + ']');

        const { svg: rendered } = await mermaid.render(id, sanitized, tempDiv);

        // Clean up temp container
        tempDiv.remove();

        if (!cancelled && rendered) setSvg(rendered);
        else if (!cancelled) setFailed(true);
      } catch (e) {
        console.warn('[mermaid] render failed:', e?.message || e);
        if (!cancelled) setFailed(true);
      }
      // Clean up any error elements mermaid injected
      setTimeout(() => {
        document.querySelectorAll('body > [id^="d"]:not([class])').forEach(el => el.remove());
        document.querySelectorAll('.error-icon, .error-text').forEach(el => el.closest('svg')?.parentElement?.remove());
      }, 100);
    })();
    return () => { cancelled = true; };
  }, [mermaidCode]);

  if (failed) return (
    <div className="my-3 p-4 rounded-lg border border-white/[0.06] bg-white/[0.02] overflow-x-auto">
      <pre className="text-[12px] font-mono text-vb-ink2 whitespace-pre">{mermaidCode}</pre>
    </div>
  );
  if (!svg) return (
    <div className="my-3 p-4 rounded-lg border border-white/[0.06] bg-white/[0.02] flex items-center gap-2">
      <svg className="w-4 h-4 animate-spin text-vb-accent" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-20"/><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
      <span className="text-[12px] text-vb-ink3">Rendering diagram...</span>
    </div>
  );

  const diagramContent = (
    <div ref={containerRef} className="[&_svg]:max-w-full [&_svg]:h-auto [&_svg]:mx-auto" dangerouslySetInnerHTML={{ __html: svg }} />
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-[250] bg-vb-bg/95 backdrop-blur-sm flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <span className="text-[13px] text-vb-ink2">Diagram View</span>
          <button onClick={() => setFullscreen(false)} className="px-3 py-1.5 rounded-lg text-[12px] text-vb-ink2 bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.06] transition-colors">
            Exit Fullscreen
          </button>
        </div>
        <div className="flex-1 overflow-auto p-8 flex items-center justify-center">
          {diagramContent}
        </div>
      </div>
    );
  }

  return (
    <div className="my-3 rounded-lg border border-vb-accent/15 bg-[#0e0e10] overflow-hidden">
      <div className="flex items-center justify-end px-3 py-2 border-b border-white/[0.04]">
        <button onClick={() => setFullscreen(true)} className="text-[11px] text-vb-ink3 hover:text-vb-ink2 px-2 py-1 rounded border border-white/[0.06] hover:border-white/[0.1] transition-colors">
          Fullscreen
        </button>
      </div>
      <div className="p-4 overflow-x-auto">
        {diagramContent}
      </div>
    </div>
  );
}

/* ── Chat View ── */
function ChatView({ analysis, messages, loading, query, setQuery, handleSend, suggestions, chatHistory, onSelectHistory, onNewChat, onDeleteHistory, onStopGeneration, onRenameHistory, historyLoaded, setHistoryLoaded, onNavigateToFile }) {
  const [inputFocused, setInputFocused] = useState(false);
  const scrollRef = useRef(null);

  // Scroll to bottom when user sends or when history is loaded
  const lastUserMsgCount = useRef(messages.length);
  useEffect(() => {
    if (historyLoaded) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'auto' });
      setHistoryLoaded(false);
      lastUserMsgCount.current = messages.length;
      return;
    }
    const userMsgs = messages.filter(m => m.role === 'user').length;
    if (userMsgs > lastUserMsgCount.current) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
    lastUserMsgCount.current = userMsgs;
  }, [messages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex-1 flex min-h-0">
      <ChatHistorySidebar history={chatHistory} onSelect={onSelectHistory} onNewChat={onNewChat} onDelete={onDeleteHistory} onRename={onRenameHistory} />

      <div className="flex-1 flex flex-col min-h-0 bg-vb-chat">
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center">
              <div className="flex flex-wrap items-center justify-center gap-3 max-w-lg">
                {suggestions.map((s, i) => (
                  <button key={i} onClick={() => handleSend(s)}
                    className="group/chip relative inline-flex items-center gap-2.5 px-4 py-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-[13px] text-vb-ink2 transition-all duration-200 ease-out overflow-hidden hover:text-vb-ink hover:border-white/[0.1]">
                    <span className="absolute bottom-0 left-1/2 h-[1px] w-0 bg-vb-accent/40 transition-all duration-300 ease-out group-hover/chip:w-3/4 group-hover/chip:left-[12.5%] rounded-full" />
                    {[<Layers size={13} key="l" />, <Code2 size={13} key="c" />, <Shield size={13} key="s" />, <Grid3X3 size={13} key="g" />][i]}
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {messages.map((msg, i) => {
                const isAI = msg.role === 'assistant';
                const { body, followUps } = isAI ? parseFollowUps(msg.content) : { body: msg.content, followUps: [] };
                return (
                  <div key={i} className="group">
                    {msg.role === 'user' ? (
                      <div className="flex justify-end">
                        <div className="max-w-[70%]">
                          <div className="px-4 py-2.5 rounded-xl bg-vb-accent/10 border border-vb-accent/15 text-vb-ink">
                            <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                          </div>
                          <div className="flex justify-end mt-1">
                            <CopyButton text={msg.content} />
                          </div>
                        </div>
                      </div>
                    ) : msg.role === 'system' ? (
                      <div className="px-1 py-2 text-[13px] text-vb-red">{msg.content}</div>
                    ) : (
                      <div className="py-2">
                        {msg.content === '__DIAGRAM__' && msg._mermaid ? (
                          <InlineDiagramRender mermaidCode={msg._mermaid} />
                        ) : (
                          <MarkdownMessage content={body} onNavigateToFile={onNavigateToFile} />
                        )}
                        {msg.content !== '__DIAGRAM__' && (
                          <div className="flex justify-start mt-1">
                            <CopyButton text={msg.content} />
                          </div>
                        )}
                      </div>
                    )}
                    {followUps.length > 0 && !loading && (
                      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-white/[0.04]">
                        {followUps.map((q, j) => (
                          <button key={j} onClick={() => handleSend(q)}
                            className="text-[12px] text-vb-accent px-3 py-1.5 rounded-md border border-vb-accent/15 bg-vb-accent/[0.04] hover:bg-vb-accent/[0.08] hover:border-vb-accent/25 transition-colors duration-150 cursor-pointer">
                            {q}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {loading && (
                <div className="flex items-center gap-3 py-3">
                  <div className="flex gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-vb-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-vb-accent/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-vb-accent/30 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chat bar */}
        <div className="flex-shrink-0 px-6 pb-8 pt-4">
          <div className={`mx-auto transition-all duration-300 ease-out ${inputFocused ? 'max-w-3xl' : 'max-w-2xl'}`}>
            <div className={`flex items-center border rounded-xl px-5 py-3.5 transition-all duration-300 ${inputFocused ? 'border-vb-accent/30 bg-vb-bg3 shadow-[0_0_24px_rgba(224,252,16,0.06)]' : 'border-white/[0.14] bg-vb-bg2 shadow-[0_-2px_12px_rgba(0,0,0,0.2)] hover:border-white/[0.2] hover:shadow-[0_-2px_16px_rgba(0,0,0,0.3)]'}`}>
              <Send size={15} className={`mr-3 flex-shrink-0 transition-colors duration-200 ${inputFocused ? 'text-vb-accent' : 'text-vb-ink4'}`} />
              <input type="text" value={query || ''} onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                placeholder="Ask a question about the codebase..."
                disabled={loading}
                className="flex-1 bg-transparent text-[14px] text-vb-ink placeholder:text-vb-ink4 outline-none caret-vb-accent" />
              <div className="flex items-center gap-1.5 ml-3 flex-shrink-0">
                {loading ? (
                  <button onClick={onStopGeneration} className="w-6 h-6 rounded-full border border-white/[0.12] flex items-center justify-center text-vb-ink3 hover:text-vb-ink2 hover:border-white/[0.2] transition-colors" title="Stop generating">
                    <Square size={8} fill="currentColor" />
                  </button>
                ) : (
                  <kbd className="text-[9px] text-vb-ink4 bg-white/[0.03] border border-white/[0.06] rounded px-1.5 py-0.5 font-mono">⌘K</kbd>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Explore & System Views ── */
function ExploreView({ analysis, selectedFile, onContinueInChat }) {
  const [code, setCode] = useState('');
  const [loadingCode, setLoadingCode] = useState(false);

  useEffect(() => {
    if (!selectedFile || !analysis?.id) return;
    let c = false; setLoadingCode(true);
    fetch(`/api/file?id=${encodeURIComponent(analysis.id)}&path=${encodeURIComponent(selectedFile)}`).then(r => r.json()).then(d => { if (!c) setCode(d.code || '// No content'); }).catch(() => { if (!c) setCode('// Failed to load'); }).finally(() => { if (!c) setLoadingCode(false); });
    return () => { c = true; };
  }, [selectedFile, analysis?.id]);

  const pathParts = selectedFile ? selectedFile.split('/') : [];

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {selectedFile ? (<>
        {/* Breadcrumb path */}
        <div className="flex items-center gap-1.5 px-6 py-3 border-b border-white/[0.06] flex-shrink-0 overflow-x-auto">
          <Code2 size={14} className="text-vb-accent-dim flex-shrink-0" />
          {pathParts.map((part, i) => (
            <span key={i} className="flex items-center gap-1.5 flex-shrink-0">
              {i > 0 && <span className="text-vb-ink4 text-[11px]">/</span>}
              <span className={`text-[13px] ${i === pathParts.length - 1 ? 'text-vb-ink font-medium' : 'text-vb-ink3'}`}>{part}</span>
            </span>
          ))}
        </div>

        {/* Code viewer */}
        <div className="flex-1 min-h-0 bg-vb-chat">
          {loadingCode ? (
            <div className="flex items-center justify-center h-40">
              <svg className="w-5 h-5 animate-spin text-vb-accent" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-20"/><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </div>
          ) : (
            <CodeViewerLazy code={code} filePath={selectedFile} analysisId={analysis?.id} onContinueInChat={onContinueInChat} />
          )}
        </div>
      </>) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[14px] text-vb-ink3">Select a file from the sidebar to view its contents</p>
        </div>
      )}
    </div>
  );
}

function SystemView({ analysis }) {
  const arch = analysis?.architecture || analysis?.results || {};
  const techStack = arch.techStack || []; const layers = arch.layers || [];
  const issues = [...(arch.securityIssues || []), ...(analysis?.results?.security?.hardcodedSecrets || []).map(item => ({ severity: 'high', title: 'Hardcoded secret', description: item.issue }))];
  const score = healthScore(analysis);
  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[{ label: 'Files', value: analysis?.total_files || 0 }, { label: 'Languages', value: Object.keys(analysis?.languages || {}).length }, { label: 'Health', value: `${score}%` }, { label: 'Issues', value: issues.length }].map((s, i) => (
            <div key={i} className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-lg">
              <div className="text-[11px] text-vb-ink3 uppercase tracking-wide mb-2">{s.label}</div>
              <div className="text-2xl font-semibold font-mono text-vb-accent">{s.value}</div>
            </div>
          ))}
        </div>
        {techStack.length > 0 && <div className="p-5 bg-white/[0.02] border border-white/[0.06] rounded-lg"><h3 className="text-[11px] text-vb-ink3 uppercase tracking-wider mb-3">Technology Stack</h3><div className="flex flex-wrap gap-2">{techStack.map((t, i) => <span key={i} className="px-3 py-1.5 bg-vb-accent/[0.04] border border-vb-accent/[0.1] rounded-md text-[13px] text-vb-ink2">{t}</span>)}</div></div>}
        {layers.length > 0 && <div className="p-5 bg-white/[0.02] border border-white/[0.06] rounded-lg"><h3 className="text-[11px] text-vb-ink3 uppercase tracking-wider mb-3">Architecture Layers</h3><div className="space-y-3">{layers.map((l, i) => <div key={i} className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-md"><div className="text-[13px] font-medium text-vb-ink mb-2">{l.name}</div><div className="flex flex-wrap gap-1.5">{(l.modules || []).map((m, j) => <span key={j} className="px-2 py-0.5 bg-white/[0.03] border border-white/[0.06] rounded text-[11px] text-vb-ink3 font-mono">{m}</span>)}</div></div>)}</div></div>}
        {issues.length > 0 && <div className="p-5 bg-white/[0.02] border border-white/[0.06] rounded-lg"><h3 className="text-[11px] text-vb-ink3 uppercase tracking-wider mb-3">Security Issues ({issues.length})</h3><div className="space-y-2">{issues.slice(0, 5).map((issue, i) => <div key={i} className="flex items-start gap-3 p-3 bg-white/[0.02] border border-white/[0.06] rounded-md"><span className={`text-[10px] font-medium uppercase px-2 py-0.5 rounded flex-shrink-0 ${issue.severity === 'high' ? 'bg-vb-red/10 text-vb-red' : 'bg-vb-amber/10 text-vb-amber'}`}>{issue.severity}</span><div><div className="text-[13px] text-vb-ink font-medium">{issue.title}</div><div className="text-[12px] text-vb-ink3 mt-0.5">{issue.description}</div></div></div>)}</div></div>}
      </div>
    </div>
  );
}

/* ── MAIN LAYOUT ── */
export default function DashboardLayout() {
  const [activeTab, setActiveTab] = useState('chat');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState('');
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const abortRef = useRef(null);
  const { toast, show: showToast, dismiss: dismissToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const analysisId = searchParams.get('id');
  const { data: session } = useSession();
  const suggestions = ['Explain Architecture', 'Map API Routes', 'Security Drilldown', 'Show Architecture Diagram'];

  useEffect(() => {
    (async () => {
      try {
        const url = analysisId ? `/api/analyze?id=${analysisId}` : '/api/analyze';
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to load analysis');
        const data = await res.json();
        setAnalysis(Array.isArray(data) ? data[0] : data);
      } catch (err) { setError(err.message); showToast(err.message, 'error'); }
      finally { setLoading(false); }
    })();
  }, [analysisId]);

  // Fetch chat history
  useEffect(() => {
    if (!analysisId) return;
    fetch(`/api/query?analysisId=${analysisId}`).then(r => r.json()).then(d => setChatHistory(d.history || [])).catch(() => {});
  }, [analysisId]);

  const handleSend = async (text) => {
    const q = (text || query).trim();
    if (!q || chatLoading || !analysis?.id) return;
    setMessages(prev => [...prev, { role: 'user', content: q }]);
    setQuery(''); setChatLoading(true);

    // Detect diagram requests
    const isDiagramRequest = /\b(diagram|visuali[sz]e|draw|graph|flow\s*chart|architecture\s*(diagram|visual|graph))\b/i.test(q);
    if (isDiagramRequest) {
      try {
        const res = await fetch('/api/diagram', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ analysisId: analysis.id, mode: q }) });
        const data = await res.json();
        if (res.ok && data.mermaid) {
          setMessages(prev => [...prev, { role: 'assistant', content: '__DIAGRAM__', _mermaid: data.mermaid }]);
        } else {
          setMessages(prev => [...prev, { role: 'system', content: data.error || 'Failed to generate diagram' }]);
        }
      } catch (err) { setMessages(prev => [...prev, { role: 'system', content: err.message }]); }
      setChatLoading(false);
      return;
    }

    // Stream response from AI
    abortRef.current = new AbortController();
    // Add a placeholder message that we'll update with streamed tokens
    const placeholderIdx = messages.length + 1; // +1 because we just added user msg
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch('/api/query/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, analysisId: analysis.id }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessages(prev => { const copy = [...prev]; copy[copy.length - 1] = { role: 'system', content: data.error || 'Error' }; return copy; });
        if (res.status === 429) showToast('Rate limit reached', 'error');
        setChatLoading(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.token) {
              accumulated += data.token;
              setMessages(prev => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: 'assistant', content: accumulated };
                return copy;
              });
            }
            if (data.error) {
              setMessages(prev => { const copy = [...prev]; copy[copy.length - 1] = { role: 'system', content: data.error }; return copy; });
            }
          } catch { /* skip */ }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        // User stopped — keep what we have so far
      } else {
        setMessages(prev => { const copy = [...prev]; copy[copy.length - 1] = { role: 'system', content: err.message }; return copy; });
        showToast('Network error', 'error');
      }
    }
    setChatLoading(false);
  };

  const handleStopGeneration = () => {
    abortRef.current?.abort();
    setChatLoading(false);
  };

  const handleDeleteHistory = async (item, idx) => {
    setChatHistory(prev => prev.filter((_, i) => i !== idx));
    // If the deleted chat is currently open, clear the view
    if (messages.length > 0 && messages[0]?.content === item.query) {
      setMessages([]);
    }
    try { await fetch('/api/query', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ analysisId: analysis?.id, query: item.query }) }); } catch { /* silent */ }
  };

  const handleRenameHistory = (item, idx, newName) => {
    setChatHistory(prev => prev.map((h, i) => i === idx ? { ...h, displayName: newName } : h));
  };

  const handleNavigateToFile = (ref) => {
    // If it looks like a file path, open it in the Explore tab
    const fileTree = analysis?.file_tree || [];
    const match = fileTree.find(f => f.type === 'blob' && (f.path === ref || f.path.endsWith(ref) || f.path.includes(ref)));
    if (match) {
      setSelectedFile(match.path);
      setActiveTab('explore');
    } else {
      // Try to find a file containing this symbol
      const files = analysis?.results?.files || [];
      const fileWithSymbol = files.find(f =>
        (f.functions || []).some(fn => fn.name === ref) ||
        (f.classes || []).some(c => c.name === ref) ||
        (f.exports || []).includes(ref)
      );
      if (fileWithSymbol) {
        setSelectedFile(fileWithSymbol.path);
        setActiveTab('explore');
      }
    }
  };

  const handleSelectHistory = (item) => {
    setMessages([{ role: 'user', content: item.query }, { role: 'assistant', content: item.response }]);
    // Mark as loaded (not new) so streaming doesn't trigger
    setHistoryLoaded(true);
  };
  const handleNewChat = () => { setMessages([]); setHistoryLoaded(false); };

  const score = analysis ? healthScore(analysis) : 0;

  if (loading) return <div className="min-h-screen bg-vb-bg flex items-center justify-center"><svg className="w-5 h-5 animate-spin text-vb-accent" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-20"/><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></div>;
  if (error) return <div className="min-h-screen bg-vb-bg flex items-center justify-center"><div className="text-center space-y-3"><p className="text-vb-red text-[14px]">{error}</p><a href="/" className="text-[13px] text-vb-ink3 underline hover:text-vb-ink transition-colors">← Go back</a></div></div>;

  return (
    <div className="flex h-screen overflow-hidden bg-vb-bg text-vb-ink">
      {/* Left sidebar — wider */}
      <aside className="w-[240px] min-w-[240px] bg-vb-bg1 border-r border-white/[0.06] flex-col hidden md:flex">
        <FileTreeSidebar analysis={analysis} selectedFile={selectedFile} onSelectFile={(p) => { setSelectedFile(p); setActiveTab('explore'); }} score={score} />
      </aside>

      {/* Center */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar — more vertical breathing room */}
        <div className="h-[64px] border-b border-white/[0.06] flex items-center px-6 flex-shrink-0 relative">
          <div className="flex items-center gap-2 text-[13px]">
            <span className="text-vb-ink2">{session?.user?.name || 'vibo'}</span>
            <span className="text-vb-ink4">›</span>
            <span className="text-vb-ink font-medium">{analysis?.repo_name || '...'}</span>
          </div>

          {/* Center tabs */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1.5">
            {[
              { id: 'chat', Icon: MessageSquare, label: 'Chat' },
              { id: 'explore', Icon: Grid3X3, label: 'Explore' },
              { id: 'system', Icon: Terminal, label: 'System' },
            ].map(({ id, Icon, label }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`group/tab relative flex items-center gap-2 px-5 py-2 rounded-lg text-[13px] font-medium transition-colors duration-150 overflow-hidden ${
                  activeTab === id ? 'bg-white/[0.08] text-vb-ink' : 'text-vb-ink3 hover:text-vb-ink2'
                }`}>
                {activeTab !== id && <span className="absolute bottom-0 left-1/2 h-[1px] w-0 bg-vb-accent/40 transition-all duration-300 ease-out group-hover/tab:w-3/4 group-hover/tab:left-[12.5%] rounded-full" />}
                <Icon size={14} className={activeTab === id ? 'text-vb-ink' : 'text-vb-ink4'} />
                {label}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-vb-green/10 text-vb-green border border-vb-green/15">
              <span className="w-1.5 h-1.5 rounded-full bg-vb-green animate-pulse-dot" />
              Analysis Complete
            </span>
            <button onClick={() => router.push('/')} className="px-3 py-1.5 rounded-md text-[12px] text-vb-ink2 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] hover:text-vb-ink transition-colors duration-150">New Repo</button>
          </div>
        </div>

        {activeTab === 'chat' && <ChatView analysis={analysis} messages={messages} loading={chatLoading} query={query} setQuery={setQuery} handleSend={handleSend} suggestions={suggestions} chatHistory={chatHistory} onSelectHistory={handleSelectHistory} onNewChat={handleNewChat} onDeleteHistory={handleDeleteHistory} onStopGeneration={handleStopGeneration} onRenameHistory={handleRenameHistory} historyLoaded={historyLoaded} setHistoryLoaded={setHistoryLoaded} onNavigateToFile={handleNavigateToFile} />}
        {activeTab === 'explore' && <ExploreView analysis={analysis} selectedFile={selectedFile} onContinueInChat={(userQuery, hiddenContext) => { setMessages(prev => [...prev, { role: 'user', content: userQuery }]); setActiveTab('chat'); handleSend(hiddenContext ? `${userQuery}\n\n${hiddenContext}` : userQuery); }} />}
        {activeTab === 'system' && <SystemView analysis={analysis} />}
      </main>

      {/* Right sidebar */}
      <aside className="w-[240px] min-w-[240px] bg-vb-bg1 border-l border-white/[0.06] hidden lg:flex flex-col">
        <RightPanel analysis={analysis} />
      </aside>

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={dismissToast} />}
    </div>
  );
}
