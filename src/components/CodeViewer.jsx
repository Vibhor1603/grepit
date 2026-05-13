"use client";
import { useState, useMemo, useEffect } from 'react';
import { Highlight, themes } from 'prism-react-renderer';
import { X } from 'lucide-react';

/* ── Language detection from file extension ── */
const EXT_TO_LANG = {
  js: 'javascript', jsx: 'jsx', ts: 'typescript', tsx: 'tsx',
  py: 'python', rb: 'ruby', go: 'go', rs: 'rust',
  java: 'java', kt: 'kotlin', swift: 'swift', cs: 'csharp',
  cpp: 'cpp', c: 'c', h: 'c', hpp: 'cpp',
  php: 'php', sql: 'sql', sh: 'bash', bash: 'bash', zsh: 'bash',
  html: 'markup', htm: 'markup', xml: 'markup', svg: 'markup',
  css: 'css', scss: 'css', less: 'css',
  json: 'json', yaml: 'yaml', yml: 'yaml', toml: 'toml',
  md: 'markdown', mdx: 'markdown',
  dockerfile: 'docker', graphql: 'graphql', gql: 'graphql',
  dart: 'dart', lua: 'lua', r: 'r', scala: 'scala',
  vue: 'markup', svelte: 'markup', astro: 'markup',
};

function detectLanguage(filePath) {
  if (!filePath) return 'javascript';
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  return EXT_TO_LANG[ext] || 'javascript';
}

/* ── Block detection — language-agnostic patterns ── */
const BLOCK_PATTERNS = [
  // JS/TS: function, class, const/let/var with arrow or function
  /^\s*(export\s+)?(default\s+)?(async\s+)?(function\*?|class)\s+(\w+)/,
  /^\s*(export\s+)?(const|let|var)\s+(\w+)\s*=\s*(async\s+)?\(/,
  /^\s*(export\s+)?(const|let|var)\s+(\w+)\s*=\s*(async\s+)?function/,
  // Python: def, class
  /^\s*(async\s+)?def\s+(\w+)/,
  /^\s*class\s+(\w+)/,
  // Go: func, type
  /^\s*func\s+(\(.*?\)\s*)?(\w+)/,
  /^\s*type\s+(\w+)\s+(struct|interface)/,
  // Rust: fn, struct, impl, enum, trait
  /^\s*(pub\s+)?(async\s+)?fn\s+(\w+)/,
  /^\s*(pub\s+)?(struct|enum|trait|impl)\s+(\w+)/,
  // Java/Kotlin/C#: public/private/protected class/method
  /^\s*(public|private|protected|internal)?\s*(static\s+)?(async\s+)?(class|interface|enum|void|int|string|bool|var|val|fun)\s+(\w+)/,
  // C/C++: function definitions
  /^\s*(\w+[\s*]+)+(\w+)\s*\([^)]*\)\s*\{?\s*$/,
  // Ruby: def, class, module
  /^\s*(def|class|module)\s+(\w+)/,
  // PHP: function, class
  /^\s*(public|private|protected)?\s*(static\s+)?function\s+(\w+)/,
  /^\s*(abstract\s+)?class\s+(\w+)/,
];

function getBlockName(line) {
  for (const pattern of BLOCK_PATTERNS) {
    const match = line.match(pattern);
    if (match) {
      // Find the last captured group that looks like an identifier
      const groups = match.filter(g => g && /^\w+$/.test(g) && g.length > 1 && !/^(export|default|async|public|private|protected|static|const|let|var|function|class|def|fn|pub|struct|enum|trait|impl|interface|void|int|string|bool|val|fun|module|abstract|internal)$/.test(g));
      return groups[groups.length - 1] || null;
    }
  }
  return null;
}

/* ── Explanation content renderer (handles inline markdown) ── */
function ExplanationContent({ text }) {
  // Simple inline markdown: **bold**, `code`, *italic*
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g).filter(Boolean);
  return (
    <p className="text-[12px] text-vb-ink2 leading-[1.7]">
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="font-semibold text-vb-ink">{part.slice(2, -2)}</strong>;
        if (part.startsWith('`') && part.endsWith('`')) return <code key={i} className="px-1 py-0.5 bg-white/[0.04] rounded text-[11px] font-mono text-vb-ink">{part.slice(1, -1)}</code>;
        if (part.startsWith('*') && part.endsWith('*')) return <em key={i} className="italic">{part.slice(1, -1)}</em>;
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
}

/* ── Custom dark theme matching our palette ── */
const viboTheme = {
  ...themes.vsDark,
  plain: { color: '#b0b0b8', backgroundColor: 'transparent' },
  styles: [
    ...themes.vsDark.styles,
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

/* ── Main CodeViewer Component ── */
export default function CodeViewer({ code, filePath, analysisId, onContinueInChat }) {
  const [hoveredBlock, setHoveredBlock] = useState(null);
  const [explanation, setExplanation] = useState('');
  const [explaining, setExplaining] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [matchLines, setMatchLines] = useState([]);
  const [currentMatch, setCurrentMatch] = useState(0);
  const [chatInput, setChatInput] = useState('');

  const language = detectLanguage(filePath);
  const lines = useMemo(() => code.split('\n'), [code]);

  const blockStarts = useMemo(() => {
    const map = {};
    lines.forEach((line, i) => { const name = getBlockName(line); if (name) map[i] = name; });
    return map;
  }, [lines]);

  // Search logic
  useEffect(() => {
    if (!searchQuery.trim()) { setMatchLines([]); return; }
    const q = searchQuery.toLowerCase();
    const matches = [];
    lines.forEach((line, i) => { if (line.toLowerCase().includes(q)) matches.push(i); });
    setMatchLines(matches);
    setCurrentMatch(0);
  }, [searchQuery, lines]);

  // Keyboard shortcut: Cmd+F to open search
  useEffect(() => {
    const handler = (e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'f') { e.preventDefault(); setSearchOpen(true); } if (e.key === 'Escape') setSearchOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleExplain = async (lineIdx) => {
    const name = blockStarts[lineIdx];
    if (!name || !analysisId) return;
    setExplaining(true); setExplanation('');
    let endLine = lineIdx + 1;
    while (endLine < lines.length && endLine < lineIdx + 25) { if (endLine > lineIdx && blockStarts[endLine]) break; endLine++; }
    const blockCode = lines.slice(lineIdx, endLine).join('\n');
    try {
      const res = await fetch('/api/query', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: `Briefly explain what "${name}" does in 2-3 sentences. Be specific.\n\nCode:\n${blockCode}`, analysisId }) });
      const data = await res.json();
      if (res.ok && data.response) { setExplanation(data.response.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/## Follow-up[\s\S]*/i, '').trim()); }
      else { setExplanation('Could not generate explanation.'); }
    } catch { setExplanation('Failed to connect.'); }
    setExplaining(false);
  };

  return (
    <div className="relative h-full flex flex-col text-[12px]">
      {/* Search bar */}
      {searchOpen && (
        <div className="absolute top-2 right-4 z-30 flex items-center gap-2 bg-vb-bg2 border border-white/[0.1] rounded-lg px-3 py-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.4)]">
          <input
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') setCurrentMatch(prev => (prev + 1) % Math.max(matchLines.length, 1)); if (e.key === 'Escape') setSearchOpen(false); }}
            placeholder="Search..."
            className="bg-transparent text-[12px] text-vb-ink placeholder:text-vb-ink4 outline-none w-40 caret-vb-accent"
          />
          {matchLines.length > 0 && <span className="text-[10px] text-vb-ink3">{currentMatch + 1}/{matchLines.length}</span>}
          <button onClick={() => setSearchOpen(false)} className="text-vb-ink4 hover:text-vb-ink3"><X size={12} /></button>
        </div>
      )}

      <Highlight theme={viboTheme} code={code} language={language}>
        {({ tokens, getLineProps, getTokenProps }) => (
          <div className="flex-1 overflow-auto">
            <div className="flex min-w-0">
              {/* Line numbers */}
              <div className="flex-shrink-0 py-3 pl-3 pr-1 select-none border-r border-white/[0.04] sticky left-0 bg-vb-chat z-[1]">
                {tokens.map((_, i) => (
                  <div key={i} className="text-[11px] font-mono text-vb-ink4 leading-[1.6] text-right pr-2 min-w-[3ch]">{i + 1}</div>
                ))}
              </div>
              {/* Code */}
              <pre className="flex-1 py-3 px-3 overflow-x-auto m-0 text-[12px]">
                {tokens.map((line, i) => {
                  const isBlockStart = blockStarts[i];
                  const isMatch = matchLines.includes(i);
                  const isCurrentMatch = matchLines[currentMatch] === i;
                  return (
                    <div
                      key={i}
                      {...getLineProps({ line })}
                      id={isCurrentMatch ? 'search-current' : undefined}
                      className={`leading-[1.6] relative group ${isBlockStart ? 'hover:bg-vb-accent/[0.03] rounded cursor-pointer' : ''} ${isMatch ? 'bg-vb-accent/[0.06]' : ''} ${isCurrentMatch ? 'bg-vb-accent/[0.12]' : ''}`}
                      onMouseEnter={() => isBlockStart && setHoveredBlock({ line: i, name: isBlockStart })}
                      onMouseLeave={() => setHoveredBlock(null)}
                    >
                      {line.map((token, j) => <span key={j} {...getTokenProps({ token })} />)}
                      {isBlockStart && hoveredBlock?.line === i && (
                        <button onClick={(e) => { e.stopPropagation(); handleExplain(i); }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] text-vb-accent bg-vb-bg2 border border-vb-accent/20 hover:bg-vb-accent/10 transition-all z-10 shadow-sm"
                          title="Explain this block">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                          Explain
                        </button>
                      )}
                    </div>
                  );
                })}
              </pre>
            </div>
          </div>
        )}
      </Highlight>

      {/* Explanation panel — positioned beside the code, auto-height */}
      {(explaining || explanation) && (
        <div className="absolute top-4 right-4 w-[300px] max-h-[60%] bg-vb-bg2 border border-white/[0.08] rounded-lg overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-20 flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06] bg-white/[0.02] flex-shrink-0">
            <span className="text-[11px] text-vb-ink font-medium truncate">{hoveredBlock?.name || 'Explanation'}</span>
            <button onClick={() => { setExplanation(''); setHoveredBlock(null); setChatInput(''); }} className="text-vb-ink4 hover:text-vb-ink3 transition-colors flex-shrink-0"><X size={12} /></button>
          </div>
          <div className="overflow-y-auto px-3 py-3 flex-shrink">
            {explaining ? (
              <div className="flex items-center gap-2 text-[11px] text-vb-ink3">
                <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-20"/><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                Analyzing...
              </div>
            ) : (
              <ExplanationContent text={explanation} />
            )}
          </div>
          {/* Ask in chat input */}
          {!explaining && explanation && (
            <div className="px-3 py-2 border-t border-white/[0.06] flex-shrink-0">
              <div className="flex items-center gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && chatInput.trim()) { onContinueInChat?.(chatInput.trim(), `Context: ${hoveredBlock?.name} in ${filePath}\n\n${explanation}`); setExplanation(''); setHoveredBlock(null); setChatInput(''); } }}
                  placeholder="Ask about this..."
                  className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-md px-2.5 py-1.5 text-[11px] text-vb-ink placeholder:text-vb-ink4 outline-none focus:border-vb-accent/20 caret-vb-accent"
                />
                <button
                  onClick={() => { if (chatInput.trim()) { onContinueInChat?.(chatInput.trim(), `Context: ${hoveredBlock?.name} in ${filePath}\n\n${explanation}`); setExplanation(''); setHoveredBlock(null); setChatInput(''); } }}
                  disabled={!chatInput.trim()}
                  className="px-2.5 py-1.5 rounded-md text-[10px] text-vb-accent border border-vb-accent/15 bg-vb-accent/[0.04] hover:bg-vb-accent/[0.08] disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0">
                  Ask in chat
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
