"use client";
import { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Highlight, themes } from 'prism-react-renderer';
import { X } from 'lucide-react';
import { useExplainCode } from '../hooks/useApi';
import { detectCodeBlocks, buildBlockRanges, buildLineToBlockStart, getBlockEndLine } from '../lib/codeBlocks';
import FilePathDisplay, { looksLikeFilePath } from './FilePathDisplay';

const HOVER_COACH_KEY = 'grepit-hover-explain-coach-v1';

const INLINE_FILE_PATH =
  /([\w][\w\-./]*(?:\/[\w\-./]+)*\.(?:js|ts|jsx|tsx|css|json|md|html|py|rb|go|rs|yaml|yml|toml|sql|sh|env|vue|svelte|astro|mjs|cjs))(?:\:(\d+))?/gi;

function ExplainFileRef({ path, line }) {
  return (
    <span className="inline-flex items-baseline gap-0 px-1 py-px mx-0.5 rounded bg-vb-accent/[0.14] border border-vb-accent/35 font-mono text-[10px] align-baseline">
      <FilePathDisplay
        path={path}
        className="[&_.file-path-display__dir]:text-vb-accent/70 [&_.file-path-display__name]:text-vb-accent [&_.file-path-display__name]:font-semibold"
      />
      {line ? <span className="text-vb-accent/75">:{line}</span> : null}
    </span>
  );
}

function splitPlainWithFilePaths(text) {
  const parts = [];
  let last = 0;
  let match;
  INLINE_FILE_PATH.lastIndex = 0;
  while ((match = INLINE_FILE_PATH.exec(text)) !== null) {
    if (match.index > last) {
      parts.push({ type: 'text', value: text.slice(last, match.index) });
    }
    const path = match[1];
    if (looksLikeFilePath(path)) {
      parts.push({ type: 'file', path, line: match[2] });
    } else {
      parts.push({ type: 'text', value: match[0] });
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ type: 'text', value: text.slice(last) });
  return parts.length ? parts : [{ type: 'text', value: text }];
}

function renderPlainSegment(text, keyPrefix) {
  return splitPlainWithFilePaths(text).map((part, i) => {
    if (part.type === 'file') {
      return <ExplainFileRef key={`${keyPrefix}-f-${i}`} path={part.path} line={part.line} />;
    }
    return <span key={`${keyPrefix}-t-${i}`}>{part.value}</span>;
  });
}

function detectLanguage(filePath) {
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
  if (!filePath) return 'javascript';
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  return EXT_TO_LANG[ext] || 'javascript';
}

function ExplanationContent({ text }) {
  const renderInline = (line, lineKey) => {
    const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g).filter(Boolean);
    return parts.map((part, i) => {
      const key = `${lineKey}-${i}`;
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={key} className="font-semibold text-vb-ink">
            {renderInline(part.slice(2, -2), `${key}-b`)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        const inner = part.slice(1, -1);
        if (looksLikeFilePath(inner.replace(/\:\d+$/, ''))) {
          const lineMatch = inner.match(/\:(\d+)$/);
          const pathOnly = lineMatch ? inner.slice(0, -lineMatch[0].length) : inner;
          return <ExplainFileRef key={key} path={pathOnly} line={lineMatch?.[1]} />;
        }
        return (
          <code key={key} className="px-1 py-0.5 bg-c-overlay-3 rounded text-[10px] font-mono text-vb-ink">
            {inner}
          </code>
        );
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={key} className="italic">{part.slice(1, -1)}</em>;
      }
      return <span key={key}>{renderPlainSegment(part, key)}</span>;
    });
  };

  const lines = text.split('\n');
  return (
    <div className="text-[12px] text-vb-ink2 leading-[1.7] space-y-1.5">
      {lines.map((line, i) => {
        if (!line.trim()) return null;
        if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
          return (
            <div key={i} className="flex gap-1.5 pl-2">
              <span className="text-vb-ink4">•</span>
              <span>{renderInline(line.replace(/^\s*[-*]\s/, ''), `l${i}`)}</span>
            </div>
          );
        }
        if (/^#{1,3}\s/.test(line)) {
          return (
            <div key={i} className="font-semibold text-vb-ink text-[12px] mt-1">
              {renderInline(line.replace(/^#{1,3}\s/, ''), `h${i}`)}
            </div>
          );
        }
        return <div key={i}>{renderInline(line, `p${i}`)}</div>;
      })}
    </div>
  );
}

const viboTheme = {
  ...themes.vsDark,
  plain: { color: 'var(--c-text-2)', backgroundColor: 'transparent' },
  styles: [
    ...themes.vsDark.styles,
    { types: ['keyword', 'builtin'], style: { color: 'var(--c-accent)' } },
    { types: ['function', 'method'], style: { color: '#7ca8e8' } },
    { types: ['string', 'char'], style: { color: '#7dd3a8' } },
    { types: ['number', 'boolean'], style: { color: '#e4c06c' } },
    { types: ['comment'], style: { color: '#3A4350', fontStyle: 'italic' } },
    { types: ['class-name', 'type'], style: { color: '#b4a0d4' } },
    { types: ['operator', 'punctuation'], style: { color: 'var(--c-text-3)' } },
    { types: ['variable', 'constant'], style: { color: 'var(--c-text)' } },
    { types: ['property'], style: { color: '#7cc8d4' } },
    { types: ['tag'], style: { color: '#e87c7c' } },
    { types: ['attr-name'], style: { color: '#e4c06c' } },
    { types: ['attr-value'], style: { color: '#7dd3a8' } },
  ],
};

function ExplainFeatureCoach({ prefersTap, onDismiss }) {
  const [mounted, setMounted] = useState(false);
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    setMounted(true);
    const t = setInterval(() => setPulse((p) => (p + 1) % 2), 1200);
    return () => clearInterval(t);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="code-explain-coach-root fixed inset-0 z-[500] flex items-end sm:items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true" aria-label="Code explain tip">
      <button type="button" className="absolute inset-0 bg-black/35" aria-label="Dismiss" onClick={onDismiss} />
      <div className="relative w-full max-w-[380px] rounded-xl border border-c-line-2 bg-c-surface shadow-[0_24px_64px_rgba(0,0,0,0.45)] overflow-hidden pointer-events-auto">
        <div className="px-4 py-3 border-b border-c-line bg-c-surface-2">
          <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-c-accent">
            {prefersTap ? "Tap to explain" : "Hover to explain"}
          </p>
        </div>

        <div className="p-4">
          <div className="rounded-lg border border-c-line bg-c-bg overflow-hidden mb-4">
            <div className="px-3 py-2 border-b border-c-line font-mono text-[10px] text-c-text-4">example.ts</div>
            <div className="px-3 py-2.5 font-mono text-[11px] leading-[1.6]">
              <div className="text-c-text-3">export async function</div>
              <div
                className={`rounded px-1 -mx-1 transition-colors duration-300 ${pulse ? "bg-c-accent/15 ring-1 ring-c-accent/40" : "bg-transparent"}`}
              >
                <span className="text-c-accent">fetchUser</span>
                <span className="text-c-text-3">(id: string) {"{"}</span>
              </div>
              <div className="text-c-text-4 pl-3">…</div>
            </div>
            <div className="px-3 py-2 border-t border-c-line flex justify-end">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium text-c-accent border border-c-accent/35 bg-c-accent/10">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0018 8 6 6 0 006 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 019 14"/></svg>
                Explain
              </span>
            </div>
          </div>

          <p className="text-[12px] text-c-text-2 leading-[1.55] mb-4">
            {prefersTap
              ? "Tap any function, class, or method for an inline AI explanation with file context."
              : "Hover any function, class, or method — then click Explain for an inline AI summary."}
          </p>
          <button
            type="button"
            onClick={onDismiss}
            className="w-full py-2.5 rounded-lg text-[13px] font-semibold bg-c-accent text-c-bg hover:opacity-90 transition-opacity"
          >
            Got it
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function CodeViewer({ code, filePath, analysisId, onContinueInChat, fontSize = 12, searchQuery = '' }) {
  const [hoveredBlock, setHoveredBlock] = useState(null);
  const [activeExplainBlock, setActiveExplainBlock] = useState(null);
  const [explanation, setExplanation] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [coachDismissed, setCoachDismissed] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem(HOVER_COACH_KEY) === '1';
    return false;
  });
  const explainMutation = useExplainCode();
  const explaining = explainMutation.isPending;
  const scrollRef = useRef(null);
  const explainGenRef = useRef(0);
  const [prefersTap, setPrefersTap] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(hover: none), (pointer: coarse)");
    const update = () => setPrefersTap(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  const language = detectLanguage(filePath);
  const lines = useMemo(() => code.split('\n'), [code]);

  const blockStarts = useMemo(() => detectCodeBlocks(lines), [lines]);

  const blockRanges = useMemo(() => buildBlockRanges(lines, blockStarts), [lines, blockStarts]);
  const lineToBlockStart = useMemo(() => buildLineToBlockStart(blockRanges), [blockRanges]);

  const firstBlockLineIdx = useMemo(() => {
    const keys = Object.keys(blockStarts).map(Number).sort((a, b) => a - b);
    return keys.length > 0 ? keys[0] : null;
  }, [blockStarts]);

  const showCoach = !coachDismissed && firstBlockLineIdx != null && blockStarts[firstBlockLineIdx];

  const dismissCoach = () => {
    setCoachDismissed(true);
    try { localStorage.setItem(HOVER_COACH_KEY, '1'); } catch {}
  };

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
    const block = blockStarts[lineIdx];
    if (!block || !analysisId) return;
    const range = blockRanges[lineIdx];
    const endLine = range ? range.end + 1 : getBlockEndLine(lines, lineIdx, blockStarts) + 1;
    const blockCode = lines.slice(lineIdx, endLine).join('\n');
    const blockMeta = { line: lineIdx, name: block.name, kind: block.kind };
    setActiveExplainBlock(blockMeta);
    setHoveredBlock(blockMeta);
    setExplanation('');
    const gen = ++explainGenRef.current;
    explainMutation.mutate({ analysisId, name: block.name, code: blockCode }, {
      onSuccess: (result) => {
        if (gen !== explainGenRef.current) return;
        setExplanation(result);
      },
      onError: () => {
        if (gen !== explainGenRef.current) return;
        setExplanation('Could not generate explanation.');
      },
    });
  };

  const closeExplanation = () => {
    explainGenRef.current += 1;
    explainMutation.reset();
    setExplanation('');
    setActiveExplainBlock(null);
    setHoveredBlock(null);
    setChatInput('');
  };

  const explainPanelOpen = explaining || Boolean(explanation) || Boolean(activeExplainBlock);
  const panelTitle = activeExplainBlock?.name || hoveredBlock?.name || 'Explanation';

  return (
    <div className="relative h-full min-h-0 flex flex-col" style={{ fontSize: `${fontSize}px` }}>
      {showCoach ? (
        <ExplainFeatureCoach prefersTap={prefersTap} onDismiss={dismissCoach} />
      ) : null}
      <Highlight theme={viboTheme} code={code} language={language}>
        {({ tokens, getLineProps, getTokenProps }) => (
          <div className="flex-1 min-h-0 overflow-auto relative" ref={scrollRef}>
            <div className="flex min-w-0 min-h-full">
              <div className="flex-shrink-0 py-3 pl-3 pr-1 select-none border-r border-c-line sticky left-0 bg-vb-chat z-[1]">
                {tokens.map((_, i) => (
                  <div key={i} className="font-mono text-vb-ink4 leading-[1.6] text-right pr-2 min-w-[3ch]" style={{ fontSize: `${Math.max(fontSize - 2, 9)}px` }}>{i + 1}</div>
                ))}
              </div>
              <pre className="flex-1 min-w-0 py-3 pl-3 pr-4 overflow-x-auto m-0" style={{ fontSize: `${fontSize}px` }}>
                {tokens.map((line, i) => {
                  const block = blockStarts[i];
                  const blockStartLine = lineToBlockStart[i];
                  const blockRange = blockStartLine != null ? blockRanges[blockStartLine] : null;
                  const isMatch = matchLines.includes(i);
                  const isCurrentMatch = matchLines[currentMatch] === i;
                  const isInHoveredBlock = hoveredBlock?.line === blockStartLine;
                  const isBlockStart = block != null;
                  const isBlockActive = blockStartLine != null && isInHoveredBlock;
                  const isBlockActiveSingle = isBlockActive && blockRange && blockRange.start === blockRange.end;
                  const isBlockActiveFirst = isBlockActive && !isBlockActiveSingle && blockRange && i === blockRange.start;
                  const isBlockActiveLast = isBlockActive && !isBlockActiveSingle && blockRange && i === blockRange.end;

                  return (
                    <div
                      key={i}
                      {...getLineProps({ line })}
                      id={isCurrentMatch ? 'search-current' : undefined}
                      className={[
                        'leading-[1.6] relative group flex items-center gap-2 min-w-0',
                        blockStartLine != null ? 'code-explain-line' : '',
                        isBlockActive ? 'code-explain-line--active' : '',
                        isBlockActiveSingle ? 'code-explain-line--active-single' : '',
                        isBlockActiveFirst ? 'code-explain-line--active-first' : '',
                        isBlockActiveLast ? 'code-explain-line--active-last' : '',
                        isBlockActive && !isBlockActiveSingle && !isBlockActiveFirst && !isBlockActiveLast ? 'code-explain-line--active-mid' : '',
                        isMatch ? 'bg-vb-accent/[0.06]' : '',
                        isCurrentMatch ? 'bg-vb-accent/[0.12]' : '',
                      ].filter(Boolean).join(' ')}
                      data-block-start={blockStartLine ?? undefined}
                      onMouseEnter={() => {
                        if (blockStartLine == null) return;
                        const meta = blockStarts[blockStartLine];
                        setHoveredBlock({ line: blockStartLine, name: meta.name, kind: meta.kind });
                      }}
                      onMouseLeave={(e) => {
                        const to = e.relatedTarget;
                        const toLine = to instanceof Element ? to.closest('[data-block-start]') : null;
                        if (toLine && toLine.dataset.blockStart === String(blockStartLine)) return;
                        setHoveredBlock(null);
                      }}
                      onClick={() => {
                        if (blockStartLine == null || !prefersTap) return;
                        const meta = blockStarts[blockStartLine];
                        setHoveredBlock({ line: blockStartLine, name: meta.name, kind: meta.kind });
                      }}
                    >
                      <span className="flex-1 min-w-0">
                        {line.map((token, j) => <span key={j} {...getTokenProps({ token })} />)}
                      </span>
                      {isBlockStart && isInHoveredBlock ? (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleExplain(i); }}
                          className="code-explain-btn flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium text-vb-accent bg-vb-accent/[0.12] hover:bg-vb-accent/[0.2] z-10"
                          title={`Explain ${block.name}`}
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0018 8 6 6 0 006 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 019 14"/></svg>
                          Explain
                        </button>
                      ) : null}
                      {isBlockStart && prefersTap && !isInHoveredBlock ? (
                        <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-vb-accent/45" aria-hidden />
                      ) : null}
                    </div>
                  );
                })}
              </pre>
            </div>
          </div>
        )}
      </Highlight>

      {explainPanelOpen ? (
        <div className="absolute top-4 right-4 w-[min(320px,calc(100%-2rem))] max-h-[60%] bg-c-surface border-2 border-vb-accent/40 rounded-xl overflow-hidden shadow-[0_16px_48px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.06)] z-30 flex flex-col ring-2 ring-vb-accent/15">
          <div className="h-[3px] bg-vb-accent flex-shrink-0" aria-hidden />
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-vb-accent/20 bg-vb-accent/[0.06] flex-shrink-0">
            <span className="text-[11px] text-vb-ink font-semibold truncate">{panelTitle}</span>
            <button
              type="button"
              onClick={closeExplanation}
              className="w-5 h-5 rounded-full bg-[#ff5f57] hover:bg-[#ff3b30] transition-colors flex items-center justify-center flex-shrink-0"
              title="Close"
              aria-label="Close explanation"
            >
              <X size={10} strokeWidth={3} className="text-[#4a0000] opacity-100" />
            </button>
          </div>
          <div className="overflow-y-auto px-3 py-3 flex-shrink min-h-[72px]">
            {explaining ? (
              <div className="flex items-center gap-2 text-[11px] text-vb-ink3">
                <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-20"/><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                Analyzing...
              </div>
            ) : (
              <ExplanationContent text={explanation} />
            )}
          </div>
          {!explaining && explanation ? (
            <div className="px-3 py-2 border-t border-c-line flex-shrink-0">
              <div className="flex items-center gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && chatInput.trim()) { onContinueInChat?.(chatInput.trim(), `Context: ${panelTitle} in ${filePath}\n\n${explanation}`); closeExplanation(); } }}
                  placeholder="Ask about this..."
                  className="flex-1 bg-c-overlay-2 border border-c-line rounded-md px-2.5 py-1.5 text-[11px] text-vb-ink placeholder:text-vb-ink4 outline-none focus:border-vb-accent/20 caret-vb-accent"
                />
                <button
                  type="button"
                  onClick={() => { if (chatInput.trim()) { onContinueInChat?.(chatInput.trim(), `Context: ${panelTitle} in ${filePath}\n\n${explanation}`); closeExplanation(); } }}
                  disabled={!chatInput.trim()}
                  className="px-2.5 py-1.5 rounded-md text-[10px] text-vb-accent border border-vb-accent/15 bg-vb-accent/[0.04] hover:bg-vb-accent/[0.08] disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0">
                  Ask in chat
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
