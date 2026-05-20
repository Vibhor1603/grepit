import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getRazorpay } from "../../../../lib/razorpay";
import { getSubscription } from "../../../../lib/subscription-gate";

// Razorpay Plan IDs — set these in .env after creating plans in dashboard
const PLAN_IDS = {
  basic: process.env.RAZORPAY_BASIC_PLAN_ID,
  pro: process.env.RAZORPAY_PRO_PLAN_ID,
};

export async function POST(request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body = {};
    try { body = await request.json(); } catch {}
    const requestedPlan = body.plan || "pro";

    // Validate plan
    if (!["basic", "pro"].includes(requestedPlan)) {
      return NextResponse.json({ error: "Invalid plan. Choose 'basic' or 'pro'." }, { status: 400 });
    }

    const planId = PLAN_IDS[requestedPlan];
    if (!planId) {
      return NextResponse.json(
        { error: `${requestedPlan} plan is not configured. Set RAZORPAY_${requestedPlan.toUpperCase()}_PLAN_ID in environment variables.` },
        { status: 500 }
      );
    }

    // If user already has an active subscription for this plan
    const existing = await getSubscription(userId);
    if (existing?.status === "active" && existing?.plan === requestedPlan) {
      return NextResponse.json({ error: "You already have an active subscription for this plan." }, { status: 400 });
    }

    // Get user info
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const email = user.emailAddresses?.[0]?.emailAddress || "";
    const name = `${user.firstName || ""} ${user.lastName || ""}`.trim() || email;

    console.log("[razorpay/create-order] Creating subscription with plan_id:", planId);

    // Create Razorpay subscription using direct API call for better error handling
    const razorpay = getRazorpay();
    let subscription;
    try {
      subscription = await razorpay.subscriptions.create({
        plan_id: planId,
        total_count: 120,
        customer_notify: 1,
        notes: { userId, plan: requestedPlan, email },
      });
    } catch (rzpErr) {
      // Razorpay SDK errors have a specific structure
      const errorMsg = rzpErr?.error?.description 
        || rzpErr?.error?.reason 
        || rzpErr?.message 
        || rzpErr?.statusMessage
        || (typeof rzpErr === 'string' ? rzpErr : JSON.stringify(rzpErr));
      Sentry.captureException(rzpErr, {
        level: "error",
        tags: { source: "razorpay", reason: "create_failed" },
        extra: { planId, requestedPlan, userId, errorMsg },
      });
      console.error("[razorpay/create-order] Razorpay API error:", errorMsg, "Full error:", JSON.stringify(rzpErr));
      return NextResponse.json({ error: `Razorpay error: ${errorMsg}` }, { status: 500 });
    }

    console.log("[razorpay/create-order] Subscription created:", subscription.id);

    return NextResponse.json({
      subscription_id: subscription.id,
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID,
      plan: requestedPlan,
      user: { email, name },
    });
  } catch (err) {
    console.error("[razorpay/create-order] Unexpected error:", err?.message || err, "Stack:", err?.stack);
    return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 });
  }
}
