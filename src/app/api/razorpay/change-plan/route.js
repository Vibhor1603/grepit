import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getRazorpay } from "../../../../lib/razorpay";
import { getSubscription, grantEntitlement, scheduleChange, clearScheduledChange } from "../../../../lib/subscription-gate";

const PLAN_IDS = {
  basic: process.env.RAZORPAY_BASIC_PLAN_ID,
  pro: process.env.RAZORPAY_PRO_PLAN_ID,
};

const PLAN_ORDER = { free: 0, basic: 1, pro: 2 };
const PLAN_PRICES_CENTS = { basic: 1200, pro: 3000 }; // USD cents

/**
 * POST /api/razorpay/change-plan
 * 
 * Production billing state machine for plan changes.
 * 
 * UPGRADE (basic → pro):
 *   1. Calculate proration (unused credit vs new charge)
 *   2. Try Razorpay Update Subscription API (handles proration natively)
 *   3. If fails (UPI/cancelled), fall back to new subscription
 *   4. Grant entitlement immediately
 * 
 * DOWNGRADE (pro → basic):
 *   1. Schedule change for cycle end (no immediate billing)
 *   2. Keep current entitlement until period ends
 *   3. At renewal, webhook applies the new plan
 * 
 * CANCEL-THEN-CHANGE (subscription already cancelled on Razorpay):
 *   - For upgrade: create new subscription, user goes through checkout
 *   - For downgrade: schedule it, create new sub with start_at = period end
 */
export async function POST(request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { plan: targetPlan } = body;

    if (!targetPlan || !["basic", "pro"].includes(targetPlan)) {
      return NextResponse.json({ error: "Invalid plan. Choose 'basic' or 'pro'." }, { status: 400 });
    }

    const targetPlanId = PLAN_IDS[targetPlan];
    if (!targetPlanId) {
      return NextResponse.json({ error: `${targetPlan} plan is not configured.` }, { status: 500 });
    }

    // Get current subscription state
    const existing = await getSubscription(userId);
    const currentPlan = existing?.entitlement_plan || existing?.plan || "free";

    if (currentPlan === "free") {
      return NextResponse.json({ error: "No active subscription. Use the subscribe flow instead." }, { status: 400 });
    }

    if (currentPlan === targetPlan) {
      return NextResponse.json({ error: `You're already on the ${targetPlan} plan.` }, { status: 400 });
    }

    const isUpgrade = PLAN_ORDER[targetPlan] > PLAN_ORDER[currentPlan];
    const razorpaySubId = existing.razorpay_subscription_id || existing.stripe_subscription_id;
    const entitlementEndsAt = existing.entitlement_ends_at || existing.current_period_end;
    const razorpay = getRazorpay();

    // ─── Check Razorpay subscription status ───
    let rzpSubStatus = null;
    if (razorpaySubId) {
      try {
        const rzpSub = await razorpay.subscriptions.fetch(razorpaySubId);
        rzpSubStatus = rzpSub.status;
      } catch {
        // Can't fetch — treat as cancelled
        rzpSubStatus = "cancelled";
      }
    }

    // ─── CASE 1: Razorpay sub is cancelled/expired — need new subscription ───
    if (!razorpaySubId || rzpSubStatus === "cancelled" || rzpSubStatus === "completed" || rzpSubStatus === "expired") {
      if (isUpgrade) {
        // Create new subscription for immediate checkout
        try {
          const newSub = await razorpay.subscriptions.create({
            plan_id: targetPlanId,
            total_count: 120,
            customer_notify: 1,
            notes: { userId, plan: targetPlan },
          });

          // Clear any pending scheduled changes since user is upgrading
          await clearScheduledChange(userId);

          return NextResponse.json({
            success: false,
            requiresCheckout: true,
            subscription_id: newSub.id,
            key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID,
            plan: targetPlan,
            message: "Please complete checkout for the new plan.",
          });
        } catch (err) {
          const msg = err?.error?.description || err?.message || "Failed to create subscription";
          return NextResponse.json({ error: msg }, { status: 500 });
        }
      } else {
        // Downgrade when already cancelled — schedule for period end, create future sub
        try {
          const startAt = entitlementEndsAt ? Math.floor(new Date(entitlementEndsAt).getTime() / 1000) : undefined;

          const newSub = await razorpay.subscriptions.create({
            plan_id: targetPlanId,
            total_count: 120,
            customer_notify: 1,
            start_at: startAt, // Starts when current entitlement expires
            notes: { userId, plan: targetPlan },
          });

          // Schedule the downgrade
          await scheduleChange(userId, {
            type: "downgrade",
            targetPlan,
            effectiveAt: entitlementEndsAt,
          });

          return NextResponse.json({
            success: false,
            requiresCheckout: true,
            subscription_id: newSub.id,
            key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID,
            plan: targetPlan,
            message: `Your ${targetPlan.charAt(0).toUpperCase() + targetPlan.slice(1)} plan will start when your current period ends. Please authorize the payment method.`,
          });
        } catch (err) {
          const msg = err?.error?.description || err?.message || "Failed to create subscription";
          return NextResponse.json({ error: msg }, { status: 500 });
        }
      }
    }

    // ─── CASE 2: Razorpay sub is active — use Update Subscription API ───
    if (isUpgrade) {
      try {
        await razorpay.subscriptions.update(razorpaySubId, {
          plan_id: targetPlanId,
          schedule_change_at: "now",
        });

        // Fetch updated subscription to get new period end
        let newEndsAt = entitlementEndsAt;
        try {
          const updated = await razorpay.subscriptions.fetch(razorpaySubId);
          if (updated.current_end) {
            newEndsAt = new Date(updated.current_end * 1000).toISOString();
          }
        } catch {}

        // Grant entitlement immediately
        await grantEntitlement(userId, {
          plan: targetPlan,
          endsAt: newEndsAt,
          razorpaySubscriptionId: razorpaySubId,
          razorpayPaymentId: existing.razorpay_payment_id || existing.stripe_customer_id,
          paymentMethod: existing.payment_method,
        });

        console.log(`[razorpay/change-plan] Upgrade: user=${userId}, ${currentPlan} → ${targetPlan} (immediate, prorated)`);

        return NextResponse.json({
          success: true,
          type: "upgrade",
          plan: targetPlan,
          message: `Upgraded to ${targetPlan.charAt(0).toUpperCase() + targetPlan.slice(1)}. Prorated difference charged.`,
        });
      } catch (rzpErr) {
        const errorMsg = rzpErr?.error?.description || rzpErr?.message || "Failed to update subscription";
        const isUpiOrCancelled = errorMsg.toLowerCase().includes("upi") || errorMsg.toLowerCase().includes("cancel");

        if (isUpiOrCancelled) {
          // Fallback: create new subscription for checkout
          try {
            const newSub = await razorpay.subscriptions.create({
              plan_id: targetPlanId,
              total_count: 120,
              customer_notify: 1,
              notes: { userId, plan: targetPlan },
            });

            await clearScheduledChange(userId);

            return NextResponse.json({
              success: false,
              requiresCheckout: true,
              subscription_id: newSub.id,
              key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID,
              plan: targetPlan,
              message: "Please complete checkout for the new plan.",
            });
          } catch (fbErr) {
            return NextResponse.json({ error: fbErr?.error?.description || "Failed" }, { status: 500 });
          }
        }

        console.error("[razorpay/change-plan] Razorpay error:", errorMsg);
        return NextResponse.json({ error: errorMsg }, { status: 500 });
      }
    } else {
      // ─── DOWNGRADE: schedule for cycle end ───
      try {
        await razorpay.subscriptions.update(razorpaySubId, {
          plan_id: targetPlanId,
          schedule_change_at: "cycle_end",
        });
      } catch (rzpErr) {
        const errorMsg = rzpErr?.error?.description || rzpErr?.message || "";
        const isUpiOrCancelled = errorMsg.toLowerCase().includes("upi") || errorMsg.toLowerCase().includes("cancel");

        if (!isUpiOrCancelled) {
          console.error("[razorpay/change-plan] Razorpay downgrade error:", errorMsg);
          return NextResponse.json({ error: errorMsg }, { status: 500 });
        }
        // If UPI/cancelled, we still schedule locally — our system is source of truth
        console.warn("[razorpay/change-plan] Razorpay update failed, scheduling locally:", errorMsg);
      }

      // Schedule the downgrade in our system
      await scheduleChange(userId, {
        type: "downgrade",
        targetPlan,
        effectiveAt: entitlementEndsAt,
      });

      console.log(`[razorpay/change-plan] Downgrade scheduled: user=${userId}, ${currentPlan} → ${targetPlan} at ${entitlementEndsAt}`);

      return NextResponse.json({
        success: true,
        type: "downgrade",
        plan: targetPlan,
        currentPlan,
        currentPeriodEnd: entitlementEndsAt,
        message: `Your plan will switch to ${targetPlan.charAt(0).toUpperCase() + targetPlan.slice(1)} at the end of your current billing period.`,
      });
    }
  } catch (err) {
    Sentry.captureException(err, {
      level: "error",
      tags: { source: "razorpay", reason: "plan_change_failed" },
    });
    console.error("[razorpay/change-plan] error:", err?.message || err);
    return NextResponse.json({ error: "Failed to change plan" }, { status: 500 });
  }
}
