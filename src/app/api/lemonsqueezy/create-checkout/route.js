import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { createCheckout, getLsVariantId } from "../../../../lib/lemonsqueezy";
import { getSubscription } from "../../../../lib/subscription-gate";

/**
 * POST /api/lemonsqueezy/create-checkout
 * 
 * Creates a LemonSqueezy checkout URL for international users (USD).
 * Returns the URL — frontend redirects the user there.
 */
export async function POST(request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body = {};
    try { body = await request.json(); } catch {}
    const requestedPlan = body.plan || "basic";

    if (!["basic", "pro"].includes(requestedPlan)) {
      return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
    }

    const variantId = getLsVariantId(requestedPlan);
    if (!variantId) {
      return NextResponse.json(
        { error: `${requestedPlan} plan is not configured for LemonSqueezy. Set LEMONSQUEEZY_${requestedPlan.toUpperCase()}_VARIANT_ID.` },
        { status: 500 }
      );
    }

    // Check if user already has this plan
    const existing = await getSubscription(userId);
    const currentPlan = existing?.entitlement_plan || existing?.plan || "free";
    if (currentPlan === requestedPlan) {
      return NextResponse.json({ error: `You're already on the ${requestedPlan} plan.` }, { status: 400 });
    }

    // Get user info for pre-fill
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const email = user.emailAddresses?.[0]?.emailAddress || "";
    const name = `${user.firstName || ""} ${user.lastName || ""}`.trim() || email;

    const origin = process.env.NEXTAUTH_URL || "https://grepit.co";
    const successUrl = `${origin}/profile?checkout=success`;

    const checkoutUrl = await createCheckout({
      variantId,
      userId,
      email,
      name,
      successUrl,
    });

    console.log("[lemonsqueezy/create-checkout] Checkout created for user:", userId, "plan:", requestedPlan);

    return NextResponse.json({ url: checkoutUrl, plan: requestedPlan });
  } catch (err) {
    Sentry.captureException(err, {
      level: "error",
      tags: { source: "lemonsqueezy", reason: "create_checkout_failed" },
    });
    console.error("[lemonsqueezy/create-checkout] error:", err?.message || err);
    return NextResponse.json({ error: "Failed to create checkout" }, { status: 500 });
  }
}
