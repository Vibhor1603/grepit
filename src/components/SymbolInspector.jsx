"use client";
import { useState, useMemo } from 'react';
import { ChevronDown, Code2, Layers, Box, Copy, Check } from 'lucide-react';

/* ── Parse args into structured list ── */
function parseArgs(args) {
  if (!args || (Array.isArray(args) && args.length === 0)) return [];
  const list = Array.isArray(args) ? args : args.split(',').map(a => a.trim()).filter(Boolean);
  return list.map(arg => {
    const colonSplit = arg.split(':').map(s => s.trim());
    if (colonSplit.length === 2) return { name: colonSplit[0], type: colonSplit[1] };
    const spaceSplit = arg.split(/\s+/);
    if (spaceSplit.length === 2 && /^[A-Z]/.test(spaceSplit[0])) return { name: spaceSplit[1], type: spaceSplit[0] };
    if (spaceSplit.length === 2 && /^[a-z]/.test(spaceSplit[0]) && !['const', 'let', 'var', 'async', 'await'].includes(spaceSplit[0])) return { name: spaceSplit[1], type: spaceSplit[0] };
    return { name: arg.replace(/[=].*$/, '').trim(), type: null };
  });
}

/* ── Build a concrete summary from symbol metadata ── */
function buildDescription(symbol, kind, args, usedBy) {
  const usedCount = (usedBy || []).length;
  const argSummary = args.length > 0
    ? args.map((a) => (a.type ? `\`${a.name}: ${a.type}\`` : `\`${a.name}\``)).join(", ")
    : null;

  const action = symbol.name.replace(/([A-Z])/g, " $1").trim().toLowerCase();
  const prefix = kind === "class" ? "Class" : kind === "method" ? "Method" : "Function";

  let text = `${prefix} \`${symbol.name}\` is responsible for ${action}.`;
  if (argSummary) {
    text += ` It accepts ${args.length} parameter${args.length > 1 ? "s" : ""}: ${argSummary}.`;
  } else if (kind !== "class") {
    text += " It does not declare explicit input parameters.";
  }
  if (usedCount > 0) {
    text += ` It is referenced by ${usedCount} other file${usedCount > 1 ? "s" : ""}.`;
  }
  return text;
}

function getReturnType(symbol, kind) {
  if (kind === "class") return null;
  const returns = symbol?.returns;
  if (Array.isArray(returns) && returns.length > 0) {
    const concrete = returns.find(Boolean);
    return concrete || null;
  }
  return null;
}

/* ── Copy button ── */
function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="p-1 rounded-md text-vb-ink4 hover:text-vb-accent hover:bg-vb-accent/[0.06] transition-all"
      title="Copy signature"
    >
      {copied ? <Check size={12} className="text-vb-accent" /> : <Copy size={12} />}
    </button>
  );
}

/* ── Single Symbol Card ── */
function SymbolCard({ symbol, kind, usedBy = [] }) {
  const [expanded, setExpanded] = useState(false);
  const args = parseArgs(symbol.args);
  const description = buildDescription(symbol, kind, args, usedBy);
  const returnType = getReturnType(symbol, kind);

  const signature = useMemo(() => {
    if (kind === 'class') return `class ${symbol.name}`;
    const argStr = args.map(a => a.type ? `${a.name}: ${a.type}` : a.name).join(', ');
    return `${symbol.name}(${argStr})`;
  }, [symbol.name, kind, args]);

  const usedByFiles = usedBy.length > 0 ? usedBy.map(p => p.split('/').pop()) : [];
  const classMethods = symbol.methods || [];

  return (
    <div className={`transition-all duration-200 ${expanded ? 'mb-2' : ''}`}>
      {/* Collapsed row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all duration-150 group/sym ${
          expanded ? 'bg-c-overlay-4' : 'hover:bg-c-overlay-2'
        }`}
      >
        <ChevronDown
          size={11}
          className={`flex-shrink-0 text-vb-ink4 transition-transform duration-200 ${expanded ? '' : '-rotate-90'}`}
        />
        <span className={`text-[11.5px] font-mono font-medium truncate ${
          kind === 'function' ? 'text-vb-blue' : kind === 'class' ? 'text-vb-violet' : 'text-vb-cyan'
        }`}>
          {symbol.name}
        </span>
        {args.length > 0 && kind !== 'class' && (
          <span className="text-[10px] text-vb-ink4 font-mono">
            ({args.length})
          </span>
        )}
        {returnType && kind !== 'class' && (
          <span className="text-[9.5px] text-vb-green font-mono ml-auto opacity-0 group-hover/sym:opacity-100 transition-opacity">
            → {returnType}
          </span>
        )}
        {classMethods.length > 0 && (
          <span className="text-[9.5px] text-vb-ink4 font-mono ml-auto">
            {classMethods.length} method{classMethods.length > 1 ? 's' : ''}
          </span>
        )}
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-3 pt-2 pb-3 animate-fade-in">
          {/* Description — large, readable, the primary content */}
          <p className="text-[12px] text-vb-ink2 leading-[1.65] mb-2.5">
            {description}
          </p>

          {/* Return type */}
          {kind !== 'class' && (
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] text-vb-ink4">Returns</span>
              <span className="text-[11px] font-mono text-vb-green font-medium">{returnType || "unknown (not declared)"}</span>
            </div>
          )}

          {/* Arguments */}
          {args.length > 0 && (
            <div className="mb-2.5">
              <span className="text-[10px] text-vb-ink4 block mb-1">Parameters</span>
              <div className="space-y-0.5">
                {args.map((arg, i) => (
                  <div key={i} className="flex items-baseline gap-2 pl-2">
                    <span className="text-[11px] font-mono text-vb-ink font-medium">{arg.name}</span>
                    {arg.type && (
                      <span className="text-[10px] font-mono text-vb-green/80">{arg.type}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Class methods */}
          {kind === 'class' && classMethods.length > 0 && (
            <div className="mb-2.5">
              <span className="text-[10px] text-vb-ink4 block mb-1">Methods</span>
              <div className="flex flex-wrap gap-1.5">
                {classMethods.map((m, i) => (
                  <span key={i} className="px-1.5 py-0.5 rounded-md bg-vb-cyan/[0.08] text-[10px] font-mono text-vb-cyan">
                    {m}()
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Used by */}
          {usedByFiles.length > 0 && (
            <div className="mb-2.5">
              <span className="text-[10px] text-vb-ink4 block mb-1">Referenced in</span>
              <div className="flex flex-wrap gap-1.5">
                {usedByFiles.slice(0, 5).map((f, i) => (
                  <span key={i} className="px-1.5 py-0.5 rounded-md bg-c-overlay-3 text-[10px] font-mono text-vb-ink3">
                    {f}
                  </span>
                ))}
                {usedByFiles.length > 5 && (
                  <span className="text-[10px] text-vb-ink4 self-center">+{usedByFiles.length - 5}</span>
                )}
              </div>
            </div>
          )}

          {/* Signature + copy — subtle footer */}
          <div className="flex items-center gap-2 pt-2 border-t border-c-line">
            <code className="text-[10px] font-mono text-vb-ink4 truncate flex-1">{signature}</code>
            <CopyBtn text={signature} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Section ── */
function Section({ icon: Icon, label, count, color, children }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="mb-2">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-c-overlay-1 rounded-lg transition-colors"
      >
        <Icon size={12} className={color} />
        <span className="text-[11px] font-semibold text-vb-ink2 uppercase tracking-wide flex-1 text-left">{label}</span>
        <span className="text-[10px] font-mono text-vb-ink4 tabular-nums">{count}</span>
        <ChevronDown size={10} className={`text-vb-ink4 transition-transform duration-200 ${collapsed ? '-rotate-90' : ''}`} />
      </button>
      {!collapsed && (
        <div className="mt-0.5">
          {children}
        </div>
      )}
    </div>
  );
}

/* ── Empty state ── */
function EmptyState({ fileKind }) {
  const config = {
    stylesheet: { emoji: '🎨', title: 'Stylesheet', desc: 'Contains selectors, custom properties, and animations. No executable symbols.' },
    markup: { emoji: '📄', title: 'Markup', desc: 'Contains HTML structure and tags. No functions or classes.' },
    config: { emoji: '⚙️', title: 'Configuration', desc: 'Contains key-value settings. No executable code.' },
    docs: { emoji: '📝', title: 'Documentation', desc: 'Contains headings and prose. No code symbols.' },
  };
  const { emoji, title, desc } = config[fileKind] || { emoji: '📦', title: 'No symbols', desc: 'No functions, classes, or methods detected in this file.' };

  return (
    <div className="flex flex-col items-center justify-center py-12 px-5">
      <span className="text-2xl mb-3">{emoji}</span>
      <span className="text-[12px] font-medium text-vb-ink3 mb-1.5">{title}</span>
      <p className="text-[12px] text-vb-ink4 text-center leading-relaxed max-w-[200px]">{desc}</p>
    </div>
  );
}

/* ── Main Component ── */
export default function SymbolInspector({ fileIntel, fileName }) {
  // Keywords that should never appear as symbols
  const KEYWORDS = new Set(['if', 'else', 'for', 'while', 'do', 'switch', 'catch', 'finally', 'try', 'return', 'throw', 'new', 'delete', 'typeof', 'void', 'with', 'yield', 'await', 'async', 'class', 'function', 'const', 'let', 'var', 'import', 'export', 'default', 'break', 'continue', 'debugger', 'in', 'of', 'instanceof', 'super', 'this', 'case', 'elif', 'except', 'pass', 'raise', 'lambda', 'print', 'None', 'True', 'False']);

  const functions = (fileIntel?.functions || []).filter(f => !KEYWORDS.has(f.name));
  const classes = (fileIntel?.classes || []).filter(c => !KEYWORDS.has(c.name));
  const methods = (fileIntel?.methods || []).filter(m => !KEYWORDS.has(m.name));

  const hasFunctions = functions.length > 0;
  const hasClasses = classes.length > 0;
  const hasMethods = methods.length > 0;
  const hasSymbols = hasFunctions || hasClasses || hasMethods;

  const fileKind = fileIntel?.fileKind || 'source';

  if (!fileIntel) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-5">
        <Code2 size={18} className="text-vb-ink4 mb-3" />
        <p className="text-[12px] text-vb-ink4 text-center">Select a file to inspect its symbols</p>
      </div>
    );
  }

  if (!hasSymbols) {
    return <EmptyState fileKind={fileKind} />;
  }

  return (
    <div className="py-1.5">
      {hasFunctions && (
        <Section icon={Code2} label="Functions" count={functions.length} color="text-vb-blue">
          {functions.map((fn, i) => (
            <SymbolCard key={`fn-${i}`} symbol={fn} kind="function" usedBy={fn.usedBy || []} />
          ))}
        </Section>
      )}

      {hasClasses && (
        <Section icon={Box} label="Classes" count={classes.length} color="text-vb-violet">
          {classes.map((cls, i) => (
            <SymbolCard key={`cls-${i}`} symbol={cls} kind="class" />
          ))}
        </Section>
      )}

      {hasMethods && (
        <Section icon={Layers} label="Methods" count={methods.length} color="text-vb-cyan">
          {methods.map((m, i) => (
            <SymbolCard key={`m-${i}`} symbol={m} kind="method" />
          ))}
        </Section>
      )}
    </div>
  );
}
