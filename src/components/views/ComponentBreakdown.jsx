"use client";
import { useEffect, useMemo, useState } from 'react';

export default function ComponentBreakdown({ analysis, theme, onNavigate, initialComponent = '' }) {
  const d = theme === 'dark';
  const components = useMemo(() => {
    const entries = analysis?.architecture?.components || analysis?.results?.components || [];
    if (entries.length > 0) return entries;
    const fileTree = analysis?.file_tree || [];
    return fileTree
      .filter((entry) => entry.type === 'blob' && /(src\/components\/|components\/).+\.(jsx|tsx)$/.test(entry.path))
      .slice(0, 16)
      .map((entry) => ({
        name: entry.path.split('/').pop().replace(/\.(jsx|tsx)$/, ''),
        file: entry.path,
        props: [],
        children: [],
        usedIn: [],
        summary: 'Detailed component analysis will appear after a fresh repository scan.',
      }));
  }, [analysis]);
  const [selected, setSelected] = useState(components[0]?.name || null);
  useEffect(() => {
    if (initialComponent && components.some((component) => component.name === initialComponent)) {
      setSelected(initialComponent);
    }
  }, [components, initialComponent]);
  const selectedComponent = components.find((component) => component.name === selected) || components[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-1">Component Breakdown</h1>
        <p className={`text-sm font-mono ${d ? 'text-d-muted' : 'text-ink-muted'}`}>UI components, props, and relationships</p>
      </div>
      {components.length > 0 ? (
        <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-4">
          <div className={`card-brutal rounded-none p-3 space-y-2 max-h-[680px] overflow-y-auto ${d ? 'bg-blue/12' : 'bg-white'}`}>
            {components.map((comp, i) => (
              <button
                key={i}
                onClick={() => setSelected(comp.name)}
                className={`w-full text-left rounded-none p-3 border-2 transition-all ${
                  selectedComponent?.name === comp.name
                    ? (d ? 'border-white bg-lime/35 text-d-text' : 'border-black bg-lime text-ink')
                    : (d ? 'border-d-border text-d-muted hover:bg-d-bg' : 'border-ink/10 text-ink-muted hover:bg-sand/60')
                }`}
              >
                <div className="font-mono text-sm font-extrabold">{comp.name}</div>
                <div className={`text-[11px] font-mono mt-1 ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>{comp.file}</div>
              </button>
            ))}
          </div>
          <div className={`card-brutal rounded-none p-5 ${d ? 'bg-purple/12' : 'bg-white'}`}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl font-extrabold tracking-tight">{selectedComponent?.name}</h2>
                <button
                  type="button"
                  onClick={() => onNavigate?.('files', { path: selectedComponent?.file })}
                  className={`text-left text-xs font-mono mt-1 break-all underline-offset-4 hover:underline ${d ? 'text-d-subtle' : 'text-ink-faint'}`}
                >
                  {selectedComponent?.file}
                </button>
              </div>
              <div className={`px-3 py-1 border-2 text-[10px] uppercase tracking-[0.2em] font-mono ${d ? 'border-d-border text-d-subtle' : 'border-ink/10 text-ink-faint'}`}>
                clickable map
              </div>
            </div>
            <p className={`text-sm leading-relaxed mb-5 ${d ? 'text-d-muted' : 'text-ink-muted'}`}>
              {selectedComponent?.summary || 'No descriptive summary is available for this component yet.'}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`border-2 p-4 ${d ? 'border-d-border bg-purple/15' : 'border-ink/10 bg-cream'}`}>
                <div className={`text-[10px] font-mono uppercase tracking-[0.2em] mb-3 ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>Props</div>
                {(selectedComponent?.props || []).length ? selectedComponent.props.map((prop, index) => (
                  <div key={index} className={`text-sm font-mono mb-2 ${d ? 'text-purple' : 'text-ink'}`}>{prop}</div>
                )) : <div className={`text-sm ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>No props inferred.</div>}
              </div>
              <div className={`border-2 p-4 ${d ? 'border-d-border bg-blue/15' : 'border-ink/10 bg-cream'}`}>
                <div className={`text-[10px] font-mono uppercase tracking-[0.2em] mb-3 ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>Renders</div>
                {(selectedComponent?.children || []).length ? selectedComponent.children.map((child, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => onNavigate?.('components', { component: child })}
                    className={`block text-left text-sm font-mono mb-2 underline-offset-4 hover:underline ${d ? 'text-blue' : 'text-ink'}`}
                  >
                    {child}
                  </button>
                )) : <div className={`text-sm ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>No child components inferred.</div>}
              </div>
              <div className={`border-2 p-4 ${d ? 'border-d-border bg-lime/15' : 'border-ink/10 bg-cream'}`}>
                <div className={`text-[10px] font-mono uppercase tracking-[0.2em] mb-3 ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>Used In</div>
                {(selectedComponent?.usedIn || []).length ? selectedComponent.usedIn.map((usage, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => onNavigate?.('files', { path: usage })}
                    className={`block text-left text-sm font-mono mb-2 break-all underline-offset-4 hover:underline ${d ? 'text-lime' : 'text-ink'}`}
                  >
                    {usage}
                  </button>
                )) : <div className={`text-sm ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>No usage sites inferred yet.</div>}
              </div>
            </div>
          </div>
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
