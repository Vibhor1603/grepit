"use client";
export default function SetupGuide({ analysis, theme }) {
  const d = theme === 'dark';
  const steps = analysis?.architecture?.setupSteps || analysis?.results?.setupSteps || [];
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
    </div>
  );
}
