import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { isDisposableEmail } from "../../../../lib/disposable-email";
import { rateLimit, rateLimitKey } from "../../../../lib/rateLimit";
import { enforceJsonBodySize, validateEmailInput } from "../../../../lib/request-security";

/**
 * POST /api/auth/check-email
 * Validates an email before signup — rejects disposable/temp emails.
 */
export async function POST(request) {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0].trim()
    || headersList.get("x-real-ip")
    || "unknown";
  const limit = await rateLimit(rateLimitKey("check-email", ip), 10, 60_000);
  if (!limit.success) {
    return NextResponse.json({ error: "Rate limit exceeded. Please try again shortly." }, { status: 429 });
  }

  const bodySizeCheck = enforceJsonBodySize(headersList, 8_192);
  if (!bodySizeCheck.ok) {
    return NextResponse.json({ error: bodySizeCheck.error }, { status: bodySizeCheck.status });
  }

  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validation = validateEmailInput(body?.email);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: validation.status });
  }
  const email = validation.value;

  const domain = email.split("@")[1] || "unknown";
  console.log("[check-email] Checking domain:", domain);

  const disposable = await isDisposableEmail(email);
  if (disposable) {
    console.log("[check-email] Rejected disposable domain:", domain);
    return NextResponse.json({ 
      error: "Please use a real email address. Disposable/temporary emails are not allowed.",
      disposable: true 
    }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
