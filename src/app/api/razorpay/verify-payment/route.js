import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { verifySubscriptionSignature, fetchSubscription } from "../../../../lib/razorpay";
import { grantEntitlement } from "../../../../lib/subscription-gate";
import { saveSubscriptionToMetadata } from "../../../../lib/server-session";
import { sendPlanUpgradeEmail } from "../../../../lib/email";

export async function POST(request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature, plan } = body;

    // Validate required fields
    if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
      return NextResponse.json({ error: "Missing payment details" }, { status: 400 });
    }

    if (!plan || !["basic", "pro"].includes(plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    // Verify signature — for subscriptions: HMAC(payment_id | subscription_id)
    const isValid = verifySubscriptionSignature({
      paymentId: razorpay_payment_id,
      subscriptionId: razorpay_subscription_id,
      signature: razorpay_signature,
    });

    if (!isValid) {
      console.error("[razorpay/verify-payment] Signature mismatch for subscription:", razorpay_subscription_id);
      Sentry.captureMessage("Razorpay payment signature mismatch", {
        level: "warning",
        tags: { source: "razorpay", reason: "signature_mismatch" },
        extra: { razorpay_subscription_id, userId },
      });
      return NextResponse.json({ error: "Payment verification failed. Signature mismatch." }, { status: 400 });
    }

    // Fetch subscription details from Razorpay to get period end
    let entitlementEndsAt = null;
    let paymentMethod = null;
    try {
      const subDetails = await fetchSubscription(razorpay_subscription_id);
      if (subDetails.current_end) {
        entitlementEndsAt = new Date(subDetails.current_end * 1000).toISOString();
      }
      paymentMethod = subDetails.payment_method || null;
    } catch (err) {
      console.warn("[razorpay/verify-payment] Could not fetch subscription details:", err.message);
    }

    // Fallback: 30 days from now
    if (!entitlementEndsAt) {
      const fallback = new Date();
      fallback.setDate(fallback.getDate() + 30);
      entitlementEndsAt = fallback.toISOString();
    }

    // Get user info
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const email = user.emailAddresses?.[0]?.emailAddress || "";
    const name = `${user.firstName || ""} ${user.lastName || ""}`.trim() || email;

    // Grant entitlement immediately
    await grantEntitlement(userId, {
      plan,
      endsAt: entitlementEndsAt,
      razorpaySubscriptionId: razorpay_subscription_id,
      razorpayPaymentId: razorpay_payment_id,
      paymentMethod,
    });

    // Save to Clerk metadata
    await saveSubscriptionToMetadata(userId, {
      razorpayPaymentId: razorpay_payment_id,
      razorpayOrderId: razorpay_subscription_id,
      subscriptionStatus: "active",
      plan,
    });

    // Send upgrade email (non-blocking)
    const planPrice = plan === "pro" ? "$30" : "$12";
    sendPlanUpgradeEmail({
      to: email,
      name,
      plan: plan.charAt(0).toUpperCase() + plan.slice(1),
      price: planPrice,
    }).catch(() => {});

    console.log("[razorpay/verify-payment] Entitlement granted: user:", userId, "plan:", plan, "ends_at:", entitlementEndsAt);

    return NextResponse.json({
      success: true,
      message: "Payment verified and subscription activated",
      plan,
    });
  } catch (err) {
    console.error("[razorpay/verify-payment] error:", err.message);
    return NextResponse.json({ error: "Payment verification failed" }, { status: 500 });
  }
}
