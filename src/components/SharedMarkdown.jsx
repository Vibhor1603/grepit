"use client";
import { Highlight, themes } from 'prism-react-renderer';
import MermaidDiagram from './MermaidDiagram';
import { looksLikeMermaid } from '../utils/client/mermaid';

const viboCodeTheme = {
  ...themes.vsDark,
  plain: { color: 'var(--c-text-2)', backgroundColor: 'transparent' },
  styles: [
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

/**
 * Shared markdown renderer — matches the dashboard chat UI.
 * Handles headings, code blocks, mermaid diagrams (all types), tables, lists.
 */
export default function SharedMarkdown({ content }) {
  const lines = content.split('\n');
  const elements = [];
  let listBuffer = [], listType = null, tableBuffer = [];
  let codeBlock = false, codeLines = [], codeLang = '';

  const renderInline = (text) => {
    if (!text) return text;
    const result = [];
    let rem = text;
    let k = 0;
    while (rem.length > 0) {
      const cm = rem.match(/^`([^`]+)`/);
      if (cm) {
        result.push(<code key={k++} className="px-1.5 py-0.5 bg-c-overlay-3 rounded text-[12px] font-mono text-vb-ink">{cm[1]}</code>);
        rem = rem.slice(cm[0].length); continue;
      }
      const bm = rem.match(/^\*\*(.+?)\*\*/);
      if (bm) { result.push(<strong key={k++} className="font-semibold text-vb-ink">{renderInline(bm[1])}</strong>); rem = rem.slice(bm[0].length); continue; }
      const im = rem.match(/^\*(.+?)\*/);
      if (im) { result.push(<em key={k++} className="italic text-vb-ink">{renderInline(im[1])}</em>); rem = rem.slice(im[0].length); continue; }
      const nx = rem.search(/[`*]/);
      if (nx === -1) { result.push(<span key={k++}>{rem}</span>); break; }
      if (nx === 0) { result.push(<span key={k++}>{rem[0]}</span>); rem = rem.slice(1); }
      else { result.push(<span key={k++}>{rem.slice(0, nx)}</span>); rem = rem.slice(nx); }
    }
    return result;
  };

  const flushList = (key) => {
    if (!listBuffer.length) return;
    const Tag = listType === 'ol' ? 'ol' : 'ul';
    elements.push(<Tag key={key} className={`${listType === 'ol' ? 'list-decimal' : 'list-disc'} ml-5 space-y-1.5 mb-3`}>{listBuffer.map((item, i) => <li key={i} className="text-[13px] text-vb-ink2 leading-relaxed">{renderInline(item)}</li>)}</Tag>);
    listBuffer = []; listType = null;
  };

  const flushTable = (key) => {
    if (tableBuffer.length < 2) { tableBuffer = []; return; }
    const headers = tableBuffer[0].split('|').map(c => c.trim()).filter(Boolean);
    const dataRows = tableBuffer.slice(1).filter(r => !/^[\s|:-]+$/.test(r)).map(r => r.split('|').map(c => c.trim()).filter(Boolean));
    elements.push(
      <div key={key} className="overflow-x-auto mb-4 rounded-lg border border-vb-accent/15">
        <table className="w-full text-[12px]">
          <thead><tr className="border-b border-vb-accent/20 bg-vb-accent/[0.04]">{headers.map((h, i) => <th key={i} className="px-4 py-2.5 text-left text-vb-accent-bright font-semibold text-[11px] uppercase tracking-wide">{h}</th>)}</tr></thead>
          <tbody>{dataRows.map((row, i) => <tr key={i} className="border-b border-c-line last:border-0 hover:bg-c-overlay-1">{row.map((cell, j) => <td key={j} className="px-4 py-2.5 text-vb-ink2">{renderInline(cell)}</td>)}</tr>)}</tbody>
        </table>
      </div>
    );
    tableBuffer = [];
  };

  const flushCode = (key) => {
    if (!codeLines.length) return;
    const codeText = codeLines.join('\n');
    if (looksLikeMermaid(codeText, codeLang)) {
      elements.push(<MermaidDiagram key={key} code={codeText} allowFullscreen={false} />);
    } else {
      elements.push(
        <div key={key} className="mb-4 min-w-[60%] max-w-full rounded-xl border border-c-line-2 overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.2)]">
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-c-line bg-c-overlay-2">
            <div className="flex items-center gap-[5px]">
              <span className="w-[8px] h-[8px] rounded-full bg-[#ff5f57]" />
              <span className="w-[8px] h-[8px] rounded-full bg-[#febc2e]" />
              <span className="w-[8px] h-[8px] rounded-full bg-c-lime" />
            </div>
            {codeLang && <span className="text-[10px] text-vb-ink4 font-mono ml-2">{codeLang}</span>}
          </div>
          <Highlight theme={viboCodeTheme} code={codeText} language={codeLang || 'javascript'}>
            {({ tokens: codeTokens, getLineProps, getTokenProps }) => (
              <pre className="px-4 py-3 overflow-x-auto bg-c-bg m-0 text-[12px]">
                {codeTokens.map((line, li) => (
                  <div key={li} {...getLineProps({ line })} className="leading-[1.6]">
                    {line.map((token, ti) => <span key={ti} {...getTokenProps({ token })} />)}
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
    if (/^#{3}\s*(.+)/.test(line)) { elements.push(<h3 key={i} className="text-[14px] font-semibold text-vb-ink mt-4 mb-2">{renderInline(line.replace(/^#{3}\s*/, '').replace(/\*\*/g, ''))}</h3>); return; }
    if (/^#{2}\s*(.+)/.test(line)) { elements.push(<h2 key={i} className="text-[15px] font-semibold text-vb-ink mt-4 mb-2">{renderInline(line.replace(/^#{2}\s*/, '').replace(/\*\*/g, ''))}</h2>); return; }
    if (/^#{1}\s*(.+)/.test(line)) { elements.push(<h1 key={i} className="text-[16px] font-semibold text-vb-ink mt-4 mb-2">{renderInline(line.replace(/^#{1}\s*/, '').replace(/\*\*/g, ''))}</h1>); return; }
    elements.push(<p key={i} className="text-[13px] text-vb-ink2 leading-[1.7] mb-2">{renderInline(line)}</p>);
  });
  flushList('end'); flushTable('te'); flushCode('ce');
  return <div>{elements}</div>;
}
