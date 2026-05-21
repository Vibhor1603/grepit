"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser, SignOutButton } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Trash2, ChevronRight, Clock, CheckCircle, AlertCircle, Loader2, Crown, Zap } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import UpgradeModal from "../../components/UpgradeModal";

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

  const [disconnecting, setDisconnecting] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [connectingGithub, setConnectingGithub] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // React Query for caching — profile data loads instantly on revisit
  const { data: subData, isLoading: subLoading } = useQuery({
    queryKey: ['profile-subscription'],
    queryFn: () => fetch("/api/profile/subscription").then(r => r.json()),
    enabled: isSignedIn,
    staleTime: 60_000, // Cache for 1 min
  });
  const { data: analysesData, isLoading: analysesLoading } = useQuery({
    queryKey: ['profile-analyses'],
    queryFn: () => fetch("/api/profile/analyses").then(r => r.json()),
    enabled: isSignedIn,
    staleTime: 60_000,
  });

  const loading = subLoading || analysesLoading;
  const analyses = analysesData?.analyses?.slice(0, 5) || [];

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) { router.push("/sign-in"); return; }
    // Show toasts for success events from URL params
    const params = new URLSearchParams(window.location.search);
    if (params.get('github') === 'connected') {
      toast.success('GitHub connected successfully');
      window.history.replaceState({}, '', '/profile');
    }
    if (params.get('checkout') === 'success') {
      toast.success('Subscription activated! Welcome aboard.');
      window.history.replaceState({}, '', '/profile');
    }
    if (params.get('plan_change') === 'scheduled') {
      toast.success('Plan change scheduled. You will switch at the end of your billing period.');
      window.history.replaceState({}, '', '/profile');
    }
  }, [isLoaded, isSignedIn]);

  const handleManageBilling = async () => {
    setShowCancelModal(true);
  };

  const handleUndoCancel = async () => {
    try {
      const res = await fetch("/api/razorpay/undo-cancel", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success('Cancellation undone. Your subscription will continue as normal.');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        toast.error(data.error || 'Could not undo cancellation');
      }
    } catch {
      toast.error('Could not undo cancellation. Contact support.');
    }
  };

  const handleCancelSubscription = async () => {
    setShowCancelModal(false);
    try {
      const res = await fetch("/api/razorpay/cancel-subscription", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        const endDate = data.currentPeriodEnd ? new Date(data.currentPeriodEnd).toLocaleDateString() : 'the end of your billing period';
        toast.success(`Subscription cancelled. You can still use your plan until ${endDate}.`);
        setTimeout(() => window.location.reload(), 2000);
      } else {
        toast.error(data.error || "Could not cancel subscription");
      }
    } catch {
      toast.error("Could not cancel subscription. Contact support.");
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    setDeleting(true);
    try {
      const res = await fetch("/api/profile/delete-account", { method: "DELETE" });
      if (res.ok) {
        toast.success("Account deleted. Goodbye.");
        setTimeout(() => { window.location.href = '/'; }, 1500);
      } else {
        const data = await res.json();
        toast.error(data.error || "Could not delete account");
      }
    } catch {
      toast.error("Could not delete account. Contact support.");
    }
    setDeleting(false);
  };

  const handleDisconnectGithub = async () => {
    setShowDisconnectModal(false);
    setDisconnecting(true);
    try {
      const res = await fetch("/api/profile/disconnect-github", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success('GitHub disconnected');
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
      <div className="min-h-screen bg-vb-bg">
        <div className="h-16 border-b border-white/[0.06]" />
        <div className="max-w-[900px] mx-auto px-6 py-10 space-y-6 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white/[0.04]" />
            <div className="space-y-2"><div className="h-4 w-32 rounded bg-white/[0.04]" /><div className="h-3 w-48 rounded bg-white/[0.03]" /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-28 rounded-xl bg-white/[0.03]" />
            <div className="h-28 rounded-xl bg-white/[0.03]" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-24 rounded bg-white/[0.04]" />
            <div className="h-16 rounded-xl bg-white/[0.03]" />
            <div className="h-16 rounded-xl bg-white/[0.03]" />
          </div>
        </div>
      </div>
    );
  }

  const isBasic = subData?.plan === "basic" && subData?.status === "active";
  const isPro = subData?.plan === "pro" && subData?.status === "active";
  const isPaid = isBasic || isPro;
  const planLabel = isPro ? "Pro" : isBasic ? "Basic" : "Free";

  return (
    <div className="min-h-screen bg-vb-bg text-vb-ink">
      <Toaster position="top-center" toastOptions={{
        style: { background: '#19191c', color: '#eaeaec', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', fontSize: '13px', padding: '12px 16px' },
        success: { iconTheme: { primary: '#E0FC10', secondary: '#0a0a0c' } },
        error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
      }} />
      <header className="h-16 bg-vb-bg/70 backdrop-blur-xl border-b border-white/[0.06] flex items-center px-6 sticky top-0 z-50">
        <div className="cursor-pointer flex items-center gap-2.5" onClick={() => router.push('/')}>
          <span className="text-[20px] font-semibold tracking-tight">grep<span className="text-[#E0FC10]">it</span></span>
        </div>
        <button onClick={() => router.back()} className="flex items-center gap-2 text-vb-ink3 hover:text-vb-accent transition-colors ml-6">
          <ArrowLeft size={16} /> <span className="text-[13px]">Back</span>
        </button>
        <div className="ml-auto flex items-center gap-3">
          <button onClick={() => router.push("/")} className="text-[12px] font-medium text-vb-bg bg-vb-accent px-4 py-2 rounded-lg hover:bg-vb-accent-bright transition-all">
            New Analysis
          </button>
          <SignOutButton><button className="text-[12px] text-vb-ink2 hover:text-vb-accent px-3 py-1.5 rounded-lg border border-white/[0.08] hover:border-vb-accent/20 transition-all">Sign out</button></SignOutButton>
        </div>
      </header>

      <main className="max-w-[900px] mx-auto px-6 py-10">
        <div className="flex items-center gap-4 mb-10">
          {user?.imageUrl && <img src={user.imageUrl} alt="" className="w-12 h-12 rounded-full border border-white/[0.08]" />}
          <div>
            <h1 className="text-[20px] font-semibold">{user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : user?.emailAddresses?.[0]?.emailAddress}</h1>
            <p className="text-[12px] text-vb-ink4">{user?.emailAddresses?.[0]?.emailAddress}</p>
          </div>
          {isPaid && <span className="ml-auto flex items-center gap-1.5 text-[11px] font-semibold bg-vb-accent/10 text-vb-accent px-3 py-1.5 rounded-full border border-vb-accent/20"><Crown size={12} /> {planLabel}</span>}
          {!isPaid && <span className="ml-auto flex items-center gap-1.5 text-[11px] font-medium bg-white/[0.04] text-vb-ink3 px-3 py-1.5 rounded-full border border-white/[0.06]">Free</span>}
        </div>

        {/* Two-column grid for subscription + github */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          {/* Subscription */}
          <div className="bg-[#111113] border border-white/[0.06] rounded-xl p-5">
            <h2 className="text-[11px] text-vb-ink4 uppercase tracking-wider font-medium mb-3">Subscription</h2>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[15px] font-semibold">{planLabel}</span>
                <p className="text-[12px] text-vb-ink3 mt-0.5">
                  {isPaid
                    ? subData?.scheduledChange === 'downgrade'
                      ? `Switching to ${subData.scheduledChangePlan?.charAt(0).toUpperCase() + subData.scheduledChangePlan?.slice(1)} on ${subData?.entitlementEndsAt ? new Date(subData.entitlementEndsAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'next cycle'}`
                      : subData?.cancelAtPeriodEnd
                        ? `Cancels ${subData?.entitlementEndsAt ? new Date(subData.entitlementEndsAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'at period end'}`
                        : subData?.entitlementEndsAt ? `Renews ${new Date(subData.entitlementEndsAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : `${isPro ? '$30' : '$12'}/month`
                    : "2 repositories · 15 AI queries/day"}
                </p>
              </div>
              {isPaid ? (
                <div className="flex items-center gap-2">
                  {subData?.scheduledChange ? (
                    <button onClick={handleUndoCancel} className="flex items-center gap-1.5 text-[11px] text-vb-accent hover:text-vb-accent-bright transition-colors border border-vb-accent/20 hover:border-vb-accent/40 rounded-lg px-3 py-1.5">
                      Undo {subData.scheduledChange === 'cancel' ? 'cancellation' : 'plan change'}
                    </button>
                  ) : (
                    <>
                      <button onClick={() => setShowUpgradeModal(true)} className="flex items-center gap-1.5 text-[11px] text-vb-ink3 hover:text-vb-accent transition-colors border border-white/[0.06] hover:border-vb-accent/20 rounded-lg px-3 py-1.5">
                        Change plan
                      </button>
                      <button onClick={handleManageBilling} className="flex items-center gap-1.5 text-[11px] text-vb-ink2 hover:text-red-400 transition-colors border border-white/[0.08] hover:border-red-400/20 rounded-lg px-3 py-1.5">
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <button onClick={() => setShowUpgradeModal(true)} className="flex items-center gap-1.5 text-[11px] font-medium bg-vb-accent text-vb-bg px-3 py-1.5 rounded-lg hover:bg-vb-accent-bright transition-all">
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
                  <p className="text-[11px] text-vb-ink4">{subData?.githubConnected ? "Private repositories unlocked" : "Required for private repositories"}</p>
                </div>
              </div>
              {subData?.githubConnected ? (
                <button onClick={() => setShowDisconnectModal(true)} disabled={disconnecting}
                  className="flex items-center gap-1.5 text-[11px] text-red-400 hover:text-red-300 border border-red-400/20 hover:border-red-400/40 rounded-lg px-2.5 py-1.5 transition-all disabled:opacity-50">
                  {disconnecting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                  Disconnect
                </button>
              ) : (
                <button onClick={() => {
                  setConnectingGithub(true);
                  const clientId = process.env.NEXT_PUBLIC_GITHUB_OAUTH_CLIENT_ID;
                  const redirectUri = process.env.NEXT_PUBLIC_GITHUB_OAUTH_REDIRECT_URI;
                  if (!clientId || !redirectUri) { toast.error("GitHub OAuth not configured"); setConnectingGithub(false); return; }
                  const state = `${user.id}:${encodeURIComponent('__profile__')}`;
                  const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;
                  window.location.href = url;
                }} disabled={connectingGithub} className="flex items-center gap-1.5 text-[11px] text-vb-accent border border-vb-accent/20 rounded-lg px-2.5 py-1.5 hover:bg-vb-accent/5 transition-all disabled:opacity-50">
                  {connectingGithub ? <Loader2 size={11} className="animate-spin" /> : <Github size={11} />}
                  {connectingGithub ? 'Connecting...' : 'Connect'}
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
              <button onClick={() => router.push("/")} className="text-[12px] font-medium bg-vb-accent text-vb-bg px-4 py-2 rounded-lg hover:bg-vb-accent-bright transition-all">Analyze your first codebase</button>
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

        {/* Danger Zone */}
        <section className="mt-10">
          <h2 className="text-[11px] text-vb-red uppercase tracking-wider font-medium mb-3">Danger Zone</h2>
          <div className="bg-[#111113] border border-vb-red/20 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium text-vb-ink">Delete account</p>
                <p className="text-[11px] text-vb-ink4 mt-0.5">Permanently delete your account and all data. This cannot be undone.</p>
              </div>
              <button onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-1.5 text-[11px] text-vb-red border border-vb-red/20 hover:bg-vb-red/[0.06] rounded-lg px-3 py-1.5 transition-all">
                <Trash2 size={11} /> Delete
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Disconnect GitHub Modal */}
      {showDisconnectModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setShowDisconnectModal(false)}>
          <div className="w-full max-w-[380px] bg-[#111113] border border-white/[0.08] rounded-xl p-6 shadow-[0_32px_80px_rgba(0,0,0,0.7)]" onClick={e => e.stopPropagation()}>
            <h3 className="text-[15px] font-semibold text-vb-ink mb-2">Disconnect GitHub?</h3>
            <p className="text-[12px] text-vb-ink3 leading-relaxed mb-5">
              Private repositories will no longer be accessible until you reconnect. Your existing analyses will remain.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setShowDisconnectModal(false)}
                className="flex-1 py-2.5 rounded-lg text-[12px] font-medium text-vb-ink2 bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.06] transition-colors">
                Cancel
              </button>
              <button onClick={handleDisconnectGithub}
                className="flex-1 py-2.5 rounded-lg text-[12px] font-medium text-red-400 border border-red-400/20 bg-red-400/[0.06] hover:bg-red-400/[0.12] transition-colors">
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setShowDeleteModal(false)}>
          <div className="w-full max-w-[420px] bg-[#111113] border border-white/[0.08] rounded-xl p-6 shadow-[0_32px_80px_rgba(0,0,0,0.7)]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-vb-red/10 border border-vb-red/20 flex items-center justify-center">
                <AlertCircle size={18} className="text-vb-red" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-vb-ink">Delete your account?</h3>
                <p className="text-[11px] text-vb-ink4">This action is permanent and irreversible.</p>
              </div>
            </div>

            <div className="bg-vb-red/[0.04] border border-vb-red/10 rounded-lg p-4 mb-5">
              <p className="text-[12px] text-vb-ink2 leading-relaxed">
                This will permanently delete:
              </p>
              <ul className="mt-2 space-y-1.5 text-[12px] text-vb-ink3">
                <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-vb-red" />All your codebase analyses</li>
                <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-vb-red" />All chat conversations and history</li>
                <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-vb-red" />All shared chat links</li>
                <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-vb-red" />Your subscription (if active, it will be cancelled)</li>
                <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-vb-red" />Your account and all personal data</li>
              </ul>
              <p className="text-[11px] text-vb-red mt-3 font-medium">This cannot be undone. There is no recovery.</p>
            </div>

            <div className="mb-4">
              <label className="text-[11px] text-vb-ink4 mb-1.5 block">Type <span className="font-mono font-bold text-vb-ink2">DELETE</span> to confirm</label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full h-9 px-3 rounded-lg bg-[#0a0a0c] border border-white/[0.08] text-[13px] text-vb-ink font-mono placeholder:text-vb-ink4 outline-none focus:border-vb-red/30"
              />
            </div>

            <div className="flex gap-2">
              <button onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }}
                className="flex-1 py-2.5 rounded-lg text-[12px] font-medium text-vb-ink2 bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.06] transition-colors">
                Cancel
              </button>
              <button onClick={handleDeleteAccount} disabled={deleteConfirmText !== 'DELETE' || deleting}
                className="flex-1 py-2.5 rounded-lg text-[12px] font-medium text-white bg-vb-red hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2">
                {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                {deleting ? 'Deleting...' : 'Delete my account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Subscription Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setShowCancelModal(false)}>
          <div className="w-full max-w-[380px] bg-[#111113] border border-white/[0.08] rounded-xl p-6 shadow-[0_32px_80px_rgba(0,0,0,0.7)]" onClick={e => e.stopPropagation()}>
            <h3 className="text-[15px] font-semibold text-vb-ink mb-2">Cancel subscription?</h3>
            <p className="text-[12px] text-vb-ink3 leading-relaxed mb-1">
              Your <span className="text-vb-ink font-medium">{planLabel}</span> plan will remain active until{' '}
              <span className="text-vb-accent font-medium">
                {subData?.currentPeriodEnd
                  ? new Date(subData.currentPeriodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                  : 'the end of your billing period'}
              </span>.
            </p>
            <p className="text-[11px] text-vb-ink4 mb-5">
              After that, you'll be moved to the Free plan. No further charges will be made.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setShowCancelModal(false)}
                className="flex-1 py-2.5 rounded-lg text-[12px] font-medium text-vb-ink2 bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.06] transition-colors">
                Keep plan
              </button>
              <button onClick={handleCancelSubscription}
                className="flex-1 py-2.5 rounded-lg text-[12px] font-medium text-red-400 border border-red-400/20 bg-red-400/[0.06] hover:bg-red-400/[0.12] transition-colors">
                Cancel subscription
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-6 px-6">

      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} currentPlan={subData?.plan || 'free'} />
        <div className="max-w-[900px] mx-auto flex items-center justify-between">
          <span className="text-[11px] text-vb-ink3">© {new Date().getFullYear()} Grepit</span>
          <div className="flex items-center gap-4">
            <a href="/privacy" className="text-[11px] text-vb-ink3 hover:text-vb-accent transition-colors">Privacy</a>
            <a href="/terms" className="text-[11px] text-vb-ink3 hover:text-vb-accent transition-colors">Terms</a>
            <a href="/refund" className="text-[11px] text-vb-ink3 hover:text-vb-accent transition-colors">Refunds</a>
            <a href="/faq" className="text-[11px] text-vb-ink3 hover:text-vb-accent transition-colors">FAQ</a>
            <a href="mailto:support@grepit.co" className="text-[11px] text-vb-ink3 hover:text-vb-accent transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}