"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser, SignOutButton } from "@clerk/nextjs";
import { ArrowLeft, ExternalLink, Trash2, ChevronRight, Clock, CheckCircle, AlertCircle, Loader2, Crown, Zap } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

function Github({ size = 18, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
    </svg>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, isSignedIn, isLoaded } = useUser();

  const [analyses, setAnalyses] = useState([]);
  const [subData, setSubData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) { router.push("/sign-in"); return; }
    loadData();
  }, [isLoaded, isSignedIn]);

  const loadData = async () => {
    setLoading(true);
    const [subRes, accRes] = await Promise.all([
      fetch("/api/profile/subscription").then(r => r.json()).catch(() => null),
      fetch("/api/profile/analyses").then(r => r.json()).catch(() => ({ analyses: [] })),
    ]);
    setSubData(subRes);
    setAnalyses(accRes.analyses?.slice(0, 5) || []);
    setLoading(false);
  };

  const handleDisconnectGithub = async () => {
    if (!window.confirm("Disconnect your GitHub account? Private repos will no longer be accessible until you reconnect.")) return;
    setDisconnecting(true);
    try {
      const res = await fetch("/api/profile/disconnect-github", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success('GitHub disconnected');
        loadData();
      } else {
        toast.error(data.error || 'Failed to disconnect');
      }
    } catch {
      toast.error('Network error');
    }
    setDisconnecting(false);
  };

  const getStatusIcon = (status) => {
    if (status === "PROCESSING") return <Loader2 size={14} className="animate-spin text-vb-accent" />;
    if (status === "COMPLETED") return <CheckCircle size={14} className="text-green-400" />;
    if (status === "FAILED") return <AlertCircle size={14} className="text-red-400" />;
    return <Clock size={14} className="text-vb-ink4" />;
  };

  if (loading || !isLoaded) {
    return (
      <div className="min-h-screen bg-vb-bg flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-vb-accent" />
      </div>
    );
  }

  const isPro = subData?.plan === "pro" && subData?.status === "active";

  return (
    <div className="min-h-screen bg-vb-bg text-vb-ink">
      <Toaster position="top-center" toastOptions={{
        style: { background: '#19191c', color: '#eaeaec', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', fontSize: '13px', padding: '12px 16px' },
        success: { iconTheme: { primary: '#E0FC10', secondary: '#0a0a0c' } },
        error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
      }} />
      <header className="h-16 bg-vb-bg/70 backdrop-blur-xl border-b border-white/[0.06] flex items-center px-6 sticky top-0 z-50">
        <button onClick={() => router.push("/")} className="flex items-center gap-2 text-vb-ink3 hover:text-vb-accent transition-colors">
          <ArrowLeft size={16} /> <span className="text-[13px]">Back</span>
        </button>
        <div className="ml-auto flex items-center gap-3">
          <button onClick={() => router.push("/dashboard")} className="text-[12px] font-medium text-vb-bg bg-vb-accent px-4 py-2 rounded-lg hover:bg-vb-accent-bright transition-all">
            New Analysis
          </button>
          <SignOutButton><button className="text-[12px] text-vb-ink4 hover:text-vb-accent px-3 py-1.5 rounded-lg border border-white/[0.06] hover:border-vb-accent/20 transition-all">Sign out</button></SignOutButton>
        </div>
      </header>

      <main className="max-w-[900px] mx-auto px-6 py-10">
        <div className="flex items-center gap-4 mb-10">
          {user?.imageUrl && <img src={user.imageUrl} alt="" className="w-12 h-12 rounded-full border border-white/[0.08]" />}
          <div>
            <h1 className="text-[20px] font-semibold">{user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : user?.emailAddresses?.[0]?.emailAddress}</h1>
            <p className="text-[12px] text-vb-ink4">{user?.emailAddresses?.[0]?.emailAddress}</p>
          </div>
          {isPro && <span className="ml-auto flex items-center gap-1.5 text-[11px] font-semibold bg-vb-accent/10 text-vb-accent px-3 py-1.5 rounded-full border border-vb-accent/20"><Crown size={12} /> Pro</span>}
        </div>

        {/* Two-column grid for subscription + github */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          {/* Subscription */}
          <div className="bg-[#111113] border border-white/[0.06] rounded-xl p-5">
            <h2 className="text-[11px] text-vb-ink4 uppercase tracking-wider font-medium mb-3">Subscription</h2>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[15px] font-semibold">{isPro ? "Pro" : "Free"}</span>
                  {isPro && subData?.cancelAtPeriodEnd && <span className="text-[10px] text-vb-ink4 bg-white/[0.04] px-2 py-0.5 rounded-full">Cancels at period end</span>}
                </div>
                <p className="text-[12px] text-vb-ink3">
                  {isPro
                    ? subData?.currentPeriodEnd ? `Renews ${new Date(subData.currentPeriodEnd).toLocaleDateString()}` : "$12/month"
                    : "3 repos · 20 AI queries/day"}
                </p>
              </div>
              {isPro ? (
                subData?.portalUrl ? (
                  <a href={subData.portalUrl} className="flex items-center gap-1.5 text-[11px] text-vb-ink3 hover:text-vb-accent transition-colors border border-white/[0.06] rounded-lg px-3 py-1.5">
                    Manage <ExternalLink size={11} />
                  </a>
                ) : null
              ) : (
                <button onClick={() => router.push("/?scrollTo=pricing")} className="flex items-center gap-1.5 text-[11px] font-medium bg-vb-accent text-vb-bg px-3 py-1.5 rounded-lg hover:bg-vb-accent-bright transition-all">
                  <Zap size={11} /> Upgrade
                </button>
              )}
            </div>
          </div>

          {/* GitHub Connection */}
          <div className="bg-[#111113] border border-white/[0.06] rounded-xl p-5">
            <h2 className="text-[11px] text-vb-ink4 uppercase tracking-wider font-medium mb-3">GitHub</h2>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Github size={16} className={subData?.githubConnected ? "text-vb-accent" : "text-vb-ink4"} />
                <div>
                  <p className="text-[13px] font-medium">{subData?.githubConnected ? "Connected" : "Not connected"}</p>
                  <p className="text-[11px] text-vb-ink4">{subData?.githubConnected ? "Private repos unlocked" : "Required for private repos"}</p>
                </div>
              </div>
              {subData?.githubConnected ? (
                <button onClick={handleDisconnectGithub} disabled={disconnecting}
                  className="flex items-center gap-1.5 text-[11px] text-red-400 hover:text-red-300 border border-red-400/20 hover:border-red-400/40 rounded-lg px-2.5 py-1.5 transition-all disabled:opacity-50">
                  {disconnecting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                  Disconnect
                </button>
              ) : (
                <button onClick={() => router.push("/")} className="flex items-center gap-1.5 text-[11px] text-vb-accent border border-vb-accent/20 rounded-lg px-2.5 py-1.5 hover:bg-vb-accent/5 transition-all">
                  <Github size={11} /> Connect
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Past Analyses */}
        <section>
          <h2 className="text-[11px] text-vb-ink4 uppercase tracking-wider font-medium mb-3">Past Analyses</h2>
          {analyses.length === 0 ? (
            <div className="bg-[#111113] border border-white/[0.06] rounded-xl p-8 text-center">
              <p className="text-[13px] text-vb-ink3 mb-3">No analyses yet</p>
              <button onClick={() => router.push("/")} className="text-[12px] font-medium bg-vb-accent text-vb-bg px-4 py-2 rounded-lg hover:bg-vb-accent-bright transition-all">Analyze your first repo</button>
            </div>
          ) : (
            <div className="space-y-2">
              {analyses.map((a) => (
                <div key={a.id} onClick={() => router.push(`/dashboard?id=${a.id}`)}
                  className="bg-[#111113] border border-white/[0.06] hover:border-vb-accent/20 rounded-xl p-4 cursor-pointer transition-all group flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    {getStatusIcon(a.status)}
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium group-hover:text-vb-accent transition-colors truncate">{a.repo_name || a.repo_url}</p>
                      <p className="text-[11px] text-vb-ink4 truncate">{new Date(a.created_at).toLocaleDateString()}{a.total_files ? ` · ${a.total_files} files` : ""}</p>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-vb-ink4 group-hover:text-vb-accent transition-colors flex-shrink-0" />
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}