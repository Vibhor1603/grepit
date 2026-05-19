import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getStripe, createOrGetCustomer, getPriceIdForPlan } from "../../../../lib/stripe";
import { saveSubscriptionToMetadata } from "../../../../lib/server-session";
import { getSubscription } from "../../../../lib/subscription-gate";

export async function POST(request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body = {};
    try { body = await request.json(); } catch {}
    const requestedPlan = body.plan || "pro"; // Default to pro if not specified

    console.log("[stripe/checkout] Creating session for user:", userId, "plan:", requestedPlan);

    // Validate plan
    if (!["pro", "team"].includes(requestedPlan)) {
      return NextResponse.json({ error: "Invalid plan. Choose 'pro' or 'team'." }, { status: 400 });
    }

    const priceId = getPriceIdForPlan(requestedPlan);
    if (!priceId) {
      return NextResponse.json({ error: `${requestedPlan} plan is not configured. Set STRIPE_${requestedPlan.toUpperCase()}_PRICE_ID.` }, { status: 500 });
    }

    // If user already has an active subscription, redirect to billing portal
    const existing = await getSubscription(userId);
    if (existing?.status === "active" && existing?.stripe_customer_id) {
      const stripe = getStripe();
      const session = await stripe.billingPortal.sessions.create({
        customer: existing.stripe_customer_id,
        return_url: `${process.env.NEXTAUTH_URL || request.nextUrl.origin}/profile`,
      });
      return NextResponse.json({ url: session.url });
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const email = user.emailAddresses?.[0]?.emailAddress;
    const name = `${user.firstName || ""} ${user.lastName || ""}`.trim() || email;

    const customerId = await createOrGetCustomer({ userId, email, name });
    await saveSubscriptionToMetadata(userId, { stripeCustomerId: customerId });

    const origin = process.env.NEXTAUTH_URL || request.nextUrl.origin;
    const returnUrl = body.returnUrl || '/profile';
    // Validate returnUrl is a relative path
    const safeReturnUrl = returnUrl.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : '/profile';

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}${safeReturnUrl}${safeReturnUrl.includes('?') ? '&' : '?'}checkout=success`,
      cancel_url: `${origin}${safeReturnUrl}${safeReturnUrl.includes('?') ? '&' : '?'}checkout=cancelled`,
      allow_promotion_codes: true,
      metadata: { userId, plan: requestedPlan },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[stripe/checkout] error:", err.message);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
