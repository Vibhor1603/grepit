import * as Sentry from "@sentry/nextjs";
import DodoPayments from "dodopayments";
import crypto from "crypto";

/**
 * Dodo Payments billing layer.
 * 
 * This is the ONLY file that talks to Dodo's API.
 * All other code goes through these functions.
 * 
 * Docs: https://docs.dodopayments.com
 */

let _client = null;

export function getDodoClient() {
  if (_client) return _client;
  const apiKey = process.env.DODO_PAYMENTS_API_KEY;
  if (!apiKey) throw new Error("DODO_PAYMENTS_API_KEY not configured");

  _client = new DodoPayments({
    bearerToken: apiKey,
    environment: process.env.DODO_ENVIRONMENT || "live_mode",
  });
  return _client;
}

// ─── Product mapping ───

export function getProductId(plan) {
  if (plan === "starter") return process.env.DODO_STARTER_PRODUCT_ID || null;
  if (plan === "pro") return process.env.DODO_PRO_PRODUCT_ID || null;
  return null;
}

export function getPlanFromProductId(productId) {
  if (productId === process.env.DODO_STARTER_PRODUCT_ID) return "starter";
  if (productId === process.env.DODO_PRO_PRODUCT_ID) return "pro";
  return null;
}

// ─── Checkout (new subscribers) ───

/**
 * Create a checkout session for a new subscription.
 * User is redirected to Dodo's hosted checkout page.
 * After payment, Dodo sends subscription.active webhook.
 */
export async function createCheckoutSession({ productId, userId, email, name, returnUrl }) {
  const client = getDodoClient();
  try {
    const session = await client.checkoutSessions.create({
      product_cart: [{ product_id: productId, quantity: 1 }],
      customer: { email, name },
      return_url: returnUrl,
      metadata: { user_id: userId },
    });
    return { sessionId: session.session_id, checkoutUrl: session.checkout_url };
  } catch (err) {
    Sentry.captureException(err, { tags: { source: "dodo", reason: "create_checkout_failed" } });
    throw err;
  }
}

// ─── Plan changes (existing subscribers) ───

/**
 * Preview what a plan change will cost before executing it.
 * Returns the prorated charge amount so we can show the user.
 */
export async function previewPlanChange(subscriptionId, newProductId) {
  const client = getDodoClient();
  try {
    const preview = await client.subscriptions.previewChangePlan(subscriptionId, {
      product_id: newProductId,
      quantity: 1,
      proration_billing_mode: "prorated_immediately",
    });
    return preview;
  } catch (err) {
    // Non-fatal — if preview fails, we can still proceed without showing amount
    console.warn("[dodo] Preview failed:", err?.message);
    return null;
  }
}

/**
 * Upgrade: Change plan immediately with prorated charge.
 * Dodo charges the price difference for remaining cycle using existing payment method.
 * No redirect needed — charge happens server-side.
 * 
 * on_payment_failure: "prevent_change" ensures plan stays unchanged if charge fails.
 * This means the user only gets upgraded AFTER successful payment.
 * If payment fails, Dodo sends subscription.on_hold webhook and we can notify the user.
 * Webhook (subscription.plan_changed) confirms the switch.
 */
export async function upgradePlan(subscriptionId, newProductId) {
  const client = getDodoClient();
  try {
    const result = await client.subscriptions.changePlan(subscriptionId, {
      product_id: newProductId,
      proration_billing_mode: "prorated_immediately",
      quantity: 1,
      on_payment_failure: "prevent_change",
    });
    return result;
  } catch (err) {
    Sentry.captureException(err, {
      tags: { source: "dodo", reason: "upgrade_failed" },
      extra: { subscriptionId, newProductId },
    });
    throw err;
  }
}

/**
 * Downgrade: Schedule plan change at next billing date.
 * User keeps current plan until period ends.
 * Dodo applies lower plan on renewal automatically.
 * 
 * Uses do_not_bill since no charge is needed for a downgrade scheduled at next billing.
 * Webhook (subscription.plan_changed) fires when the switch actually happens.
 */
export async function downgradePlan(subscriptionId, newProductId) {
  const client = getDodoClient();
  try {
    const result = await client.subscriptions.changePlan(subscriptionId, {
      product_id: newProductId,
      proration_billing_mode: "prorated_immediately",
      quantity: 1,
      effective_at: "next_billing_date",
    });
    return result;
  } catch (err) {
    Sentry.captureException(err, {
      tags: { source: "dodo", reason: "downgrade_failed" },
      extra: { subscriptionId, newProductId },
    });
    throw err;
  }
}

/**
 * Cancel a scheduled plan change (undo downgrade).
 */
export async function cancelScheduledPlanChange(subscriptionId) {
  const client = getDodoClient();
  try {
    await client.subscriptions.cancelChangePlan(subscriptionId);
  } catch (err) {
    Sentry.captureException(err, {
      tags: { source: "dodo", reason: "cancel_scheduled_change_failed" },
      extra: { subscriptionId },
    });
    throw err;
  }
}

// ─── Cancellation ───

/**
 * Cancel subscription at end of billing period.
 * User keeps access until current_period_end.
 * Dodo stops renewal automatically.
 */
export async function cancelSubscription(subscriptionId) {
  const client = getDodoClient();
  try {
    const result = await client.subscriptions.update(subscriptionId, {
      cancel_at_next_billing_date: true,
    });
    return result;
  } catch (err) {
    Sentry.captureException(err, {
      tags: { source: "dodo", reason: "cancel_failed" },
      extra: { subscriptionId },
    });
    throw err;
  }
}

/**
 * Undo cancellation — reactivate before period ends.
 * No new checkout, no double charge.
 */
export async function undoCancellation(subscriptionId) {
  const client = getDodoClient();
  try {
    const result = await client.subscriptions.update(subscriptionId, {
      cancel_at_next_billing_date: false,
    });
    return result;
  } catch (err) {
    Sentry.captureException(err, {
      tags: { source: "dodo", reason: "undo_cancel_failed" },
      extra: { subscriptionId },
    });
    throw err;
  }
}

// ─── Subscription retrieval ───

export async function getSubscriptionDetails(subscriptionId) {
  const client = getDodoClient();
  return client.subscriptions.retrieve(subscriptionId);
}

// ─── Webhook verification ───

export function verifyWebhookSignature(rawBody, signature, webhookId, timestamp) {
  const secret = process.env.DODO_PAYMENTS_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("[dodo] DODO_PAYMENTS_WEBHOOK_SECRET not set, skipping verification");
    return true;
  }

  try {
    const signedContent = `${webhookId}.${timestamp}.${rawBody}`;
    const secretBytes = Buffer.from(secret.replace("whsec_", ""), "base64");
    const expectedSignature = crypto
      .createHmac("sha256", secretBytes)
      .update(signedContent)
      .digest("base64");

    const signatures = signature.split(" ");
    return signatures.some((sig) => {
      const sigValue = sig.replace(/^v1,/, "");
      return sigValue === expectedSignature;
    });
  } catch (err) {
    console.error("[dodo] Signature verification error:", err.message);
    return false;
  }
}
