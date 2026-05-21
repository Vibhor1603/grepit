import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getPaymentProvider, getCountryFromHeaders } from "../../../../lib/geo";

/**
 * GET /api/billing/provider
 * 
 * Returns which payment provider to use based on user's location.
 * Frontend calls this to decide whether to show Razorpay modal or redirect to LemonSqueezy.
 */
export async function GET() {
  const headersList = await headers();
  const provider = getPaymentProvider(headersList);
  const country = getCountryFromHeaders(headersList);

  return NextResponse.json({
    provider, // "razorpay" or "lemonsqueezy"
    country,
    currency: provider === "razorpay" ? "INR" : "USD",
  });
}
