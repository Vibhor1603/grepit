import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { upgradePlan, downgradePlan, getProductId } from "../../../../lib/billing/dodo";
import { getSubscription, getUserPlan, scheduleChange } from "../../../../lib/subscription-gate";

const PLAN_ORDER = { free: 0, basic: 1, pro: 2 };

/**
 * POST /api/dodo/change-plan
 * 
 * UPGRADE (Basic → Pro):
 *   - Calls Dodo changePlan with prorated_immediately + prevent_change
 *   - Dodo charges price difference using existing payment method (no redirect)
 *   - If charge fails → error returned, plan unchanged
 *   - If charge succeeds → Dodo sends subscription.plan_changed webhook → we grant entitlement
 * 
 * DOWNGRADE (Pro → Basic):
 *   - Calls Dodo changePlan with effective_at: next_billing_date
 *   - User keeps Pro until billing period ends
 *   - Dodo applies Basic on renewal automatically
 *   - We record scheduled change locally for UI display
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

    const targetProductId = getProductId(targetPlan);
    if (!targetProductId) {
      return NextResponse.json({ error: `${targetPlan} plan is not configured.` }, { status: 500 });
    }

    // Never trust frontend — get current state from DB
    const existing = await getSubscription(userId);
    const currentPlan = await getUserPlan(userId);

    if (currentPlan === "free") {
      return NextResponse.json({ error: "No active subscription. Use checkout to subscribe." }, { status: 400 });
    }
    if (currentPlan === targetPlan) {
      return NextResponse.json({ error: `You're already on the ${targetPlan} plan.` }, { status: 400 });
    }

    const dodoSubId = existing.razorpay_subscription_id;
    if (!dodoSubId) {
      return NextResponse.json({ error: "Subscription ID not found. Contact support." }, { status: 400 });
    }

    const isUpgrade = PLAN_ORDER[targetPlan] > PLAN_ORDER[currentPlan];

    if (isUpgrade) {
      // ─── UPGRADE ───
      // Dodo charges prorated difference immediately using saved payment method.
      // No redirect needed. Webhook confirms and grants entitlement.
      try {
        await upgradePlan(dodoSubId, targetProductId);
      } catch (err) {
        const msg = err?.message || "Upgrade failed";
        console.error("[change-plan] Upgrade error:", msg);

        // Handle 409: pending plan change or payment still processing
        if (msg.includes("409") || msg.includes("pending")) {
          // Try to cancel any scheduled change first
          try {
            const { cancelScheduledPlanChange } = await import("../../../../lib/billing/dodo");
            await cancelScheduledPlanChange(dodoSubId);
            // Retry
            await upgradePlan(dodoSubId, targetProductId);
          } catch (retryErr) {
            const retryMsg = retryErr?.message || "";
            // If cancel failed with 404 (no scheduled change), the issue is a stuck payment
            if (retryMsg.includes("404") || retryMsg.includes("No scheduled")) {
              return NextResponse.json({
                error: "A previous payment is still processing on Dodo's side. Please wait 2-3 minutes and try again, or check your Dodo dashboard.",
              }, { status: 409 });
            }
            return NextResponse.json({ error: retryMsg || "Upgrade failed" }, { status: 500 });
          }
        } else {
          return NextResponse.json({ error: msg }, { status: 500 });
        }
      }

      console.log(`[change-plan] Upgrade initiated: user=${userId}, ${currentPlan} → ${targetPlan}`);

      return NextResponse.json({
        success: true,
        type: "upgrade",
        plan: targetPlan,
        message: `Upgrading to ${targetPlan.charAt(0).toUpperCase() + targetPlan.slice(1)}. Prorated difference will be charged.`,
      });
    } else {
      // ─── DOWNGRADE ───
      // Scheduled at next billing date. User keeps current plan until then.
      try {
        await downgradePlan(dodoSubId, targetProductId);
      } catch (err) {
        const msg = err?.message || "Downgrade failed";
        console.error("[change-plan] Downgrade error:", msg);

        if (msg.includes("409") || msg.includes("pending")) {
          try {
            const { cancelScheduledPlanChange } = await import("../../../../lib/billing/dodo");
            await cancelScheduledPlanChange(dodoSubId);
            await downgradePlan(dodoSubId, targetProductId);
          } catch (retryErr) {
            const retryMsg = retryErr?.message || "";
            if (retryMsg.includes("404") || retryMsg.includes("No scheduled")) {
              return NextResponse.json({
                error: "A previous payment is still processing. Please wait 2-3 minutes and try again.",
              }, { status: 409 });
            }
            return NextResponse.json({ error: retryMsg || "Downgrade failed" }, { status: 500 });
          }
        } else {
          return NextResponse.json({ error: msg }, { status: 500 });
        }
      }

      // Record locally for UI (profile shows "Switching to Basic on [date]")
      const effectiveAt = existing.entitlement_ends_at || new Date(Date.now() + 30 * 86400000).toISOString();
      await scheduleChange(userId, { type: "downgrade", targetPlan, effectiveAt });

      const endDate = new Date(effectiveAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      console.log(`[change-plan] Downgrade scheduled: user=${userId}, ${currentPlan} → ${targetPlan}, effective=${effectiveAt}`);

      return NextResponse.json({
        success: true,
        type: "downgrade_scheduled",
        plan: targetPlan,
        effectiveAt,
        message: `Downgrade scheduled. You'll keep ${currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} until ${endDate}.`,
      });
    }
  } catch (err) {
    Sentry.captureException(err, { tags: { source: "dodo", reason: "plan_change_failed" } });
    console.error("[change-plan] error:", err?.message || err);
    return NextResponse.json({ error: "Failed to change plan" }, { status: 500 });
  }
}
