/**
 * Internal email admin is only available in local development.
 * `next dev` sets NODE_ENV=development automatically.
 * Production and preview deployments (NODE_ENV=production) return 404.
 */
export function isInternalAdminEnabled() {
  return process.env.NODE_ENV === "development";
}

import { NextResponse } from "next/server";

export function internalAdminDisabledResponse() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
