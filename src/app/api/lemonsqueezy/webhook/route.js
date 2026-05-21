import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/db";
import { subscriptions, webhook_events } from "../../../../db/schema";
import { eq } from "drizzle-orm";
import { verifyLsWebhookSignature } from "../../../../lib/lemonsqueezy";
import { grantEntitlement, scheduleChange, extendEntitlement } from "../../../../lib/subscription-gate";
import { sendPlanUpgradeEmail, sendPlanDowngradeEmail, sendPaymentFailedEmail } from "../../../../lib/email";

/**
 * POST /api/lemonsqueezy/webhook
 * 
 * Handles LemonSqueezy webhook events for international subscriptions.
 * 
 * Events handled:
 *   - subscription_created → First payment, grant entitlement
 *   - subscription_updated → Plan change, renewal, status change
 *   - subscription_cancelled → Schedule cancellation
 *   - subscription_resumed → Undo cancellation
 *   - subscription_expired → Downgrade to free
 *   - subscription_payment_success → Extend entitlement
 *   - subscription_payment_failed → Alert (LS retries automatically)
 */

function extractUserId(event) {
  // LemonSqueezy sends custom data in meta.custom_data (from checkout_data.custom)
  return event?.meta?.custom_data?.user_id
    || event?.data?.attributes?.first_subscription_item?.custom_data?.user_id
    || null;
}

function extractPlanFromVariant(variantId) {
  const basicVariant = process.env.LEMONSQUEEZY_BASIC_VARIANT_ID;
  const proVariant = process.env.LEMONSQUEEZY_PRO_VARIANT_ID;
  if (String(variantId) === String(basicVariant)) return "basic";
  if (String(variantId) === String(proVariant)) return "pro";
  return null;
}

export async function POST(request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-signature");

  // Verify webhook signature
  if (!verifyLsWebhookSignature(rawBody, signature)) {
    Sentry.captureMessage("LemonSqueezy webhook signature verification failed", {
      level: "error",
      tags: { source: "lemonsqueezy-webhook", reason: "invalid_signature" },
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventName = event?.meta?.event_name;
  const eventId = `ls_${event?.data?.id}_${eventName}_${event?.meta?.webhook_id || ""}`;

  const db = getDb();

  // Idempotency check
  try {
    await db.insert(webhook_events).values({
      provider: "lemonsqueezy",
      provider_event_id: eventId,
      event_type: eventName,
      payload: event,
      processed: false,
    });
  } catch (err) {
    if (err?.code === "23505" || err?.message?.includes("unique") || err?.message?.includes("duplicate")) {
      return NextResponse.json({ received: true, duplicate: true });
    }
  }

  console.log(`[lemonsqueezy/webhook] Event: ${eventName}`);

  try {
    const attrs = event?.data?.attributes;
    const subscriptionId = String(event?.data?.id);
    const userId = extractUserId(event);
    const variantId = attrs?.variant_id;
    const plan = extractPlanFromVariant(variantId);
    const customerEmail = attrs?.user_email || null;

    switch (eventName) {
      // ─── New subscription created (first payment successful) ───
      case "subscription_created": {
        if (!userId || !plan) {
          console.warn("[ls/webhook] subscription_created: missing userId or plan", { userId, variantId });
          break;
        }

        const endsAt = attrs?.renews_at ? new Date(attrs.renews_at).toISOString() : null;

        await grantEntitlement(userId, {
          plan,
          endsAt: endsAt || new Date(Date.now() + 30 * 86400000).toISOString(),
          razorpaySubscriptionId: `ls_${subscriptionId}`, // Prefix to distinguish from Razorpay
          razorpayPaymentId: `ls_payment_${subscriptionId}`,
          paymentMethod: "lemonsqueezy",
        });

        // Store LS subscription ID for future operations
        await db.update(subscriptions)
          .set({
            owner_email: customerEmail,
            payment_method: "lemonsqueezy",
            razorpay_subscription_id: `ls_${subscriptionId}`,
            razorpay_status: "active",
          })
          .where(eq(subscriptions.user_id, userId));

        if (customerEmail) {
          sendPlanUpgradeEmail({
            to: customerEmail, name: null,
            plan: plan.charAt(0).toUpperCase() + plan.slice(1),
            price: plan === "pro" ? "$30" : "$12",
          }).catch(() => {});
        }

        console.log(`[ls/webhook] Subscription created: user=${userId}, plan=${plan}`);
        break;
      }

      // ─── Subscription updated (plan change, status change) ───
      case "subscription_updated": {
        const existingSub = await findUserByLsSubscriptionId(db, subscriptionId);
        if (!existingSub) break;

        const status = attrs?.status; // active, cancelled, expired, past_due, paused
        const newPlan = extractPlanFromVariant(variantId);
        const endsAt = attrs?.renews_at ? new Date(attrs.renews_at).toISOString() : null;

        if (status === "active" && newPlan) {
          // Plan change or reactivation
          await db.update(subscriptions)
            .set({
              entitlement_plan: newPlan,
              entitlement_ends_at: endsAt,
              plan: newPlan,
              razorpay_status: "active",
              auto_renew: true,
              scheduled_change_type: null,
              scheduled_change_plan: null,
              scheduled_change_at: null,
              cancel_at_period_end: false,
              status: "active",
              updated_at: new Date().toISOString(),
            })
            .where(eq(subscriptions.user_id, existingSub.user_id));

          console.log(`[ls/webhook] Subscription updated: user=${existingSub.user_id}, plan=${newPlan}`);
        } else if (status === "cancelled") {
          // LS marks as cancelled but user keeps access until renews_at
          const cancelAt = attrs?.ends_at ? new Date(attrs.ends_at).toISOString() : endsAt;
          await db.update(subscriptions)
            .set({
              razorpay_status: "cancelled",
              auto_renew: false,
              scheduled_change_type: "cancel",
              scheduled_change_plan: "free",
              scheduled_change_at: cancelAt,
              cancel_at_period_end: true,
              updated_at: new Date().toISOString(),
            })
            .where(eq(subscriptions.user_id, existingSub.user_id));

          console.log(`[ls/webhook] Subscription cancelled: user=${existingSub.user_id}`);
        } else if (status === "expired") {
          await db.update(subscriptions)
            .set({
              entitlement_plan: "free",
              plan: "free",
              status: "cancelled",
              razorpay_status: "expired",
              auto_renew: false,
              scheduled_change_type: null,
              updated_at: new Date().toISOString(),
            })
            .where(eq(subscriptions.user_id, existingSub.user_id));

          if (existingSub.owner_email) {
            sendPlanDowngradeEmail({ to: existingSub.owner_email, name: null, previousPlan: existingSub.entitlement_plan || existingSub.plan }).catch(() => {});
          }
          console.log(`[ls/webhook] Subscription expired: user=${existingSub.user_id}`);
        } else if (status === "past_due") {
          await db.update(subscriptions)
            .set({ razorpay_status: "past_due", status: "past_due", updated_at: new Date().toISOString() })
            .where(eq(subscriptions.user_id, existingSub.user_id));

          if (existingSub.owner_email) {
            sendPaymentFailedEmail({ to: existingSub.owner_email, name: null, plan: existingSub.entitlement_plan || "Basic" }).catch(() => {});
          }
          console.log(`[ls/webhook] Subscription past_due: user=${existingSub.user_id}`);
        }
        break;
      }

      // ─── Subscription payment successful (renewal) ───
      case "subscription_payment_success": {
        const existingSub = await findUserByLsSubscriptionId(db, subscriptionId);
        if (!existingSub) break;

        // Extend entitlement by looking at the subscription's renews_at
        const endsAt = attrs?.renews_at ? new Date(attrs.renews_at).toISOString() : null;
        if (endsAt) {
          await extendEntitlement(existingSub.user_id, endsAt);
        }

        console.log(`[ls/webhook] Payment success: user=${existingSub.user_id}, ends_at=${endsAt}`);
        break;
      }

      // ─── Subscription payment failed ───
      case "subscription_payment_failed": {
        const existingSub = await findUserByLsSubscriptionId(db, subscriptionId);
        if (!existingSub) break;

        // LS retries automatically, just log
        console.log(`[ls/webhook] Payment failed (LS will retry): user=${existingSub.user_id}`);
        break;
      }

      default:
        console.log(`[ls/webhook] Unhandled event: ${eventName}`);
    }

    // Mark as processed
    await db.update(webhook_events)
      .set({ processed: true })
      .where(eq(webhook_events.provider_event_id, eventId))
      .catch(() => {});

  } catch (err) {
    Sentry.captureException(err, {
      level: "error",
      tags: { source: "lemonsqueezy-webhook", eventName },
      extra: { eventId },
    });
    console.error(`[ls/webhook] Error handling ${eventName}:`, err?.message || err);
    return NextResponse.json({ error: "Webhook handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// Helper to find user by LS subscription ID
async function findUserByLsSubscriptionId(db, lsSubId) {
  const prefixedId = `ls_${lsSubId}`;
  const rows = await db.select()
    .from(subscriptions)
    .where(eq(subscriptions.razorpay_subscription_id, prefixedId))
    .limit(1);
  return rows[0] || null;
}
