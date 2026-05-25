import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDodoClient } from "../../../../lib/billing/dodo";
import { getSubscription } from "../../../../lib/subscription-gate";

/**
 * POST /api/dodo/customer-portal
 * 
 * Creates a Dodo Customer Portal session so the user can manage their
 * payment method, view invoices, etc. Returns the portal URL.
 */
export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sub = await getSubscription(userId);
    if (!sub || !sub.dodo_subscription_id) {
      return NextResponse.json({ error: "No billing account found." }, { status: 400 });
    }

    const client = getDodoClient();
    const origin = process.env.NEXT_PUBLIC_APP_URL || "https://grepit.co";

    // Get customer_id from the subscription details on Dodo
    const dodoSub = await client.subscriptions.retrieve(sub.dodo_subscription_id);
    const customerId = dodoSub?.customer?.customer_id || dodoSub?.customer_id;

    if (!customerId) {
      return NextResponse.json({ error: "Could not find your billing account." }, { status: 400 });
    }

    const session = await client.customers.customerPortal.create(customerId, {
      return_url: `${origin}/profile`,
      send_email: false,
    });

    if (!session?.link) {
      return NextResponse.json({ error: "Could not create portal session." }, { status: 500 });
    }

    return NextResponse.json({ url: session.link });
  } catch (err) {
    console.error("[customer-portal] error:", err?.message || err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
