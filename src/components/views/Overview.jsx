"use client";
export default function Overview({ analysis, theme, eli5 }) {
  const d = theme === 'dark';
  const arch = analysis?.architecture || analysis?.results || {};
  const languages = analysis?.languages || {};
  const totalBytes = Object.values(languages).reduce((a, b) => a + b, 0) || 1;
  const langEntries = Object.entries(languages).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const techStack = arch.techStack || [];
  const projectType = arch.projectType || 'Project';

  if (!analysis) return <div className={`text-center py-20 text-sm font-mono ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>No analysis found. <a href="/" className="underline">← Go back</a></div>;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold tracking-tight">{analysis.repo_name}</h1>
          {projectType && <span className={`text-xs font-mono px-2 py-0.5 rounded-none font-bold bg-purple text-ink border-2 ${d ? 'border-white' : 'border-black'}`}>{projectType}</span>}
        </div>
        <p className={`text-sm font-mono ${d ? 'text-d-muted' : 'text-ink-muted'}`}>{analysis.repo_url}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Files', value: (analysis.total_files || 0).toLocaleString() },
          { label: 'Est. Lines', value: analysis.total_lines > 1000 ? `${(analysis.total_lines/1000).toFixed(1)}K` : String(analysis.total_lines || 0) },
          { label: 'Languages', value: String(Object.keys(languages).length) },
          { label: 'Patterns', value: String((arch.patterns || []).length) },
        ].map((s, i) => (
          <div key={i} className={`card-brutal rounded-none p-4 ${d ? 'bg-d-card' : 'bg-white'}`}>
            <div className={`text-[10px] font-mono uppercase tracking-wider mb-1 ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>{s.label}</div>
            <div className="text-xl font-bold font-mono">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className={`card-brutal rounded-none p-5 ${d ? 'bg-d-card' : 'bg-white'}`}>
        <h2 className={`text-[11px] font-mono uppercase tracking-wider mb-3 ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>
          {eli5 ? '🧸 Simple Explanation' : 'AI Summary'}
        </h2>
        <p className={`text-[14px] leading-relaxed ${d ? 'text-d-muted' : 'text-ink-light'}`}>
          {eli5
            ? `This is a ${projectType.toLowerCase()} called "${analysis.repo_name}". It uses ${techStack.slice(0, 3).join(', ') || 'some tools'} to work. Think of it like a recipe — it has ${analysis.total_files} ingredients (files) organized in folders.`
            : analysis.summary}
        </p>
      </div>

      {/* Tech Stack */}
      {techStack.length > 0 && (
        <div className={`card-brutal rounded-none p-5 ${d ? 'bg-d-card' : 'bg-white'}`}>
          <h2 className={`text-[11px] font-mono uppercase tracking-wider mb-3 ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>Tech Stack</h2>
          <div className="flex flex-wrap gap-2">
            {techStack.map((t, i) => (
              <span key={i} className={`px-2.5 py-1 rounded-none text-xs font-mono font-semibold bg-lime text-ink border-2 ${d ? 'border-white' : 'border-black'}`}>{t}</span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Languages */}
        <div className={`card-brutal rounded-none p-5 ${d ? 'bg-d-card' : 'bg-white'}`}>
          <h2 className={`text-[11px] font-mono uppercase tracking-wider mb-4 ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>Language Distribution</h2>
          <div className="space-y-3">
            {langEntries.map(([lang, bytes]) => {
              const pct = ((bytes / totalBytes) * 100);
              return (
                <div key={lang}>
                  <div className="flex justify-between mb-1">
                    <span className="text-[13px] font-mono">{lang}</span>
                    <span className={`text-[12px] font-mono ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>{pct.toFixed(1)}%</span>
                  </div>
                  <div className={`w-full h-1.5 rounded-none overflow-hidden ${d ? 'bg-d-bg' : 'bg-cream'}`}>
                    <div className="h-full bg-purple rounded-none" style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Patterns & Suggestions */}
        <div className="space-y-4">
          {(arch.patterns || []).length > 0 && (
            <div className={`card-brutal rounded-none p-5 ${d ? 'bg-d-card' : 'bg-white'}`}>
              <h2 className={`text-[11px] font-mono uppercase tracking-wider mb-3 ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>Detected Patterns</h2>
              <div className="flex flex-wrap gap-1.5">
                {arch.patterns.map((p, i) => (
                  <span key={i} className={`px-2 py-0.5 rounded-none text-[11px] font-mono font-semibold bg-blue text-ink border-2 ${d ? 'border-white' : 'border-black'}`}>{p}</span>
                ))}
              </div>
            </div>
          )}
          {(arch.suggestions || []).length > 0 && (
            <div className={`card-brutal rounded-none p-5 ${d ? 'bg-d-card' : 'bg-white'}`}>
              <h2 className={`text-[11px] font-mono uppercase tracking-wider mb-3 ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>Suggestions</h2>
              <ul className="space-y-2">
                {arch.suggestions.slice(0, 5).map((s, i) => (
                  <li key={i} className={`text-[13px] flex items-start gap-2 ${d ? 'text-d-muted' : 'text-ink-muted'}`}>
                    <span className="text-purple mt-0.5">→</span><span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
