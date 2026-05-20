import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { getDb } from "../../../../lib/db";
import { subscriptions, webhook_events } from "../../../../db/schema";
import { eq } from "drizzle-orm";
import { extendEntitlement, grantEntitlement } from "../../../../lib/subscription-gate";
import { sendPlanUpgradeEmail, sendPlanDowngradeEmail, sendPaymentFailedEmail } from "../../../../lib/email";

/**
 * POST /api/razorpay/webhook
 * 
 * Production webhook handler with:
 * - Signature verification
 * - Idempotency (webhook_events table)
 * - Entitlement-based state updates
 */

function verifyWebhookSignature(body, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("[webhook] RAZORPAY_WEBHOOK_SECRET not set, skipping verification");
    return true;
  }
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");
  return expectedSignature === signature;
}

function getSubscriptionEntity(payload) {
  return payload?.subscription?.entity || null;
}

function getSubscriptionId(payload) {
  return payload?.subscription?.entity?.id
    || payload?.payment?.entity?.subscription_id
    || null;
}

function getUserIdFromNotes(payload) {
  const notes = payload?.subscription?.entity?.notes
    || payload?.payment?.entity?.notes
    || {};
  return notes.userId || null;
}

function getPlanFromNotes(payload) {
  const notes = payload?.subscription?.entity?.notes
    || payload?.payment?.entity?.notes
    || {};
  return notes.plan || null;
}

function getEmailFromPayload(payload) {
  return payload?.payment?.entity?.email
    || payload?.subscription?.entity?.notes?.email
    || null;
}

async function findUserBySubscriptionId(db, subscriptionId) {
  if (!subscriptionId) return null;
  // Check new column first, then legacy
  let rows = await db.select()
    .from(subscriptions)
    .where(eq(subscriptions.razorpay_subscription_id, subscriptionId))
    .limit(1);
  if (rows.length > 0) return rows[0];

  rows = await db.select()
    .from(subscriptions)
    .where(eq(subscriptions.stripe_subscription_id, subscriptionId))
    .limit(1);
  return rows[0] || null;
}

export async function POST(request) {
  const body = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  // Verify signature
  if (!verifyWebhookSignature(body, signature)) {
    console.error("[webhook] Invalid signature");
    Sentry.captureMessage("Razorpay webhook signature verification failed", {
      level: "error",
      tags: { source: "razorpay-webhook", reason: "invalid_signature" },
      extra: { hasSignature: !!signature },
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event;
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = event.event;
  const payload = event.payload;
  const eventId = event.account_id + "_" + (event.payload?.subscription?.entity?.id || event.payload?.payment?.entity?.id || "") + "_" + eventType + "_" + (event.created_at || "");

  const db = getDb();

  // ─── Idempotency check ───
  try {
    await db.insert(webhook_events).values({
      provider_event_id: eventId,
      event_type: eventType,
      payload: event,
      processed: false,
    });
  } catch (err) {
    // Unique constraint violation = already processed
    if (err?.code === "23505" || err?.message?.includes("unique") || err?.message?.includes("duplicate")) {
      console.log(`[webhook] Duplicate event skipped: ${eventType} (${eventId})`);
      return NextResponse.json({ received: true, duplicate: true });
    }
    // Other DB error — log but continue processing
    console.warn("[webhook] Failed to insert event record:", err?.message);
  }

  console.log(`[webhook] Processing: ${eventType}`);

  try {
    switch (eventType) {
      // ─── First payment successful ───
      case "subscription.activated": {
        const userId = getUserIdFromNotes(payload);
        const plan = getPlanFromNotes(payload);
        const subscriptionId = getSubscriptionId(payload);
        const subEntity = getSubscriptionEntity(payload);

        if (!userId || !plan) {
          console.warn("[webhook] subscription.activated: missing userId or plan");
          break;
        }

        const endsAt = subEntity?.current_end
          ? new Date(subEntity.current_end * 1000).toISOString()
          : null;

        await grantEntitlement(userId, {
          plan,
          endsAt: endsAt || new Date(Date.now() + 30 * 86400000).toISOString(),
          razorpaySubscriptionId: subscriptionId,
          razorpayPaymentId: subEntity?.payment_id || null,
          paymentMethod: subEntity?.payment_method || null,
        });

        // Also set owner_email
        const email = getEmailFromPayload(payload);
        if (email) {
          await db.update(subscriptions)
            .set({ owner_email: email })
            .where(eq(subscriptions.user_id, userId));

          sendPlanUpgradeEmail({
            to: email, name: null,
            plan: plan.charAt(0).toUpperCase() + plan.slice(1),
            price: plan === "pro" ? "$30" : "$12",
          }).catch(() => {});
        }

        console.log(`[webhook] Activated: user=${userId}, plan=${plan}`);
        break;
      }

      // ─── Recurring payment successful ───
      case "subscription.charged": {
        const subscriptionId = getSubscriptionId(payload);
        const subEntity = getSubscriptionEntity(payload);
        const existingSub = await findUserBySubscriptionId(db, subscriptionId);

        if (!existingSub) break;

        // If there's a scheduled cancellation, cancel on Razorpay NOW and downgrade
        if (existingSub.scheduled_change_type === "cancel") {
          try {
            const { cancelSubscription } = await import("../../../../lib/razorpay");
            await cancelSubscription(subscriptionId, false); // immediate cancel
          } catch (err) {
            console.warn("[webhook] Failed to cancel on Razorpay:", err?.error?.description || err?.message);
          }

          await db.update(subscriptions)
            .set({
              entitlement_plan: "free",
              plan: "free",
              status: "cancelled",
              razorpay_status: "cancelled",
              auto_renew: false,
              scheduled_change_type: null,
              scheduled_change_plan: null,
              scheduled_change_at: null,
              cancel_at_period_end: false,
              updated_at: new Date().toISOString(),
            })
            .where(eq(subscriptions.user_id, existingSub.user_id));

          if (existingSub.owner_email) {
            sendPlanDowngradeEmail({
              to: existingSub.owner_email, name: null,
              previousPlan: (existingSub.entitlement_plan || existingSub.plan || "Basic").charAt(0).toUpperCase() + (existingSub.entitlement_plan || existingSub.plan || "basic").slice(1),
            }).catch(() => {});
          }

          console.log(`[webhook] Scheduled cancel applied on renewal: user=${existingSub.user_id}`);
          break;
        }

        // If there's a scheduled downgrade, apply it
        if (existingSub.scheduled_change_type === "downgrade" && existingSub.scheduled_change_plan) {
          const newPlan = existingSub.scheduled_change_plan;
          const newEndsAt = subEntity?.current_end
            ? new Date(subEntity.current_end * 1000).toISOString()
            : null;

          await db.update(subscriptions)
            .set({
              entitlement_plan: newPlan,
              entitlement_ends_at: newEndsAt,
              plan: newPlan,
              current_period_end: newEndsAt,
              scheduled_change_type: null,
              scheduled_change_plan: null,
              scheduled_change_at: null,
              cancel_at_period_end: false,
              auto_renew: true,
              razorpay_status: "active",
              status: "active",
              updated_at: new Date().toISOString(),
            })
            .where(eq(subscriptions.user_id, existingSub.user_id));

          console.log(`[webhook] Downgrade applied on renewal: user=${existingSub.user_id}, plan=${newPlan}`);
          break;
        }

        // Normal renewal — extend entitlement
        const newEndsAt = subEntity?.current_end
          ? new Date(subEntity.current_end * 1000).toISOString()
          : null;

        if (newEndsAt) {
          await extendEntitlement(existingSub.user_id, newEndsAt);
        }

        console.log(`[webhook] Charged: user=${existingSub.user_id}, ends_at=${newEndsAt}`);
        break;
      }

      // ─── Payment failed after all retries ───
      case "subscription.halted": {
        const subscriptionId = getSubscriptionId(payload);
        const existingSub = await findUserBySubscriptionId(db, subscriptionId);
        if (!existingSub) break;

        // Mark razorpay_status as halted but DON'T remove entitlement yet
        // (no grace period per your request — cut access)
        await db.update(subscriptions)
          .set({
            razorpay_status: "halted",
            status: "past_due",
            entitlement_plan: "free",
            auto_renew: false,
            updated_at: new Date().toISOString(),
          })
          .where(eq(subscriptions.user_id, existingSub.user_id));

        if (existingSub.owner_email) {
          sendPaymentFailedEmail({
            to: existingSub.owner_email, name: null,
            plan: (existingSub.entitlement_plan || existingSub.plan || "Pro").charAt(0).toUpperCase() + (existingSub.entitlement_plan || existingSub.plan || "pro").slice(1),
          }).catch(() => {});
        }

        console.log(`[webhook] Halted: user=${existingSub.user_id}`);
        break;
      }

      // ─── Subscription cancelled ───
      case "subscription.cancelled": {
        const subscriptionId = getSubscriptionId(payload);
        const subEntity = getSubscriptionEntity(payload);
        const existingSub = await findUserBySubscriptionId(db, subscriptionId);
        if (!existingSub) break;

        // Update razorpay_status — entitlement is managed by our system
        await db.update(subscriptions)
          .set({
            razorpay_status: "cancelled",
            auto_renew: false,
            updated_at: new Date().toISOString(),
          })
          .where(eq(subscriptions.user_id, existingSub.user_id));

        // If no scheduled change exists, schedule a cancel
        if (!existingSub.scheduled_change_type) {
          const endsAt = subEntity?.current_end
            ? new Date(subEntity.current_end * 1000).toISOString()
            : existingSub.entitlement_ends_at || existingSub.current_period_end;

          await db.update(subscriptions)
            .set({
              scheduled_change_type: "cancel",
              scheduled_change_plan: "free",
              scheduled_change_at: endsAt,
              cancel_at_period_end: true,
            })
            .where(eq(subscriptions.user_id, existingSub.user_id));
        }

        console.log(`[webhook] Cancelled: user=${existingSub.user_id}`);
        break;
      }

      // ─── All billing cycles done ───
      case "subscription.completed": {
        const subscriptionId = getSubscriptionId(payload);
        const existingSub = await findUserBySubscriptionId(db, subscriptionId);
        if (!existingSub) break;

        await db.update(subscriptions)
          .set({
            razorpay_status: "completed",
            entitlement_plan: "free",
            status: "cancelled",
            plan: "free",
            auto_renew: false,
            scheduled_change_type: null,
            scheduled_change_plan: null,
            scheduled_change_at: null,
            updated_at: new Date().toISOString(),
          })
          .where(eq(subscriptions.user_id, existingSub.user_id));

        console.log(`[webhook] Completed: user=${existingSub.user_id}`);
        break;
      }

      // ─── Plan change confirmed by Razorpay ───
      case "subscription.updated": {
        const subscriptionId = getSubscriptionId(payload);
        const subEntity = getSubscriptionEntity(payload);
        const existingSub = await findUserBySubscriptionId(db, subscriptionId);
        if (!existingSub) break;

        const newPlanId = subEntity?.plan_id;
        let newPlan = null;
        if (newPlanId === process.env.RAZORPAY_BASIC_PLAN_ID) newPlan = "basic";
        else if (newPlanId === process.env.RAZORPAY_PRO_PLAN_ID) newPlan = "pro";

        if (newPlan && newPlan !== (existingSub.entitlement_plan || existingSub.plan)) {
          const newEndsAt = subEntity?.current_end
            ? new Date(subEntity.current_end * 1000).toISOString()
            : existingSub.entitlement_ends_at;

          await db.update(subscriptions)
            .set({
              entitlement_plan: newPlan,
              entitlement_ends_at: newEndsAt,
              plan: newPlan,
              stripe_price_id: newPlan,
              current_period_end: newEndsAt,
              razorpay_status: "active",
              scheduled_change_type: null,
              scheduled_change_plan: null,
              scheduled_change_at: null,
              cancel_at_period_end: false,
              updated_at: new Date().toISOString(),
            })
            .where(eq(subscriptions.user_id, existingSub.user_id));

          console.log(`[webhook] Updated: user=${existingSub.user_id}, plan=${newPlan}`);
        }
        break;
      }

      // ─── Payment pending ───
      case "subscription.pending": {
        const subscriptionId = getSubscriptionId(payload);
        const existingSub = await findUserBySubscriptionId(db, subscriptionId);
        if (existingSub) {
          await db.update(subscriptions)
            .set({ razorpay_status: "pending", updated_at: new Date().toISOString() })
            .where(eq(subscriptions.user_id, existingSub.user_id));
        }
        console.log(`[webhook] Pending: sub=${subscriptionId}`);
        break;
      }

      // ─── Individual payment attempt failed ───
      case "payment.failed": {
        const subscriptionId = payload?.payment?.entity?.subscription_id;
        if (!subscriptionId) break;
        // Don't downgrade — Razorpay will retry. Only halted = all retries exhausted.
        console.log(`[webhook] Payment failed (will retry): sub=${subscriptionId}`);
        break;
      }

      default:
        console.log(`[webhook] Unhandled: ${eventType}`);
    }

    // Mark event as processed
    await db.update(webhook_events)
      .set({ processed: true })
      .where(eq(webhook_events.provider_event_id, eventId))
      .catch(() => {});

  } catch (err) {
    Sentry.captureException(err, {
      level: "error",
      tags: { source: "razorpay-webhook", eventType },
      extra: { eventId },
    });
    console.error(`[webhook] Error handling ${eventType}:`, err?.message || err);
    return NextResponse.json({ error: "Webhook handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
