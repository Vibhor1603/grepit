import Stripe from "stripe";

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

export async function createOrGetCustomer({ userId, email, name }) {
  const stripe = getStripe();
  const existing = await stripe.customers.list({ email, limit: 1 });
  if (existing.data.length > 0) {
    return existing.data[0].id;
  }
  const customer = await stripe.customers.create({ email, name, metadata: { userId } });
  return customer.id;
}
