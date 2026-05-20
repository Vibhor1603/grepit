import Razorpay from "razorpay";
import crypto from "crypto";

let _razorpay = null;

export function getRazorpay() {
  if (_razorpay) return _razorpay;
  _razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
  return _razorpay;
}

/**
 * Create a Razorpay subscription.
 * @param {string} planId - Razorpay plan ID (plan_...)
 * @param {object} options - Additional options (customer_notify, notes, etc.)
 * @returns {object} - Razorpay subscription object
 */
export async function createSubscription({ planId, notes = {}, customerNotify = 1 }) {
  const razorpay = getRazorpay();
  const subscription = await razorpay.subscriptions.create({
    plan_id: planId,
    total_count: 120, // Max billing cycles (10 years monthly)
    customer_notify: customerNotify,
    notes,
  });
  return subscription;
}

/**
 * Fetch a Razorpay subscription by ID.
 * @param {string} subscriptionId - Razorpay subscription ID (sub_...)
 */
export async function fetchSubscription(subscriptionId) {
  const razorpay = getRazorpay();
  return razorpay.subscriptions.fetch(subscriptionId);
}

/**
 * Cancel a Razorpay subscription.
 * @param {string} subscriptionId - Razorpay subscription ID (sub_...)
 * @param {boolean} cancelAtCycleEnd - If true, cancels at end of current billing cycle
 */
export async function cancelSubscription(subscriptionId, cancelAtCycleEnd = true) {
  const razorpay = getRazorpay();
  return razorpay.subscriptions.cancel(subscriptionId, cancelAtCycleEnd);
}

/**
 * Verify Razorpay payment signature for subscriptions.
 * For subscriptions: HMAC-SHA256(payment_id + "|" + subscription_id, key_secret)
 * @param {string} paymentId - Razorpay payment ID
 * @param {string} subscriptionId - Razorpay subscription ID
 * @param {string} signature - Razorpay signature from frontend
 * @returns {boolean} - Whether signature is valid
 */
export function verifySubscriptionSignature({ paymentId, subscriptionId, signature }) {
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${paymentId}|${subscriptionId}`)
    .digest("hex");
  return expectedSignature === signature;
}

/**
 * Verify Razorpay payment signature for orders (one-time payments).
 * @param {string} orderId - Razorpay order ID
 * @param {string} paymentId - Razorpay payment ID
 * @param {string} signature - Razorpay signature from frontend
 * @returns {boolean} - Whether signature is valid
 */
export function verifyPaymentSignature({ orderId, paymentId, signature }) {
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return expectedSignature === signature;
}
