import Stripe from "stripe";
import { PLANS } from "../config/plans";

let _stripe = null;

export function getStripe() {
  if (_stripe) return _stripe;
  _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-04-22.dahlia",
  });
  return _stripe;
}

export function getProPriceId() {
  return process.env.STRIPE_PRO_PRICE_ID;
}

export function getTeamPriceId() {
  return process.env.STRIPE_TEAM_PRICE_ID;
}

/**
 * Get the Stripe price ID for a given plan name.
 */
export function getPriceIdForPlan(planName) {
  const plan = PLANS[planName];
  if (!plan?.stripe_price_id) return null;
  return plan.stripe_price_id;
}

export async function createOrGetCustomer({ userId, email, name }) {
  const stripe = getStripe();
  const existing = await stripe.customers.list({ email, limit: 1 });
  if (existing.data.length > 0) {
    // Ensure userId is in metadata
    if (!existing.data[0].metadata?.userId) {
      await stripe.customers.update(existing.data[0].id, { metadata: { userId } });
    }
    return existing.data[0].id;
  }
  const customer = await stripe.customers.create({ email, name, metadata: { userId } });
  return customer.id;
}
