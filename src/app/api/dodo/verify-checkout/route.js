import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSubscription, getUserPlan, grantEntitlement } from "../../../../lib/subscription-gate";
import { getSubscriptionDetails, getPlanFromProductId } from "../../../../lib/billing/dodo";

/**
 * POST /api/dodo/verify-checkout
 * 
 * Fallback verification for when the webhook is missed (e.g., ngrok down, network issues).
 * Called by the profile page after returning from checkout with ?checkout=success.
 * 
 * Flow:
 * 1. Check if user already has an active entitlement → skip
 * 2. Look up the user's Dodo subscription ID from our DB
 * 3. Fetch subscription status directly from Dodo's API
 * 4. If active, grant entitlement (same as webhook would have done)
 */
export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user already has an active paid plan (webhook already processed)
    const currentPlan = await getUserPlan(userId);
    if (currentPlan !== "free") {
      return NextResponse.json({ 
        verified: true, 
        plan: currentPlan, 
        message: "Already active" 
      });
    }

    // Get subscription record from our DB
    const sub = await getSubscription(userId);
    const dodoSubId = sub?.razorpay_subscription_id;

    if (!dodoSubId) {
      // No subscription ID stored yet — webhook hasn't arrived and we don't have
      // a way to look up the subscription. User may need to wait.
      return NextResponse.json({ 
        verified: false, 
        plan: "free",
        message: "Subscription not found yet. It may take a moment to activate." 
      });
    }

    // Fetch subscription status directly from Dodo
    let dodoSub;
    try {
      dodoSub = await getSubscriptionDetails(dodoSubId);
    } catch (err) {
      console.error("[dodo/verify-checkout] Failed to fetch from Dodo:", err?.message);
      return NextResponse.json({ 
        verified: false, 
        plan: "free",
        message: "Could not verify with payment provider. Please wait a moment and refresh." 
      });
    }

    // Check if subscription is active on Dodo's side
    if (dodoSub.status !== "active") {
      return NextResponse.json({ 
        verified: false, 
        plan: "free",
        message: `Subscription status: ${dodoSub.status}. Please wait for payment to complete.` 
      });
    }

    // Subscription is active on Dodo — grant entitlement (webhook missed)
    const productId = dodoSub.product_id;
    const plan = getPlanFromProductId(productId);

    if (!plan) {
      console.error("[dodo/verify-checkout] Unknown product_id:", productId);
      return NextResponse.json({ 
        verified: false, 
        plan: "free",
        message: "Could not determine plan from subscription. Contact support." 
      });
    }

    const endsAt = dodoSub.next_billing_date
      ? new Date(dodoSub.next_billing_date).toISOString()
      : new Date(Date.now() + 30 * 86400000).toISOString();

    await grantEntitlement(userId, {
      plan,
      endsAt,
      razorpaySubscriptionId: dodoSubId,
      razorpayPaymentId: dodoSub.payment_id || null,
      paymentMethod: "dodo",
    });

    console.log(`[dodo/verify-checkout] Granted entitlement (webhook fallback): user=${userId}, plan=${plan}`);

    return NextResponse.json({ 
      verified: true, 
      plan,
      message: `${plan.charAt(0).toUpperCase() + plan.slice(1)} plan activated.` 
    });
  } catch (err) {
    Sentry.captureException(err, {
      level: "error",
      tags: { source: "dodo", reason: "verify_checkout_failed" },
    });
    console.error("[dodo/verify-checkout] error:", err?.message || err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
