/**
 * Instant loading skeleton for the profile page.
 * This is server-rendered and shown immediately while the client component loads.
 * Eliminates the blank white screen during JS bundle download.
 */
export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-vb-bg">
      <div className="h-14 md:h-16 border-b border-c-line flex items-center px-4 md:px-6">
        <div className="w-16 h-5 rounded bg-c-overlay-3" />
        <div className="ml-auto flex gap-2">
          <div className="w-24 h-8 rounded-lg bg-c-overlay-3" />
          <div className="w-16 h-8 rounded-lg bg-c-overlay-3" />
        </div>
      </div>
      <div className="max-w-[900px] mx-auto px-4 md:px-6 py-8 md:py-10 space-y-6">
        {/* Avatar + name skeleton */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-c-overlay-3 animate-pulse" />
          <div className="space-y-2">
            <div className="h-5 w-36 rounded bg-c-overlay-3 animate-pulse" />
            <div className="h-3 w-48 rounded bg-c-overlay-2 animate-pulse" />
          </div>
        </div>
        {/* Cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-28 rounded-xl bg-c-overlay-2 animate-pulse" />
          <div className="h-28 rounded-xl bg-c-overlay-2 animate-pulse" />
        </div>
        {/* Analyses skeleton */}
        <div className="space-y-2">
          <div className="h-4 w-24 rounded bg-c-overlay-3 animate-pulse" />
          <div className="h-16 rounded-xl bg-c-overlay-2 animate-pulse" />
          <div className="h-16 rounded-xl bg-c-overlay-2 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
