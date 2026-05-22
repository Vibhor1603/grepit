import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { previewPlanChange, getProductId } from "../../../../lib/billing/dodo";
import { getSubscription, getUserPlan } from "../../../../lib/subscription-gate";

/**
 * POST /api/dodo/preview-change
 * 
 * Returns the prorated charge amount for an upgrade.
 * Called before the user confirms, so they see exactly what they'll pay.
 */
export async function POST(request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { plan: targetPlan } = body;

    if (!targetPlan || !["starter", "pro"].includes(targetPlan)) {
      return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
    }

    const existing = await getSubscription(userId);
    const currentPlan = await getUserPlan(userId);

    if (currentPlan === "free" || currentPlan === targetPlan) {
      return NextResponse.json({ error: "Cannot preview this change." }, { status: 400 });
    }

    const dodoSubId = existing?.dodo_subscription_id;
    if (!dodoSubId) {
      return NextResponse.json({ error: "No subscription found." }, { status: 400 });
    }

    const targetProductId = getProductId(targetPlan);
    const preview = await previewPlanChange(dodoSubId, targetProductId);

    if (!preview) {
      return NextResponse.json({ available: false });
    }

    // immediate_charge.summary.total_amount is in smallest currency unit (cents/paise/etc.)
    const totalAmount = preview.immediate_charge?.summary?.total_amount;
    const currency = preview.new_plan?.currency || "USD";

    // Format using the currency's native locale so symbols are correct (₹ for INR, $ for USD, etc.)
    let formattedAmount = null;
    if (totalAmount != null) {
      try {
        // Use undefined locale so Intl picks the best locale for the currency
        formattedAmount = new Intl.NumberFormat(undefined, {
          style: 'currency',
          currency,
          maximumFractionDigits: currency === 'INR' ? 0 : 2, // INR doesn't use decimals typically
        }).format(totalAmount / 100);
      } catch {
        // Fallback: just show amount with currency code
        formattedAmount = `${currency} ${(totalAmount / 100).toFixed(2)}`;
      }
    }

    return NextResponse.json({
      available: true,
      amount: formattedAmount,
      currency,
    });
  } catch (err) {
    console.error("[preview-change] error:", err?.message);
    return NextResponse.json({ available: false });
  }
}
