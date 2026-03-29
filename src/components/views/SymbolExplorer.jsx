"use client";
import { useEffect, useMemo, useState } from "react";

export default function SymbolExplorer({ analysis, theme, onNavigate, initialSymbol = "" }) {
  const d = theme === "dark";
  const [search, setSearch] = useState("");
  const symbols = analysis?.results?.symbolIndex || analysis?.architecture?.symbolIndex || [];
  const filtered = useMemo(
    () =>
      symbols.filter((symbol) =>
        `${symbol.name} ${symbol.file} ${symbol.type}`.toLowerCase().includes(search.trim().toLowerCase()),
      ),
    [symbols, search],
  );
  const [selectedName, setSelectedName] = useState(filtered[0]?.name || null);
  useEffect(() => {
    if (!filtered.some((symbol) => symbol.name === selectedName)) {
      setSelectedName(filtered[0]?.name || null);
    }
  }, [filtered, selectedName]);
  useEffect(() => {
    if (initialSymbol && filtered.some((symbol) => symbol.name === initialSymbol)) {
      setSelectedName(initialSymbol);
    }
  }, [filtered, initialSymbol]);
  const selected = filtered.find((symbol) => symbol.name === selectedName) || filtered[0] || null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-1">Code Intel</h1>
        <p className={`text-sm ${d ? "text-d-muted" : "text-ink-muted"}`}>Functions, classes, methods, and usage relationships across the codebase.</p>
      </div>
      <div className="workspace-card p-3 md:p-4">
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search symbols..."
          className={`workspace-input w-full px-4 py-3 text-[13px] font-mono ${d ? "text-d-text placeholder:text-d-subtle" : "text-ink placeholder:text-ink-faint"}`}
        />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-[340px_minmax(0,1fr)] gap-5 xl:gap-6">
        <div className="workspace-card p-4 md:p-5 max-h-[680px] overflow-y-auto">
          {filtered.map((symbol, index) => (
            <button
              key={`${symbol.file}-${symbol.name}-${index}`}
              onClick={() => setSelectedName(symbol.name)}
              className={`w-full text-left p-4 mb-3 rounded-[18px] border transition-all ${
                selected?.name === symbol.name
                  ? (d ? "border-white/10 bg-blue/12 text-d-text shadow-[0_18px_34px_rgba(0,0,0,0.28)]" : "border-black/10 bg-blue/10 text-ink shadow-[0_16px_32px_rgba(15,23,42,0.08)]")
                  : (d ? "border-d-border text-d-muted hover:bg-white/5" : "border-ink/10 text-ink-muted hover:bg-sand/70")
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm font-semibold">{symbol.name}</span>
                <span className={`text-[10px] uppercase tracking-[0.2em] font-mono ${d ? "text-d-subtle" : "text-ink-faint"}`}>{symbol.type}</span>
              </div>
              <div className={`text-[11px] font-mono mt-1 break-all ${d ? "text-d-subtle" : "text-ink-faint"}`}>{symbol.file}</div>
            </button>
          ))}
        </div>
        <div className="workspace-card p-6 md:p-7">
          {selected ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl md:text-2xl font-semibold tracking-tight">{selected.name}</h2>
                <button
                  type="button"
                  onClick={() => onNavigate?.("files", { path: selected.file })}
                  className={`text-left text-xs font-mono mt-1 break-all underline-offset-4 hover:underline ${d ? "text-d-subtle" : "text-ink-faint"}`}
                >
                  {selected.file}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="workspace-panel p-4 md:p-5">
                  <div className={`text-[10px] font-mono uppercase tracking-[0.2em] mb-3 ${d ? "text-d-subtle" : "text-ink-faint"}`}>Arguments</div>
                  {(selected.args || []).length ? selected.args.map((arg, index) => (
                    <div key={index} className={`text-sm font-mono mb-2 ${d ? "text-purple" : "text-ink"}`}>{arg}</div>
                  )) : <div className={`text-sm ${d ? "text-d-subtle" : "text-ink-faint"}`}>No arguments inferred.</div>}
                </div>
                <div className="workspace-panel p-4 md:p-5">
                  <div className={`text-[10px] font-mono uppercase tracking-[0.2em] mb-3 ${d ? "text-d-subtle" : "text-ink-faint"}`}>Methods</div>
                  {(selected.methods || []).length ? selected.methods.map((method, index) => (
                    <div key={index} className={`text-sm font-mono mb-2 ${d ? "text-blue" : "text-ink"}`}>{method}</div>
                  )) : <div className={`text-sm ${d ? "text-d-subtle" : "text-ink-faint"}`}>No methods inferred.</div>}
                </div>
                <div className="workspace-panel p-4 md:p-5">
                  <div className={`text-[10px] font-mono uppercase tracking-[0.2em] mb-3 ${d ? "text-d-subtle" : "text-ink-faint"}`}>Used In</div>
                  {(selected.usedBy || []).length ? selected.usedBy.map((usage, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => onNavigate?.("files", { path: usage })}
                      className={`block text-left text-sm font-mono mb-2 break-all underline-offset-4 hover:underline ${d ? "text-lime" : "text-ink"}`}
                    >
                      {usage}
                    </button>
                  )) : <div className={`text-sm ${d ? "text-d-subtle" : "text-ink-faint"}`}>No usage sites inferred yet.</div>}
                </div>
              </div>
              {selected.returns?.length > 0 && (
                <div className="workspace-panel p-4 md:p-5">
                  <div className={`text-[10px] font-mono uppercase tracking-[0.2em] mb-3 ${d ? "text-d-subtle" : "text-ink-faint"}`}>Returns</div>
                  <div className="flex flex-wrap gap-2">
                    {selected.returns.map((item, index) => (
                      <span key={index} className="workspace-chip">{item}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className={`text-center py-20 ${d ? "text-d-subtle" : "text-ink-faint"}`}>No symbols available for this repository.</div>
          )}
        </div>
      </div>
    </div>
  );
}
