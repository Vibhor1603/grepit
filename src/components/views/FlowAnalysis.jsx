"use client";
export default function FlowAnalysis({ analysis, theme }) {
  const d = theme === 'dark';
  const flows = analysis?.architecture?.flowPaths || analysis?.results?.flowPaths || [];
  const ml = analysis?.architecture?.mlInsights || analysis?.results?.mlInsights || {};
  const stepTones = d
    ? ['bg-blue/12 border-white', 'bg-purple/12 border-white', 'bg-lime/12 border-white', 'bg-peach/12 border-white']
    : ['bg-cream border-ink/10', 'bg-white border-ink/10', 'bg-sand/70 border-ink/10', 'bg-cream border-ink/10'];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-1">Flow Analysis</h1>
        <p className={`text-sm font-mono ${d ? 'text-d-muted' : 'text-ink-muted'}`}>Execution paths and data flow traces</p>
      </div>
      {flows.length > 0 ? flows.map((flow, i) => (
        <div key={i} className={`card-brutal rounded-none p-5 ${d ? 'bg-purple/12' : 'bg-white'}`}>
          <h3 className="font-mono font-semibold text-sm mb-4">{flow.name}</h3>
          <div className="overflow-x-auto">
            <div className="flex items-center gap-3 min-w-max pb-2">
              {(flow.steps || []).map((step, j) => (
                  <div key={j} className="flex items-center gap-3">
                  <div className={`min-w-[220px] max-w-[220px] border-2 p-3 ${stepTones[j % stepTones.length]}`}>
                    <div className={`text-[10px] uppercase tracking-[0.2em] font-mono mb-2 ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>Step {j + 1}</div>
                    <div className={`text-[13px] leading-relaxed ${d ? 'text-d-muted' : 'text-ink-muted'}`}>{step}</div>
                  </div>
                  {j < flow.steps.length - 1 && <div className="text-xl font-black text-purple">→</div>}
                </div>
              ))}
            </div>
          </div>
          <div className={`mt-4 text-[11px] font-mono ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>
            Tree/map mode highlights the order of execution and handoffs between each stage.
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
