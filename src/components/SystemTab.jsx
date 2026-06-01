"use client";
import { useState } from 'react';
import { useSystemData } from '../hooks/useApi';
import { useUser } from '@clerk/nextjs';
import { Layers, FileText, Terminal, Download, ChevronRight, Package, Settings, Server, Lock, Zap } from 'lucide-react';
import { LOADING_MESSAGES, getHealthMessage } from '../lib/personality';
import { UpgradeInline, UpgradeBanner } from './UpgradeCTA';
import FilePathDisplay from './FilePathDisplay';

function Section({ title, icon: Icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-c-line rounded-lg overflow-hidden bg-c-surface">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2 md:gap-2.5 px-3 md:px-4 py-2.5 md:py-3 bg-c-surface-2 hover:bg-c-surface-3 transition-colors text-left">
        <Icon size={14} className="text-vb-accent flex-shrink-0" />
        <span className="text-[13px] md:text-[14px] font-medium text-vb-ink flex-1">{title}</span>
        <ChevronRight size={13} className={`text-vb-ink3 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && <div className="px-3 md:px-4 py-2.5 md:py-3 border-t border-c-line">{children}</div>}
    </div>
  );
}

function downloadReport(report) {
  import('./ReportPDF').then(({ generateReport }) => generateReport(report));
}

function FixContent({ text }) {
  const lines = text.split('\n');
  return (
    <div className="text-[12px] text-vb-ink2 leading-[1.7] space-y-1.5">
      {lines.map((line, i) => {
        if (!line.trim()) return null;
        if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
          const content = line.replace(/^\s*[-*]\s/, '');
          return <div key={i} className="flex gap-2 pl-1"><span className="text-vb-accent flex-shrink-0">•</span><span>{renderFixInline(content)}</span></div>;
        }
        if (/^\d+\.\s/.test(line.trim())) {
          const content = line.replace(/^\s*\d+\.\s/, '');
          return <div key={i} className="flex gap-2 pl-1"><span className="text-vb-accent flex-shrink-0">{line.match(/\d+/)[0]}.</span><span>{renderFixInline(content)}</span></div>;
        }
        if (/^#{1,3}\s/.test(line)) return <div key={i} className="text-[12px] font-semibold text-vb-ink mt-2">{line.replace(/^#{1,3}\s/, '')}</div>;
        return <div key={i}>{renderFixInline(line)}</div>;
      })}
    </div>
  );
}

function renderFixInline(text) {
  return text.split(/(`[^`]+`)/).map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i} className="px-1 py-0.5 bg-c-surface-3 rounded text-[11px] font-mono text-vb-ink">{part.slice(1, -1)}</code>;
    return <span key={i}>{part.replace(/\*\*([^*]+)\*\*/g, (_, m) => m)}</span>;
  });
}

function IssueCard({ cat, items, onHowToFix }) {
  const [expanded, setExpanded] = useState(false);
  const filesWithPath = items.filter(i => i.file);
  const visibleFiles = expanded ? filesWithPath : filesWithPath.slice(0, 5);
  const hasMore = filesWithPath.length > 5;

  return (
    <div className="bg-c-surface-3 rounded-lg border border-c-line overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-c-line">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${items[0]?.severity === 'high' ? 'bg-red-500' : items[0]?.severity === 'medium' ? 'bg-yellow-500' : 'bg-vb-ink4'}`} />
          <h3 className="text-[14px] text-vb-ink font-medium">{cat}</h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-vb-ink3">{items.length} found</span>
          <button onClick={() => onHowToFix(cat, items)} className="text-[11px] text-vb-accent px-2.5 py-1 rounded-md border border-vb-accent/15 bg-vb-accent/[0.04] hover:bg-vb-accent/[0.08] transition-colors">
            How to fix
          </button>
        </div>
      </div>
      <div className="px-5 py-4">
        {items[0]?.description && <p className="text-[13px] text-vb-ink2 mb-3">{items[0].description}</p>}
        <div className="space-y-1.5">
          {visibleFiles.map((item, j) => (
            <div key={j} className="text-[13px] text-vb-ink font-mono px-3 py-2 bg-c-surface-3 rounded border border-c-line">{item.file}</div>
          ))}
        </div>
        {hasMore && (
          <button onClick={() => setExpanded(!expanded)} className="mt-2 text-[12px] text-vb-accent hover:text-vb-accent-bright transition-colors">
            {expanded ? 'Show less' : `Show all ${filesWithPath.length} files`}
          </button>
        )}
      </div>
    </div>
  );
}

export default function SystemTab({ analysisId, onContinueInChat, userPlan = 'free', onUpgrade }) {
  const { data, isLoading, error } = useSystemData(analysisId);
  const [reportOpen, setReportOpen] = useState(false);
  const [fixExplanation, setFixExplanation] = useState(null);
  const [fixCache, setFixCache] = useState({}); // cache fixes by category
  const canExportPdf = userPlan !== 'free';

  const handleHowToFix = async (cat, items) => {
    if (fixCache[cat]) {
      setFixExplanation({ cat, loading: false, text: fixCache[cat] });
      return;
    }
    setFixExplanation({ cat, loading: true, text: '' });
    try {
      const fileList = items.filter(i => i.file).slice(0, 5).map(i => i.file).join(', ');
      const desc = items[0]?.description || cat;
      const query = `I have a "${cat}" issue in my codebase. Description: "${desc}". Affected files: ${fileList}. Give me a concise bullet-point list of exact steps to fix this. Be specific to these files.`;
      const res = await fetch('/api/query', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, analysisId }) });
      const data = await res.json();
      const text = (data.response || '').replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/## Follow-up[\s\S]*/i, '').replace(/\*\*Follow-up[\s\S]*/i, '').trim();
      setFixCache(prev => ({ ...prev, [cat]: text }));
      setFixExplanation({ cat, loading: false, text: text || 'Could not generate fix suggestions.' });
    } catch { setFixExplanation({ cat, loading: false, text: 'Could not generate fix suggestions.' }); }
  };

  const handleContinueInChat = () => {
    if (!fixExplanation?.text) return;
    const userQuery = `Explain in more detail how to fix the "${fixExplanation.cat}" issue and walk me through the implementation step by step.`;
    const hiddenContext = `Context from security report:\nIssue: ${fixExplanation.cat}\nSuggested fixes:\n${fixExplanation.text}`;
    onContinueInChat?.(userQuery, hiddenContext);
    setReportOpen(false);
    setFixExplanation(null);
  };

  if (isLoading) return (
    <div className="flex-1 overflow-y-auto p-3 md:p-6 bg-c-surface dashboard-panel-solid">
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Skeleton placeholders */}
        <div className="h-20 rounded-lg bg-c-surface-3 animate-pulse" />
        <div className="h-32 rounded-lg bg-c-surface-3 animate-pulse" />
        <div className="h-24 rounded-lg bg-c-surface-3 animate-pulse" />
        <div className="h-40 rounded-lg bg-c-surface-3 animate-pulse" />
        <p className="text-[12px] text-vb-ink4 text-center mt-4">{LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]}</p>
      </div>
    </div>
  );
  if (error) return <div className="flex-1 flex items-center justify-center text-vb-red text-[13px]">{error.message}</div>;
  if (!data) return null;

  const { techStack, entryPoints, conventions, securityReport, database } = data;

  return (
    <div className="flex-1 overflow-y-auto p-3 md:p-6 bg-c-surface dashboard-panel-solid">
      <div className="max-w-5xl mx-auto space-y-4">

        {/* Health Score Banner */}
        <div className="flex items-center justify-between p-3 md:p-4 rounded-lg border border-c-line bg-c-surface">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="relative w-12 h-12">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="38" fill="none" stroke="var(--c-line)" strokeWidth="7" />
                <circle cx="50" cy="50" r="38" fill="none"
                  stroke={securityReport.score >= 75 ? '#22c55e' : securityReport.score >= 50 ? '#eab308' : '#FCA5A5'}
                  strokeWidth="7" strokeLinecap="round"
                  strokeDasharray={`${securityReport.score * 2.39} 239`} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-[14px] font-bold font-mono ${securityReport.score >= 75 ? 'text-green-500' : securityReport.score >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>{securityReport.score}</span>
              </div>
            </div>
            <div>
              <div className="text-[13px] text-vb-ink font-medium">Health Score</div>
              <div className="text-[11px] text-vb-ink2">{getHealthMessage(securityReport.score)}</div>
            </div>
          </div>
          <button onClick={() => setReportOpen(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] text-vb-ink2 bg-c-surface-3 border border-c-line-2 hover:bg-white/[0.06] hover:text-vb-ink transition-colors">
            <FileText size={13} />
            View Report
          </button>
        </div>

        {/* Report Modal */}
        {reportOpen && (
          <div className="fixed inset-0 z-[250] bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-6" onClick={() => setReportOpen(false)}>
            <div className="w-full md:max-w-3xl max-h-[95vh] md:max-h-[90vh] bg-c-surface-2 rounded-t-2xl md:rounded-xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.6)] flex flex-col" onClick={(e) => e.stopPropagation()}>
              {/* Mobile drag handle */}
              <div className="md:hidden flex justify-center py-2">
                <div className="w-8 h-1 rounded-full bg-white/[0.15]" />
              </div>
              {/* Header */}
              <div className="flex items-center px-4 md:px-5 py-2.5 md:py-3.5 bg-c-surface-2 border-b border-c-line">
                <button onClick={() => setReportOpen(false)} className="w-[16px] h-[16px] md:w-[12px] md:h-[12px] rounded-full bg-[#ff5f57] hover:bg-[#ff3b30] transition-colors flex items-center justify-center mr-3 md:mr-4">
                  <svg width="7" height="7" viewBox="0 0 10 10" className="opacity-100"><path d="M2 2L8 8M8 2L2 8" stroke="#4a0000" strokeWidth="1.8" strokeLinecap="round"/></svg>
                </button>
                <div className="flex-1 flex items-center justify-center gap-2">
                  <span className="text-[13px] md:text-[14px] font-semibold text-vb-ink">grep<span className="text-vb-accent">it</span></span>
                  <span className="text-vb-ink4 hidden md:inline">|</span>
                  <span className="text-[12px] md:text-[13px] text-vb-ink2 hidden md:inline">Security Report</span>
                </div>
                {canExportPdf ? (
                  <button onClick={() => downloadReport(securityReport)} className="flex items-center gap-1.5 px-2.5 md:px-3 py-1 md:py-1.5 rounded-lg text-[10px] md:text-[11px] text-vb-ink2 bg-c-surface-3 border border-c-line hover:bg-white/[0.06] transition-colors">
                    <Download size={11} />
                    PDF
                  </button>
                ) : (
                  <button onClick={onUpgrade} className="flex items-center gap-1.5 px-2.5 md:px-3 py-1 md:py-1.5 rounded-lg text-[10px] md:text-[11px] text-vb-ink2 bg-c-surface-3 border border-c-line hover:bg-white/[0.06] transition-colors">
                    <Download size={11} />
                    PDF
                  </button>
                )}
              </div>

              {/* Report content */}
              <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 md:space-y-6">
                {/* Score */}
                <div className="bg-c-surface-3 rounded-lg p-5 md:p-8 border border-c-line text-center">
                  <div className="inline-block relative w-20 h-20 md:w-28 md:h-28 mb-3 md:mb-4">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="var(--c-line)" strokeWidth="8" />
                      <circle
                        cx="50" cy="50" r="40" fill="none"
                        stroke={securityReport.score >= 75 ? '#22c55e' : securityReport.score >= 50 ? '#eab308' : '#FCA5A5'}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${securityReport.score * 2.51} 251`}
                        style={{ animation: 'scoreArc 1.2s ease-out forwards' }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg md:text-2xl font-bold text-vb-ink">{securityReport.score}%</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-vb-ink2 uppercase tracking-widest mb-3 md:mb-4">Health Score</p>
                  <p className="text-[12px] md:text-[14px] text-vb-ink leading-relaxed max-w-md mx-auto">
                    Analysis of <strong className="text-vb-accent">{securityReport.repoName}</strong> covering {securityReport.totalFiles} files. {securityReport.highCount > 0 ? `${securityReport.highCount} high-severity issues require immediate attention.` : 'No critical issues found.'} {securityReport.testing.hasTests ? `${securityReport.testing.testFileCount} test files detected.` : 'No test coverage detected.'}
                  </p>
                </div>

                {/* Issues — gated for free users */}
                {(() => {
                  const grouped = {};
                  securityReport.issues.forEach(i => { const k = i.title || 'Other'; if (!grouped[k]) grouped[k] = []; grouped[k].push(i); });
                  const entries = Object.entries(grouped);
                  const isGated = securityReport.gated;
                  
                  if (!isGated) {
                    return entries.map(([cat, items]) => (
                      <IssueCard key={cat} cat={cat} items={items} onHowToFix={handleHowToFix} />
                    ));
                  }

                  return (
                    <>
                      {/* Visible issues (50% of total) */}
                      {entries.map(([cat, items]) => (
                        <IssueCard key={cat} cat={cat} items={items} onHowToFix={handleHowToFix} />
                      ))}

                      {/* Locked section — blurred teaser for remaining issues */}
                      <div className="relative rounded-xl overflow-hidden">
                        <div className="pointer-events-none select-none">
                          <div className="blur-[5px] opacity-50 space-y-3 px-5 pb-5 pt-4 bg-c-surface-3 rounded-lg border border-c-line">
                            <div className="h-3.5 w-40 rounded bg-white/[0.06]" />
                            <div className="h-9 rounded bg-c-surface-3" />
                            <div className="h-9 rounded bg-c-surface-3" />
                            <div className="h-3.5 w-32 rounded bg-white/[0.06] mt-4" />
                            <div className="h-9 rounded bg-c-surface-3" />
                          </div>
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-[var(--c-surface-2)]/20 via-[var(--c-surface-2)]/60 to-[var(--c-surface-2)]/90">
                          <div className="text-center space-y-2.5">
                            <div className="w-10 h-10 mx-auto rounded-full bg-c-surface-elev border border-white/[0.1] flex items-center justify-center">
                              <Lock size={16} className="text-vb-ink3" />
                            </div>
                            <p className="text-[12px] text-vb-ink3">{securityReport.gatedIssueCount - entries.length} more issues hidden</p>
                            <button onClick={onUpgrade}
                              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-[12px] font-medium bg-c-accent text-c-bg hover:bg-c-accent-bright transition-all shadow-[var(--shadow-2)]">
                              <Zap size={12} /> Unlock full report
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}

                {/* Fix explanation panel — right side overlay */}
                {fixExplanation && (
                  <div className="fixed top-[12vh] right-8 w-[300px] max-h-[70vh] bg-c-surface-2 border border-c-line-2 rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex flex-col z-[260] overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2.5 border-b border-c-line flex-shrink-0">
                      <span className="text-[11px] text-vb-accent font-medium truncate">Fix: {fixExplanation.cat}</span>
                      <button onClick={() => setFixExplanation(null)} className="w-[16px] h-[16px] md:w-[11px] md:h-[11px] rounded-full bg-[#ff5f57] hover:bg-[#ff3b30] transition-colors flex items-center justify-center"><svg width="6" height="6" viewBox="0 0 10 10" className="opacity-100"><path d="M2 2L8 8M8 2L2 8" stroke="#4a0000" strokeWidth="1.8" strokeLinecap="round"/></svg></button>
                    </div>
                    <div className="flex-1 overflow-y-auto px-3 py-3">
                      {fixExplanation.loading ? (
                        <div className="flex items-center gap-2 text-[11px] text-vb-ink3 py-2">
                          <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-20"/><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                          Generating...
                        </div>
                      ) : (
                        <FixContent text={fixExplanation.text} />
                      )}
                    </div>
                    {/* Continue in chat */}
                    {!fixExplanation.loading && fixExplanation.text && (
                      <div className="px-3 py-2.5 border-t border-c-line flex-shrink-0">
                        <button onClick={handleContinueInChat} className="w-full text-[11px] text-vb-accent px-3 py-2 rounded-md border border-vb-accent/15 bg-vb-accent/[0.04] hover:bg-vb-accent/[0.08] transition-colors text-center">
                          Discuss in chat →
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-4">
                  <p className="text-[11px] text-vb-ink4">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  <div className="text-right">
                    <span className="text-[12px] text-vb-accent font-medium">✓ grepit Certified</span>
                    <p className="text-[10px] text-vb-ink4">Automated security analysis</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tech Stack */}
        <Section title="Technology Stack" icon={Layers}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {techStack.map((t, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 md:py-2.5 bg-c-surface-2 rounded-md border border-c-line">
                <span className="text-[12px] md:text-[13px] text-vb-ink font-medium">{t.name}</span>
                <span className="text-[12px] text-vb-ink2">{t.role}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Entry Points */}
        <Section title="Entry Points & Services" icon={Server}>
          {entryPoints.length === 0 ? (
            <p className="text-[12px] text-vb-ink3">No entry points detected</p>
          ) : (
            <div className="space-y-2">
              {entryPoints.map((ep, i) => (
                <div key={i} className="p-3 bg-c-surface-2 rounded-md border border-c-line">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] text-vb-ink font-medium">{ep.name}</span>
                    <span className="text-[10px] text-vb-accent px-2 py-0.5 rounded bg-vb-accent/[0.08] border border-vb-accent/15">{ep.type}</span>
                  </div>
                  <div className="text-[11px] text-vb-ink3 font-mono">{ep.main}</div>
                  {ep.scripts.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {ep.scripts.map((s, j) => <span key={j} className="text-[10px] text-vb-ink3 px-1.5 py-0.5 bg-c-surface-3 rounded border border-c-line font-mono">{s}</span>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Database — only if detected */}
        {database?.detected && (
          <Section title={`Database: ${database.type}${database.orm ? ` (${database.orm})` : ''}`} icon={Server}>
            {database.models.length > 0 ? (
              <div className="space-y-2">
                {database.models.map((model, i) => (
                  <div key={i} className="px-3 py-2.5 bg-c-surface-2 rounded-md border border-c-line">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-vb-ink font-medium font-mono">{model.name}</span>
                      {model.file && <span className="text-[10px] text-vb-ink3 font-mono">{model.file.split('/').pop()}</span>}
                    </div>
                    {model.fields.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {model.fields.map((f, j) => <span key={j} className="text-[10px] text-vb-ink2 px-1.5 py-0.5 bg-c-surface-3 rounded border border-c-line font-mono">{f}</span>)}
                      </div>
                    )}
                  </div>
                ))}
                {database.migrations && <p className="text-[11px] text-vb-ink3 mt-2">{database.migrations} migration files detected</p>}
              </div>
            ) : (
              <p className="text-[12px] text-vb-ink3">Database detected but no models could be extracted from the indexed code.</p>
            )}
          </Section>
        )}

        {/* Project Configuration */}
        <Section title="Project Configuration" icon={Settings}>
          {/* Scripts */}
          {conventions.scripts.length > 0 && (
            <div className="mb-4">
              <div className="text-[11px] text-vb-ink3 uppercase tracking-wide mb-2">Available Scripts</div>
              <div className="space-y-1">
                {conventions.scripts.slice(0, 12).map((s, i) => (
                  <div key={i} className="flex items-center gap-2 sm:gap-3 px-3 py-2 bg-c-surface-2 rounded-md border border-c-line min-w-0 overflow-hidden">
                    <Terminal size={11} className="text-vb-ink4 flex-shrink-0" />
                    <span className="text-[11px] text-vb-accent font-mono shrink-0 whitespace-nowrap">{s.name}</span>
                    <span className="text-[10px] text-vb-ink4 font-mono min-w-0 truncate">{s.command}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Linting */}
          {conventions.linting.length > 0 && (
            <div className="mb-4">
              <div className="text-[11px] text-vb-ink3 uppercase tracking-wide mb-2">Linting</div>
              {conventions.linting.map((l, i) => (
                <div key={i} className="text-[11px] text-vb-ink2 px-3 py-2 bg-c-surface-2 rounded-md border border-c-line mb-1 min-w-0">
                  <FilePathDisplay path={l.file} block />
                  {l.rules.length > 0 && <span className="text-vb-ink4 font-mono text-[10px] mt-0.5 block">({l.rules.length} rules)</span>}
                </div>
              ))}
            </div>
          )}
          {/* Docker */}
          {conventions.docker.length > 0 && (
            <div className="mb-4">
              <div className="text-[11px] text-vb-ink3 uppercase tracking-wide mb-2">Docker</div>
              {conventions.docker.map((d, i) => <div key={i} className="text-[11px] text-vb-ink2 font-mono">{d.file}</div>)}
            </div>
          )}
          {/* CI/CD */}
          {conventions.ci.length > 0 && (
            <div>
              <div className="text-[11px] text-vb-ink3 uppercase tracking-wide mb-2">CI/CD</div>
              {conventions.ci.map((c, i) => <div key={i} className="text-[11px] text-vb-ink2 font-mono">{c.file}</div>)}
            </div>
          )}
        </Section>

        {/* Dependencies */}
        {conventions.dependencies.length > 0 && (
          <Section title="Dependencies" icon={Package} defaultOpen={false}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1 max-h-[300px] overflow-y-auto">
              {conventions.dependencies.map((d, i) => (
                <div key={i} className="flex items-center justify-between px-2 py-1 text-[11px]">
                  <span className="text-vb-ink2 font-mono truncate">{d.name}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${d.type === 'dev' ? 'text-vb-ink4 bg-c-surface-3' : 'text-vb-accent/70 bg-vb-accent/[0.04]'}`}>{d.type}</span>
                </div>
              ))}
            </div>
          </Section>
        )}


      </div>
    </div>
  );
}
