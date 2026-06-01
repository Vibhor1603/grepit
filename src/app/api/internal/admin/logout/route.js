import { NextResponse } from "next/server";
import { clearAdminSessionCookie } from "../../../../../lib/admin-auth";
import {
  internalAdminDisabledResponse,
  isInternalAdminEnabled,
} from "../../../../../lib/internal-admin-gate";

export async function POST() {
  if (!isInternalAdminEnabled()) return internalAdminDisabledResponse();
  await clearAdminSessionCookie();
  return NextResponse.json({ ok: true });
}
