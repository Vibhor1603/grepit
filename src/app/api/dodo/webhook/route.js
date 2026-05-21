import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/db";
import { subscriptions, webhook_events } from "../../../../db/schema";
import { eq } from "drizzle-orm";
import { verifyWebhookSignature, getPlanFromProductId } from "../../../../lib/billing/dodo";
import { grantEntitlement, extendEntitlement, invalidateSubscriptionCache } from "../../../../lib/subscription-gate";

/**
 * POST /api/dodo/webhook
 * 
 * SOURCE OF TRUTH for all subscription state changes.
 * Entitlements are ONLY granted/revoked here — never in API routes.
 * 
 * Events handled:
 *   subscription.active       → First payment succeeded, grant entitlement
 *   subscription.renewed      → Recurring payment succeeded, extend entitlement
 *   subscription.plan_changed → Upgrade/downgrade confirmed, update entitlement
 *   subscription.on_hold      → Payment failed, revoke access
 *   subscription.cancelled    → Subscription ended, revoke access
 *   subscription.expired      → Subscription expired, revoke access
 *   payment.succeeded         → Log only (subscription events drive state)
 *   payment.failed            → Log only
 */

async function findUserBySubscriptionId(db, subId) {
  if (!subId) return null;
  const rows = await db.select()
    .from(subscriptions)
    .where(eq(subscriptions.razorpay_subscription_id, subId))
    .limit(1);
  return rows[0] || null;
}

export async function POST(request) {
  const rawBody = await request.text();
  const signature = request.headers.get("webhook-signature") || "";
  const webhookId = request.headers.get("webhook-id") || "";
  const timestamp = request.headers.get("webhook-timestamp") || "";

  // Verify signature BEFORE parsing
  if (!verifyWebhookSignature(rawBody, signature, webhookId, timestamp)) {
    Sentry.captureMessage("Dodo webhook signature verification failed", { level: "error" });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = event.type;
  const eventData = event.data;
  const db = getDb();

  // Idempotency — prevent duplicate processing
  const eventId = webhookId || `dodo_${eventData?.subscription_id || ""}_${eventType}_${timestamp}`;
  try {
    await db.insert(webhook_events).values({
      provider: "dodo",
      provider_event_id: eventId,
      event_type: eventType,
      payload: event,
      processed: false,
    });
  } catch (err) {
    if (err?.code === "23505" || err?.message?.includes("unique") || err?.message?.includes("duplicate")) {
      return NextResponse.json({ received: true, duplicate: true });
    }
  }

  console.log(`[webhook] ${eventType}`);

  try {
    switch (eventType) {

      // ─── First payment succeeded → grant entitlement ───
      case "subscription.active": {
        const subId = eventData?.subscription_id;
        const productId = eventData?.product_id;
        const plan = getPlanFromProductId(productId);
        const userId = eventData?.metadata?.user_id;
        const nextBillingDate = eventData?.next_billing_date;

        if (!userId || !plan) {
          console.warn("[webhook] subscription.active: missing userId or plan", { userId, productId });
          break;
        }

        const endsAt = nextBillingDate
          ? new Date(nextBillingDate).toISOString()
          : new Date(Date.now() + 30 * 86400000).toISOString();

        await grantEntitlement(userId, {
          plan,
          endsAt,
          razorpaySubscriptionId: subId,
          razorpayPaymentId: eventData?.payment_id || null,
          paymentMethod: "dodo",
        });

        // Store customer email
        const customerEmail = eventData?.customer?.email;
        if (customerEmail) {
          await db.update(subscriptions)
            .set({ owner_email: customerEmail })
            .where(eq(subscriptions.user_id, userId));
        }

        console.log(`[webhook] Activated: user=${userId}, plan=${plan}, ends=${endsAt}`);
        break;
      }

      // ─── Recurring payment succeeded → extend entitlement ───
      case "subscription.renewed": {
        const subId = eventData?.subscription_id;
        const existingSub = await findUserBySubscriptionId(db, subId);
        if (!existingSub) break;

        const nextBillingDate = eventData?.next_billing_date;
        const newEndsAt = nextBillingDate
          ? new Date(nextBillingDate).toISOString()
          : new Date(Date.now() + 30 * 86400000).toISOString();

        await extendEntitlement(existingSub.user_id, newEndsAt);

        // Clear any scheduled changes (they've been applied by Dodo)
        await db.update(subscriptions)
          .set({
            scheduled_change_type: null,
            scheduled_change_plan: null,
            scheduled_change_at: null,
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          })
          .where(eq(subscriptions.user_id, existingSub.user_id));

        await invalidateSubscriptionCache(existingSub.user_id);
        console.log(`[webhook] Renewed: user=${existingSub.user_id}, ends=${newEndsAt}`);
        break;
      }

      // ─── Plan change confirmed (upgrade or downgrade applied) ───
      case "subscription.plan_changed": {
        const subId = eventData?.subscription_id;
        const existingSub = await findUserBySubscriptionId(db, subId);
        if (!existingSub) break;

        const productId = eventData?.product_id;
        const newPlan = getPlanFromProductId(productId);
        const nextBillingDate = eventData?.next_billing_date;

        if (!newPlan) break;

        const newEndsAt = nextBillingDate
          ? new Date(nextBillingDate).toISOString()
          : existingSub.entitlement_ends_at;

        await db.update(subscriptions)
          .set({
            entitlement_plan: newPlan,
            entitlement_ends_at: newEndsAt,
            plan: newPlan,
            status: "active",
            razorpay_status: "active",
            scheduled_change_type: null,
            scheduled_change_plan: null,
            scheduled_change_at: null,
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          })
          .where(eq(subscriptions.user_id, existingSub.user_id));

        await invalidateSubscriptionCache(existingSub.user_id);
        console.log(`[webhook] Plan changed: user=${existingSub.user_id}, plan=${newPlan}`);
        break;
      }

      // ─── Payment failed → revoke access ───
      case "subscription.on_hold": {
        const subId = eventData?.subscription_id;
        const existingSub = await findUserBySubscriptionId(db, subId);
        if (!existingSub) break;

        await db.update(subscriptions)
          .set({
            status: "past_due",
            razorpay_status: "on_hold",
            entitlement_plan: "free",
            auto_renew: false,
            updated_at: new Date().toISOString(),
          })
          .where(eq(subscriptions.user_id, existingSub.user_id));

        await invalidateSubscriptionCache(existingSub.user_id);
        console.log(`[webhook] On hold: user=${existingSub.user_id}`);
        break;
      }

      // ─── Subscription cancelled ───
      case "subscription.cancelled": {
        const subId = eventData?.subscription_id;
        const existingSub = await findUserBySubscriptionId(db, subId);
        if (!existingSub) break;

        // Check if there's still time left
        const nextBilling = eventData?.next_billing_date;
        const hasTimeLeft = nextBilling && new Date(nextBilling) > new Date();

        if (hasTimeLeft) {
          // Keep entitlement until period ends
          await db.update(subscriptions)
            .set({
              razorpay_status: "cancelled",
              auto_renew: false,
              cancel_at_period_end: true,
              scheduled_change_type: "cancel",
              scheduled_change_plan: "free",
              scheduled_change_at: new Date(nextBilling).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .where(eq(subscriptions.user_id, existingSub.user_id));
        } else {
          // Immediate — revoke now
          await db.update(subscriptions)
            .set({
              entitlement_plan: "free",
              plan: "free",
              status: "cancelled",
              razorpay_status: "cancelled",
              auto_renew: false,
              cancel_at_period_end: false,
              scheduled_change_type: null,
              scheduled_change_plan: null,
              scheduled_change_at: null,
              updated_at: new Date().toISOString(),
            })
            .where(eq(subscriptions.user_id, existingSub.user_id));
        }

        await invalidateSubscriptionCache(existingSub.user_id);
        console.log(`[webhook] Cancelled: user=${existingSub.user_id}, hasTimeLeft=${hasTimeLeft}`);
        break;
      }

      // ─── Subscription expired ───
      case "subscription.expired": {
        const subId = eventData?.subscription_id;
        const existingSub = await findUserBySubscriptionId(db, subId);
        if (!existingSub) break;

        await db.update(subscriptions)
          .set({
            entitlement_plan: "free",
            plan: "free",
            status: "expired",
            razorpay_status: "expired",
            auto_renew: false,
            scheduled_change_type: null,
            scheduled_change_plan: null,
            scheduled_change_at: null,
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          })
          .where(eq(subscriptions.user_id, existingSub.user_id));

        await invalidateSubscriptionCache(existingSub.user_id);
        console.log(`[webhook] Expired: user=${existingSub.user_id}`);
        break;
      }

      // ─── Subscription updated (catch-all sync) ───
      case "subscription.updated": {
        const subId = eventData?.subscription_id;
        const existingSub = await findUserBySubscriptionId(db, subId);
        if (!existingSub) break;

        // Sync cancel_at_next_billing_date from Dodo
        const cancelAtNext = eventData?.cancel_at_next_billing_date;
        if (cancelAtNext !== undefined) {
          await db.update(subscriptions)
            .set({
              cancel_at_period_end: cancelAtNext,
              updated_at: new Date().toISOString(),
            })
            .where(eq(subscriptions.user_id, existingSub.user_id));
          await invalidateSubscriptionCache(existingSub.user_id);
        }

        console.log(`[webhook] Updated: user=${existingSub.user_id}`);
        break;
      }

      // ─── Payment events (log only) ───
      case "payment.succeeded":
        console.log(`[webhook] Payment succeeded: ${eventData?.payment_id}`);
        break;

      case "payment.failed":
        console.log(`[webhook] Payment failed: ${eventData?.payment_id}`);
        break;

      case "subscription.failed":
        console.log(`[webhook] Subscription creation failed: ${eventData?.metadata?.user_id || "unknown"}`);
        break;

      default:
        console.log(`[webhook] Unhandled: ${eventType}`);
    }

    // Mark processed
    await db.update(webhook_events)
      .set({ processed: true })
      .where(eq(webhook_events.provider_event_id, eventId))
      .catch(() => {});

  } catch (err) {
    Sentry.captureException(err, { tags: { source: "dodo-webhook", eventType } });
    console.error(`[webhook] Error handling ${eventType}:`, err?.message || err);
    return NextResponse.json({ error: "Webhook handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
