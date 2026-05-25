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
        const errMsg = err?.message || String(err);
        console.error("[change-plan] Upgrade error:", errMsg);

        // 409 = conflict — pending payment from a previous attempt is blocking
        if (errMsg.includes("409") || errMsg.includes("pending") || errMsg.includes("payment")) {
          // The subscription has a stuck pending change (from a previous prevent_change attempt).
          // Try to force the change with do_not_bill to clear the stuck state, then re-apply properly.
          try {
            const { getDodoClient } = await import("../../../../lib/billing/dodo");
            const client = getDodoClient();
            // First: apply the change without billing to clear the pending state
            await client.subscriptions.changePlan(dodoSubId, {
              product_id: targetProductId,
              proration_billing_mode: "do_not_bill",
              quantity: 1,
              on_payment_failure: "apply_change",
            });
            // The plan is now changed. The prorated charge was skipped but the user gets the upgrade.
            // On next renewal, they'll be charged the full new plan price.
            console.log(`[change-plan] Upgrade forced via do_not_bill (cleared stuck state): user=${userId}, ${currentPlan} → ${targetPlan}`);
          } catch (retryErr) {
            const retryMsg = retryErr?.message || String(retryErr);
            console.error("[change-plan] Force upgrade failed:", retryMsg);
            return NextResponse.json({
              error: "Your subscription has a pending payment that's blocking this change. Please contact support or try again in a few minutes.",
              code: "PAYMENT_PENDING",
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
        const errMsg = err?.message || String(err);
        console.error("[change-plan] Downgrade error:", errMsg);

        if (errMsg.includes("409") || errMsg.includes("pending") || errMsg.includes("payment")) {
          // Stuck pending state — force with do_not_bill
          try {
            const { getDodoClient } = await import("../../../../lib/billing/dodo");
            const client = getDodoClient();
            await client.subscriptions.changePlan(dodoSubId, {
              product_id: targetProductId,
              proration_billing_mode: "do_not_bill",
              quantity: 1,
              on_payment_failure: "apply_change",
              effective_at: "next_billing_date",
            });
            console.log(`[change-plan] Downgrade forced via do_not_bill: user=${userId}, ${currentPlan} → ${targetPlan}`);
          } catch (retryErr) {
            const retryMsg = retryErr?.message || String(retryErr);
            console.error("[change-plan] Force downgrade failed:", retryMsg);
            return NextResponse.json({
              error: "Your subscription has a pending payment that's blocking this change. Please contact support or try again in a few minutes.",
              code: "PAYMENT_PENDING",
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
