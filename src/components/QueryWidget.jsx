"use client";
import { useEffect, useRef, useState } from "react";

function renderInlineMarkdown(text) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={index}>{part.slice(1, -1)}</code>;
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return <span key={index}>{part}</span>;
  });
}

function MarkdownMessage({ content }) {
  const lines = content.split("\n");
  const elements = [];
  let listBuffer = [];
  let listType = null;

  const flushList = (key) => {
    if (!listBuffer.length) return;
    const Tag = listType === "ol" ? "ol" : "ul";
    elements.push(
      <Tag key={key}>
        {listBuffer.map((item, index) => (
          <li key={index}>{renderInlineMarkdown(item)}</li>
        ))}
      </Tag>,
    );
    listBuffer = [];
    listType = null;
  };

  lines.forEach((line, index) => {
    const orderedMatch = line.match(/^\d+\.\s+(.*)$/);
    const bulletMatch = line.match(/^[-*]\s+(.*)$/);
    if (orderedMatch) {
      if (listType && listType !== "ol") flushList(`list-switch-${index}`);
      listType = "ol";
      listBuffer.push(orderedMatch[1]);
      return;
    }
    if (bulletMatch) {
      if (listType && listType !== "ul") flushList(`list-switch-${index}`);
      listType = "ul";
      listBuffer.push(bulletMatch[1]);
      return;
    }

    flushList(`list-${index}`);

    if (!line.trim()) return;

    if (line.startsWith("### ")) {
      elements.push(<h3 key={index}>{renderInlineMarkdown(line.slice(4))}</h3>);
      return;
    }
    if (line.startsWith("## ")) {
      elements.push(<h2 key={index}>{renderInlineMarkdown(line.slice(3))}</h2>);
      return;
    }
    if (line.startsWith("# ")) {
      elements.push(<h1 key={index}>{renderInlineMarkdown(line.slice(2))}</h1>);
      return;
    }

    elements.push(<p key={index}>{renderInlineMarkdown(line)}</p>);
  });

  flushList("list-end");
  return <div className="markdown-brutal">{elements}</div>;
}

export default function QueryWidget({ analysis, theme, eli5 }) {
  const d = theme === "dark";
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rateMsg, setRateMsg] = useState("");
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const suggestions = eli5
    ? ["What does this repo do?", "Where should I start?", "Explain the main flow", "What should I read first?"]
    : ["Summarize the architecture", "Find risky files", "Explain the API flow", "What should I review first?"];

  const handleSend = async (text) => {
    const q = (text || query).trim();
    if (!q || loading || !analysis?.id) return;
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setQuery("");
    setLoading(true);
    setRateMsg("");
    try {
      const prompt = eli5 ? `Explain simply for a beginner: ${q}` : q;
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: prompt, analysisId: analysis.id }),
      });
      const data = await res.json();
      if (res.status === 429) {
        setRateMsg(data.error);
        setMessages((prev) => [...prev, { role: "system", content: data.error }]);
      } else if (!res.ok) {
        setMessages((prev) => [...prev, { role: "system", content: data.error || "Error" }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
      }
    } catch (error) {
      setMessages((prev) => [...prev, { role: "system", content: error.message }]);
    }
    setLoading(false);
  };

  return (
    <>
      <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
        {open && (
          <>
            <button
              className="fixed inset-0 bg-black/40 backdrop-blur-[1px]"
              onClick={() => setOpen(false)}
              aria-label="Close assistant overlay"
            />
            <div className={`fixed bottom-5 right-5 w-[min(980px,calc(100vw-2rem))] h-[min(78vh,760px)] card-brutal rounded-none flex flex-col ${d ? "bg-d-card text-d-text" : "bg-white text-ink"}`}>
              <div className={`flex items-center justify-between gap-3 p-5 border-b ${d ? "border-d-border" : "border-ink/10"}`}>
                <div>
                  <div className="text-xl font-black tracking-tight">Ask Vibo</div>
                  <div className={`text-[12px] font-mono mt-1 ${d ? "text-d-subtle" : "text-ink-faint"}`}>
                    Asking about {analysis?.repo_name || "this analysis"}
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className={`w-10 h-10 border-2 flex items-center justify-center ${d ? "border-white bg-d-bg hover:bg-blue/12" : "border-black bg-cream hover:bg-sand"}`}
                  aria-label="Close assistant"
                  title="Close assistant"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-[260px_minmax(0,1fr)] flex-1 min-h-0">
                <div className={`border-r p-5 space-y-4 ${d ? "border-d-border bg-d-bg/70" : "border-ink/10 bg-cream/70"}`}>
                  <div>
                    <div className={`text-[10px] uppercase tracking-[0.2em] font-mono mb-2 ${d ? "text-d-subtle" : "text-ink-faint"}`}>Quick Prompts</div>
                    <div className="flex flex-col gap-2">
                      {suggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => handleSend(suggestion)}
                          className={`px-3 py-3 border-2 text-left text-[12px] font-mono ${d ? "border-white bg-d-card hover:bg-blue/12" : "border-black bg-white hover:bg-sand"}`}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className={`text-sm leading-relaxed ${d ? "text-d-muted" : "text-ink-muted"}`}>
                    Ask about architecture, risky files, setup, API behavior, code ownership, or where to read next.
                  </div>
                </div>

                <div className="flex flex-col min-h-0">
                  <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {messages.length === 0 ? (
                      <div className="h-full flex items-center justify-center">
                        <div className="max-w-xl text-center space-y-4">
                          <div className="text-2xl font-black tracking-tight">Codebase Assistant</div>
                          <p className={`text-sm leading-relaxed ${d ? "text-d-muted" : "text-ink-muted"}`}>
                            Ask precise questions about the current analysis and get answers grounded in the most relevant files, symbols, and snippets.
                          </p>
                        </div>
                      </div>
                    ) : (
                      messages.map((msg, index) => (
                        <div key={index} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[85%] px-4 py-3 text-[13px] leading-relaxed rounded-none ${
                              msg.role === "user"
                                ? d
                                  ? "bg-lime text-ink"
                                  : "bg-ink text-white"
                                : msg.role === "system"
                                  ? "bg-red-500/10 text-red-400"
                                  : d
                                    ? "bg-d-bg text-d-muted"
                                    : "bg-cream text-ink-muted"
                            }`}
                          >
                            {msg.role === "assistant" ? <MarkdownMessage content={msg.content} /> : <pre className="whitespace-pre-wrap font-mono">{msg.content}</pre>}
                          </div>
                        </div>
                      ))
                    )}
                    {loading && (
                      <div className="flex gap-1.5 px-1">
                        <div className="w-1.5 h-1.5 rounded-none bg-purple animate-bounce" style={{ animationDelay: "0ms" }}></div>
                        <div className="w-1.5 h-1.5 rounded-none bg-blue animate-bounce" style={{ animationDelay: "150ms" }}></div>
                        <div className="w-1.5 h-1.5 rounded-none bg-lime animate-bounce" style={{ animationDelay: "300ms" }}></div>
                      </div>
                    )}
                    <div ref={endRef} />
                  </div>

                  <div className={`p-4 border-t ${d ? "border-d-border" : "border-ink/10"}`}>
                    {rateMsg && <div className="text-[11px] font-mono text-yellow-400 mb-2">{rateMsg}</div>}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        onKeyDown={(event) => event.key === "Enter" && handleSend()}
                        placeholder="Ask about this codebase..."
                        disabled={loading}
                        className={`flex-1 px-3 py-3 rounded-none text-[13px] font-mono border ${d ? "bg-d-bg border-d-border text-d-text placeholder:text-d-subtle" : "bg-cream border-ink/10 text-ink placeholder:text-ink-faint"}`}
                      />
                      <button
                        onClick={() => handleSend()}
                        disabled={loading || !query.trim()}
                        className={`w-12 h-12 btn-brutal rounded-none font-mono text-sm disabled:opacity-30 ${d ? "bg-purple text-ink" : "bg-lime text-ink"}`}
                      >
                        →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        <button
          onClick={() => setOpen((current) => !current)}
          className={`w-14 h-14 btn-brutal rounded-none flex items-center justify-center ${d ? "bg-lime text-ink" : "bg-purple text-ink"}`}
          aria-label={open ? "Close assistant" : "Open assistant"}
          title={open ? "Close assistant" : "Open assistant"}
        >
          <span className="material-symbols-outlined text-[24px]">{open ? "close" : "chat"}</span>
        </button>
      </div>
    </>
  );
}
