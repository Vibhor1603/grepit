"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useAnalysis, useChatHistory, useDeleteChatHistory, useFileContent } from '../hooks/useApi';
import { useQueryClient } from '@tanstack/react-query';
import { useResizable, useResizableRight } from '../hooks/useResizable';
import { LOADING_MESSAGES, getRandomMessage, getRateLimitMessage, ERROR_MESSAGES, EMPTY_STATES } from '../lib/personality';
import { MessageSquare, LayoutGrid, Terminal, FileText, Folder, ChevronRight, Code2, Shield, Server, Cpu, Layers, Send, Plus, Clock, X, Square, Copy, Check, Trash2, Search, ZoomIn, ZoomOut, Maximize2, Minimize2, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react';
import dynamic from 'next/dynamic';
import ChatInputComponent from './ChatInput';
import SystemTabComponent from './SystemTab';
import SymbolInspector from './SymbolInspector';
import { Highlight, themes } from 'prism-react-renderer';

const viboCodeTheme = {
  ...themes.vsDark,
  plain: { color: '#b0b0b8', backgroundColor: 'transparent' },
  styles: [
    { types: ['keyword', 'builtin'], style: { color: '#E0FC10' } },
    { types: ['function', 'method'], style: { color: '#7ca8e8' } },
    { types: ['string', 'char'], style: { color: '#7dd3a8' } },
    { types: ['number', 'boolean'], style: { color: '#e4c06c' } },
    { types: ['comment'], style: { color: '#4a4a54', fontStyle: 'italic' } },
    { types: ['class-name', 'type'], style: { color: '#b4a0d4' } },
    { types: ['operator', 'punctuation'], style: { color: '#787884' } },
    { types: ['variable', 'constant'], style: { color: '#eaeaec' } },
    { types: ['property'], style: { color: '#7cc8d4' } },
    { types: ['tag'], style: { color: '#e87c7c' } },
    { types: ['attr-name'], style: { color: '#e4c06c' } },
    { types: ['attr-value'], style: { color: '#7dd3a8' } },
  ],
};

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
      // Match backtick-wrapped content
      const cm = rem.match(/^`([^`]+)`/);
      if (cm) {
        const ref = cm[1].replace(/^['''"]+|['''"]+$/g, '').trim();
        if (isFilePath(ref) || isCodeSymbol(ref)) {
          result.push(
            <button key={k++} onClick={() => onNavigateToFile?.(ref)} className="inline px-1 py-0.5 text-vb-accent text-[12px] font-mono underline underline-offset-2 decoration-vb-accent/40 hover:decoration-vb-accent cursor-pointer transition-colors">
              {ref}
            </button>
          );
        } else {
          result.push(<code key={k++} className="px-1.5 py-0.5 bg-white/[0.04] rounded text-[12px] font-mono text-vb-ink">{cm[1]}</code>);
        }
        rem = rem.slice(cm[0].length); continue;
      }
      // Match any quote-wrapped file path (single, smart, or double quotes)
      const sq = rem.match(/^[''"\u2018\u2019\u201C\u201D]([^\s''"\u2018\u2019\u201C\u201D]+\.\w{1,4})[''"\u2018\u2019\u201C\u201D]/);
      if (sq && isFilePath(sq[1])) {
        result.push(
          <button key={k++} onClick={() => onNavigateToFile?.(sq[1])} className="inline px-1 py-0.5 text-vb-accent text-[12px] font-mono underline underline-offset-2 decoration-vb-accent/40 hover:decoration-vb-accent cursor-pointer transition-colors">
            {sq[1]}
          </button>
        );
        rem = rem.slice(sq[0].length); continue;
      }
      const bm = rem.match(/^\*\*(.+?)\*\*/);
      if (bm) { result.push(<strong key={k++} className="font-semibold text-vb-ink">{bm[1]}</strong>); rem = rem.slice(bm[0].length); continue; }
      const im = rem.match(/^\*(.+?)\*/);
      if (im) { result.push(<em key={k++} className="italic text-vb-ink">{im[1]}</em>); rem = rem.slice(im[0].length); continue; }
      // Find next special character
      const nx = rem.search(/[`*''\u2018\u2019\u201C\u201D"]/);
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
        <div key={key} className="mb-4 min-w-[60%] max-w-full rounded-xl border border-white/[0.08] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.2)]">
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/[0.06] bg-white/[0.03]">
            <div className="flex items-center gap-[5px]">
              <span className="w-[8px] h-[8px] rounded-full bg-[#ff5f57]" />
              <span className="w-[8px] h-[8px] rounded-full bg-[#febc2e]" />
              <span className="w-[8px] h-[8px] rounded-full bg-[#28c840]" />
            </div>
            {codeLang && <span className="text-[10px] text-vb-ink4 font-mono ml-2">{codeLang}</span>}
          </div>
          <Highlight theme={viboCodeTheme} code={codeLines.join('\n')} language={codeLang || 'javascript'}>
            {({ tokens: codeTokens, getLineProps: glp, getTokenProps: gtp }) => (
              <pre className="px-4 py-3 overflow-x-auto bg-[#0a0a0c] m-0 text-[12px]">
                {codeTokens.map((line, li) => (
                  <div key={li} {...glp({ line })} className="leading-[1.6]">
                    {line.map((token, ti) => <span key={ti} {...gtp({ token })} />)}
                  </div>
                ))}
              </pre>
            )}
          </Highlight>
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
    if (/^#{1,6}\s*$/.test(line.trim())) return; // Skip empty headings (lone # or ##)
    if (/^#{3}\s*(.+)/.test(line)) { elements.push(<h3 key={i} className="text-[14px] font-semibold text-vb-ink mt-4 mb-2">{renderInline(line.replace(/^#{3}\s*/, '').replace(/\*\*/g, ''))}</h3>); return; }
    if (/^#{2}\s*(.+)/.test(line)) { elements.push(<h2 key={i} className="text-[15px] font-semibold text-vb-ink mt-4 mb-2">{renderInline(line.replace(/^#{2}\s*/, '').replace(/\*\*/g, ''))}</h2>); return; }
    if (/^#{1}\s*(.+)/.test(line)) { elements.push(<h1 key={i} className="text-[16px] font-semibold text-vb-ink mt-4 mb-2">{renderInline(line.replace(/^#{1}\s*/, '').replace(/\*\*/g, ''))}</h1>); return; }
    elements.push(<p key={i} className="text-[13px] text-vb-ink2 leading-[1.7] mb-2">{renderInline(line)}</p>);
  });
  flushList('end'); flushTable('te');
  // Only flush code block if it was properly closed (codeBlock === false)
  // This prevents rendering incomplete/partial code blocks during streaming
  if (!codeBlock) flushCode('ce');
  else if (codeLines.length > 0) {
    // Show streaming code as a placeholder while incomplete
    elements.push(
      <div key="streaming-code" className="mb-4 min-w-[60%] max-w-full rounded-xl border border-white/[0.08] overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/[0.06] bg-white/[0.03]">
          <div className="flex items-center gap-[5px]">
            <span className="w-[8px] h-[8px] rounded-full bg-[#ff5f57]" />
            <span className="w-[8px] h-[8px] rounded-full bg-[#febc2e]" />
            <span className="w-[8px] h-[8px] rounded-full bg-[#28c840]" />
          </div>
          {codeLang && <span className="text-[10px] text-vb-ink4 font-mono ml-2">{codeLang}</span>}
          <span className="text-[10px] text-vb-ink4 ml-auto">streaming...</span>
        </div>
        <pre className="px-4 py-3 overflow-x-auto bg-[#0a0a0c] m-0 text-[12px] text-vb-ink2 font-mono whitespace-pre">{codeLines.join('\n')}</pre>
      </div>
    );
  }
  return <div>{elements}</div>;
}

/* ── File Tree Sidebar ── */
function FileTreeSidebar({ analysis, selectedFile, onSelectFile, score, onCollapse }) {
  const [expanded, setExpanded] = useState({});
  const [fileSearch, setFileSearch] = useState('');
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

  // Auto-expand first two levels on mount (only once)
  const hasAutoExpanded = useRef(false);
  useEffect(() => {
    if (hasAutoExpanded.current || Object.keys(tree).length === 0) return;
    hasAutoExpanded.current = true;
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
        <button onClick={onCollapse} className="ml-auto p-1 rounded-md text-vb-ink4 hover:text-vb-ink3 hover:bg-white/[0.04] transition-colors" title="Collapse">
          <PanelLeftClose size={13} />
        </button>
      </div>
      {/* File search */}
      <div className="px-2 py-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-2 px-2 py-1.5 bg-white/[0.03] border border-white/[0.06] rounded-md">
          <Search size={12} className="text-vb-ink4 flex-shrink-0" />
          <input
            value={fileSearch}
            onChange={(e) => setFileSearch(e.target.value)}
            placeholder="Search files..."
            className="flex-1 bg-transparent text-[11px] text-vb-ink placeholder:text-vb-ink4 outline-none caret-vb-accent"
          />
          {fileSearch && <button onClick={() => setFileSearch('')} className="text-vb-ink4 hover:text-vb-ink3"><X size={10} /></button>}
        </div>
      </div>
      {/* File search results */}
      {fileSearch.trim() ? (
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
          {fileTree.filter(f => f.type === 'blob' && f.path.toLowerCase().includes(fileSearch.toLowerCase())).slice(0, 30).map(f => (
            <button key={f.path} onClick={() => { onSelectFile(f.path); setFileSearch(''); }}
              className={`w-full flex items-center gap-2 px-2 py-[5px] rounded-md text-[11px] transition-colors duration-150 ${selectedFile === f.path ? 'bg-vb-accent/10 text-vb-accent' : 'text-vb-ink2 hover:text-vb-ink hover:bg-white/[0.04]'}`}>
              <FileText size={11} className="flex-shrink-0 opacity-50" />
              <span className="truncate">{f.path}</span>
            </button>
          ))}
          {fileTree.filter(f => f.type === 'blob' && f.path.toLowerCase().includes(fileSearch.toLowerCase())).length === 0 && (
            <p className="text-[11px] text-vb-ink4 px-2 py-3 text-center">No files found</p>
          )}
        </div>
      ) : (
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {renderNode(tree)}
      </div>
      )}
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
function RightPanel({ analysis, selectedFile, activeTab }) {
  const fileIntel = useMemo(() => {
    if (!selectedFile || !analysis?.results?.files) return null;
    return analysis.results.files.find(f => f.path === selectedFile) || null;
  }, [selectedFile, analysis]);

  const fileName = selectedFile ? selectedFile.split('/').pop() : '';
  const showSymbols = selectedFile && fileIntel;

  const profile = getIdentityProfile(analysis);
  const highTraffic = getHighTrafficFiles(analysis);
  const displayFiles = highTraffic || ['Dashboard.tsx', 'useAnalysis.ts', 'App.tsx'];

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      {showSymbols ? (
        <>
          {/* File header — minimal, just context */}
          <div className="px-3 py-2.5 border-b border-white/[0.06] flex items-center gap-2 min-w-0">
            <span className="text-[12px] font-mono text-vb-ink font-medium truncate">{fileName}</span>
            <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
              {fileIntel.language && (
                <span className="px-1.5 py-[1px] rounded bg-white/[0.04] text-[9px] font-mono text-vb-ink4 uppercase">{fileIntel.language}</span>
              )}
              {fileIntel.lineCount > 0 && (
                <span className="text-[9px] text-vb-ink4 font-mono">{fileIntel.lineCount}L</span>
              )}
            </div>
          </div>
          {/* Symbol inspector */}
          <div className="flex-1 overflow-y-auto">
            <SymbolInspector fileIntel={fileIntel} fileName={fileName} />
          </div>
        </>
      ) : (
        <>
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
              </div>
            ))}</div>
          </div>
          <div className="px-4 py-5 mt-auto">
            <div className="p-4 rounded-lg bg-vb-accent/[0.04] border border-vb-accent/[0.1]">
              <div className="flex items-center gap-2 mb-1.5"><Shield size={14} className="text-vb-accent" /><span className="text-[13px] font-semibold text-vb-accent">Pro Guard</span></div>
              <p className="text-[12px] text-vb-ink3 leading-relaxed">Continuous analysis is active. Your codebase is safe.</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Confirmation Modal ── */
function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-vb-bg/80 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-vb-bg2 border border-white/[0.08] rounded-lg p-5 max-w-sm w-full mx-4 shadow-[0_16px_48px_rgba(0,0,0,0.5)]" onClick={(e) => e.stopPropagation()}>
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
function ChatHistorySidebar({ history, onSelect, onNewChat, onDelete, onRename, onCollapse, activeChatId }) {
  const [confirmItem, setConfirmItem] = useState(null);
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
    <div className="w-[200px] min-w-[200px] border-r border-white/[0.06] flex flex-col h-full bg-vb-bg1 hidden md:flex">
      <div className="px-3 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <span className="text-[12px] font-medium text-vb-ink2">Chat History</span>
        <div className="flex items-center gap-1">
          <button onClick={onNewChat} className="p-1 rounded-md hover:bg-white/[0.04] text-vb-ink3 hover:text-vb-ink transition-colors" title="New chat">
            <Plus size={14} />
          </button>
          <button onClick={onCollapse} className="p-1 rounded-md hover:bg-white/[0.04] text-vb-ink4 hover:text-vb-ink3 transition-colors" title="Collapse">
            <PanelLeftClose size={13} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {history.length === 0 ? (
          <p className="text-[11px] text-vb-ink4 px-2 py-6 text-center leading-relaxed">{EMPTY_STATES.noHistory}</p>
        ) : history.map((item, i) => (
          <div key={i} className={`group flex items-center gap-0.5 rounded-md transition-colors ${item.id === activeChatId ? 'bg-vb-accent/[0.06] border border-vb-accent/15' : 'hover:bg-white/[0.03]'}`}>
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
                className={`flex-1 text-left px-3 py-2 text-[12px] transition-colors truncate flex items-center gap-2 min-w-0 ${item.id === activeChatId ? 'text-vb-ink' : 'text-vb-ink2 hover:text-vb-ink'}`}>
                <Clock size={11} className={`flex-shrink-0 ${item.id === activeChatId ? 'text-vb-accent' : 'text-vb-ink4'}`} />
                <span className="truncate">{item.displayName || item.query}</span>
              </button>
            )}
            <button onClick={() => setConfirmItem(item)} className="opacity-0 group-hover:opacity-100 p-1 mr-1 text-vb-ink4 hover:text-vb-red transition-all" title="Delete">
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>

      {confirmItem && (
        <ConfirmModal
          message="This chat will be permanently deleted. You won't be able to recover it."
          onConfirm={() => { onDelete(confirmItem); setConfirmItem(null); }}
          onCancel={() => setConfirmItem(null)}
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
            primaryColor: '#1e1e24',
            primaryTextColor: '#eaeaec',
            primaryBorderColor: '#E0FC10',
            lineColor: '#5c5c66',
            secondaryColor: '#16161a',
            tertiaryColor: '#1c1c20',
            background: '#0a0a0c',
            mainBkg: '#1e1e24',
            nodeBorder: '#E0FC10',
            nodeTextColor: '#eaeaec',
            clusterBkg: '#111113',
            clusterBorder: '#3a3a42',
            titleColor: '#eaeaec',
            edgeLabelBackground: '#16161a',
            labelTextColor: '#eaeaec',
            textColor: '#eaeaec',
            actorTextColor: '#eaeaec',
            signalTextColor: '#eaeaec',
            labelColor: '#eaeaec',
            loopTextColor: '#eaeaec',
            noteBkgColor: '#1e1e24',
            noteTextColor: '#eaeaec',
            activationBorderColor: '#E0FC10',
            sequenceNumberColor: '#0a0a0c',
            sectionBkgColor: '#1e1e24',
            altSectionBkgColor: '#16161a',
            sectionBkgColor2: '#111113',
            taskTextColor: '#eaeaec',
            taskTextDarkColor: '#eaeaec',
            taskBorderColor: '#E0FC10',
            taskBkgColor: '#1e1e24',
            activeTaskBorderColor: '#E0FC10',
            activeTaskBkgColor: '#2a2a30',
            gridColor: '#3a3a42',
            doneTaskBkgColor: '#1a2e1a',
            doneTaskBorderColor: '#28c840',
            critBorderColor: '#ef4444',
            critBkgColor: '#2e1a1a',
            todayLineColor: '#E0FC10',
            fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: '14px',
          },
          flowchart: {
            htmlLabels: false,
            curve: 'basis',
            nodeSpacing: 30,
            rankSpacing: 50,
            padding: 15,
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
          // Fix node labels: ["text"] — remove dots, slashes, special chars from inside brackets
          .replace(/\["([^"]*?)"\]/g, (_, label) => {
            const clean = label.replace(/[./\\<>(){}]/g, ' ').replace(/\s+/g, ' ').trim();
            return `["${clean}"]`;
          })
          // Fix edge labels: -->|"text"| — remove slashes and special chars
          .replace(/\|"([^"]*?)"\|/g, (_, label) => {
            const clean = label.replace(/[/\\<>(){}]/g, ' ').replace(/\s+/g, ' ').trim();
            return `|"${clean}"|`;
          })
          // Fix unquoted edge labels: -->|text| — wrap in quotes if they contain special chars
          .replace(/-->\|([^"|][^|]*)\|/g, (match, label) => {
            if (/[/\\.<>(){}]/.test(label)) {
              const clean = label.replace(/[/\\<>(){}]/g, ' ').replace(/\s+/g, ' ').trim();
              return `-->|"${clean}"|`;
            }
            return match;
          })
          // Fix parenthesized labels with special chars
          .replace(/\([^)]*\/[^)]*\)/g, (m) => '[' + m.slice(1, -1).replace(/[\/\\<>]/g, ' ') + ']');

        const { svg: rendered } = await mermaid.render(id, sanitized, tempDiv);

        // Clean up temp container
        tempDiv.remove();

        if (!cancelled && rendered) {
          // Mermaid output is generated client-side (not user input) so XSS risk is minimal.
          // We inject a style block to ensure text visibility on dark backgrounds.
          let fixedSvg = rendered.replace(/<svg([^>]*)>/, `<svg$1><style>
            text, tspan { fill: #eaeaec !important; }
            .nodeLabel, .edgeLabel, .label, .labelText { color: #eaeaec !important; fill: #eaeaec !important; }
            foreignObject div, foreignObject span, foreignObject p { color: #eaeaec !important; }
            .node rect, .node polygon, .node circle { fill: #1e1e24 !important; stroke: #E0FC10 !important; }
            .edgePath path, .flowchart-link { stroke: #5c5c66 !important; }
            .edgeLabel rect { fill: #16161a !important; }
          </style>`);
          setSvg(fixedSvg);
        }
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
    <div ref={containerRef} className="vb-diagram [&_svg]:max-w-full [&_svg]:h-auto [&_svg]:mx-auto" dangerouslySetInnerHTML={{ __html: svg }} />
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-[250] bg-vb-bg/95 backdrop-blur-sm flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <span className="text-[13px] text-vb-ink2">Diagram View</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setFullscreen(false)} className="p-1.5 rounded-md text-vb-ink2 hover:text-vb-ink hover:bg-white/[0.06] transition-colors" title="Exit fullscreen">
              <Minimize2 size={15} />
            </button>
            <button onClick={() => setFullscreen(false)} className="group/close w-[14px] h-[14px] rounded-full bg-[#ff5f57] hover:bg-[#ff3b30] transition-colors flex items-center justify-center" title="Close"><X size={8} className="text-[#4a0000] opacity-0 group-hover/close:opacity-100 transition-opacity" /></button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-8 flex items-center justify-center">
          {diagramContent}
        </div>
      </div>
    );
  }

  return (
    <div className="my-3 rounded-lg border border-vb-accent/15 bg-[#0e0e10] overflow-hidden">
      <div className="flex items-center justify-end px-3 py-2 border-b border-white/[0.04] gap-2">
        <button onClick={() => setFullscreen(true)} className="p-1.5 rounded-md text-vb-ink2 hover:text-vb-ink hover:bg-white/[0.06] transition-colors" title="Fullscreen">
          <Maximize2 size={14} />
        </button>
      </div>
      <div className="p-4 overflow-x-auto">
        {diagramContent}
      </div>
    </div>
  );
}

/* ── Chat View ── */
function ChatView({ analysis, messages, loading, query, setQuery, handleSend, suggestions, chatHistory, onSelectHistory, onNewChat, onDeleteHistory, onStopGeneration, onRenameHistory, historyLoaded, setHistoryLoaded, onNavigateToFile, activeChatId }) {
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

  const [historyCollapsed, setHistoryCollapsed] = useState(false);

  return (
    <div className="flex-1 flex min-h-0">
      {!historyCollapsed && (
        <ChatHistorySidebar history={chatHistory} onSelect={onSelectHistory} onNewChat={onNewChat} onDelete={onDeleteHistory} onRename={onRenameHistory} onCollapse={() => setHistoryCollapsed(true)} activeChatId={activeChatId} />
      )}

      <div className="flex-1 flex flex-col min-h-0 bg-vb-chat relative">
        {historyCollapsed && (
          <button onClick={() => setHistoryCollapsed(false)} className="absolute top-2 left-2 z-10 p-1.5 rounded-md text-vb-ink3 hover:text-vb-ink2 hover:bg-white/[0.04] transition-colors" title="Show chat history">
            <PanelLeftOpen size={14} />
          </button>
        )}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center">
              <p className="text-[14px] text-vb-ink3 mb-6">What's confusing you today?</p>
              <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-lg">
                {suggestions.map((s, i) => (
                  <button key={i} onClick={() => handleSend(s)}
                    className="group/chip relative inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/[0.08] bg-white/[0.02] text-[13px] text-vb-ink2 transition-all duration-200 ease-out overflow-hidden hover:bg-white/[0.05] hover:border-white/[0.14] hover:text-vb-ink">
                    <span className="absolute bottom-0 left-1/2 h-[1px] w-0 bg-vb-accent/40 transition-all duration-300 ease-out group-hover/chip:w-3/4 group-hover/chip:left-[12.5%] rounded-full" />
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
                          {msg._files?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-1.5 justify-end">
                              {msg._files.map(f => (
                                <span key={f} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-vb-accent/[0.08] border border-vb-accent/20 text-vb-accent">
                                  <FileText size={9} />{f.split('/').pop()}
                                </span>
                              ))}
                            </div>
                          )}
                          {msg._context && (
                            <div className="flex justify-end mb-1.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-vb-accent/[0.06] border border-vb-accent/15 text-vb-accent">
                                <Shield size={9} />Context attached
                              </span>
                            </div>
                          )}
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
                            className="text-[12px] text-vb-accent-dim px-3 py-1.5 rounded-md border border-vb-accent/10 bg-vb-accent/[0.02] hover:bg-vb-accent/[0.06] hover:border-vb-accent/20 hover:text-vb-accent transition-colors duration-150 cursor-pointer">
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

        {/* Chat bar with @ mention support */}
        <ChatInputComponent query={query} setQuery={setQuery} onSend={handleSend} loading={loading} onStop={onStopGeneration} fileTree={analysis?.file_tree || []} />
      </div>
    </div>
  );
}

/* ── Explore & System Views ── */
function ExploreView({ analysis, selectedFile, onContinueInChat }) {
  const [fontSize, setFontSize] = useState(12);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // React Query cached file fetch
  const { data: code = '', isLoading: loadingCode } = useFileContent(analysis?.id, selectedFile);

  const pathParts = selectedFile ? selectedFile.split('/') : [];

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {selectedFile ? (<>
        {/* Breadcrumb + toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06] flex-shrink-0">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 overflow-x-auto min-w-0">
            <Code2 size={13} className="text-vb-accent-dim flex-shrink-0" />
            {pathParts.map((part, i) => (
              <span key={i} className="flex items-center gap-1 flex-shrink-0">
                {i > 0 && <span className="text-vb-ink4 text-[10px]">/</span>}
                <span className={`text-[12px] ${i === pathParts.length - 1 ? 'text-vb-ink font-medium' : 'text-vb-ink3'}`}>{part}</span>
              </span>
            ))}
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-1 flex-shrink-0 ml-3">
            {/* Search toggle */}
            <button onClick={() => setSearchOpen(!searchOpen)} className={`p-1.5 rounded-md transition-colors ${searchOpen ? 'bg-vb-accent/10 text-vb-accent' : 'text-vb-ink2 hover:text-vb-ink hover:bg-white/[0.06]'}`} title="Search (⌘F)">
              <Search size={15} />
            </button>
            {/* Zoom out */}
            <button onClick={() => setFontSize(s => Math.max(9, s - 1))} className="p-1.5 rounded-md text-vb-ink2 hover:text-vb-ink hover:bg-white/[0.06] transition-colors" title="Decrease font size">
              <ZoomOut size={15} />
            </button>
            <span className="text-[11px] text-vb-ink2 min-w-[22px] text-center font-mono">{fontSize}</span>
            {/* Zoom in */}
            <button onClick={() => setFontSize(s => Math.min(18, s + 1))} className="p-1.5 rounded-md text-vb-ink2 hover:text-vb-ink hover:bg-white/[0.06] transition-colors" title="Increase font size">
              <ZoomIn size={15} />
            </button>
          </div>
        </div>

        {/* Search bar */}
        {searchOpen && (
          <div className="flex items-center gap-2 px-4 py-2 border-b border-white/[0.06] bg-white/[0.01]">
            <Search size={12} className="text-vb-ink4 flex-shrink-0" />
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery(''); } }}
              placeholder="Search in file..."
              className="flex-1 bg-transparent text-[12px] text-vb-ink placeholder:text-vb-ink4 outline-none caret-vb-accent"
            />
            {searchQuery && <span className="text-[10px] text-vb-ink4">{(code.match(new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length} matches</span>}
            <button onClick={() => { setSearchOpen(false); setSearchQuery(''); }} className="group/close w-[12px] h-[12px] rounded-full bg-[#ff5f57] hover:bg-[#ff3b30] transition-colors flex items-center justify-center flex-shrink-0" title="Close"><X size={7} className="text-[#4a0000] opacity-0 group-hover/close:opacity-100 transition-opacity" /></button>
          </div>
        )}

        {/* Code viewer */}
        <div className="flex-1 min-h-0 bg-vb-chat">
          {loadingCode ? (
            <div className="flex items-center justify-center h-40">
              <svg className="w-5 h-5 animate-spin text-vb-accent" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-20"/><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </div>
          ) : (
            <CodeViewerLazy code={code} filePath={selectedFile} analysisId={analysis?.id} onContinueInChat={onContinueInChat} fontSize={fontSize} searchQuery={searchQuery} />
          )}
        </div>
      </>) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[14px] text-vb-ink3">Select a file from the sidebar to explore</p>
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
  const [selectedFile, setSelectedFile] = useState('');
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [activeChatId, setActiveChatId] = useState(null);
  const leftPanel = useResizable({ defaultWidth: 240, minWidth: 180, maxWidth: 400, storageKey: 'vibo-left-panel' });
  const rightPanel = useResizableRight({ defaultWidth: 240, minWidth: 180, maxWidth: 360, storageKey: 'vibo-right-panel' });
  const abortRef = useRef(null);
  const { toast, show: showToast, dismiss: dismissToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const analysisId = searchParams.get('id');
  const { data: session } = useSession();
  // React Query hooks
  const { data: analysis, isLoading: loading, error: analysisError } = useAnalysis(analysisId);
  const { data: chatHistory = [] } = useChatHistory(analysisId);
  const deleteChatMutation = useDeleteChatHistory();
  const queryClient = useQueryClient();
  const error = analysisError?.message || '';

  // Dynamic suggestions based on the analyzed codebase
  const suggestions = useMemo(() => {
    if (!analysis) return ['Where do I start?', 'Explain Architecture', 'Map API Routes', 'Show Architecture Diagram'];
    const arch = analysis.architecture || analysis.results || {};
    const techStack = (arch.techStack || []).slice(0, 2).join(' & ');
    const hasApi = (arch.apiEndpoints || []).length > 0;
    const hasAuth = (analysis.file_tree || []).some(f => /auth|login|session/i.test(f.path));
    const hasDb = (analysis.file_tree || []).some(f => /database|schema|model|migration/i.test(f.path));
    const items = [];
    items.push('Where do I start?');
    items.push(`How is ${analysis.repo_name} structured?`);
    if (hasApi) items.push('Walk me through the API routes');
    if (hasAuth) items.push('Explain the auth flow');
    if (hasDb) items.push('How does the database layer work?');
    if (techStack) items.push(`Why was ${techStack} chosen?`);
    if (items.length < 5) items.push('Find potential security issues');
    return items.slice(0, 4);
  }, [analysis]);

  const handleSend = async (text, attachedFiles = [], hiddenContext = '') => {
    const q = (text || query).trim();
    if (!q || chatLoading || !analysis?.id) return;

    // Build display message (what user sees — no hidden context, but show badge)
    const displayMsg = attachedFiles.length > 0
      ? { role: 'user', content: q, _files: attachedFiles }
      : hiddenContext
        ? { role: 'user', content: q, _context: true }
        : { role: 'user', content: q };
    setMessages(prev => [...prev, displayMsg]);

    // Build actual query with file context + hidden context for the AI
    let actualQuery = q;
    if (attachedFiles.length > 0) {
      actualQuery = q; // files handled by backend
    }
    if (hiddenContext) {
      actualQuery = `${q}\n\n${hiddenContext}`;
    }
    let forcedFiles = attachedFiles;
    setQuery(''); setChatLoading(true);

    // Detect diagram requests
    const isDiagramRequest = /\b(diagram|visuali[sz]e|draw|graph|flow\s*chart|architecture\s*(diagram|visual|graph))\b/i.test(q);
    if (isDiagramRequest) {
      try {
        const res = await fetch('/api/diagram', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ analysisId: analysis.id, mode: actualQuery }) });
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
        body: JSON.stringify({ query: actualQuery, analysisId: analysis.id, files: forcedFiles }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessages(prev => { const copy = [...prev]; copy[copy.length - 1] = { role: 'system', content: data.error || 'Error' }; return copy; });
        if (res.status === 429) showToast(getRateLimitMessage(30), 'error');
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
    // Refresh chat history cache so new chat appears in sidebar
    setTimeout(() => queryClient.invalidateQueries({ queryKey: ['chatHistory', analysisId] }), 500);
  };

  const handleStopGeneration = () => {
    abortRef.current?.abort();
    setChatLoading(false);
  };

  const handleDeleteHistory = async (item, idx) => {
    if (!item) return;
    if (messages.length > 0 && messages[0]?.content === item.query) {
      setMessages([]);
    }
    deleteChatMutation.mutate({ analysisId: analysis?.id, query: item.query });
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
    setActiveChatId(item.id || null);
    setHistoryLoaded(true);
  };
  const handleNewChat = () => { setMessages([]); setQuery(''); setChatLoading(false); setHistoryLoaded(false); setActiveChatId(null); };

  const score = analysis ? healthScore(analysis) : 0;

  if (loading) {
    return <div className="min-h-screen bg-vb-bg flex flex-col items-center justify-center gap-3"><svg className="w-5 h-5 animate-spin text-vb-accent" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-20"/><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg><p className="text-[13px] text-vb-ink3">{LOADING_MESSAGES[Math.floor(Date.now() / 3000) % LOADING_MESSAGES.length]}</p></div>;
  }
  if (error) return <div className="min-h-screen bg-vb-bg flex items-center justify-center"><div className="text-center space-y-3"><p className="text-vb-red text-[14px]">{getRandomMessage(ERROR_MESSAGES)}</p><p className="text-[12px] text-vb-ink4 font-mono">{error}</p><a href="/" className="inline-block mt-2 text-[13px] text-vb-ink3 underline hover:text-vb-ink transition-colors">← Go back</a></div></div>;

  return (
    <div className="flex h-screen overflow-hidden bg-vb-bg text-vb-ink">
      {/* Left sidebar — hidden on small screens */}
      {!leftPanel.collapsed && (
        <>
          <aside style={{ width: `${leftPanel.width}px` }} className="flex-shrink-0 bg-vb-bg1 flex-col overflow-hidden hidden md:flex">
            <FileTreeSidebar analysis={analysis} selectedFile={selectedFile} onSelectFile={(p) => { setSelectedFile(p); setActiveTab('explore'); }} score={score} onCollapse={() => leftPanel.setCollapsed(true)} />
          </aside>
          <div onMouseDown={leftPanel.onMouseDown} className="w-[3px] flex-shrink-0 cursor-col-resize bg-white/[0.04] hover:bg-vb-accent/30 active:bg-vb-accent/50 transition-colors hidden md:block" />
        </>
      )}

      {/* Center */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <div className="h-[64px] border-b border-white/[0.06] flex items-center px-4 flex-shrink-0">
          <div className="flex items-center gap-2 text-[13px]">
            {leftPanel.collapsed && (
              <button onClick={() => leftPanel.setCollapsed(false)} className="p-1 rounded-md text-vb-ink3 hover:text-vb-ink2 hover:bg-white/[0.04] transition-colors mr-1" title="Show file explorer">
                <PanelLeftOpen size={15} />
              </button>
            )}
            <span className="text-vb-ink2">{session?.user?.name || 'vibo'}</span>
            <span className="text-vb-ink4">›</span>
            <span className="text-vb-ink font-medium">{analysis?.repo_name || '...'}</span>
          </div>

          {/* Tabs — use flex-1 + justify-center so they center within the available space */}
          <div className="flex-1 flex justify-center">
            <div className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-1 py-1">
              {[
                { id: 'explore', Icon: LayoutGrid, label: 'Explore' },
                { id: 'chat', Icon: MessageSquare, label: 'Chat' },
                { id: 'system', Icon: Terminal, label: 'System' },
              ].map(({ id, Icon, label }) => (
                <button key={id} onClick={() => setActiveTab(id)}
                  className={`group/tab relative flex items-center gap-2 px-4 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-200 overflow-hidden ${
                    activeTab === id ? 'bg-vb-accent/[0.05] text-vb-ink' : 'text-vb-ink3 hover:text-vb-ink2'
                  }`}>
                  {activeTab !== id && <span className="absolute bottom-0 left-1/2 h-[1px] w-0 bg-vb-accent/40 transition-all duration-300 ease-out group-hover/tab:w-3/4 group-hover/tab:left-[12.5%] rounded-full" />}
                  <Icon size={15} className={activeTab === id ? 'text-vb-accent-dim' : 'text-vb-ink4'} strokeWidth={activeTab === id ? 2.2 : 1.8} />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] text-vb-accent border border-vb-accent/20 bg-vb-accent/[0.04] hover:bg-vb-accent/[0.08] transition-colors duration-150" title="Analyze a new repository">
              <Plus size={13} />
              <span className="hidden sm:inline">New</span>
            </button>
            {rightPanel.collapsed && (
              <button onClick={() => rightPanel.setCollapsed(false)} className="p-1 rounded-md text-vb-ink3 hover:text-vb-ink2 hover:bg-white/[0.04] transition-colors" title="Show inspector panel">
                <PanelRightOpen size={15} />
              </button>
            )}
          </div>
        </div>

        {activeTab === 'chat' && <ChatView analysis={analysis} messages={messages} loading={chatLoading} query={query} setQuery={setQuery} handleSend={handleSend} suggestions={suggestions} chatHistory={chatHistory} onSelectHistory={handleSelectHistory} onNewChat={handleNewChat} onDeleteHistory={handleDeleteHistory} onStopGeneration={handleStopGeneration} onRenameHistory={handleRenameHistory} historyLoaded={historyLoaded} setHistoryLoaded={setHistoryLoaded} onNavigateToFile={handleNavigateToFile} activeChatId={activeChatId} />}
        {activeTab === 'explore' && <ExploreView analysis={analysis} selectedFile={selectedFile} onContinueInChat={(userQuery, hiddenContext) => { setMessages([]); setActiveTab('chat'); setTimeout(() => handleSend(userQuery, [], hiddenContext), 50); }} />}
        {activeTab === 'system' && <SystemTabComponent analysisId={analysisId} onContinueInChat={(userQuery, hiddenContext) => { setMessages([]); setActiveTab('chat'); setTimeout(() => handleSend(userQuery, [], hiddenContext), 50); }} />}
      </main>

      {/* Right sidebar — hidden on small screens */}
      {!rightPanel.collapsed && (
        <>
          <div onMouseDown={rightPanel.onMouseDown} className="w-[3px] flex-shrink-0 cursor-col-resize bg-white/[0.04] hover:bg-vb-accent/30 active:bg-vb-accent/50 transition-colors hidden lg:block" />
          <aside style={{ width: `${rightPanel.width}px` }} className="flex-shrink-0 bg-vb-bg1 flex-col overflow-hidden hidden lg:flex">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
              <span className="text-[11px] font-medium text-vb-ink3 uppercase tracking-wider">{selectedFile ? 'Symbol Inspector' : 'Identity Profile'}</span>
              <button onClick={() => rightPanel.setCollapsed(true)} className="p-1 rounded-md text-vb-ink3 hover:text-vb-ink2 hover:bg-white/[0.04] transition-colors" title="Hide panel">
                <PanelRightClose size={13} />
              </button>
            </div>
            <RightPanel analysis={analysis} selectedFile={selectedFile} activeTab={activeTab} />
          </aside>
        </>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={dismissToast} />}
    </div>
  );
}

