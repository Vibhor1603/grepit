"use client";
import { useState, useRef, useEffect } from 'react';

export default function QueryConsole({ analysis, theme, eli5 }) {
  const d = theme === 'dark';
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rateMsg, setRateMsg] = useState('');
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const suggestions = eli5 ? [
    'Explain this project like I\'m 5',
    'What does this app do?',
    'What should I learn first?',
    'Give me a guided tour'
  ] : [
    'What patterns are used?',
    'Identify breaking changes risks',
    'Run a scalability audit',
    'Generate a security report'
  ];

  const handleSend = async (text) => {
    const q = (text || query).trim();
    if (!q || loading) return;
    setMessages(prev => [...prev, { role: 'user', content: q }]);
    setQuery('');
    setLoading(true);
    setRateMsg('');
    try {
      const prompt = eli5 ? `Please explain in very simple terms, avoiding jargon, as if to a complete beginner: ${q}` : q;
      const res = await fetch('/api/query', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: prompt, analysisId: analysis?.id })
      });
      const data = await res.json();
      if (res.status === 429) { setRateMsg(data.error); setMessages(prev => [...prev, { role: 'system', content: data.error }]); }
      else if (!res.ok) { setMessages(prev => [...prev, { role: 'system', content: data.error || 'Error' }]); }
      else { setMessages(prev => [...prev, { role: 'assistant', content: data.response }]); }
    } catch (err) { setMessages(prev => [...prev, { role: 'system', content: err.message }]); }
    setLoading(false);
  };

  const exportChat = () => {
    const md = messages.map(m => `**${m.role}:** ${m.content}`).join('\n\n---\n\n');
    const blob = new Blob([`# Vibo Analysis Report — ${analysis?.repo_name}\n\n${md}`], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vibo-report-${analysis?.repo_name || 'analysis'}.md`;
    a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">AI Query</h1>
          <p className={`text-sm font-mono ${d ? 'text-d-muted' : 'text-ink-muted'}`}>
            {eli5 ? '🧸 Simple mode — ask anything!' : `Ask about ${analysis?.repo_name}`}
          </p>
        </div>
        {messages.length > 0 && (
          <button onClick={exportChat} className={`btn-brutal px-3 py-1.5 rounded-none text-[12px] font-mono ${d ? 'bg-d-card text-d-muted' : 'bg-white text-ink-muted'}`}>
            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">download</span>Export</span>
          </button>
        )}
      </div>

      <div className={`card-brutal rounded-none flex flex-col ${d ? 'bg-d-card' : 'bg-white'}`} style={{ height: 'calc(100vh - 220px)' }}>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <span className={`material-symbols-outlined text-4xl mb-3 ${d ? 'text-d-subtle' : 'text-ink-faint'}`}>chat</span>
              <p className={`text-sm font-mono mb-5 ${d ? 'text-d-muted' : 'text-ink-muted'}`}>Ask anything about the codebase</p>
              <div className="flex flex-wrap gap-2 justify-center max-w-md">
                {suggestions.map((s, i) => (
                  <button key={i} onClick={() => handleSend(s)}
                    className={`px-3 py-1.5 rounded-none text-[12px] font-mono border transition-all ${d ? 'border-d-border text-d-muted hover:text-d-text hover:border-d-subtle' : 'border-ink/10 text-ink-muted hover:text-ink hover:border-ink/25'}`}>{s}</button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-none px-4 py-2.5 text-[13px] leading-relaxed font-mono ${
                msg.role === 'user' ? (d ? 'bg-purple/20 text-d-text' : 'bg-ink text-white') :
                msg.role === 'system' ? 'bg-red-500/10 text-red-400' :
                (d ? 'text-d-muted' : 'text-ink-muted')
              }`}>
                <pre className="whitespace-pre-wrap font-mono text-[13px]">{msg.content}</pre>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-1.5 px-1"><div className="w-1.5 h-1.5 rounded-none bg-purple animate-bounce" style={{ animationDelay: '0ms' }}></div><div className="w-1.5 h-1.5 rounded-none bg-purple animate-bounce" style={{ animationDelay: '150ms' }}></div><div className="w-1.5 h-1.5 rounded-none bg-purple animate-bounce" style={{ animationDelay: '300ms' }}></div></div>
          )}
          <div ref={endRef} />
        </div>
        <div className={`p-3 border-t ${d ? 'border-d-border' : 'border-ink/10'}`}>
          {rateMsg && <p className="text-[11px] text-yellow-400 font-mono mb-2">{rateMsg}</p>}
          <div className="flex gap-2">
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask a question..." disabled={loading}
              className={`flex-1 px-3 py-2.5 rounded-none text-[13px] font-mono border transition-colors ${d ? 'bg-d-bg border-d-border text-d-text placeholder:text-d-subtle' : 'bg-cream border-ink/10 text-ink placeholder:text-ink-faint'}`} />
            <button onClick={() => handleSend()} disabled={loading || !query.trim()}
              className={`btn-brutal px-4 py-2.5 rounded-none font-mono text-sm font-semibold disabled:opacity-30 ${d ? 'bg-purple text-ink' : 'bg-lime text-ink'}`}>
              →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
