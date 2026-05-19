import { NextResponse } from "next/server";
import { isDisposableEmail } from "../../../../lib/disposable-email";

/**
 * POST /api/auth/check-email
 * Validates an email before signup — rejects disposable/temp emails.
 */
export async function POST(request) {
  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email } = body;
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

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
