"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { ViboMark } from "../../../components/ViboLogo";
import { MessageSquare, ArrowRight, X, Sparkles, Copy, Check } from "lucide-react";
import SharedMarkdown from "../../../components/SharedMarkdown";

export default function SharedChatPage() {
  const { token } = useParams();
  const router = useRouter();
  const { isSignedIn } = useUser();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCta, setShowCta] = useState(false);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/share/${token}`)
      .then(r => r.json().then(d => ({ ok: r.ok, data: d })))
      .then(({ ok, data }) => {
        if (!ok) { setError(data.error || "Not found"); setLoading(false); return; }
        setData(data);
        setLoading(false);
        // Show CTA after 10 seconds of viewing
        setTimeout(() => setShowCta(true), 10000);
      })
      .catch(() => { setError("Could not load shared chat"); setLoading(false); });
  }, [token]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-vb-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <ViboMark size={24} />
          <svg className="w-5 h-5 animate-spin text-vb-accent" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-20"/>
            <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-vb-bg flex items-center justify-center px-6">
        <div className="text-center space-y-4">
          <ViboMark size={28} />
          <h1 className="text-[20px] font-semibold text-vb-ink">Chat not found</h1>
          <p className="text-[13px] text-vb-ink3">{error}</p>
          <button onClick={() => router.push('/')} className="text-[12px] font-medium text-vb-bg bg-vb-accent px-4 py-2 rounded-lg hover:bg-vb-accent-bright transition-all">
            Go to Grepit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-vb-bg1 text-vb-ink flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-white/[0.06] flex items-center px-5 flex-shrink-0 bg-vb-bg1 z-50">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => router.push('/')}>
          <ViboMark size={18} />
          <span className="text-[15px] font-semibold tracking-tight">grep<span className="text-vb-accent">it</span></span>
        </div>
        <div className="ml-4 flex items-center gap-2">
          <span className="text-[11px] text-vb-ink4 bg-white/[0.04] px-2 py-0.5 rounded-md border border-white/[0.06]">Shared</span>
          <span className="text-[12px] text-vb-ink3 truncate max-w-[200px]">{data.repoName}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] text-vb-ink3 border border-white/[0.06] hover:bg-white/[0.04] transition-colors">
            {copied ? <Check size={12} className="text-vb-accent" /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy link'}
          </button>
          {!isSignedIn && (
            <button onClick={() => router.push('/sign-in')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-vb-bg bg-vb-accent hover:bg-vb-accent-bright transition-all">
              Sign up free
            </button>
          )}
          {isSignedIn && (
            <button onClick={() => router.push('/')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-vb-bg bg-vb-accent hover:bg-vb-accent-bright transition-all">
              Analyze your code
            </button>
          )}
        </div>
      </header>

      {/* Chat content — scrollable inside, page doesn't scroll */}
      <main ref={scrollRef} className="flex-1 overflow-y-auto bg-vb-bg1">
        <div className="max-w-[1000px] mx-auto px-6 md:px-10 py-8 space-y-6">
          {/* Title */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-2">
              <MessageSquare size={14} className="text-vb-accent" />
              <span className="text-[11px] text-vb-ink4 uppercase tracking-wider">Shared conversation</span>
            </div>
            <h1 className="text-[18px] font-semibold text-vb-ink">{data.title}</h1>
            <p className="text-[11px] text-vb-ink4 mt-1">
              {data.repoName} · {new Date(data.sharedAt).toLocaleDateString()}
            </p>
          </div>

          {/* Messages */}
          {data.messages.map((msg, i) => (
            <div key={i} className="space-y-4">
              {/* User message */}
              <div className="flex justify-end">
                <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl rounded-tr-sm px-4 py-3 max-w-[75%]">
                  <p className="text-[13px] text-vb-ink leading-relaxed">{msg.query}</p>
                </div>
              </div>
              {/* AI response */}
              <div className="flex justify-start">
                <div className="flex gap-3 w-full">
                  <div className="w-6 h-6 rounded-md bg-vb-accent/[0.08] border border-vb-accent/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <Sparkles size={11} className="text-vb-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <SharedMarkdown content={msg.response} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Fake chat input — CTA to try the product */}
      <div className="flex-shrink-0 px-6 md:px-10 pb-5 pt-3 bg-vb-bg1 border-t border-white/[0.04]">
        <div className="max-w-[900px] mx-auto">
          <button onClick={() => router.push('/')}
            className="w-full flex items-center border border-vb-accent/20 rounded-xl px-5 py-3.5 bg-vb-accent/[0.03] hover:bg-vb-accent/[0.06] hover:border-vb-accent/30 transition-all duration-300 group cursor-pointer shadow-[0_0_20px_rgba(224,252,16,0.03)] hover:shadow-[0_0_30px_rgba(224,252,16,0.06)]">
            <Sparkles size={14} className="mr-3 text-vb-accent group-hover:scale-110 transition-transform" />
            <span className="text-[13px] text-vb-ink3 group-hover:text-vb-ink2 transition-colors">Try asking about your own codebase...</span>
            <span className="ml-auto text-[11px] font-medium text-vb-accent opacity-70 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              Get started <ArrowRight size={12} />
            </span>
          </button>
        </div>
      </div>

      {/* CTA Modal — appears after 10s */}
      {showCta && (
        <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-4 pointer-events-none">
          <div className="pointer-events-auto w-full max-w-[400px] bg-[#111113] border border-white/[0.08] rounded-2xl p-6 shadow-[0_32px_80px_rgba(0,0,0,0.7)] animate-slide-up">
            <button onClick={() => setShowCta(false)} className="absolute top-3 right-3 p-1 text-vb-ink4 hover:text-vb-ink3 transition-colors">
              <X size={14} />
            </button>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto rounded-xl bg-vb-accent/[0.08] border border-vb-accent/20 flex items-center justify-center mb-4">
                <Sparkles size={20} className="text-vb-accent" />
              </div>
              <h3 className="text-[16px] font-semibold text-vb-ink mb-2">Want this for your codebase?</h3>
              <p className="text-[12px] text-vb-ink3 leading-relaxed mb-5">
                Paste any GitHub link and get instant architecture maps, security audits, and an AI that actually understands the code.
              </p>
              <button onClick={() => router.push(isSignedIn ? '/' : '/sign-in')}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-medium bg-vb-accent text-vb-bg hover:bg-vb-accent-bright transition-all">
                {isSignedIn ? 'Analyze your repository' : 'Get started free'} <ArrowRight size={14} />
              </button>
              <p className="text-[10px] text-vb-ink4 mt-3">Free to start · No credit card required</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
