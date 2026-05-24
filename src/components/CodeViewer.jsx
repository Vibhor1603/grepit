"use client";
import { useState, useMemo, useEffect } from 'react';
import { Highlight, themes } from 'prism-react-renderer';
import { X } from 'lucide-react';
import { useExplainCode } from '../hooks/useApi';

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

/* ── Explanation content renderer (handles markdown) ── */
function ExplanationContent({ text }) {
  const renderInline = (line) => {
    const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g).filter(Boolean);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="font-semibold text-vb-ink">{part.slice(2, -2)}</strong>;
      if (part.startsWith('`') && part.endsWith('`')) return <code key={i} className="px-1 py-0.5 bg-white/[0.04] rounded text-[10px] font-mono text-vb-ink">{part.slice(1, -1)}</code>;
      if (part.startsWith('*') && part.endsWith('*')) return <em key={i} className="italic">{part.slice(1, -1)}</em>;
      return <span key={i}>{part}</span>;
    });
  };

  const lines = text.split('\n');
  return (
    <div className="text-[12px] text-vb-ink2 leading-[1.7] space-y-1.5">
      {lines.map((line, i) => {
        if (!line.trim()) return null;
        if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) return <div key={i} className="flex gap-1.5 pl-2"><span className="text-vb-ink4">•</span><span>{renderInline(line.replace(/^\s*[-*]\s/, ''))}</span></div>;
        if (/^#{1,3}\s/.test(line)) return <div key={i} className="font-semibold text-vb-ink text-[12px] mt-1">{renderInline(line.replace(/^#{1,3}\s/, ''))}</div>;
        return <div key={i}>{renderInline(line)}</div>;
      })}
    </div>
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
export default function CodeViewer({ code, filePath, analysisId, onContinueInChat, fontSize = 12, searchQuery = '' }) {
  const [hoveredBlock, setHoveredBlock] = useState(null);
  const [explanation, setExplanation] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [hintDismissed, setHintDismissed] = useState(() => {
    if (typeof window !== 'undefined') return sessionStorage.getItem('grepit-code-hint-dismissed') === 'true';
    return false;
  });
  const explainMutation = useExplainCode();
  const explaining = explainMutation.isPending;

  const language = detectLanguage(filePath);
  const lines = useMemo(() => code.split('\n'), [code]);

  const blockStarts = useMemo(() => {
    const map = {};
    lines.forEach((line, i) => { const name = getBlockName(line); if (name) map[i] = name; });
    return map;
  }, [lines]);

  const [matchLines, setMatchLines] = useState([]);
  const [currentMatch, setCurrentMatch] = useState(0);

  useEffect(() => {
    if (!searchQuery.trim()) { setMatchLines([]); return; }
    const q = searchQuery.toLowerCase();
    const matches = [];
    lines.forEach((line, i) => { if (line.toLowerCase().includes(q)) matches.push(i); });
    setMatchLines(matches);
    setCurrentMatch(0);
  }, [searchQuery, lines]);

  const handleExplain = (lineIdx) => {
    const name = blockStarts[lineIdx];
    if (!name || !analysisId) return;
    let endLine = lineIdx + 1;
    while (endLine < lines.length && endLine < lineIdx + 25) { if (endLine > lineIdx && blockStarts[endLine]) break; endLine++; }
    const blockCode = lines.slice(lineIdx, endLine).join('\n');
    explainMutation.mutate({ analysisId, name, code: blockCode }, {
      onSuccess: (result) => setExplanation(result),
      onError: () => setExplanation('Could not generate explanation.'),
    });
  };

  return (
    <div className="relative h-full flex flex-col" style={{ fontSize: `${fontSize}px` }}>
      {/* Hint banner — shows once per session */}
      {!hintDismissed && Object.keys(blockStarts).length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-vb-accent/[0.04] border-b border-vb-accent/10 flex-shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-vb-accent flex-shrink-0"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0018 8 6 6 0 006 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 019 14"/></svg>
          <span className="text-[11px] text-vb-accent/80 flex-1">
            <span className="hidden md:inline">Hover over any function or class to get an AI explanation</span>
            <span className="md:hidden">Tap any function or class name to get an AI explanation</span>
          </span>
          <button onClick={() => { setHintDismissed(true); sessionStorage.setItem('grepit-code-hint-dismissed', 'true'); }} className="text-vb-accent/50 hover:text-vb-accent transition-colors flex-shrink-0">
            <X size={12} />
          </button>
        </div>
      )}
      <Highlight theme={viboTheme} code={code} language={language}>
        {({ tokens, getLineProps, getTokenProps }) => (
          <div className="flex-1 overflow-auto">
            <div className="flex min-w-0">
              {/* Line numbers */}
              <div className="flex-shrink-0 py-3 pl-3 pr-1 select-none border-r border-white/[0.04] sticky left-0 bg-vb-chat z-[1]">
                {tokens.map((_, i) => (
                  <div key={i} className="font-mono text-vb-ink4 leading-[1.6] text-right pr-2 min-w-[3ch]" style={{ fontSize: `${Math.max(fontSize - 2, 9)}px` }}>{i + 1}</div>
                ))}
              </div>
              {/* Code */}
              <pre className="flex-1 py-3 px-3 overflow-x-auto m-0" style={{ fontSize: `${fontSize}px` }}>
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
                      onClick={() => { if (isBlockStart && window.innerWidth < 768) handleExplain(i); }}
                    >
                      {line.map((token, j) => <span key={j} {...getTokenProps({ token })} />)}
                      {isBlockStart && hoveredBlock?.line === i && (
                        <button onClick={(e) => { e.stopPropagation(); handleExplain(i); }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] text-vb-accent border border-vb-accent/25 bg-vb-accent/[0.08] hover:bg-vb-accent/[0.14] transition-all z-10"
                          title="Explain this block">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0018 8 6 6 0 006 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 019 14"/></svg>
                          Explain
                        </button>
                      )}
                      {/* Mobile: always show a subtle indicator for tappable blocks */}
                      {isBlockStart && !hoveredBlock && (
                        <span className="md:hidden absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-vb-accent/30" />
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
            <button onClick={() => { setExplanation(''); setHoveredBlock(null); setChatInput(''); }} className="w-[18px] h-[18px] md:w-[14px] md:h-[14px] rounded-full bg-[#ff5f57] hover:bg-[#ff3b30] transition-colors flex items-center justify-center flex-shrink-0" title="Close"><X size={9} strokeWidth={3} className="text-[#4a0000] opacity-100" /></button>
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
