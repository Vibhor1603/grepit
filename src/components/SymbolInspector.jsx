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

/* ── Infer a meaningful description from function name + context ── */
function inferDescription(name, kind, args, usedBy) {
  const lower = name.toLowerCase();
  const argNames = args.map(a => a.name).join(', ');
  const usedCount = (usedBy || []).length;

  // Build a richer, more contextual description
  let action = '';
  let detail = '';

  if (/^(get|fetch|load|read|find|query|retrieve)/.test(lower)) {
    action = 'Fetches or retrieves data';
    if (argNames) detail = ` based on ${argNames}`;
  } else if (/^(set|update|put|patch|modify|change)/.test(lower)) {
    action = 'Updates or mutates';
    const target = name.replace(/^(set|update|put|patch|modify|change)/i, '');
    if (target) detail = ` the ${target.replace(/([A-Z])/g, ' $1').trim().toLowerCase()}`;
    else if (argNames) detail = ` using ${argNames}`;
  } else if (/^(create|make|build|generate|new|init|setup)/.test(lower)) {
    action = 'Constructs and returns a new';
    const target = name.replace(/^(create|make|build|generate|new|init|setup)/i, '');
    detail = target ? ` ${target.replace(/([A-Z])/g, ' $1').trim().toLowerCase()} instance` : ' resource or object';
  } else if (/^(delete|remove|destroy|clear|reset|drop)/.test(lower)) {
    action = 'Removes or cleans up';
    const target = name.replace(/^(delete|remove|destroy|clear|reset|drop)/i, '');
    detail = target ? ` ${target.replace(/([A-Z])/g, ' $1').trim().toLowerCase()}` : ' the target resource';
  } else if (/^handle/.test(lower)) {
    const event = name.replace(/^handle/i, '');
    action = `Handles the ${event.replace(/([A-Z])/g, ' $1').trim().toLowerCase()} event`;
    if (argNames) detail = ` with ${argNames}`;
  } else if (/^on/.test(lower)) {
    const event = name.replace(/^on/i, '');
    action = `Callback triggered on ${event.replace(/([A-Z])/g, ' $1').trim().toLowerCase()}`;
  } else if (/^(is|has|can|should|check|validate|verify)/.test(lower)) {
    action = 'Checks whether';
    const condition = name.replace(/^(is|has|can|should|check|validate|verify)/i, '');
    detail = condition ? ` ${condition.replace(/([A-Z])/g, ' $1').trim().toLowerCase()} is true` : ' a condition holds';
  } else if (/^(render|display|show|draw|paint)/.test(lower)) {
    action = 'Renders';
    const target = name.replace(/^(render|display|show|draw|paint)/i, '');
    detail = target ? ` the ${target.replace(/([A-Z])/g, ' $1').trim().toLowerCase()} UI` : ' a visual component';
  } else if (/^(parse|transform|convert|format|serialize|map|normalize)/.test(lower)) {
    action = 'Transforms data';
    const target = name.replace(/^(parse|transform|convert|format|serialize|map|normalize)/i, '');
    if (target) detail = ` into ${target.replace(/([A-Z])/g, ' $1').trim().toLowerCase()} format`;
    else if (argNames) detail = ` from ${argNames}`;
  } else if (/^use/.test(lower)) {
    const hookName = name.replace(/^use/i, '');
    action = `React hook managing ${hookName.replace(/([A-Z])/g, ' $1').trim().toLowerCase() || 'component'} state/logic`;
  } else if (/^(send|emit|dispatch|publish|notify|broadcast)/.test(lower)) {
    action = 'Dispatches';
    const target = name.replace(/^(send|emit|dispatch|publish|notify|broadcast)/i, '');
    detail = target ? ` a ${target.replace(/([A-Z])/g, ' $1').trim().toLowerCase()} event` : ' an event or message';
  } else if (/^(sort|filter|reduce|group|aggregate)/.test(lower)) {
    action = 'Processes a collection by';
    const op = name.match(/^(sort|filter|reduce|group|aggregate)/i)?.[0] || '';
    detail = `${op.toLowerCase()}ing`;
    if (argNames) detail += ` based on ${argNames}`;
  } else if (/^(open|close|toggle|show|hide|expand|collapse)/.test(lower)) {
    const op = name.match(/^(open|close|toggle|show|hide|expand|collapse)/i)?.[0] || '';
    const target = name.replace(/^(open|close|toggle|show|hide|expand|collapse)/i, '');
    action = `${op.charAt(0).toUpperCase() + op.slice(1).toLowerCase()}s`;
    detail = target ? ` the ${target.replace(/([A-Z])/g, ' $1').trim().toLowerCase()}` : ' a UI element';
  } else if (/^(connect|disconnect|subscribe|unsubscribe|listen)/.test(lower)) {
    action = 'Manages a connection or subscription';
    if (argNames) detail = ` for ${argNames}`;
  } else if (/^(log|print|debug|trace|warn|error)/.test(lower)) {
    action = 'Logs or outputs diagnostic information';
  } else if (/^(export|import|upload|download|save|write)/.test(lower)) {
    action = 'Handles data I/O';
    const target = name.replace(/^(export|import|upload|download|save|write)/i, '');
    if (target) detail = ` for ${target.replace(/([A-Z])/g, ' $1').trim().toLowerCase()}`;
  } else if (/^(ensure|assert|require|guard)/.test(lower)) {
    action = 'Enforces a precondition';
    const target = name.replace(/^(ensure|assert|require|guard)/i, '');
    if (target) detail = ` that ${target.replace(/([A-Z])/g, ' $1').trim().toLowerCase()}`;
  } else if (/^(with|wrap|decorate|enhance)/.test(lower)) {
    action = 'Wraps or enhances';
    const target = name.replace(/^(with|wrap|decorate|enhance)/i, '');
    detail = target ? ` ${target.replace(/([A-Z])/g, ' $1').trim().toLowerCase()} with additional behavior` : ' with additional behavior';
  } else if (kind === 'method') {
    action = `Method that operates on the parent class`;
    if (argNames) detail = ` using ${argNames}`;
  } else if (kind === 'class') {
    action = `Encapsulates ${name.replace(/([A-Z])/g, ' $1').trim().toLowerCase()} logic and state`;
  } else {
    // Generic — try to break apart camelCase for meaning
    const words = name.replace(/([A-Z])/g, ' $1').trim().toLowerCase();
    action = `Performs ${words}`;
    if (argNames) detail = ` with ${argNames}`;
  }

  let desc = action + detail;
  if (usedCount > 0) desc += `. Referenced in ${usedCount} other file${usedCount > 1 ? 's' : ''}`;
  return desc;
}

/* ── Infer return type ── */
function inferReturnType(name, kind) {
  const lower = name.toLowerCase();
  if (kind === 'class') return null;
  if (/^(is|has|can|should|check|validate|verify)/.test(lower)) return 'boolean';
  if (/^(get|find|query|fetch|load|read|retrieve)/.test(lower)) return 'data';
  if (/^(create|make|build|generate|new)/.test(lower)) return 'instance';
  if (/^(handle|on|set|update|delete|remove|clear|reset|log|print)/.test(lower)) return 'void';
  if (/^(render|display)/.test(lower)) return 'JSX';
  if (/^(parse|transform|convert|format|serialize|map|normalize)/.test(lower)) return 'transformed';
  if (/^(use)/.test(lower)) return 'hook state';
  if (/^(count|length|size|total|sum|max|min|index)/.test(lower)) return 'number';
  if (/^(to|as)/.test(lower)) return 'converted';
  if (/^(sort|filter|reduce|group)/.test(lower)) return 'array';
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
  const description = inferDescription(symbol.name, kind, args, usedBy);
  const returnType = inferReturnType(symbol.name, kind);

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
          {returnType && kind !== 'class' && (
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] text-vb-ink4">Returns</span>
              <span className="text-[11px] font-mono text-vb-green font-medium">{returnType}</span>
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
