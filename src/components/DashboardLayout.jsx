"use client";
import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { AnimatePresence, motion } from 'framer-motion';
import { useAnalysis, useChatHistory, useDeleteChatHistory, useFileContent, useFetchConversationMessages, useStreamChat, useShareChat, useReanalyzeRepo } from '../hooks/useApi';
import { usePlan } from '../hooks/usePlan';
import { useQueryClient } from '@tanstack/react-query';
import { useResizable, useResizableRight } from '../hooks/useResizable';
import { LOADING_MESSAGES, getRandomMessage, getRateLimitMessage, ERROR_MESSAGES, EMPTY_STATES } from '../lib/personality';
import { MessageSquare, LayoutGrid, Terminal, FileText, Folder, ChevronRight, Code2, Shield, Send, Plus, Clock, X, Square, Copy, Check, Trash2, Search, ZoomIn, ZoomOut, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, UserCircle, Share2, Zap, RefreshCw, Loader2 } from 'lucide-react';
import { buildChatSuggestions } from '../lib/chat-suggestions';
import MermaidDiagram from './MermaidDiagram';
import { looksLikeMermaid } from '../utils/client/mermaid';
import dynamic from 'next/dynamic';
import ChatInputComponent from './ChatInput';
import { ViboMark, ViboWordmark } from './ViboLogo';
import FilePathDisplay, { looksLikeFilePath } from './FilePathDisplay';
import ThemeToggle from './ThemeToggle';
import DashboardTabs from './DashboardTabs';
import SuggestionChip from './SuggestionChip';
import { Highlight, themes } from 'prism-react-renderer';
import { healthScore, getIdentityProfile, getHighTrafficFiles, normalizeAssistantOpening, parseFollowUps } from '../utils/client/formatting';

// ── Lazy-loaded components (not needed on initial render) ──
const SystemTabComponent = dynamic(() => import('./SystemTab'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-40"><svg className="w-5 h-5 animate-spin text-vb-accent" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-20"/><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></div>,
});

const SymbolInspector = dynamic(() => import('./SymbolInspector'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-20"><svg className="w-4 h-4 animate-spin text-vb-accent" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-20"/><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></div>,
});

const UpgradeModal = dynamic(() => import('./UpgradeModal'), {
  ssr: false,
});

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

const ChatCodeBlock = memo(function ChatCodeBlock({ code, language, streaming = false }) {
  return (
    <div className="chat-md-code-block">
      <div className="chat-md-code-block__header">
        <div className="flex items-center gap-[5px]">
          <span className="w-[8px] h-[8px] rounded-full bg-[#ff5f57]" />
          <span className="w-[8px] h-[8px] rounded-full bg-[#febc2e]" />
          <span className="w-[8px] h-[8px] rounded-full bg-[#28c840]" />
        </div>
        {language ? <span className="text-[10px] text-vb-ink4 font-mono ml-2">{language}</span> : null}
        {streaming ? <span className="text-[10px] text-vb-ink4 ml-auto">streaming…</span> : null}
      </div>
      {streaming ? (
        <pre className="chat-md-code-block__pre text-vb-ink2 font-mono whitespace-pre">{code}</pre>
      ) : (
        <Highlight theme={viboCodeTheme} code={code} language={language || 'javascript'}>
          {({ tokens: codeTokens, getLineProps: glp, getTokenProps: gtp }) => (
            <pre className="chat-md-code-block__pre">
              {codeTokens.map((line, li) => (
                <div key={li} {...glp({ line })} className="leading-[1.6]">
                  {line.map((token, ti) => <span key={ti} {...gtp({ token })} />)}
                </div>
              ))}
            </pre>
          )}
        </Highlight>
      )}
    </div>
  );
});

const CodeViewerLazy = dynamic(() => import('./CodeViewer'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-40"><svg className="w-5 h-5 animate-spin text-vb-accent" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-20"/><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></div>,
});

/* ── Copy Button (memoized — one per message) ── */
const CopyButton = memo(function CopyButton({ text }) {
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
});

/* ── Time Ago Helper (pure function — safe to call anywhere) ── */
function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

/* ── Toast ── */
function Toast({ message, type, onDismiss }) {
  useEffect(() => { const t = setTimeout(onDismiss, 10000); return () => clearTimeout(t); }, [onDismiss]);
  const styles = { error: 'border-vb-red/20 bg-vb-red/[0.06] text-vb-red', success: 'border-vb-accent/20 bg-vb-accent/[0.06] text-vb-accent', info: 'border-c-line-2 bg-c-overlay-2 text-vb-ink2' };
  return <div className={`fixed bottom-6 right-6 z-[200] px-5 py-3.5 rounded-xl border ${styles[type] || styles.info} text-[14px] shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-sm max-w-[400px]`}>{message}</div>;
}
function useToast() {
  const [toast, setToast] = useState(null);
  const show = useCallback((msg, type = 'info') => setToast({ message: msg, type }), []);
  const dismiss = useCallback(() => setToast(null), []);
  return { toast, show, dismiss };
}

/* ── Helpers ── */

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); });
}
/* ── Markdown renderer (memoized — only re-renders when content changes) ── */
const MarkdownMessage = memo(function MarkdownMessage({ content, onNavigateToFile }) {
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
            <button key={k++} onClick={() => onNavigateToFile?.(ref)} className="inline-flex max-w-full min-w-0 px-0.5 text-vb-accent-dim font-mono text-[12px] underline underline-offset-2 decoration-vb-accent/40 hover:text-vb-accent hover:decoration-vb-accent cursor-pointer transition-colors text-left">
              {isFilePath(ref) ? <FilePathDisplay path={ref} /> : ref}
            </button>
          );
        } else {
          result.push(<code key={k++} className="px-1.5 py-0.5 bg-c-overlay-3 rounded text-[12px] font-mono text-vb-ink">{cm[1]}</code>);
        }
        rem = rem.slice(cm[0].length); continue;
      }
      // Match any quote-wrapped file path (single, smart, double, or backtick-like quotes)
      const sq = rem.match(/^([''\u2018\u2019\u201C\u201D"`])([^\s''\u2018\u2019\u201C\u201D"`]+\.\w{1,4})\1/);
      if (sq && isFilePath(sq[2])) {
        result.push(
          <button key={k++} onClick={() => onNavigateToFile?.(sq[2])} className="inline-flex max-w-full min-w-0 px-0.5 text-vb-accent-dim font-mono text-[12px] underline underline-offset-2 decoration-vb-accent/40 hover:text-vb-accent hover:decoration-vb-accent cursor-pointer transition-colors text-left">
            <FilePathDisplay path={sq[2]} />
          </button>
        );
        rem = rem.slice(sq[0].length); continue;
      }
      // Match unquoted file paths inline (word/slash sequences ending in known extension)
      const fp = rem.match(/^([\w\-./]+\.(js|ts|jsx|tsx|css|json|md|html|py|rb|go|rs|yaml|yml|toml|sql|sh|env))\b/i);
      if (fp && fp[1].includes('/')) {
        result.push(
          <button key={k++} onClick={() => onNavigateToFile?.(fp[1])} className="inline-flex max-w-full min-w-0 px-0.5 text-vb-accent-dim font-mono text-[12px] underline underline-offset-2 decoration-vb-accent/40 hover:text-vb-accent hover:decoration-vb-accent cursor-pointer transition-colors text-left">
            <FilePathDisplay path={fp[1]} />
          </button>
        );
        rem = rem.slice(fp[0].length); continue;
      }
      const bm = rem.match(/^\*\*(.+?)\*\*/);
      if (bm) { result.push(<strong key={k++} className="font-semibold text-vb-ink">{renderInline(bm[1])}</strong>); rem = rem.slice(bm[0].length); continue; }
      const im = rem.match(/^\*(.+?)\*/);
      if (im) { result.push(<em key={k++} className="italic text-vb-ink">{renderInline(im[1])}</em>); rem = rem.slice(im[0].length); continue; }
      // Find next special character — but never consume a backtick here;
      // backtick at pos 0 means the cm match above already failed (not a valid
      // inline code span), so we emit it literally and move on.
      const nx = rem.search(/[`*''\u2018\u2019\u201C\u201D"]/);
      if (nx === -1) {
        // No special chars left — check for bare file paths in remaining text
        const bareMatch = rem.match(/([\w\-./]+\.(js|ts|jsx|tsx|css|json|md|html|py|rb|go|rs|yaml|yml|toml|sql|sh|env))\b/i);
        if (bareMatch && bareMatch[1].includes('/')) {
          const idx = rem.indexOf(bareMatch[1]);
          if (idx > 0) result.push(<span key={k++}>{rem.slice(0, idx)}</span>);
          result.push(
            <button key={k++} onClick={() => onNavigateToFile?.(bareMatch[1])} className="inline-flex max-w-full min-w-0 px-0.5 text-vb-accent-dim font-mono text-[12px] underline underline-offset-2 decoration-vb-accent/40 hover:text-vb-accent hover:decoration-vb-accent cursor-pointer transition-colors text-left">
              <FilePathDisplay path={bareMatch[1]} />
            </button>
          );
          rem = rem.slice(idx + bareMatch[1].length);
          continue;
        }
        result.push(<span key={k++}>{rem}</span>); break;
      }
      if (nx === 0) {
        // Emit the unmatched special character literally and advance
        result.push(<span key={k++}>{rem[0]}</span>);
        rem = rem.slice(1);
      } else {
        // Check if there's a file path before the next special char
        const segment = rem.slice(0, nx);
        const bareInSegment = segment.match(/([\w\-./]+\.(js|ts|jsx|tsx|css|json|md|html|py|rb|go|rs|yaml|yml|toml|sql|sh|env))\b/i);
        if (bareInSegment && bareInSegment[1].includes('/')) {
          const idx = segment.indexOf(bareInSegment[1]);
          if (idx > 0) result.push(<span key={k++}>{segment.slice(0, idx)}</span>);
          result.push(
            <button key={k++} onClick={() => onNavigateToFile?.(bareInSegment[1])} className="inline-flex max-w-full min-w-0 px-0.5 text-vb-accent-dim font-mono text-[12px] underline underline-offset-2 decoration-vb-accent/40 hover:text-vb-accent hover:decoration-vb-accent cursor-pointer transition-colors text-left">
              <FilePathDisplay path={bareInSegment[1]} />
            </button>
          );
          rem = rem.slice(idx + bareInSegment[1].length);
        } else {
          result.push(<span key={k++}>{rem.slice(0, nx)}</span>);
          rem = rem.slice(nx);
        }
      }
    }
    return result;
  };

  const flushList = (key) => { if (!listBuffer.length) return; const Tag = listType === 'ol' ? 'ol' : 'ul'; elements.push(<Tag key={key} className={`chat-md-list ${listType === 'ol' ? 'list-decimal' : 'list-disc'} ml-5 space-y-2`}>{listBuffer.map((item, i) => <li key={i} className="text-[13px] text-vb-ink2 leading-relaxed">{renderInline(item)}</li>)}</Tag>); listBuffer = []; listType = null; };

  const flushTable = (key) => {
    if (tableBuffer.length < 2) { tableBuffer = []; return; }
    const headers = tableBuffer[0].split('|').map(c => c.trim()).filter(Boolean);
    const dataRows = tableBuffer.slice(1).filter(r => !/^[\s|:-]+$/.test(r)).map(r => r.split('|').map(c => c.trim()).filter(Boolean));
    elements.push(
      <div key={key} className="chat-md-table-wrap overflow-x-auto rounded-lg border border-vb-accent/15">
        <table className="w-full text-[12px]">
          <thead><tr className="border-b border-vb-accent/20 bg-vb-accent/[0.04]">{headers.map((h, i) => <th key={i} className="px-4 py-2.5 text-left text-vb-accent-bright font-semibold text-[11px] uppercase tracking-wide">{h}</th>)}</tr></thead>
          <tbody>{dataRows.map((row, i) => <tr key={i} className="border-b border-c-line last:border-0 hover:bg-c-overlay-1">{row.map((cell, j) => {
            const trimmed = cell.trim();
            const isPathCell = looksLikeFilePath(trimmed) && trimmed.includes('/');
            return (
              <td key={j} className="px-4 py-2.5 text-vb-ink2 max-w-[220px]">
                {isPathCell ? (
                  <FilePathDisplay
                    path={trimmed}
                    block
                    onClick={onNavigateToFile ? () => onNavigateToFile(trimmed) : undefined}
                    className={onNavigateToFile ? 'file-path-display--interactive' : ''}
                  />
                ) : renderInline(cell)}
              </td>
            );
          })}</tr>)}</tbody>
        </table>
      </div>
    );
    tableBuffer = [];
  };

  const flushCode = (key) => {
    if (!codeLines.length) return;
    const codeText = codeLines.join('\n');
    if (looksLikeMermaid(codeText, codeLang)) {
      elements.push(
        <div key={key} className="chat-md-diagram-wrap">
          <MermaidDiagram code={codeText} />
        </div>
      );
    } else {
      elements.push(
        <ChatCodeBlock key={key} code={codeText} language={codeLang} />
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
    if (/^#{3}\s*(.+)/.test(line)) { elements.push(<h3 key={i} className="chat-md-h3">{renderInline(line.replace(/^#{3}\s*/, '').replace(/\*\*/g, ''))}</h3>); return; }
    if (/^#{2}\s*(.+)/.test(line)) { elements.push(<h2 key={i} className="chat-md-h2">{renderInline(line.replace(/^#{2}\s*/, '').replace(/\*\*/g, ''))}</h2>); return; }
    if (/^#{1}\s*(.+)/.test(line)) { elements.push(<h1 key={i} className="chat-md-h1">{renderInline(line.replace(/^#{1}\s*/, '').replace(/\*\*/g, ''))}</h1>); return; }
    elements.push(<p key={i} className="chat-md-p">{renderInline(line)}</p>);
  });
  flushList('end'); flushTable('te');
  // Only flush code block if it was properly closed (codeBlock === false)
  // This prevents rendering incomplete/partial code blocks during streaming
  if (!codeBlock) flushCode('ce');
  else if (codeLines.length > 0) {
    const streamingCode = codeLines.join('\n');
    if (looksLikeMermaid(streamingCode, codeLang)) {
      elements.push(
        <div key="streaming-diagram" className="chat-md-diagram-wrap chat-md-diagram-wrap--loading">
          <svg className="w-4 h-4 animate-spin text-vb-accent" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-20"/><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          <span className="text-[12px] text-vb-ink3">Building diagram…</span>
        </div>
      );
    } else {
      elements.push(
        <ChatCodeBlock key="streaming-code" code={streamingCode} language={codeLang} streaming />
      );
    }
  }
  return <div className="chat-md-prose min-w-0 max-w-full">{elements}</div>;
});

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
            className={`w-full flex items-center gap-2 py-[5px] pr-2 rounded-md text-[12px] transition-colors duration-150 ${selectedFile === value.__path ? 'bg-vb-accent/10 text-vb-accent' : 'text-c-text-2 hover:text-c-text hover:bg-c-overlay-3'}`}>
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
            className="w-full flex items-center gap-1.5 py-[5px] pr-2 rounded-md text-[12px] text-vb-ink2 hover:text-vb-ink hover:bg-c-overlay-3 transition-colors duration-150">
            <ChevronRight size={11} className={`transition-transform duration-150 flex-shrink-0 text-vb-ink4 ${expanded[dirPath] ? 'rotate-90' : ''}`} />
            <Folder size={13} className="flex-shrink-0 text-vb-accent-dim opacity-70" />
            <span className="truncate font-medium">{name}</span>
          </button>
          {expanded[dirPath] && (
            <div className="relative">
              <div className="absolute top-0 bottom-0 border-l border-c-line" style={{ left: `${indent + 14}px` }} />
              {renderNode(value.__children || {}, dirPath, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 flex items-center gap-3 border-b border-c-line">
        <div className="flex items-center gap-[6px]">
          <span className="w-[10px] h-[10px] rounded-full bg-[#ff5f57]" />
          <span className="w-[10px] h-[10px] rounded-full bg-[#febc2e]" />
          <span className="w-[10px] h-[10px] rounded-full bg-c-lime" />
        </div>
        <span className="text-[11px] font-medium text-vb-ink3 uppercase tracking-wider">Filesystem</span>
        <button onClick={onCollapse} className="ml-auto p-1 rounded-md text-vb-ink4 hover:text-vb-ink3 hover:bg-c-overlay-3 transition-colors" title="Collapse">
          <PanelLeftClose size={13} />
        </button>
      </div>
      {/* File search */}
      <div className="px-2 py-2 border-b border-c-line">
        <div className="flex items-center gap-2 px-2 py-1.5 bg-c-overlay-2 border border-c-line rounded-md">
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
              className={`w-full flex items-center gap-2 px-2 py-[5px] rounded-md text-[11px] transition-colors duration-150 min-w-0 ${selectedFile === f.path ? 'bg-vb-accent/10 text-vb-accent' : 'text-vb-ink2 hover:text-vb-ink hover:bg-c-overlay-3'}`}>
              <FileText size={11} className="flex-shrink-0 opacity-50" />
              <FilePathDisplay path={f.path} block className="min-w-0 flex-1" />
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
    </div>
  );
}

/* ── Right Panel ── */
function RightPanel({ analysis, selectedFile, activeTab, userPlan, onShareChat, activeChatId, sharingChatId }) {
  const fileIntel = useMemo(() => {
    if (!selectedFile || !analysis?.results?.files) return null;
    return analysis.results.files.find(f => f.path === selectedFile) || null;
  }, [selectedFile, analysis]);

  const fileName = selectedFile ? selectedFile.split('/').pop() : '';
  const showSymbols = selectedFile && fileIntel;

  const profile = getIdentityProfile(analysis);
  const highTraffic = getHighTrafficFiles(analysis);
  const displayFiles = highTraffic || [];

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto flex flex-col">
      {showSymbols ? (
        <>
          <div className="px-3 py-2.5 border-b border-c-line flex items-center gap-2 min-w-0">
            <span className="text-[12px] font-mono text-vb-ink font-medium truncate">{fileName}</span>
            <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
              {fileIntel.language && (
                <span className="px-1.5 py-[1px] rounded bg-c-overlay-3 text-[9px] font-mono text-vb-ink4 uppercase">{fileIntel.language}</span>
              )}
              {fileIntel.lineCount > 0 && (
                <span className="text-[9px] text-vb-ink4 font-mono">{fileIntel.lineCount}L</span>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <SymbolInspector fileIntel={fileIntel} fileName={fileName} />
          </div>
        </>
      ) : (
        <>
          {/* Quick Actions */}
          <div className="px-4 py-5 border-b border-c-line">
            <h3 className="text-[11px] font-medium text-vb-ink3 uppercase tracking-wider mb-3">Quick Actions</h3>
            <div className="space-y-2">
              {activeChatId && (
                <button onClick={() => onShareChat?.()} disabled={sharingChatId === activeChatId} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-c-overlay-1 border border-c-line hover:bg-c-overlay-3 hover:border-c-line-3 transition-colors text-left disabled:opacity-50">
                  {sharingChatId === activeChatId ? (
                    <svg className="w-[13px] h-[13px] animate-spin text-vb-accent" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-20"/><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  ) : (
                    <Share2 size={13} className="text-vb-accent" />
                  )}
                  <span className="text-[12px] text-vb-ink2">{sharingChatId === activeChatId ? 'Generating link...' : 'Share this chat'}</span>
                </button>
              )}
              <a href={analysis?.repo_url || '#'} target="_blank" rel="noopener noreferrer" className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-c-overlay-1 border border-c-line hover:bg-c-overlay-3 hover:border-c-line-3 transition-colors">
                <Code2 size={13} className="text-vb-ink4" />
                <span className="text-[12px] text-vb-ink2">View on GitHub</span>
              </a>
            </div>
          </div>

          {/* Codebase Summary */}
          <div className="px-4 py-5 border-b border-c-line">
            <h3 className="text-[11px] font-medium text-vb-ink3 uppercase tracking-wider mb-3">Codebase</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-vb-ink4">Repository</span>
                <span className="text-[12px] text-vb-ink2 font-medium truncate ml-2 max-w-[120px]">{analysis?.repo_name || 'n/a'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-vb-ink4">Files</span>
                <span className="text-[12px] text-vb-ink2 font-mono">{analysis?.total_files?.toLocaleString() || 'n/a'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-vb-ink4">Lines</span>
                <span className="text-[12px] text-vb-ink2 font-mono">{analysis?.total_lines?.toLocaleString() || 'n/a'}</span>
              </div>
              {profile.techStack && (
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-vb-ink4">Stack</span>
                  <span className="text-[12px] text-vb-ink2 leading-relaxed break-words">{profile.techStack}</span>
                </div>
              )}
            </div>
          </div>

          {/* Plan info — directly below codebase */}
          <div className="px-4 py-4 border-b border-c-line">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-vb-ink4 uppercase tracking-wider">Plan</span>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${userPlan === 'free' ? 'bg-c-overlay-3 text-vb-ink3' : 'bg-vb-accent/10 text-vb-accent border border-vb-accent/20'}`}>
                {userPlan === 'free' ? 'Free' : userPlan === 'starter' ? 'Starter' : 'Pro'}
              </span>
            </div>
          </div>

          {/* Footer links — always at bottom */}
          <div className="mt-auto px-4 py-4 border-t border-c-line">
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <a href="/privacy" className="text-[11px] text-vb-ink3 hover:text-vb-accent transition-colors">Privacy</a>
              <a href="/terms" className="text-[11px] text-vb-ink3 hover:text-vb-accent transition-colors">Terms</a>
              <a href="/refund" className="text-[11px] text-vb-ink3 hover:text-vb-accent transition-colors">Refunds</a>
              <a href="/faq" className="text-[11px] text-vb-ink3 hover:text-vb-accent transition-colors">FAQ</a>
              <a href="mailto:support@grepit.co" className="text-[11px] text-vb-ink3 hover:text-vb-accent transition-colors">Contact</a>
            </div>
          </div>
        </>
      )}
      </div>
    </div>
  );
}

/* ── Confirmation Modal ── */
function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-vb-bg/80 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-vb-bg2 border border-c-line-2 rounded-lg p-5 max-w-sm w-full mx-4 shadow-[0_16px_48px_rgba(0,0,0,0.5)]" onClick={(e) => e.stopPropagation()}>
        <p className="text-[13px] text-vb-ink2 leading-relaxed mb-5">{message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-[12px] text-vb-ink2 bg-c-overlay-2 border border-c-line-2 hover:bg-c-overlay-4 hover:border-c-line-3 transition-colors">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-lg text-[12px] text-vb-red border border-vb-red/20 bg-vb-red/[0.06] hover:bg-vb-red/[0.12] transition-colors">Delete</button>
        </div>
      </div>
    </div>
  );
}

/* ── Chat History Sidebar ── */
function ChatHistorySidebar({ history, onSelect, onNewChat, onDelete, onRename, onShare, sharingChatId, onCollapse, activeChatId }) {
  const [confirmItem, setConfirmItem] = useState(null);
  const [renamingIdx, setRenamingIdx] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const startRename = (item, i) => {
    setRenamingIdx(i);
    setRenameValue(item.displayName || item.title || item.query?.slice(0, 40) || 'New chat');
  };

  const submitRename = (item, i) => {
    if (renameValue.trim()) onRename(item, i, renameValue.trim());
    setRenamingIdx(null);
  };

  return (
    <div className="w-[200px] min-w-[200px] border-r border-c-line flex flex-col h-full bg-vb-bg1 hidden md:flex">
      <div className="px-3 py-3 border-b border-c-line flex items-center justify-between">
        <span className="text-[12px] font-medium text-c-text-2">Chat History</span>
        <div className="flex items-center gap-1">
          <button onClick={onNewChat} className="p-1 rounded-md hover:bg-c-overlay-3 text-vb-ink3 hover:text-vb-ink transition-colors" title="New chat">
            <Plus size={14} />
          </button>
          <button onClick={onCollapse} className="p-1 rounded-md hover:bg-c-overlay-3 text-vb-ink4 hover:text-vb-ink3 transition-colors" title="Collapse">
            <PanelLeftClose size={13} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {history.length === 0 ? (
          <p className="text-[11px] text-c-text-3 px-2 py-6 text-center leading-relaxed">{EMPTY_STATES.noHistory}</p>
        ) : history.map((item, i) => (
          <div key={i} className={`group flex items-center gap-0.5 rounded-md transition-colors ${item.id === activeChatId ? 'bg-c-lime-soft border border-c-lime-line' : 'hover:bg-c-overlay-2'}`}>
            {renamingIdx === i ? (
              <input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submitRename(item, i); if (e.key === 'Escape') setRenamingIdx(null); }}
                onBlur={() => submitRename(item, i)}
                className="flex-1 px-3 py-1.5 text-[12px] text-vb-ink bg-transparent border border-c-lime-line rounded outline-none caret-c-lime"
              />
            ) : (
              <button onClick={() => onSelect(item)}
                onDoubleClick={() => startRename(item, i)}
                className={`flex-1 text-left px-3 py-2 text-[12.5px] transition-colors truncate flex items-center gap-2 min-w-0 ${item.id === activeChatId ? 'text-c-text' : 'text-c-text-2 hover:text-c-text'}`}>
                <Clock size={11} className={`flex-shrink-0 ${item.id === activeChatId ? 'text-c-lime' : 'text-c-text-3'}`} />
                <span className="truncate">{item.displayName || item.title || item.query || 'New chat'}</span>
              </button>
            )}
            <button
              onClick={() => onShare?.(item)}
              disabled={sharingChatId === item.id}
              style={{ transition: 'opacity 160ms var(--ease-out-strong), color 160ms var(--ease-out-strong)' }}
              className="opacity-0 group-hover:opacity-100 p-1 text-vb-ink4 hover:text-vb-accent disabled:opacity-50"
              title="Share"
            >
              {sharingChatId === item.id ? (
                <svg className="w-[11px] h-[11px] animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-20"/><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              ) : (
                <Share2 size={11} />
              )}
            </button>
            <button
              onClick={() => setConfirmItem(item)}
              style={{ transition: 'opacity 160ms var(--ease-out-strong), color 160ms var(--ease-out-strong)' }}
              className="opacity-0 group-hover:opacity-100 p-1 mr-1 text-vb-ink4 hover:text-vb-red"
              title="Delete"
            >
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

/* ── Chat Loading Indicator ── */
const STREAM_STATUS_LABELS = {
  preparing: 'Reading your question…',
  context: 'Searching the codebase…',
  generating: 'Writing answer…',
};

function ChatLoadingIndicator({ statusLabel }) {
  const [msg, setMsg] = useState(() => LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]);
  useEffect(() => {
    if (statusLabel) return undefined;
    const interval = setInterval(() => {
      setMsg(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]);
    }, 2500);
    return () => clearInterval(interval);
  }, [statusLabel]);
  const label = statusLabel || msg;
  return (
    <div className="flex items-center gap-3 py-4 px-1">
      <div className="flex gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-c-accent animate-[bounce_0.6s_ease-in-out_infinite]" style={{ animationDelay: '0ms' }} />
        <div className="w-1.5 h-1.5 rounded-full bg-c-lime animate-[bounce_0.6s_ease-in-out_infinite]" style={{ animationDelay: '120ms' }} />
        <div className="w-1.5 h-1.5 rounded-full bg-c-accent-bright animate-[bounce_0.6s_ease-in-out_infinite]" style={{ animationDelay: '240ms' }} />
      </div>
      <span className="chat-loading-status">{label}</span>
    </div>
  );
}

/* ── Chat View ── */
function ChatView({ analysis, messages, loading, streamStatus, query, setQuery, handleSend, suggestions, chatHistory, onSelectHistory, onNewChat, onDeleteHistory, onStopGeneration, onRenameHistory, onShareHistory, sharingChatId, historyLoaded, setHistoryLoaded, onNavigateToFile, activeChatId, switchingChat }) {
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
        <div className="hidden md:block">
          <ChatHistorySidebar history={chatHistory} onSelect={onSelectHistory} onNewChat={onNewChat} onDelete={onDeleteHistory} onRename={onRenameHistory} onShare={onShareHistory} sharingChatId={sharingChatId} onCollapse={() => setHistoryCollapsed(true)} activeChatId={activeChatId} />
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-0 dashboard-chat-surface relative">
        {historyCollapsed && (
          <button onClick={() => setHistoryCollapsed(false)} className="absolute top-2 left-2 z-10 p-1.5 rounded-md text-vb-ink3 hover:text-vb-ink2 hover:bg-c-overlay-3 transition-colors hidden md:block" title="Show chat history">
            <PanelLeftOpen size={14} />
          </button>
        )}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-3 md:px-6 py-4 md:py-6 min-w-0"
          onMouseDown={(e) => {
            if (e.target.closest('.chat-input-bar, textarea, input')) return;
            const tag = document.activeElement?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') document.activeElement?.blur();
          }}
        >
          <div className={messages.length === 0 ? "h-full" : "min-h-full"}>
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-6">
              {switchingChat && (
                <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-c-line bg-c-overlay-1 px-3 py-1.5 text-[12px] text-c-text-3">
                  <Loader2 size={12} className="animate-spin text-c-accent" />
                  Loading conversation…
                </div>
              )}
              <div className="flex items-center gap-2 mb-3">
                <ViboMark size={22} />
                <span className="text-[18px] font-semibold tracking-tight text-c-text select-none">
                  grep<span className="text-c-lime-pastel">it</span>
                </span>
              </div>
              <p className="text-[14px] text-c-text-3 mb-5 text-center">What&apos;s confusing you today?</p>
              <div className="chat-suggestions-wrap">
                {suggestions.map((s) => (
                  <SuggestionChip
                    key={s}
                    onClick={() => handleSend(s)}
                    className="chat-suggestion-chip"
                  >
                    {s}
                  </SuggestionChip>
                ))}
              </div>
              <div className="w-full max-w-[680px] px-2 chat-empty-composer">
                <ChatInputComponent
                  query={query}
                  setQuery={setQuery}
                  onSend={handleSend}
                  loading={loading}
                  onStop={onStopGeneration}
                  fileTree={analysis?.file_tree || []}
                />
              </div>
              </div>
            ) : (
              <div className="space-y-5 min-w-0 w-full">
              {messages.map((msg, i) => {
                const isAI = msg.role === 'assistant';
                const normalizedContent = isAI ? normalizeAssistantOpening(msg.content) : msg.content;
                const { body, followUps } = isAI ? parseFollowUps(normalizedContent) : { body: normalizedContent, followUps: [] };
                return (
                  <div key={i} className="group" style={{ contentVisibility: 'auto', containIntrinsicSize: '0 80px' }}>
                    {msg.role === 'user' ? (
                      <div className="flex justify-end">
                        <div className="max-w-[85%] md:max-w-[70%]">
                          {msg._files?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-1.5 justify-end">
                              {msg._files.map(f => (
                                <span key={f} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-c-accent-soft border border-c-accent-line text-c-accent">
                                  <FileText size={9} />{f.split('/').pop()}
                                </span>
                              ))}
                            </div>
                          )}
                          {msg._context && (
                            <div className="flex justify-end mb-1.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-c-lime-soft border border-c-lime-line text-c-lime">
                                <Shield size={9} />Context attached
                              </span>
                            </div>
                          )}
                          <div className="chat-user-bubble">
                            <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                          </div>
                          <div className="flex justify-end mt-1">
                            <CopyButton text={msg.content} />
                          </div>
                        </div>
                      </div>
                    ) : msg.role === 'system' ? (
                      <div className="px-1 py-2 text-[13px] text-vb-red">{msg.content}</div>
                    ) : (
                        <div className="py-3 max-w-full min-w-0 overflow-hidden">
                          <MarkdownMessage content={body} onNavigateToFile={onNavigateToFile} />
                        <div className="flex justify-start mt-1">
                          <CopyButton text={normalizedContent} />
                        </div>
                      </div>
                    )}
                    {followUps.length > 0 && !loading && (
                      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-c-line max-w-full overflow-hidden">
                        {followUps.map((q, j) => (
                          <SuggestionChip key={j} onClick={() => handleSend(q)}
                            className="chat-followup-chip max-w-full truncate">
                            {q}
                          </SuggestionChip>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {loading && <ChatLoadingIndicator statusLabel={streamStatus ? STREAM_STATUS_LABELS[streamStatus] : ''} />}
              </div>
            )}
          </div>
        </div>

        {/* Chat bar — only show at bottom when there are messages */}
        {messages.length > 0 && (
          <ChatInputComponent query={query} setQuery={setQuery} onSend={handleSend} loading={loading} onStop={onStopGeneration} fileTree={analysis?.file_tree || []} />
        )}
      </div>
    </div>
  );
}

/* ── Explore & System Views ── */
function ExploreView({ analysis, selectedFile, onSelectFile, onContinueInChat }) {
  const [fontSize, setFontSize] = useState(12);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // React Query cached file fetch
  const { data: code = '', isLoading: loadingCode } = useFileContent(analysis?.id, selectedFile);
  const fileCode = typeof code === 'string' ? code : (code?.code ?? '');
  const fileTruncated = typeof code === 'object' && code?.truncated;

  const pathParts = selectedFile ? selectedFile.split('/') : [];

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-c-surface dashboard-panel-solid">
      {selectedFile ? (<>
        {/* Breadcrumb + toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-c-line flex-shrink-0">
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
          <div className="flex items-center gap-2 px-4 py-2 border-b border-c-line bg-c-overlay-1">
            <Search size={12} className="text-vb-ink4 flex-shrink-0" />
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery(''); } }}
              placeholder="Search in file..."
              className="flex-1 bg-transparent text-[12px] text-vb-ink placeholder:text-vb-ink4 outline-none caret-vb-accent"
            />
            {searchQuery && <span className="text-[10px] text-vb-ink4">{(fileCode.match(new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length} matches</span>}
            <button onClick={() => { setSearchOpen(false); setSearchQuery(''); }} className="w-[16px] h-[16px] md:w-[12px] md:h-[12px] rounded-full bg-[#ff5f57] hover:bg-[#ff3b30] transition-colors flex items-center justify-center flex-shrink-0" title="Close"><X size={7} className="text-[#4a0000] opacity-100" /></button>
          </div>
        )}

        {/* Code viewer */}
        <div className="flex-1 min-h-0 bg-vb-chat flex flex-col overflow-hidden">
          {fileTruncated ? (
            <div className="flex-shrink-0 px-4 py-2 border-b border-c-line bg-c-accent-soft text-[11px] text-c-text-2">
              Showing indexed excerpt. Live fetch unavailable — large files may be partial in cache.
            </div>
          ) : null}
          {loadingCode ? (
            <div className="flex items-center justify-center h-40">
              <svg className="w-5 h-5 animate-spin text-vb-accent" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-20"/><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </div>
          ) : (
            <CodeViewerLazy code={fileCode} filePath={selectedFile} analysisId={analysis?.id} onContinueInChat={onContinueInChat} fontSize={fontSize} searchQuery={searchQuery} />
          )}
        </div>
      </>) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Desktop: show message to use sidebar */}
          <div className="hidden md:flex flex-1 items-center justify-center">
            <p className="text-[14px] text-vb-ink3">Select a file from the sidebar to explore</p>
          </div>
          {/* Mobile: full file tree (same as desktop sidebar) */}
          <div className="md:hidden flex-1 flex flex-col overflow-hidden">
            <FileTreeSidebar analysis={analysis} selectedFile={selectedFile} onSelectFile={(p) => onSelectFile?.(p)} score={0} onCollapse={() => {}} />
          </div>
        </div>
      )}
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
  const [streamStatus, setStreamStatus] = useState('');
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [activeChatId, setActiveChatId] = useState(() => crypto.randomUUID());
  const [userPlan, setUserPlan] = useState('free');
  const [sharingChatId, setSharingChatId] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [switchingChat, setSwitchingChat] = useState(false);
  const { plan: fetchedPlan } = usePlan();
  const leftPanel = useResizable({ defaultWidth: 240, minWidth: 180, maxWidth: 400, storageKey: 'grepit-left-panel' });
  const rightPanel = useResizableRight({ defaultWidth: 300, minWidth: 200, maxWidth: 420, storageKey: 'grepit-right-panel' });
  const abortRef = useRef(null);
  const activeChatIdRef = useRef(activeChatId);
  const chatSwitchSeqRef = useRef(0);
  const conversationCacheRef = useRef(new Map());
  const { toast, show: showToast, dismiss: dismissToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const analysisId = searchParams.get('id');
  const { user, isLoaded: clerkLoaded, isSignedIn } = useUser();
  // React Query hooks
  const { data: analysis, isLoading: loading, error: analysisError } = useAnalysis(analysisId);
  const { data: chatHistory = [] } = useChatHistory(analysisId);
  const deleteChatMutation = useDeleteChatHistory();
  const fetchConversationMessages = useFetchConversationMessages();
  const streamChatMutation = useStreamChat();
  const shareChatMutation = useShareChat();
  const reanalyzeMutation = useReanalyzeRepo();
  const queryClient = useQueryClient();
  const error = analysisError?.message || '';

  // Sync plan from hook
  useEffect(() => {
    if (fetchedPlan) setUserPlan(fetchedPlan);
  }, [fetchedPlan]);
  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);
  useEffect(() => {
    if (!activeChatId) return;
    conversationCacheRef.current.set(activeChatId, messages);
  }, [activeChatId, messages]);

  const suggestions = useMemo(() => buildChatSuggestions(analysis), [analysis]);

  const stopActiveStream = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setChatLoading(false);
    setStreamStatus('');
  };

  const handleSend = async (text, attachedFiles = [], hiddenContext = '') => {
    const q = (text || query).trim();
    if (!q || chatLoading || !analysis?.id) return;

    // Optimistically add this conversation to the sidebar if it's the first message
    const isFirstMessage = messages.length === 0;
    if (isFirstMessage) {
      queryClient.setQueryData(['chatHistory', analysisId], (old = []) => {
        // Don't add if already exists
        if (old.some(c => c.id === activeChatId)) return old;
        return [
          { id: activeChatId, title: q.slice(0, 80), created_at: new Date().toISOString(), last_activity: new Date().toISOString(), messageCount: 1 },
          ...old,
        ];
      });
    }

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
    setQuery(''); setChatLoading(true); setStreamStatus('preparing');

    // Stream response from AI — the AI decides if a diagram is needed
    // and includes mermaid code blocks in its response when appropriate
    abortRef.current = new AbortController();
    const streamChatId = activeChatId; // Capture current chat ID to detect stale streams
    // Add a placeholder message that we'll update with streamed tokens
    const placeholderIdx = messages.length + 1; // +1 because we just added user msg
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const res = await streamChatMutation.mutateAsync({
        query: actualQuery,
        analysisId: analysis.id,
        files: forcedFiles,
        conversationId: activeChatId,
        signal: abortRef.current.signal,
      });

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
            if (data.status) {
              if (activeChatIdRef.current === streamChatId) setStreamStatus(data.status);
              continue;
            }
            if (data.token) {
              if (activeChatIdRef.current === streamChatId) setStreamStatus('');
              accumulated += data.token;
              // Only update if we're still on the same chat
              if (activeChatIdRef.current === streamChatId) {
                setMessages(prev => {
                  const copy = [...prev];
                  copy[copy.length - 1] = { role: 'assistant', content: accumulated };
                  return copy;
                });
              }
            }
            if (data.error) {
              if (activeChatIdRef.current === streamChatId) {
                setMessages(prev => { const copy = [...prev]; copy[copy.length - 1] = { role: 'system', content: data.error }; return copy; });
              }
            }
          } catch { /* skip */ }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        // User stopped — keep what we have so far
      } else {
        const isGateError = err.code === 'TOKEN_BUDGET_EXCEEDED' || err.code === 'CHAT_MESSAGE_LIMIT' || err.code === 'PRO_FEATURE_ONLY';
        if (isGateError) setShowUpgradeModal(true);
        if (err.status === 429) showToast('Too many requests. Slow down a bit.', 'error');
        const isNetworkError = err instanceof TypeError || /fetch|network|connection/i.test(err.message);
        const errorMsg = isGateError
          ? `${err.message}\n\n[Upgrade your plan →](/?scrollTo=pricing)`
          : isNetworkError
          ? 'Connection lost. Check your network and try again.'
          : err.message || 'Something went wrong';
        setMessages(prev => { const copy = [...prev]; copy[copy.length - 1] = { role: 'system', content: errorMsg }; return copy; });
        if (isNetworkError) showToast('No internet connection', 'error');
      }
    }
    setChatLoading(false);
    setStreamStatus('');
    abortRef.current = null;
    // Refresh chat history immediately so new chat appears in sidebar
    queryClient.invalidateQueries({ queryKey: ['chatHistory', analysisId] });
  };

  const handleStopGeneration = () => {
    stopActiveStream();
  };

  const handleDeleteHistory = async (item) => {
    if (!item) return;
    if (activeChatId === item.id) {
      setMessages([]);
      setActiveChatId(crypto.randomUUID());
    }
    deleteChatMutation.mutate({ analysisId: analysis?.id, conversationId: item.id });
  };

  const handleRenameHistory = (item, idx, newName) => {
    // Rename is client-side only for now
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

  const handleSelectHistory = async (item) => {
    // Switching conversations should immediately stop the current stream.
    stopActiveStream();
    const switchSeq = ++chatSwitchSeqRef.current;
    activeChatIdRef.current = item.id;
    const cachedMessages = conversationCacheRef.current.get(item.id);
    if (cachedMessages) {
      // Instant paint from local cache, then revalidate in background.
      setMessages(cachedMessages);
      setHistoryLoaded(true);
      setSwitchingChat(false);
    } else {
      setSwitchingChat(true);
      // Clear old chat immediately so UI never shows stale conversation.
      setMessages([]);
      setHistoryLoaded(false);
    }
    setActiveChatId(item.id);
    // Load all messages in this conversation
    try {
      const data = await fetchConversationMessages.mutateAsync({ conversationId: item.id, analysisId });
      // Ignore stale responses from older switch requests.
      if (chatSwitchSeqRef.current !== switchSeq || activeChatIdRef.current !== item.id) return;
      const msgs = (data || []).flatMap(m => [
        { role: 'user', content: m.query },
        { role: 'assistant', content: m.response },
      ]);
      conversationCacheRef.current.set(item.id, msgs);
      setMessages(msgs);
      setHistoryLoaded(true);
    } catch {
      if (chatSwitchSeqRef.current !== switchSeq || activeChatIdRef.current !== item.id) return;
      const fallback = [{ role: 'user', content: item.title }];
      conversationCacheRef.current.set(item.id, fallback);
      setMessages(fallback);
      setHistoryLoaded(true);
    } finally {
      if (chatSwitchSeqRef.current === switchSeq) {
        setSwitchingChat(false);
      }
    }
  };
  const handleNewChat = () => {
    // Switching conversations should immediately stop the current stream.
    stopActiveStream();
    chatSwitchSeqRef.current += 1;
    setSwitchingChat(false);
    setMessages([]);
    setQuery('');
    setHistoryLoaded(false);
    const newChatId = crypto.randomUUID();
    activeChatIdRef.current = newChatId;
    conversationCacheRef.current.set(newChatId, []);
    setActiveChatId(newChatId);
  };

  const handleShareHistory = async (item) => {
    if (!item?.id || !analysisId) return;
    setSharingChatId(item.id);
    try {
      const data = await shareChatMutation.mutateAsync({ conversationId: item.id, analysisId });
      if (data?.url) {
        await navigator.clipboard.writeText(data.url);
        showToast('Share link copied to clipboard', 'success');
      } else {
        showToast('Could not create share link', 'error');
      }
    } catch (err) {
      if (err.code === 'SHARE_LIMIT_REACHED') setShowUpgradeModal(true);
      showToast(err.message || 'Could not create share link', 'error');
    }
    setSharingChatId(null);
  };

  const handleReanalyze = async () => {
    if (!analysis?.repo_url) return;
    setReanalyzing(true);
    try {
      const data = await reanalyzeMutation.mutateAsync({
        repoUrl: analysis.repo_url,
        repoName: analysis.repo_name,
      });
      if (data?.id) {
        showToast('Re-analysis complete', 'success');
        // If same ID, just refresh the cache. If new ID, update URL without full reload.
        if (data.id === analysisId) {
          queryClient.invalidateQueries({ queryKey: ['analysis', analysisId] });
        } else {
          // Update URL without triggering a full page navigation
          window.history.replaceState({}, '', `/dashboard?id=${data.id}`);
          // Invalidate old cache and set new data directly
          queryClient.removeQueries({ queryKey: ['analysis', analysisId] });
          queryClient.setQueryData(['analysis', data.id], data);
          queryClient.invalidateQueries({ queryKey: ['chatHistory', data.id] });
        }
      } else {
        showToast('Re-analysis failed', 'error');
      }
    } catch (err) {
      if (err.code === 'REANALYZE_LIMIT_REACHED') setShowUpgradeModal(true);
      showToast(err.message || 'Could not re-analyze. Try again.', 'error');
    }
    setReanalyzing(false);
  };

  const score = analysis ? healthScore(analysis) : 0;

  if (!clerkLoaded) {
    return <div className="min-h-screen bg-vb-bg flex items-center justify-center"><svg className="w-5 h-5 animate-spin text-vb-accent" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-20"/><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></div>;
  }
  if (clerkLoaded && !isSignedIn) {
    router.replace(`/sign-in?redirect_url=${encodeURIComponent(window.location.pathname + window.location.search)}`);
    return <div className="min-h-screen bg-vb-bg flex items-center justify-center"><svg className="w-5 h-5 animate-spin text-vb-accent" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-20"/><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></div>;
  }
  if (!analysisId) {
    router.replace('/');
    return <div className="min-h-screen bg-vb-bg flex items-center justify-center"><svg className="w-5 h-5 animate-spin text-vb-accent" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-20"/><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></div>;
  }
  if (loading) {
    return <div className="min-h-screen bg-vb-bg flex flex-col items-center justify-center gap-4"><div className="flex items-center gap-2"><ViboMark size={22} /><span className="text-[18px] font-semibold tracking-tight text-vb-ink select-none">grep<span className="text-vb-accent">it</span></span></div><svg className="w-5 h-5 animate-spin text-vb-accent" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-20"/><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg><p className="text-[13px] text-vb-ink3">{LOADING_MESSAGES[Math.floor(Date.now() / 3000) % LOADING_MESSAGES.length]}</p></div>;
  }
  if (error) return <div className="min-h-screen bg-vb-bg flex items-center justify-center"><div className="text-center space-y-3"><p className="text-vb-red text-[14px]">{getRandomMessage(ERROR_MESSAGES)}</p><p className="text-[12px] text-vb-ink4 font-mono">{error}</p><a href="/" className="inline-block mt-2 text-[13px] text-vb-ink3 underline hover:text-vb-ink transition-colors">← Go back</a></div></div>;

  return (
    <div className="flex h-[100dvh] overflow-hidden dashboard-shell text-c-text">
      {/* Left sidebar — hidden on small screens */}
      {!leftPanel.collapsed && (
        <>
          <aside style={{ width: `${leftPanel.width}px` }} className="flex-shrink-0 bg-c-surface-2 flex-col overflow-hidden hidden md:flex border-r border-c-line">
            <FileTreeSidebar analysis={analysis} selectedFile={selectedFile} onSelectFile={(p) => { setSelectedFile(p); setActiveTab('explore'); }} score={score} onCollapse={() => leftPanel.setCollapsed(true)} />
          </aside>
          <div onMouseDown={leftPanel.onMouseDown} className="w-[3px] flex-shrink-0 cursor-col-resize bg-c-overlay-3 hover:bg-vb-accent/30 active:bg-vb-accent/50 transition-colors hidden md:block" />
        </>
      )}

      {/* Center */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar — grid keeps tabs centered at every width */}
        <div className="dashboard-topbar h-[56px] lg:h-[60px] border-b border-c-line flex-shrink-0 bg-c-surface">
          <div className="dashboard-topbar-inner h-full grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-3 px-3 sm:px-4 lg:px-5 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 overflow-hidden">
            {leftPanel.collapsed && (
              <button
                onClick={() => leftPanel.setCollapsed(false)}
                style={{ transition: 'color 160ms var(--ease-out-strong), background-color 160ms var(--ease-out-strong)' }}
                className="p-1.5 rounded-md text-c-text-3 hover:text-c-text-2 hover:bg-c-overlay-3 flex-shrink-0 hidden md:block"
                title="Show file explorer"
              >
                <PanelLeftOpen size={15} />
              </button>
            )}
            <a
              href="/"
              style={{ transition: 'opacity 160ms var(--ease-out-strong)' }}
              className="flex items-center gap-2 hover:opacity-80 flex-shrink-0"
              title="grepit Home"
            >
              <ViboMark size={20} />
              <ViboWordmark size="sm" />
            </a>
            <span className="text-c-text-4 hidden lg:inline flex-shrink-0">/</span>
            <span className="relative hidden lg:flex items-center gap-1.5 min-w-0">
              <span className="hidden sm:inline-flex h-1.5 w-1.5 rounded-full bg-c-lime flex-shrink-0" title="Analysis ready" aria-hidden />
              <span className="font-mono text-[13px] sm:text-[14px] text-c-text truncate min-w-0 max-w-[100px] sm:max-w-[160px] md:max-w-[200px] lg:max-w-[280px] xl:max-w-[360px]">
                {analysis?.repo_name || '...'}
              </span>
            </span>
            {analysis?.updated_at && (
              <button
                onClick={handleReanalyze}
                disabled={reanalyzing}
                style={{ transition: 'color 160ms var(--ease-out-strong)' }}
                className="hidden sm:flex items-center gap-1.5 text-[12px] sm:text-[13px] font-medium text-c-text-2 hover:text-c-text disabled:opacity-50 flex-shrink-0"
                title={`Last analyzed ${timeAgo(analysis.updated_at)}. Click to re-analyze.`}
              >
                {reanalyzing ? <Loader2 size={12} className="animate-spin text-c-accent" /> : <RefreshCw size={12} />}
                <span className="hidden lg:inline">{reanalyzing ? 'Analyzing…' : timeAgo(analysis.updated_at)}</span>
              </button>
            )}
          </div>

          {/* Center tabs — md+ desktop/tablet landscape; icon-only until xl */}
          <div className="hidden md:flex justify-center min-w-0 px-1">
            <DashboardTabs
              activeTab={activeTab}
              onChange={(id) => {
                setActiveTab(id);
                if (id !== 'explore') setSelectedFile('');
              }}
              tabs={[
                { id: 'explore', Icon: LayoutGrid, label: 'Explore' },
                { id: 'chat', Icon: MessageSquare, label: 'Chat' },
                { id: 'system', Icon: Terminal, label: 'System' },
              ]}
            />
          </div>

          <div className="flex items-center justify-end gap-1 sm:gap-1.5 lg:gap-2 min-w-0">
            <ThemeToggle />
            {userPlan === 'free' && (
              <button
                onClick={() => setShowUpgradeModal(true)}
                style={{ transition: 'color 160ms var(--ease-out-strong), background-color 160ms var(--ease-out-strong)' }}
                className="hidden sm:flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-[12px] sm:text-[13px] font-medium text-c-text-2 hover:text-c-accent hover:bg-c-accent-soft flex-shrink-0"
                title="Upgrade plan"
              >
                <Zap size={11} /> <span className="hidden lg:inline">Upgrade</span>
              </button>
            )}
            <button
              onClick={() => router.push('/profile')}
              style={{ transition: 'color 160ms var(--ease-out-strong), background-color 160ms var(--ease-out-strong)' }}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 lg:px-3.5 py-1.5 rounded-md text-[13px] font-medium text-c-text-2 hover:text-c-text hover:bg-c-overlay-3 flex-shrink-0"
              title="Profile"
            >
              <UserCircle size={14} />
              <span className="hidden xl:inline">Profile</span>
            </button>
            <button
              onClick={() => router.push('/')}
              style={{ transition: 'background-color 160ms var(--ease-out-strong), transform 160ms var(--ease-out-strong)' }}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 lg:px-3.5 py-1.5 rounded-md text-[13px] font-semibold text-c-bg bg-c-accent hover:opacity-90 flex-shrink-0"
              title="New analysis"
            >
              <Plus size={14} strokeWidth={2.4} />
              <span className="hidden xl:inline">New</span>
            </button>
            {rightPanel.collapsed && (
              <button
                onClick={() => rightPanel.setCollapsed(false)}
                style={{ transition: 'color 160ms var(--ease-out-strong), background-color 160ms var(--ease-out-strong)' }}
                className="p-1.5 rounded-md text-c-text-3 hover:text-c-text-2 hover:bg-c-overlay-3 hidden lg:block flex-shrink-0"
                title="Show inspector panel"
              >
                <PanelRightOpen size={15} />
              </button>
            )}
          </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
            className="flex-1 flex flex-col min-h-0 overflow-hidden bg-c-surface dashboard-panel-solid"
          >
            {activeTab === 'chat' && (
              <ChatView
                analysis={analysis}
                messages={messages}
                loading={chatLoading}
                streamStatus={streamStatus}
                query={query}
                setQuery={setQuery}
                handleSend={handleSend}
                suggestions={suggestions}
                chatHistory={chatHistory}
                onSelectHistory={handleSelectHistory}
                onNewChat={handleNewChat}
                onDeleteHistory={handleDeleteHistory}
                onStopGeneration={handleStopGeneration}
                onRenameHistory={handleRenameHistory}
                onShareHistory={handleShareHistory}
                sharingChatId={sharingChatId}
                historyLoaded={historyLoaded}
                setHistoryLoaded={setHistoryLoaded}
                onNavigateToFile={handleNavigateToFile}
                activeChatId={activeChatId}
                switchingChat={switchingChat}
              />
            )}
            {activeTab === 'explore' && <ExploreView analysis={analysis} selectedFile={selectedFile} onSelectFile={setSelectedFile} onContinueInChat={(userQuery, hiddenContext) => { setMessages([]); setActiveChatId(crypto.randomUUID()); setActiveTab('chat'); setTimeout(() => handleSend(userQuery, [], hiddenContext), 50); }} />}
            {activeTab === 'system' && <SystemTabComponent analysisId={analysisId} userPlan={userPlan} onUpgrade={() => setShowUpgradeModal(true)} onContinueInChat={(userQuery, hiddenContext) => { setMessages([]); setActiveChatId(crypto.randomUUID()); setActiveTab('chat'); setTimeout(() => handleSend(userQuery, [], hiddenContext), 50); }} />}
          </motion.div>
        </AnimatePresence>

        {/* Mobile bottom tab bar */}
        <div className="md:hidden flex-shrink-0 border-t border-c-line bg-c-surface-2 safe-area-pb">
          <div className="flex items-center justify-around py-2 px-1">
            {[
              { id: 'explore', Icon: LayoutGrid, label: 'Explore' },
              { id: 'chat', Icon: MessageSquare, label: 'Chat' },
              { id: 'system', Icon: Terminal, label: 'System' },
            ].map(({ id, Icon, label }) => (
              <button key={id} onClick={() => { setActiveTab(id); if (id !== 'explore') setSelectedFile(''); }}
                className={`flex flex-col items-center gap-0.5 px-2 sm:px-3 py-1 rounded-lg transition-colors min-w-[3.25rem] ${
                  activeTab === id ? 'text-c-lime' : 'text-c-text-2'
                }`}>
                <Icon size={18} strokeWidth={activeTab === id ? 2.2 : 1.5} />
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            ))}
            <button onClick={() => setMobileHistoryOpen(true)}
              className={`flex flex-col items-center gap-0.5 px-2 sm:px-3 py-1 rounded-lg transition-colors min-w-[3.25rem] ${mobileHistoryOpen ? 'text-c-lime' : 'text-c-text-2'}`}>
              <Clock size={18} strokeWidth={1.5} />
              <span className="text-[10px] font-medium">History</span>
            </button>
          </div>
        </div>

        {/* Mobile chat history drawer */}
        {mobileHistoryOpen && (
          <div className="md:hidden fixed inset-0 z-[200] flex flex-col justify-end" onClick={() => setMobileHistoryOpen(false)}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <div className="relative bg-vb-bg1 border-t border-c-line-2 rounded-t-2xl max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
              {/* Handle */}
              <div className="flex justify-center py-2">
                <div className="w-8 h-1 rounded-full bg-white/[0.15]" />
              </div>
              {/* Header */}
              <div className="flex items-center justify-between px-4 pb-3 border-b border-c-line">
                <span className="text-[13px] font-medium text-vb-ink">Chat History</span>
                <button onClick={() => { handleNewChat(); setMobileHistoryOpen(false); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] text-vb-accent border border-vb-accent/20 bg-vb-accent/[0.04]">
                  <Plus size={11} /> New chat
                </button>
              </div>
              {/* Chat list */}
              <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
                {chatHistory.length === 0 ? (
                  <p className="text-[12px] text-vb-ink4 text-center py-8">No conversations yet</p>
                ) : (
                  chatHistory.map((item) => (
                    <button key={item.id}
                      onClick={() => { handleSelectHistory(item); setMobileHistoryOpen(false); }}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-[12px] transition-colors flex items-center gap-2 ${
                        item.id === activeChatId ? 'bg-c-lime-soft text-c-text border border-c-lime-line' : 'text-vb-ink2 hover:bg-c-overlay-3'
                      }`}>
                      <Clock size={11} className={item.id === activeChatId ? 'text-c-lime flex-shrink-0' : 'text-vb-ink4 flex-shrink-0'} />
                      <span className="truncate">{item.title || 'New chat'}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Right sidebar — hidden on small screens */}
      {!rightPanel.collapsed && (
        <>
          <div onMouseDown={rightPanel.onMouseDown} className="w-[3px] flex-shrink-0 cursor-col-resize bg-c-overlay-3 hover:bg-vb-accent/30 active:bg-vb-accent/50 transition-colors hidden lg:block" />
          <aside style={{ width: `${rightPanel.width}px` }} className="flex-shrink-0 bg-c-surface-2 flex-col overflow-hidden hidden lg:flex border-l border-c-line">
            <div className="flex items-center justify-between px-4 py-3 border-b border-c-line">
              <span className="text-[11px] font-medium text-vb-ink3 uppercase tracking-wider">{selectedFile ? 'Symbol Inspector' : 'Identity Profile'}</span>
              <button onClick={() => rightPanel.setCollapsed(true)} className="p-1 rounded-md text-vb-ink3 hover:text-vb-ink2 hover:bg-c-overlay-3 transition-colors" title="Hide panel">
                <PanelRightClose size={13} />
              </button>
            </div>
            <RightPanel analysis={analysis} selectedFile={selectedFile} activeTab={activeTab} userPlan={userPlan} activeChatId={activeChatId} sharingChatId={sharingChatId} onShareChat={() => handleShareHistory({ id: activeChatId })} />
          </aside>
        </>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={dismissToast} />}
      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} currentPlan={userPlan} />
    </div>
  );
}
