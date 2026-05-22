import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { createCheckoutSession, getProductId } from "../../../../lib/billing/dodo";
import { getUserPlan } from "../../../../lib/subscription-gate";

/**
 * POST /api/dodo/create-checkout
 * 
 * Creates a Dodo checkout session for NEW subscribers (free → paid).
 * Returns checkout URL — frontend redirects user to Dodo's hosted page.
 * After payment, Dodo sends subscription.active webhook → we grant entitlement.
 * 
 * This is NOT used for upgrades/downgrades (those use change-plan).
 */
export async function POST(request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body = {};
    try { body = await request.json(); } catch {}
    // Plan IDs: "starter" and "pro"
    const requestedPlan = body.plan || "starter";

    if (!["starter", "pro"].includes(requestedPlan)) {
      console.error("[create-checkout] Invalid plan:", requestedPlan);
      return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
    }

    const productId = getProductId(requestedPlan);
    if (!productId) {
      console.error("[create-checkout] Product ID not configured for plan:", requestedPlan, "| DODO_STARTER_PRODUCT_ID:", !!process.env.DODO_STARTER_PRODUCT_ID, "| DODO_PRO_PRODUCT_ID:", !!process.env.DODO_PRO_PRODUCT_ID);
      return NextResponse.json({ error: "Something went wrong. Please try again later." }, { status: 500 });
    }

    // Verify user is on free plan
    const currentPlan = await getUserPlan(userId);
    console.log("[create-checkout] user=%s, currentPlan=%s, requestedPlan=%s", userId, currentPlan, requestedPlan);

    if (currentPlan !== "free") {
      return NextResponse.json({ error: "You already have an active subscription. Use plan change instead." }, { status: 400 });
    }

    // Get user info for checkout pre-fill
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const email = user.emailAddresses?.[0]?.emailAddress || "";
    const name = `${user.firstName || ""} ${user.lastName || ""}`.trim() || email;

    const origin = process.env.NEXTAUTH_URL || "https://grepit.co";
    const returnUrl = `${origin}/profile?checkout=success`;

    const { checkoutUrl } = await createCheckoutSession({
      productId,
      userId,
      email,
      name,
      returnUrl,
    });

    console.log("[create-checkout] Session created: user=%s, plan=%s", userId, requestedPlan);

    return NextResponse.json({ url: checkoutUrl, plan: requestedPlan });
  } catch (err) {
    Sentry.captureException(err, { tags: { source: "dodo", reason: "create_checkout_failed" } });
    console.error("[create-checkout] error:", err?.message || err);
    return NextResponse.json({ error: "Failed to create checkout. Please try again." }, { status: 500 });
  }
}
