"use client";
export default function ComponentBreakdown({ analysis, theme }) {
  const d = theme === 'dark';
  const components = analysis?.architecture?.components || analysis?.results?.components || [];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-1">Component Breakdown</h1>
        <p className={`text-sm font-mono ${d ? 'text-d-muted' : 'text-ink-muted'}`}>UI components, props, and relationships</p>
      </div>
      {components.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {components.map((comp, i) => (
            <div key={i} className={`card-brutal rounded-none p-4 ${d ? 'bg-d-card' : 'bg-white'}`}>
              <div className="font-mono font-semibold text-sm mb-1">{comp.name}</div>
              <div className={`text-[11px] font-mono mb-3 ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>{comp.file}</div>
              {comp.props?.length > 0 && (
                <div className="mb-2">
                  <span className={`text-[10px] font-mono uppercase tracking-wider ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>Props: </span>
                  {comp.props.map((p, j) => <span key={j} className={`text-[11px] font-mono ${d ? 'text-purple' : 'text-purple'}`}>{j > 0 ? ', ' : ''}{p}</span>)}
                </div>
              )}
              {comp.children?.length > 0 && (
                <div>
                  <span className={`text-[10px] font-mono uppercase tracking-wider ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>Children: </span>
                  {comp.children.map((c, j) => <span key={j} className={`text-[11px] font-mono ${d ? 'text-blue' : 'text-ink-muted'}`}>{j > 0 ? ', ' : ''}{c}</span>)}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className={`card-brutal rounded-none p-8 text-center ${d ? 'bg-d-card' : 'bg-white'}`}>
          <span className={`material-symbols-outlined text-3xl mb-2 block ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>widgets</span>
          <p className={`text-sm font-mono ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>No UI components detected.</p>
        </div>
      )}
    </div>
  );
}
