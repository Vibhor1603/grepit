import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSubscription, getUserPlan } from "../../../../lib/subscription-gate";
import { getGithubRepoToken } from "../../../../lib/server-session";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  console.log("[profile/subscription] Fetching for user:", userId);

  const [sub, plan, githubConnected] = await Promise.all([
    getSubscription(userId),
    getUserPlan(userId),
    getGithubRepoToken({ userId }).then(t => !!t),
  ]);

  console.log("[profile/subscription] Plan:", plan, "status:", sub?.status || "active");

  return NextResponse.json({
    plan,
    status: sub?.status || "active",
    cancelAtPeriodEnd: sub?.cancel_at_period_end || false,
    currentPeriodEnd: sub?.current_period_end || null,
    stripeCustomerId: sub?.stripe_customer_id || null,
    githubConnected,
  });
}
