import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getStripe, getProPriceId, createOrGetCustomer } from "../../../../lib/stripe";
import { saveSubscriptionToMetadata } from "../../../../lib/server-session";
import { getSubscription } from "../../../../lib/subscription-gate";

export async function POST(request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existing = await getSubscription(userId);
    if (existing?.plan === "pro" && existing?.status === "active") {
      const stripe = getStripe();
      const session = await stripe.billingPortal.sessions.create({
        customer: existing.stripe_customer_id,
        return_url: `${process.env.NEXTAUTH_URL || request.nextUrl.origin}/dashboard`,
      });
      return NextResponse.json({ url: session.url });
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const email = user.emailAddresses?.[0]?.emailAddress;
    const name = `${user.firstName || ""} ${user.lastName || ""}`.trim() || email;

    const customerId = await createOrGetCustomer({ userId, email, name });

    await saveSubscriptionToMetadata(userId, { stripeCustomerId: customerId });

    const stripe = getStripe();
    const priceId = getProPriceId();

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXTAUTH_URL || request.nextUrl.origin}/profile?checkout=success`,
      cancel_url: `${process.env.NEXTAUTH_URL || request.nextUrl.origin}/?checkout=cancelled`,
      allow_promotion_codes: true,
      metadata: { userId },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[stripe/checkout]", err);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
