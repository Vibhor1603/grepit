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

    // immediate_charge.summary.total_amount is in smallest currency unit (cents)
    const totalAmount = preview.immediate_charge?.summary?.total_amount;
    const currency = preview.new_plan?.currency || "USD";

    // Format amount: cents → dollars (or equivalent)
    const formattedAmount = totalAmount != null
      ? new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(totalAmount / 100)
      : null;

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
