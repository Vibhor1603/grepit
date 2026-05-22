import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { upgradePlan, downgradePlan, getProductId, cancelScheduledPlanChange } from "../../../../lib/billing/dodo";
import { getSubscription, getUserPlan, scheduleChange } from "../../../../lib/subscription-gate";

const PLAN_ORDER = { free: 0, starter: 1, pro: 2 };

export async function POST(request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { plan: targetPlan } = body;

    if (!targetPlan || !["starter", "pro"].includes(targetPlan)) {
      return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
    }

    const targetProductId = getProductId(targetPlan);
    if (!targetProductId) {
      return NextResponse.json({ error: "Something went wrong. Please try again later." }, { status: 500 });
    }

    const existing = await getSubscription(userId);
    const currentPlan = await getUserPlan(userId);

    if (currentPlan === "free") {
      return NextResponse.json({ error: "No active subscription. Use checkout to subscribe." }, { status: 400 });
    }
    if (currentPlan === targetPlan) {
      return NextResponse.json({ error: `You're already on this plan.` }, { status: 400 });
    }

    const dodoSubId = existing.dodo_subscription_id;
    if (!dodoSubId) {
      return NextResponse.json({ error: "Something went wrong. Please contact support." }, { status: 400 });
    }

    const isUpgrade = PLAN_ORDER[targetPlan] > PLAN_ORDER[currentPlan];

    if (isUpgrade) {
      // ─── UPGRADE ───
      try {
        await upgradePlan(dodoSubId, targetProductId);
      } catch (err) {
        console.error("[change-plan] Upgrade error:", err?.message || err);

        // 409 = pending change — try to clear and retry
        if (err?.message?.includes("409") || err?.message?.includes("pending")) {
          try {
            await cancelScheduledPlanChange(dodoSubId);
            await upgradePlan(dodoSubId, targetProductId);
          } catch (retryErr) {
            console.error("[change-plan] Retry failed:", retryErr?.message);
            return NextResponse.json({
              error: "Please wait a moment and try again.",
            }, { status: 409 });
          }
        } else {
          Sentry.captureException(err, { tags: { source: "dodo", action: "upgrade" } });
          return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
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
      try {
        await downgradePlan(dodoSubId, targetProductId);
      } catch (err) {
        console.error("[change-plan] Downgrade error:", err?.message || err);

        if (err?.message?.includes("409") || err?.message?.includes("pending")) {
          try {
            await cancelScheduledPlanChange(dodoSubId);
            await downgradePlan(dodoSubId, targetProductId);
          } catch (retryErr) {
            console.error("[change-plan] Retry failed:", retryErr?.message);
            return NextResponse.json({
              error: "Please wait a moment and try again.",
            }, { status: 409 });
          }
        } else {
          Sentry.captureException(err, { tags: { source: "dodo", action: "downgrade" } });
          return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
        }
      }

      const effectiveAt = existing.entitlement_ends_at || new Date(Date.now() + 30 * 86400000).toISOString();
      await scheduleChange(userId, { type: "downgrade", targetPlan, effectiveAt });

      const endDate = new Date(effectiveAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      console.log(`[change-plan] Downgrade scheduled: user=${userId}, ${currentPlan} → ${targetPlan}`);

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
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
