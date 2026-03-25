"use client";
export default function SecurityAudit({ analysis, theme }) {
  const d = theme === 'dark';
  const arch = analysis?.architecture || analysis?.results || {};
  const issues = arch.securityIssues || [];
  const smells = arch.codeSmells || [];
  const testGaps = arch.testGaps || [];
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
              {issue.file && <span className={`text-[10px] font-mono ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>{issue.file}</span>}
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
              <div className="font-mono text-[12px]"><span className={d ? 'text-d-text' : 'text-ink'}>{smell.file}</span>: {smell.issue}</div>
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
    </div>
  );
}
