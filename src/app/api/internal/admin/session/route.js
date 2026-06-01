import { NextResponse } from "next/server";
import { requireAdminSession } from "../../../../../lib/admin-auth";
import {
  internalAdminDisabledResponse,
  isInternalAdminEnabled,
} from "../../../../../lib/internal-admin-gate";

export async function GET() {
  if (!isInternalAdminEnabled()) return internalAdminDisabledResponse();
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ ok: true, username: session.username });
}
