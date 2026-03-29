"use client";
export default function SetupGuide({ analysis, theme, onNavigate }) {
  const d = theme === 'dark';
  const steps = analysis?.architecture?.setupSteps || analysis?.results?.setupSteps || [];
  const tools = analysis?.architecture?.requiredTools || analysis?.results?.requiredTools || [];
  const envNotes = analysis?.architecture?.environmentNotes || analysis?.results?.environmentNotes || [];
  const entryPoints = analysis?.architecture?.entryPoints || analysis?.results?.entryPoints || [];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-1">Setup Guide</h1>
        <p className={`text-sm font-mono ${d ? 'text-d-muted' : 'text-ink-muted'}`}>Auto-generated local development instructions</p>
      </div>
      <div className={`card-brutal rounded-none p-5 ${d ? 'bg-d-card' : 'bg-white'}`}>
        {steps.length > 0 ? (
          <ol className="space-y-4">
            {steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className={`w-6 h-6 rounded-none flex items-center justify-center text-[11px] font-mono font-bold shrink-0 ${d ? 'bg-purple/20 text-purple' : 'bg-purple/30 text-ink'}`}>{i + 1}</span>
                <span className={`text-[13px] font-mono leading-relaxed pt-0.5 ${d ? 'text-d-muted' : 'text-ink-muted'}`}>{step}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className={`text-sm font-mono ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>No setup steps detected. Try asking the AI Query console for setup instructions.</p>
        )}
      </div>
      {(tools.length > 0 || envNotes.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`card-brutal rounded-none p-5 ${d ? 'bg-d-card' : 'bg-white'}`}>
            <h2 className={`text-[11px] font-mono uppercase tracking-wider mb-4 ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>Required Tools</h2>
            <div className="space-y-2">
              {tools.map((tool, index) => (
                <div key={index} className={`text-[13px] font-mono ${d ? 'text-d-text' : 'text-ink'}`}>{tool}</div>
              ))}
            </div>
          </div>
          <div className={`card-brutal rounded-none p-5 ${d ? 'bg-d-card' : 'bg-white'}`}>
            <h2 className={`text-[11px] font-mono uppercase tracking-wider mb-4 ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>Environment & Fixes</h2>
            <div className="space-y-2">
              {envNotes.map((note, index) => (
                <div key={index} className={`text-[13px] leading-relaxed ${d ? 'text-d-muted' : 'text-ink-muted'}`}>{note}</div>
              ))}
            </div>
          </div>
        </div>
      )}
      {entryPoints.length > 0 && (
        <div className={`card-brutal rounded-none p-5 ${d ? 'bg-blue/12' : 'bg-white'}`}>
          <h2 className={`text-[11px] font-mono uppercase tracking-wider mb-4 ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>Useful Entry Files</h2>
          <div className="flex flex-wrap gap-2">
            {entryPoints.slice(0, 6).map((entry) => (
              <button
                key={entry}
                type="button"
                onClick={() => onNavigate?.('files', { path: entry })}
                className={`px-3 py-2 border-2 text-[12px] font-mono ${d ? 'border-white bg-d-bg hover:bg-blue/12' : 'border-black bg-cream hover:bg-sand'}`}
              >
                {entry}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
