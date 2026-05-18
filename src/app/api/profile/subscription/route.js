import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getStripe } from "../../../../lib/stripe";
import { getSubscription } from "../../../../lib/subscription-gate";
import { getGithubRepoToken } from "../../../../lib/server-session";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sub = await getSubscription(userId);
  const githubConnected = !!(await getGithubRepoToken({ userId }));

  let portalUrl = null;
  if (sub?.stripe_customer_id) {
    try {
      const stripe = getStripe();
      const session = await stripe.billingPortal.sessions.create({
        customer: sub.stripe_customer_id,
        return_url: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/profile`,
      });
      portalUrl = session.url;
    } catch {}
  }

  return NextResponse.json({
    plan: sub?.plan || "free",
    status: sub?.status || "inactive",
    cancelAtPeriodEnd: sub?.cancel_at_period_end || false,
    currentPeriodEnd: sub?.current_period_end || null,
    githubConnected,
    portalUrl,
  });
}