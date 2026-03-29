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
        <h1 className="text-2xl font-bold tracking-tight mb-1">Code Intel</h1>
        <p className={`text-sm font-mono ${d ? "text-d-muted" : "text-ink-muted"}`}>Functions, classes, methods, and where they live</p>
      </div>
      <div className={`card-brutal rounded-none p-3 ${d ? "bg-d-card" : "bg-white"}`}>
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search symbols..."
          className={`w-full px-3 py-2 rounded-none text-[13px] font-mono border ${d ? "bg-d-bg border-d-border text-d-text placeholder:text-d-subtle" : "bg-cream border-ink/10 text-ink placeholder:text-ink-faint"}`}
        />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-4">
        <div className={`card-brutal rounded-none p-3 max-h-[680px] overflow-y-auto ${d ? "bg-d-card" : "bg-white"}`}>
          {filtered.map((symbol, index) => (
            <button
              key={`${symbol.file}-${symbol.name}-${index}`}
              onClick={() => setSelectedName(symbol.name)}
              className={`w-full text-left rounded-none p-3 border-2 mb-2 ${
                selected?.name === symbol.name
                  ? (d ? "border-white bg-blue/20 text-d-text" : "border-black bg-blue text-ink")
                  : (d ? "border-d-border text-d-muted hover:bg-d-bg" : "border-ink/10 text-ink-muted hover:bg-sand/70")
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm font-extrabold">{symbol.name}</span>
                <span className={`text-[10px] uppercase tracking-[0.2em] font-mono ${d ? "text-d-subtle" : "text-ink-faint"}`}>{symbol.type}</span>
              </div>
              <div className={`text-[11px] font-mono mt-1 break-all ${d ? "text-d-subtle" : "text-ink-faint"}`}>{symbol.file}</div>
            </button>
          ))}
        </div>
        <div className={`card-brutal rounded-none p-5 ${d ? "bg-d-card" : "bg-white"}`}>
          {selected ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-extrabold tracking-tight">{selected.name}</h2>
                <button
                  type="button"
                  onClick={() => onNavigate?.("files", { path: selected.file })}
                  className={`text-left text-xs font-mono mt-1 break-all underline-offset-4 hover:underline ${d ? "text-d-subtle" : "text-ink-faint"}`}
                >
                  {selected.file}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`border-2 p-4 ${d ? "border-d-border bg-d-bg" : "border-ink/10 bg-cream"}`}>
                  <div className={`text-[10px] font-mono uppercase tracking-[0.2em] mb-3 ${d ? "text-d-subtle" : "text-ink-faint"}`}>Arguments</div>
                  {(selected.args || []).length ? selected.args.map((arg, index) => (
                    <div key={index} className={`text-sm font-mono mb-2 ${d ? "text-purple" : "text-ink"}`}>{arg}</div>
                  )) : <div className={`text-sm ${d ? "text-d-subtle" : "text-ink-faint"}`}>No arguments inferred.</div>}
                </div>
                <div className={`border-2 p-4 ${d ? "border-d-border bg-d-bg" : "border-ink/10 bg-cream"}`}>
                  <div className={`text-[10px] font-mono uppercase tracking-[0.2em] mb-3 ${d ? "text-d-subtle" : "text-ink-faint"}`}>Methods</div>
                  {(selected.methods || []).length ? selected.methods.map((method, index) => (
                    <div key={index} className={`text-sm font-mono mb-2 ${d ? "text-blue" : "text-ink"}`}>{method}</div>
                  )) : <div className={`text-sm ${d ? "text-d-subtle" : "text-ink-faint"}`}>No methods inferred.</div>}
                </div>
                <div className={`border-2 p-4 ${d ? "border-d-border bg-d-bg" : "border-ink/10 bg-cream"}`}>
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
                <div className={`border-2 p-4 ${d ? "border-d-border bg-d-bg" : "border-ink/10 bg-cream"}`}>
                  <div className={`text-[10px] font-mono uppercase tracking-[0.2em] mb-3 ${d ? "text-d-subtle" : "text-ink-faint"}`}>Returns</div>
                  <div className="flex flex-wrap gap-2">
                    {selected.returns.map((item, index) => (
                      <span key={index} className={`px-2 py-1 text-xs font-mono border-2 ${d ? "border-white bg-d-card" : "border-black bg-white"}`}>{item}</span>
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
