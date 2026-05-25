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

    console.log("[preview-change] Dodo response:", JSON.stringify(preview, null, 2).slice(0, 2000));

    // Extract amount and currency from Dodo's preview response
    // Dodo returns amount in minor units (cents/paise) — we need to find the right fields
    const totalAmount = preview.immediate_charge?.summary?.total_amount 
      ?? preview.immediate_charge?.amount 
      ?? preview.amount;
    
    // Search for currency in multiple possible locations
    const currency = preview.immediate_charge?.summary?.currency
      || preview.immediate_charge?.currency 
      || preview.new_plan?.currency 
      || preview.currency 
      || "USD";

    console.log("[preview-change] Extracted: amount=%s, currency=%s", totalAmount, currency);

    // Format using Intl so symbols are correct (₹ for INR, $ for USD, € for EUR, etc.)
    let formattedAmount = null;
    if (totalAmount != null) {
      try {
        // Zero-decimal currencies don't need division
        const zeroDecimal = ['JPY', 'KRW', 'VND', 'CLP', 'ISK', 'UGX', 'RWF'];
        const divisor = zeroDecimal.includes(currency) ? 1 : 100;
        const value = totalAmount / divisor;

        formattedAmount = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency,
          minimumFractionDigits: zeroDecimal.includes(currency) ? 0 : 2,
          maximumFractionDigits: zeroDecimal.includes(currency) ? 0 : 2,
        }).format(value);
      } catch {
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
