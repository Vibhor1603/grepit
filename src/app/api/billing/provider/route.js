import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getPaymentProvider, getCountryFromHeaders } from "../../../../lib/geo";

/**
 * GET /api/billing/provider
 * 
 * Returns which payment provider to use based on user's location.
 * Response is cached for 5 minutes via Cache-Control header.
 */
export async function GET() {
  const headersList = await headers();
  const provider = getPaymentProvider(headersList);
  const country = getCountryFromHeaders(headersList);

  return NextResponse.json(
    { provider, country, currency: provider === "razorpay" ? "INR" : "USD" },
    { headers: { "Cache-Control": "private, max-age=300" } }
  );
}
