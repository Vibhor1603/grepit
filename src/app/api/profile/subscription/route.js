import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSubscription } from "../../../../lib/subscription-gate";
import { getGithubRepoToken } from "../../../../lib/server-session";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Single DB query + github check in parallel
  const [sub, githubConnected] = await Promise.all([
    getSubscription(userId),
    getGithubRepoToken({ userId }).then(t => !!t),
  ]);

  // Determine plan from entitlement (no second DB call)
  let plan = "free";
  if (sub) {
    if (sub.entitlement_plan && sub.entitlement_plan !== "free" && sub.entitlement_ends_at) {
      const endsAt = new Date(sub.entitlement_ends_at);
      if (endsAt > new Date()) plan = sub.entitlement_plan;
    } else if (sub.status === "active" && sub.plan && sub.plan !== "free") {
      plan = sub.plan;
    }
  }

  const entitlementEndsAt = sub?.entitlement_ends_at || sub?.current_period_end || null;

  return NextResponse.json({
    plan,
    status: sub?.status || "inactive",
    entitlementEndsAt,
    autoRenew: sub?.auto_renew ?? true,
    scheduledChange: sub?.scheduled_change_type || null,
    scheduledChangePlan: sub?.scheduled_change_plan || null,
    scheduledChangeAt: sub?.scheduled_change_at || null,
    cancelAtPeriodEnd: (sub?.scheduled_change_type === "cancel") || (sub?.cancel_at_period_end || false),
    currentPeriodEnd: entitlementEndsAt,
    githubConnected,
  });
}
