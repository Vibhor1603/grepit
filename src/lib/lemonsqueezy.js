import * as Sentry from "@sentry/nextjs";
import crypto from "crypto";

/**
 * LemonSqueezy API client for international payments (USD).
 * 
 * LemonSqueezy is a merchant-of-record platform that handles:
 * - USD subscriptions globally
 * - Tax collection and remittance
 * - Hosted checkout pages
 * - Webhook notifications for subscription lifecycle
 * 
 * Docs: https://docs.lemonsqueezy.com/api
 */

const LS_API_BASE = "https://api.lemonsqueezy.com/v1";

function getApiKey() {
  return process.env.LEMONSQUEEZY_API_KEY;
}

function getStoreId() {
  return process.env.LEMONSQUEEZY_STORE_ID;
}

/**
 * Make an authenticated request to the LemonSqueezy API.
 */
async function lsRequest(path, options = {}) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("LEMONSQUEEZY_API_KEY not configured");

  const res = await fetch(`${LS_API_BASE}${path}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/vnd.api+json",
      "Accept": "application/vnd.api+json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const errorBody = await res.text();
    const err = new Error(`LemonSqueezy API error: ${res.status}`);
    err.status = res.status;
    err.body = errorBody;
    Sentry.captureException(err, {
      level: "error",
      tags: { source: "lemonsqueezy", status: res.status },
      extra: { path, errorBody },
    });
    throw err;
  }

  return res.json();
}

/**
 * Create a checkout URL for a subscription.
 * 
 * @param {object} params
 * @param {string} params.variantId - LemonSqueezy variant ID (the specific plan/price)
 * @param {string} params.userId - Our internal user ID (stored in checkout custom data)
 * @param {string} params.email - User's email for pre-fill
 * @param {string} params.name - User's name for pre-fill
 * @param {string} params.successUrl - URL to redirect after successful payment
 * @returns {Promise<string>} Checkout URL
 */
export async function createCheckout({ variantId, userId, email, name, successUrl }) {
  const storeId = getStoreId();
  if (!storeId) throw new Error("LEMONSQUEEZY_STORE_ID not configured");

  const data = await lsRequest("/checkouts", {
    method: "POST",
    body: JSON.stringify({
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: {
            custom: {
              user_id: userId,
            },
            email,
            name,
          },
          product_options: {
            redirect_url: successUrl,
          },
        },
        relationships: {
          store: { data: { type: "stores", id: storeId } },
          variant: { data: { type: "variants", id: variantId } },
        },
      },
    }),
  });

  return data.data.attributes.url;
}

/**
 * Cancel a LemonSqueezy subscription.
 * @param {string} subscriptionId - LS subscription ID
 */
export async function cancelLsSubscription(subscriptionId) {
  return lsRequest(`/subscriptions/${subscriptionId}`, {
    method: "DELETE",
  });
}

/**
 * Get a LemonSqueezy subscription by ID.
 * @param {string} subscriptionId - LS subscription ID
 */
export async function getLsSubscription(subscriptionId) {
  const data = await lsRequest(`/subscriptions/${subscriptionId}`);
  return data.data;
}

/**
 * Update a LemonSqueezy subscription (e.g., change plan/variant).
 * @param {string} subscriptionId - LS subscription ID
 * @param {string} variantId - New variant ID to switch to
 */
export async function updateLsSubscription(subscriptionId, variantId) {
  return lsRequest(`/subscriptions/${subscriptionId}`, {
    method: "PATCH",
    body: JSON.stringify({
      data: {
        type: "subscriptions",
        id: subscriptionId,
        attributes: {
          variant_id: parseInt(variantId, 10),
        },
      },
    }),
  });
}

/**
 * Verify LemonSqueezy webhook signature.
 * Uses timing-safe comparison to prevent timing attacks.
 * @param {string} rawBody - Raw request body
 * @param {string} signature - X-Signature header value
 * @returns {boolean}
 */
export function verifyLsWebhookSignature(rawBody, signature) {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("[lemonsqueezy] LEMONSQUEEZY_WEBHOOK_SECRET not set, skipping verification");
    return true; // Skip in dev
  }
  if (!signature || !rawBody) return false;
  
  const hmac = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  
  try {
    return crypto.timingSafeEqual(
      Buffer.from(hmac, "hex"),
      Buffer.from(signature, "hex")
    );
  } catch {
    return false;
  }
}

/**
 * Get the variant ID for a plan.
 * @param {"basic" | "pro"} plan
 * @returns {string | null}
 */
export function getLsVariantId(plan) {
  if (plan === "basic") return process.env.LEMONSQUEEZY_BASIC_VARIANT_ID || null;
  if (plan === "pro") return process.env.LEMONSQUEEZY_PRO_VARIANT_ID || null;
  return null;
}
