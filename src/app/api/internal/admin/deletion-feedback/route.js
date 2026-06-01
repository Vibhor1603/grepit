import { NextResponse } from "next/server";
import { requireAdminSession } from "../../../../../lib/admin-auth";
import {
  internalAdminDisabledResponse,
  isInternalAdminEnabled,
} from "../../../../../lib/internal-admin-gate";
import { listDeletionFeedback } from "../../../../../lib/admin-deletion-feedback";

export async function GET(request) {
  if (!isInternalAdminEnabled()) return internalAdminDisabledResponse();
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const plan = searchParams.get("plan") || "all";
    const limit = Number(searchParams.get("limit") || "100");
    const offset = Number(searchParams.get("offset") || "0");

    const data = await listDeletionFeedback({ plan, limit, offset });

    return NextResponse.json(data);
  } catch (err) {
    console.error("[admin/deletion-feedback]", err.message);
    return NextResponse.json(
      { error: err.message || "Failed to load deletion feedback" },
      { status: 500 },
    );
  }
}
