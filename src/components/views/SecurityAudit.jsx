"use client";
export default function SecurityAudit({ analysis, theme, onNavigate }) {
  const d = theme === 'dark';
  const arch = analysis?.architecture || analysis?.results || {};
  const resultSecurity = analysis?.results?.security || {};
  const resultQuality = analysis?.results?.quality || {};
  const resultPerformance = analysis?.results?.performance || {};
  const resultTesting = analysis?.results?.testing || {};
  const issues = [
    ...(arch.securityIssues || []),
    ...(resultSecurity.hardcodedSecrets || []).map((item) => ({
      severity: 'high',
      title: 'Potential hardcoded secret',
      description: item.issue,
      file: item.file,
    })),
    ...(resultSecurity.unsafePatterns || []).map((item) => ({
      severity: 'medium',
      title: 'Unsafe pattern',
      description: item.issue,
      file: item.file,
    })),
  ];
  const smells = arch.codeSmells || [];
  const testGaps = [
    ...(arch.testGaps || []),
    ...(resultTesting.testFiles?.length === 0 ? ['No test files were detected in the repository snapshot.'] : []),
    ...(!resultTesting.coverageDetected ? ['No coverage report was detected.'] : []),
  ];
  const duplicateSignals = [
    ...(arch.duplicateCodeSignals || []),
    ...(resultQuality.duplicateGroups || []).map((group) => `Repeated file bodies detected across: ${group.join(', ')}`),
    ...(resultQuality.namingIssues || []).map((name) => `Naming inconsistency detected for symbol "${name}".`),
  ];
  const performanceRisks = [
    ...(arch.performanceRisks || []),
    ...(resultPerformance.heavyFiles || []).map((item) => `${item.file} is heavy at ${item.lineCount} lines.`),
    ...(resultPerformance.nestedLoopSignals || []).map((item) => `${item} contains nested loop signals.`),
  ];
  const heatmap = arch.complexityHeatmap || [];
  const unusedSymbols = resultQuality.unusedSymbols || [];
  const sevColors = { high: 'text-red-400 bg-red-400/10', medium: 'text-yellow-400 bg-yellow-400/10', low: 'text-blue bg-blue/10' };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-1">Security & Quality Audit</h1>
        <p className={`text-sm font-mono ${d ? 'text-d-muted' : 'text-ink-muted'}`}>Issues, code smells, and test coverage gaps</p>
      </div>
      {/* Security Issues */}
      <div className={`card-brutal rounded-none p-5 ${d ? 'bg-d-card' : 'bg-white'}`}>
        <h2 className={`text-[11px] font-mono uppercase tracking-wider mb-4 ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>Security ({issues.length})</h2>
        {issues.length > 0 ? issues.map((issue, i) => (
          <div key={i} className={`flex items-start gap-3 p-3 rounded-none mb-2 ${d ? 'bg-d-bg' : 'bg-cream'}`}>
            <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${sevColors[issue.severity] || ''}`}>{issue.severity}</span>
            <div className="flex-1">
              <div className="font-mono text-sm font-semibold">{issue.title}</div>
              <p className={`text-[12px] mt-0.5 ${d ? 'text-d-muted' : 'text-ink-muted'}`}>{issue.description}</p>
              {issue.file && (
                <button
                  type="button"
                  onClick={() => onNavigate?.('files', { path: issue.file })}
                  className={`block text-left text-[10px] font-mono underline-offset-4 hover:underline ${d ? 'text-d-subtle' : 'text-ink-faint'}`}
                >
                  {issue.file}
                </button>
              )}
            </div>
          </div>
        )) : <p className={`text-sm font-mono ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>No security issues detected. ✓</p>}
      </div>
      {/* Code Smells */}
      {smells.length > 0 && (
        <div className={`card-brutal rounded-none p-5 ${d ? 'bg-d-card' : 'bg-white'}`}>
          <h2 className={`text-[11px] font-mono uppercase tracking-wider mb-4 ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>Code Smells ({smells.length})</h2>
          {smells.map((smell, i) => (
            <div key={i} className={`p-3 rounded-none mb-2 ${d ? 'bg-d-bg' : 'bg-cream'}`}>
              <div className="font-mono text-[12px]">
                <button type="button" onClick={() => onNavigate?.('files', { path: smell.file })} className={`${d ? 'text-d-text' : 'text-ink'} underline-offset-4 hover:underline`}>
                  {smell.file}
                </button>
                : {smell.issue}
              </div>
              <div className={`text-[11px] mt-1 ${d ? 'text-purple' : 'text-purple'}`}>Fix: {smell.suggestion}</div>
            </div>
          ))}
        </div>
      )}
      {/* Test Gaps */}
      {testGaps.length > 0 && (
        <div className={`card-brutal rounded-none p-5 ${d ? 'bg-d-card' : 'bg-white'}`}>
          <h2 className={`text-[11px] font-mono uppercase tracking-wider mb-4 ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>Test Gaps ({testGaps.length})</h2>
          <div className="space-y-1.5">
            {testGaps.map((gap, i) => (
              <div key={i} className={`flex items-center gap-2 text-[13px] font-mono ${d ? 'text-d-muted' : 'text-ink-muted'}`}>
                <span className="text-yellow-400">⚠</span>{gap}
              </div>
            ))}
          </div>
        </div>
      )}
      {unusedSymbols.length > 0 && (
        <div className={`card-brutal rounded-none p-5 ${d ? 'bg-d-card' : 'bg-white'}`}>
          <h2 className={`text-[11px] font-mono uppercase tracking-wider mb-4 ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>Potentially Unused Symbols</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {unusedSymbols.slice(0, 16).map((item, i) => (
              <div key={i} className={`p-3 border-2 ${d ? 'border-d-border bg-d-bg' : 'border-ink/10 bg-cream'}`}>
                <button type="button" onClick={() => onNavigate?.('symbols', { symbol: item.name })} className="text-sm font-mono font-semibold text-left underline-offset-4 hover:underline">{item.name}</button>
                <button type="button" onClick={() => onNavigate?.('files', { path: item.file })} className={`block text-left text-[11px] mt-1 underline-offset-4 hover:underline ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>{item.file}</button>
              </div>
            ))}
          </div>
        </div>
      )}
      {(duplicateSignals.length > 0 || performanceRisks.length > 0 || heatmap.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className={`card-brutal rounded-none p-5 ${d ? 'bg-d-card' : 'bg-white'}`}>
            <h2 className={`text-[11px] font-mono uppercase tracking-wider mb-4 ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>Duplicate Signals</h2>
            <div className="space-y-2">
              {duplicateSignals.length > 0 ? duplicateSignals.map((signal, index) => (
                <div key={index} className={`text-[13px] ${d ? 'text-d-muted' : 'text-ink-muted'}`}>{signal}</div>
              )) : <div className={`text-sm ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>No duplication signals inferred.</div>}
            </div>
          </div>
          <div className={`card-brutal rounded-none p-5 ${d ? 'bg-d-card' : 'bg-white'}`}>
            <h2 className={`text-[11px] font-mono uppercase tracking-wider mb-4 ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>Performance Risks</h2>
            <div className="space-y-2">
              {performanceRisks.length > 0 ? performanceRisks.map((risk, index) => (
                <div key={index} className={`text-[13px] ${d ? 'text-d-muted' : 'text-ink-muted'}`}>{risk}</div>
              )) : <div className={`text-sm ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>No obvious structural performance risks inferred.</div>}
            </div>
          </div>
          <div className={`card-brutal rounded-none p-5 ${d ? 'bg-d-card' : 'bg-white'}`}>
            <h2 className={`text-[11px] font-mono uppercase tracking-wider mb-4 ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>Complexity Heatmap</h2>
            <div className="space-y-3">
              {heatmap.map((item, index) => (
                <div key={index}>
                  <div className="flex justify-between mb-1">
                    <span className="text-[12px] font-mono">{item.name}</span>
                    <span className={`text-[11px] font-mono ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>{item.weight}</span>
                  </div>
                  <div className={`h-2 ${d ? 'bg-d-bg' : 'bg-cream'}`}>
                    <div className="h-full bg-peach" style={{ width: `${Math.min(100, item.weight * 8)}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
