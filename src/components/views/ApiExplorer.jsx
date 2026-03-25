"use client";
export default function ApiExplorer({ analysis, theme }) {
  const d = theme === 'dark';
  const endpoints = analysis?.architecture?.apiEndpoints || analysis?.results?.apiEndpoints || [];
  const methodColors = { GET: 'text-blue', POST: 'text-lime', PUT: 'text-purple', DELETE: 'text-red-400', PATCH: 'text-peach' };
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-1">API Explorer</h1>
        <p className={`text-sm font-mono ${d ? 'text-d-muted' : 'text-ink-muted'}`}>Auto-detected endpoints and routes</p>
      </div>
      {endpoints.length > 0 ? (
        <div className={`card-brutal rounded-none overflow-hidden ${d ? 'bg-d-card' : 'bg-white'}`}>
          {endpoints.map((ep, i) => (
            <div key={i} className={`flex items-start gap-3 p-4 ${i > 0 ? `border-t ${d ? 'border-d-border' : 'border-ink/10'}` : ''}`}>
              <span className={`text-[11px] font-mono font-bold w-12 shrink-0 mt-0.5 ${methodColors[ep.method] || (d ? 'text-d-muted' : 'text-ink-muted')}`}>{ep.method}</span>
              <div className="flex-1 min-w-0">
                <div className="font-mono text-sm font-semibold truncate">{ep.path}</div>
                <div className={`text-[12px] mt-0.5 ${d ? 'text-d-muted' : 'text-ink-muted'}`}>{ep.description}</div>
                {ep.file && <div className={`text-[11px] font-mono mt-1 ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>{ep.file}</div>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={`card-brutal rounded-none p-8 text-center ${d ? 'bg-d-card' : 'bg-white'}`}>
          <span className={`material-symbols-outlined text-3xl mb-2 block ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>api</span>
          <p className={`text-sm font-mono ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>No API endpoints detected in this codebase.</p>
        </div>
      )}
    </div>
  );
}
