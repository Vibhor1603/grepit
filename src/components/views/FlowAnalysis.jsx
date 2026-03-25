"use client";
export default function FlowAnalysis({ analysis, theme }) {
  const d = theme === 'dark';
  const flows = analysis?.architecture?.flowPaths || analysis?.results?.flowPaths || [];
  const ml = analysis?.architecture?.mlInsights || analysis?.results?.mlInsights || {};
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-1">Flow Analysis</h1>
        <p className={`text-sm font-mono ${d ? 'text-d-muted' : 'text-ink-muted'}`}>Execution paths and data flow traces</p>
      </div>
      {flows.length > 0 ? flows.map((flow, i) => (
        <div key={i} className={`card-brutal rounded-none p-5 ${d ? 'bg-d-card' : 'bg-white'}`}>
          <h3 className="font-mono font-semibold text-sm mb-3">{flow.name}</h3>
          <div className="space-y-2">
            {(flow.steps || []).map((step, j) => (
              <div key={j} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-6 h-6 rounded-none flex items-center justify-center text-[10px] font-mono font-bold ${d ? 'bg-purple/20 text-purple' : 'bg-purple/30 text-ink'}`}>{j + 1}</div>
                  {j < flow.steps.length - 1 && <div className={`w-px h-4 ${d ? 'bg-d-border' : 'bg-ink/10'}`}></div>}
                </div>
                <span className={`text-[13px] font-mono pt-0.5 ${d ? 'text-d-muted' : 'text-ink-muted'}`}>{step}</span>
              </div>
            ))}
          </div>
        </div>
      )) : (
        <div className={`card-brutal rounded-none p-8 text-center ${d ? 'bg-d-card' : 'bg-white'}`}>
          <span className={`material-symbols-outlined text-3xl mb-2 block ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>route</span>
          <p className={`text-sm font-mono ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>No execution flows detected.</p>
        </div>
      )}
      {/* ML/Data Insights */}
      {(ml.models?.length > 0 || ml.pipelines?.length > 0 || ml.dataFiles?.length > 0) && (
        <div className={`card-brutal rounded-none p-5 ${d ? 'bg-d-card' : 'bg-white'}`}>
          <h2 className={`text-[11px] font-mono uppercase tracking-wider mb-4 ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>ML / Data Insights</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ml.models?.length > 0 && <div><div className={`text-[10px] font-mono uppercase tracking-wider mb-2 ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>Models</div>{ml.models.map((m, i) => <div key={i} className={`text-[12px] font-mono mb-1 ${d ? 'text-blue' : 'text-ink-muted'}`}>{m}</div>)}</div>}
            {ml.pipelines?.length > 0 && <div><div className={`text-[10px] font-mono uppercase tracking-wider mb-2 ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>Pipelines</div>{ml.pipelines.map((p, i) => <div key={i} className={`text-[12px] font-mono mb-1 ${d ? 'text-purple' : 'text-ink-muted'}`}>{p}</div>)}</div>}
            {ml.dataFiles?.length > 0 && <div><div className={`text-[10px] font-mono uppercase tracking-wider mb-2 ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>Data Files</div>{ml.dataFiles.map((f, i) => <div key={i} className={`text-[12px] font-mono mb-1 ${d ? 'text-d-muted' : 'text-ink-muted'}`}>{f}</div>)}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
