import { NextResponse } from "next/server";
import { setAdminSessionCookie, verifyAdminCredentials } from "../../../../../lib/admin-auth";
import {
  internalAdminDisabledResponse,
  isInternalAdminEnabled,
} from "../../../../../lib/internal-admin-gate";

export async function POST(request) {
  if (!isInternalAdminEnabled()) return internalAdminDisabledResponse();
  try {
    const body = await request.json();
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    if (!username || !password) {
      return NextResponse.json({ error: "Username and password required" }, { status: 400 });
    }
    const row = await verifyAdminCredentials(username, password);
    if (!row) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    await setAdminSessionCookie(row.username);
    return NextResponse.json({ ok: true, username: row.username });
  } catch (err) {
    console.error("[admin/login]", err.message);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
