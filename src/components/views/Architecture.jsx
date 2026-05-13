"use client";
export default function Architecture({ analysis, theme, eli5, onNavigate }) {
  const d = theme === 'dark';
  const arch = analysis?.architecture || analysis?.results || {};
  const queryEngine = analysis?.results?.queryArchitecture || arch.queryArchitecture || null;
  const codebaseSummary = analysis?.results?.codebaseIndex?.summary || null;
  const layers = arch.layers || [];
  const deps = analysis?.results?.dependencyGraph || arch.dependencies || [];
  const callGraph = analysis?.results?.callGraph || [];
  const fileTree = analysis?.file_tree || [];
  const modules = {};
  fileTree.forEach(f => { if (f.type === 'blob') { const g = f.path.split('/').slice(0, 2).join('/'); modules[g] = (modules[g] || 0) + 1; } });
  const topModules = Object.entries(modules).sort((a, b) => b[1] - a[1]).slice(0, 12);
  const max = topModules[0]?.[1] || 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-1">Architecture Map</h1>
        <p className={`text-sm font-mono ${d ? 'text-d-muted' : 'text-ink-muted'}`}>
          {eli5 ? "This shows how the different parts of the project fit together, like rooms in a house." : "System topology and module dependency analysis"}
        </p>
      </div>
      {layers.length > 0 && (
        <div className={`card-brutal rounded-none p-5 ${d ? 'bg-d-card' : 'bg-white'}`}>
          <h2 className={`text-[11px] font-mono uppercase tracking-wider mb-4 ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>Architecture Layers</h2>
          <div className="space-y-3">
            {layers.map((layer, i) => (
              <div key={i} className={`p-3 rounded-none border ${d ? 'border-d-border bg-d-bg' : 'border-ink/10 bg-cream'}`}>
                <div className="font-mono font-semibold text-sm mb-2">{layer.name}</div>
                <div className="flex flex-wrap gap-1">{(layer.modules || []).map((m, j) => (
                  <button
                    key={j}
                    type="button"
                    onClick={() => onNavigate?.('files', { path: m })}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono underline-offset-4 hover:underline ${d ? 'bg-d-card text-d-muted' : 'bg-white text-ink-muted'}`}
                  >
                    {m}
                  </button>
                ))}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {queryEngine && (
        <div className={`card-brutal rounded-none p-5 ${d ? 'bg-d-card' : 'bg-white'}`}>
          <h2 className={`text-[11px] font-mono uppercase tracking-wider mb-4 ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>Query Engine</h2>
          <div className="space-y-3">
            <div className={`p-3 rounded-none border ${d ? 'border-d-border bg-d-bg' : 'border-ink/10 bg-cream'}`}>
              <div className="font-mono font-semibold text-sm">{queryEngine.strategy}</div>
              <p className={`mt-2 text-[12px] leading-relaxed font-mono ${d ? 'text-d-muted' : 'text-ink-muted'}`}>
                {queryEngine.summary}
              </p>
            </div>
            {codebaseSummary && (
              <div className="grid grid-cols-2 xl:grid-cols-5 gap-2">
                {[
                  ['Files', codebaseSummary.fileCount],
                  ['Dirs', codebaseSummary.directoryCount],
                  ['Imports', codebaseSummary.dependencyEdges],
                  ['Calls', codebaseSummary.callEdges],
                  ['Unresolved', codebaseSummary.unresolvedImports],
                ].map(([label, value]) => (
                  <div key={label} className={`px-3 py-2 rounded-none border text-[12px] font-mono ${d ? 'border-d-border bg-d-bg text-d-muted' : 'border-ink/10 bg-cream text-ink-muted'}`}>
                    <div className={`${d ? 'text-d-subtle' : 'text-ink-faint'}`}>{label}</div>
                    <div className="mt-1 font-semibold text-sm">{value}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
              {(queryEngine.phases || []).map((phase, i) => (
                <div key={i} className={`px-3 py-2 rounded-none border text-[12px] font-mono ${d ? 'border-d-border bg-d-bg text-d-muted' : 'border-ink/10 bg-cream text-ink-muted'}`}>
                  {phase}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <div className={`card-brutal rounded-none p-5 ${d ? 'bg-d-card' : 'bg-white'}`}>
        <h2 className={`text-[11px] font-mono uppercase tracking-wider mb-4 ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>Modules ({topModules.length})</h2>
          <div className="space-y-1.5">
            {topModules.map(([mod, count]) => (
              <button
                key={mod}
                type="button"
                onClick={() => onNavigate?.('files', { path: mod })}
                className="flex items-center gap-3 py-1 w-full text-left"
              >
                <span className="text-[12px] font-mono truncate w-40 shrink-0">{mod}</span>
                <div className={`flex-1 h-2 rounded-none overflow-hidden ${d ? 'bg-d-bg' : 'bg-cream'}`}>
                  <div className="h-full bg-purple rounded-none" style={{ width: `${(count / max) * 100}%` }}></div>
                </div>
                <span className={`text-[11px] font-mono w-6 text-right shrink-0 ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>{count}</span>
              </button>
            ))}
          </div>
        </div>
      {deps.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className={`card-brutal rounded-none p-5 ${d ? 'bg-d-card' : 'bg-white'}`}>
            <h2 className={`text-[11px] font-mono uppercase tracking-wider mb-4 ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>Dependencies</h2>
            <div className="grid grid-cols-1 gap-2">
              {deps.slice(0, 16).map((dep, i) => (
                <div key={i} className={`flex items-center gap-2 py-1.5 px-3 rounded-md text-[12px] font-mono ${d ? 'bg-d-bg text-d-muted' : 'bg-cream text-ink-muted'}`}>
                  <button type="button" onClick={() => onNavigate?.('files', { path: dep.from })} className={`truncate underline-offset-4 hover:underline ${d ? 'text-d-text' : 'text-ink'}`}>{dep.from}</button>
                  <span className="text-purple">→</span>
                  <button type="button" onClick={() => onNavigate?.('files', { path: dep.to })} className="truncate underline-offset-4 hover:underline">{dep.to}</button>
                </div>
              ))}
            </div>
          </div>
          <div className={`card-brutal rounded-none p-5 ${d ? 'bg-d-card' : 'bg-white'}`}>
            <h2 className={`text-[11px] font-mono uppercase tracking-wider mb-4 ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>Call Graph</h2>
            <div className="space-y-2">
              {callGraph.slice(0, 14).map((edge, i) => (
                <div key={i} className={`py-2 px-3 border-2 text-[12px] font-mono ${d ? 'border-d-border bg-d-bg text-d-muted' : 'border-ink/10 bg-cream text-ink-muted'}`}>
                  <button type="button" onClick={() => onNavigate?.('symbols', { symbol: edge.from.split('#').pop() })} className="break-all text-left underline-offset-4 hover:underline">{edge.from}</button>
                  <div className="text-purple my-1">calls</div>
                  <button type="button" onClick={() => onNavigate?.('symbols', { symbol: edge.to.split('#').pop() })} className="break-all text-left underline-offset-4 hover:underline">{edge.to}</button>
                </div>
              ))}
              {callGraph.length === 0 && <div className={`text-sm ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>No call edges inferred yet.</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
