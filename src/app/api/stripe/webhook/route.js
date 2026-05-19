import { NextResponse } from "next/server";
import { getStripe } from "../../../../lib/stripe";
import { saveSubscriptionToMetadata } from "../../../../lib/server-session";
import { upsertSubscription } from "../../../../lib/subscription-gate";
import { getPlanByPriceId } from "../../../../config/plans";
import { sendPlanUpgradeEmail, sendPlanDowngradeEmail, sendPaymentFailedEmail } from "../../../../lib/email";

async function getUserFromSubscription(subscription) {
  const stripe = getStripe();
  const customer = await stripe.customers.retrieve(subscription.customer);
  return {
    userId: customer.metadata?.userId || null,
    customerEmail: customer.email || null,
    customerId: subscription.customer,
  };
}

async function syncSubscription(subscription, status) {
  const { userId, customerEmail, customerId } = await getUserFromSubscription(subscription);
  if (!userId) {
    console.warn("[stripe/webhook] No userId in customer metadata, skipping sync. Customer:", customerId);
    return;
  }

  const priceId = subscription.items?.data?.[0]?.price?.id;
  const isActive = status === "active" || status === "trialing";
  
  // Resolve plan from price ID — this handles pro vs team automatically
  const plan = isActive ? getPlanByPriceId(priceId) : "free";

  console.log(`[stripe/webhook] syncSubscription: userId=${userId}, status=${status}, priceId=${priceId}, resolvedPlan=${plan}, isActive=${isActive}`);

  const currentPeriodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;

  const result = await upsertSubscription({
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

  console.log(`[stripe/webhook] upsertSubscription result:`, result?.id ? 'success' : 'failed');

  await saveSubscriptionToMetadata(userId, {
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    subscriptionStatus: status,
    plan,
  }).catch(err => console.error("[stripe/webhook] saveSubscriptionToMetadata failed:", err.message));
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
    console.log(`[stripe/webhook] Event received: ${event.type} (id: ${event.id})`);
  } catch (err) {
    console.error("[stripe/webhook] signature verification failed:", err.message);
    console.error("[stripe/webhook] STRIPE_WEBHOOK_SECRET present:", !!process.env.STRIPE_WEBHOOK_SECRET);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          await syncSubscription(subscription, subscription.status);
          
          // Send upgrade email
          const { customerEmail } = await getUserFromSubscription(subscription);
          const priceId = subscription.items?.data?.[0]?.price?.id;
          const plan = getPlanByPriceId(priceId);
          if (customerEmail && plan !== 'free') {
            const planPrice = plan === 'team' ? '$30' : '$12';
            sendPlanUpgradeEmail({ to: customerEmail, name: session.customer_details?.name, plan: plan.charAt(0).toUpperCase() + plan.slice(1), price: planPrice }).catch(() => {});
          }
        }
        break;
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        await syncSubscription(subscription, subscription.status);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const { customerEmail } = await getUserFromSubscription(subscription);
        const priceId = subscription.items?.data?.[0]?.price?.id;
        const previousPlan = getPlanByPriceId(priceId);
        await syncSubscription(subscription, "cancelled");
        
        // Send downgrade email
        if (customerEmail && previousPlan !== 'free') {
          sendPlanDowngradeEmail({ to: customerEmail, name: null, previousPlan: previousPlan.charAt(0).toUpperCase() + previousPlan.slice(1) }).catch(() => {});
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
          const { customerEmail } = await getUserFromSubscription(subscription);
          const priceId = subscription.items?.data?.[0]?.price?.id;
          const plan = getPlanByPriceId(priceId);
          await syncSubscription(subscription, "past_due");
          
          // Send payment failed email
          if (customerEmail) {
            sendPaymentFailedEmail({ to: customerEmail, name: null, plan: plan.charAt(0).toUpperCase() + plan.slice(1) }).catch(() => {});
          }
        }
        break;
      }
    }
  } catch (err) {
    console.error("[stripe/webhook] handler error:", err);
    return NextResponse.json({ error: "Webhook handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
