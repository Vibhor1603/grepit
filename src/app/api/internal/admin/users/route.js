import { NextResponse } from "next/server";
import { requireAdminSession } from "../../../../../lib/admin-auth";
import {
  internalAdminDisabledResponse,
  isInternalAdminEnabled,
} from "../../../../../lib/internal-admin-gate";
import { filterRecipients, listAdminRecipients } from "../../../../../lib/admin-users";

export async function GET(request) {
  if (!isInternalAdminEnabled()) return internalAdminDisabledResponse();
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    const status = searchParams.get("status") || "all";
    const plan = searchParams.get("plan") || "all";

    const { users: all, meta } = await listAdminRecipients();
    const users = filterRecipients(all, { q, status, plan });

    return NextResponse.json({
      users,
      total: all.length,
      filtered: users.length,
      meta,
    });
  } catch (err) {
    console.error("[admin/users]", err.message);
    return NextResponse.json({ error: err.message || "Failed to load users" }, { status: 500 });
  }
}
