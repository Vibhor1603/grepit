/**
 * Analytics event tracking via PostHog.
 * Import and call these functions at key user interaction points.
 * Safe to call even if PostHog isn't configured — all functions are no-ops when disabled.
 */

function getPostHog() {
  if (typeof window === "undefined") return null;
  try {
    const { posthog } = require("posthog-js");
    return posthog;
  } catch {
    return null;
  }
}

/**
 * Track a custom event.
 */
export function track(event, properties = {}) {
  if (typeof window === "undefined") return;
  try {
    const posthog = window.__posthog || getPostHog();
    if (posthog?.capture) posthog.capture(event, properties);
  } catch { /* silent */ }
}

// ── Pre-defined events ──

export function trackAnalysisStarted(repoUrl, source = "github") {
  track("analysis_started", { repo_url: repoUrl, source });
}

export function trackAnalysisCompleted(repoName, totalFiles, duration) {
  track("analysis_completed", { repo_name: repoName, total_files: totalFiles, duration_ms: duration });
}

export function trackAnalysisFailed(repoUrl, error) {
  track("analysis_failed", { repo_url: repoUrl, error });
}

export function trackChatQuery(analysisId, queryLength) {
  track("chat_query_sent", { analysis_id: analysisId, query_length: queryLength });
}

export function trackDiagramGenerated(analysisId, mode) {
  track("diagram_generated", { analysis_id: analysisId, mode });
}

export function trackFileViewed(analysisId, filePath) {
  track("file_viewed", { analysis_id: analysisId, file_path: filePath });
}

export function trackReportDownloaded(analysisId, format) {
  track("report_downloaded", { analysis_id: analysisId, format });
}

export function trackUpgradeClicked(source, currentPlan) {
  track("upgrade_clicked", { source, current_plan: currentPlan });
}

export function trackSignUp(method) {
  track("user_signed_up", { method });
}

export function trackSignIn(method) {
  track("user_signed_in", { method });
}

export function trackCheckoutStarted(plan) {
  track("checkout_started", { plan });
}

export function trackFeatureGated(feature, plan) {
  track("feature_gated", { feature, current_plan: plan });
}

export function trackSearchUsed(analysisId, query) {
  track("search_used", { analysis_id: analysisId, query_length: query?.length });
}

export function trackOnboardingStarted(type) {
  track("onboarding_started", { type });
}
