import { NextResponse } from "next/server";
import { getStripe } from "../../../../lib/stripe";
import { saveSubscriptionToMetadata } from "../../../../lib/server-session";
import { upsertSubscription } from "../../../../lib/subscription-gate";

async function getUserFromSubscription(subscription) {
  const stripe = getStripe();
  const customer = await stripe.customers.retrieve(subscription.customer);
  return {
    userId: customer.metadata?.userId || null,
    customerEmail: customer.email || null,
    customerId: subscription.customer,
  };
}

async function syncSubscription(subscription, plan, status) {
  const { userId, customerEmail, customerId } = await getUserFromSubscription(subscription);
  if (!userId) return;

  const priceId = subscription.items?.data?.[0]?.price?.id;
  const currentPeriodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;

  await upsertSubscription({
    user_id: userId,
    owner_email: customerEmail,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    stripe_price_id: priceId,
    status,
    plan,
    current_period_end: currentPeriodEnd,
    cancel_at_period_end: subscription.cancel_at_period_end || false,
  });

  await saveSubscriptionToMetadata(userId, {
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    subscriptionStatus: status,
    plan,
  });
}

export async function POST(request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const stripe = getStripe();
  let event;
  try {
    const body = await request.text();
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[stripe/webhook] signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        const isActive = subscription.status === "active" || subscription.status === "trialing";
        await syncSubscription(subscription, isActive ? "pro" : "free", subscription.status);
        break;
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const isActive = subscription.status === "active" || subscription.status === "trialing";
        await syncSubscription(subscription, isActive ? "pro" : "free", subscription.status);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        await syncSubscription(subscription, "free", "cancelled");
        break;
      }
    }
  } catch (err) {
    console.error("[stripe/webhook] handler error:", err);
    return NextResponse.json({ error: "Webhook handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
