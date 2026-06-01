import { clerkClient } from "@clerk/nextjs/server";
import { isNotNull } from "drizzle-orm";
import { getDb } from "./db";
import { analyses, subscriptions } from "../db/schema";

function getAdminClerkSecretKey() {
  return process.env.ADMIN_CLERK_SECRET_KEY || process.env.CLERK_SECRET_KEY;
}

function clerkKeyKind(secret) {
  if (!secret) return "missing";
  if (secret.startsWith("sk_live_")) return "production";
  if (secret.startsWith("sk_test_")) return "development";
  return "unknown";
}

function isValidEmail(email) {
  return typeof email === "string" && email.includes("@") && email.length > 3;
}

/** Clerk REST uses snake_case; SDK uses camelCase. */
function primaryEmail(user) {
  const addrs = user.email_addresses || user.emailAddresses || [];
  const primaryId = user.primary_email_address_id || user.primaryEmailAddressId;
  const primary = addrs.find((e) => e.id === primaryId);
  return (
    primary?.email_address ||
    primary?.emailAddress ||
    addrs[0]?.email_address ||
    addrs[0]?.emailAddress ||
    ""
  ).trim();
}

function displayName(user) {
  const first = user.first_name ?? user.firstName ?? "";
  const last = user.last_name ?? user.lastName ?? "";
  const n = [first, last].filter(Boolean).join(" ").trim();
  const email = primaryEmail(user);
  return n || user.username || (email ? email.split("@")[0] : "") || "";
}

function mapClerkUser(u) {
  const email = primaryEmail(u);
  return {
    id: u.id,
    email,
    name: displayName(u),
    status: "active",
    source: "clerk",
    createdAt: u.created_at
      ? new Date(u.created_at).toISOString()
      : u.createdAt
        ? new Date(u.createdAt).toISOString()
        : null,
    plan: null,
  };
}

function shouldIncludeDbRecipients() {
  if (process.env.ADMIN_USERS_INCLUDE_DB === "true") return true;
  if (process.env.ADMIN_USERS_INCLUDE_DB === "false") return false;
  return !process.env.ADMIN_CLERK_SECRET_KEY;
}

/** One row per email; prefer clerk over database. */
function mergeByEmail(groups) {
  const byEmail = new Map();
  const order = ["clerk", "database"];
  const rank = Object.fromEntries(order.map((s, i) => [s, i]));

  for (const list of groups) {
    for (const u of list) {
      if (!isValidEmail(u.email)) continue;
      const key = u.email.toLowerCase();
      const existing = byEmail.get(key);
      if (!existing || rank[u.source] < rank[existing.source]) {
        byEmail.set(key, { ...u, email: u.email.trim() });
      }
    }
  }

  return [...byEmail.values()].sort((a, b) => a.email.localeCompare(b.email));
}

/** Paginate all Clerk users (max 500 per page). Uses ADMIN_CLERK_SECRET_KEY when set. */
export async function fetchAllClerkUsers() {
  const secretKey = getAdminClerkSecretKey();
  if (!secretKey) return { users: [], skippedNoEmail: 0 };

  const out = [];
  let skippedNoEmail = 0;
  let offset = 0;
  const limit = 500;

  if (process.env.ADMIN_CLERK_SECRET_KEY) {
    for (;;) {
      const url = new URL("https://api.clerk.com/v1/users");
      url.searchParams.set("limit", String(limit));
      url.searchParams.set("offset", String(offset));
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${secretKey}` },
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Clerk API ${res.status}: ${body.slice(0, 200)}`);
      }
      const users = await res.json();
      const batch = Array.isArray(users) ? users : users?.data || [];
      for (const u of batch) {
        const mapped = mapClerkUser(u);
        if (!isValidEmail(mapped.email)) {
          skippedNoEmail += 1;
          continue;
        }
        out.push(mapped);
      }
      if (batch.length < limit) break;
      offset += limit;
    }
    return { users: out, skippedNoEmail };
  }

  const client = await clerkClient();
  for (;;) {
    const batch = await client.users.getUserList({ limit, offset });
    for (const u of batch.data) {
      const mapped = mapClerkUser(u);
      if (!isValidEmail(mapped.email)) {
        skippedNoEmail += 1;
        continue;
      }
      out.push(mapped);
    }
    if (batch.data.length < limit) break;
    offset += limit;
  }
  return { users: out, skippedNoEmail };
}

/** Users from DB when Clerk instance differs (optional; off when ADMIN_CLERK_SECRET_KEY is set). */
export async function fetchDbRecipients() {
  const db = getDb();
  const [subs, analysisRows] = await Promise.all([
    db
      .select({
        userId: subscriptions.user_id,
        email: subscriptions.owner_email,
        plan: subscriptions.entitlement_plan,
      })
      .from(subscriptions),
    db
      .selectDistinct({ email: analyses.owner_email })
      .from(analyses)
      .where(isNotNull(analyses.owner_email)),
  ]);

  const byEmail = new Map();
  for (const s of subs) {
    if (!isValidEmail(s.email)) continue;
    const key = s.email.toLowerCase();
    if (!byEmail.has(key)) {
      byEmail.set(key, {
        id: s.userId || `db:${key}`,
        email: s.email.trim(),
        name: s.email.split("@")[0],
        status: "active",
        source: "database",
        createdAt: null,
        plan: s.plan || "free",
      });
    }
  }
  for (const row of analysisRows) {
    if (!isValidEmail(row.email)) continue;
    const key = row.email.toLowerCase();
    if (!byEmail.has(key)) {
      byEmail.set(key, {
        id: `db:${key}`,
        email: row.email.trim(),
        name: row.email.split("@")[0],
        status: "active",
        source: "database",
        createdAt: null,
        plan: "free",
      });
    }
  }
  return [...byEmail.values()];
}

export async function attachPlans(users) {
  const db = getDb();
  const subs = await db.select().from(subscriptions);
  const byUserId = new Map(subs.map((s) => [s.user_id, s.entitlement_plan || "free"]));
  const byEmail = new Map(
    subs
      .filter((s) => s.owner_email)
      .map((s) => [s.owner_email.toLowerCase(), s.entitlement_plan || "free"]),
  );
  return users.map((u) => ({
    ...u,
    plan:
      (u.id && byUserId.get(u.id)) ||
      (u.email && byEmail.get(u.email.toLowerCase())) ||
      u.plan ||
      "free",
  }));
}

export async function listAdminRecipients() {
  const includeDb = shouldIncludeDbRecipients();
  const { users: clerkUsers, skippedNoEmail } = await fetchAllClerkUsers();
  const dbUsers = includeDb ? await fetchDbRecipients() : [];

  const merged = mergeByEmail([clerkUsers, includeDb ? dbUsers : []]);

  const dbOnlyCount = includeDb
    ? dbUsers.filter((u) => !clerkUsers.some((c) => c.email.toLowerCase() === u.email.toLowerCase())).length
    : 0;

  const withPlans = await attachPlans(merged);
  return {
    users: withPlans,
    meta: {
      clerk: clerkUsers.length,
      database: dbOnlyCount,
      skippedNoEmail,
      total: withPlans.length,
      clerkKey: clerkKeyKind(getAdminClerkSecretKey()),
      usingAdminClerkKey: Boolean(process.env.ADMIN_CLERK_SECRET_KEY),
      includeDb,
    },
  };
}

export function filterRecipients(users, { q, status, plan }) {
  let list = users;
  if (status && status !== "all") {
    list = list.filter((u) => u.status === status);
  }
  if (plan && plan !== "all") {
    list = list.filter((u) => (u.plan || "free") === plan);
  }
  if (q && q.trim()) {
    const needle = q.trim().toLowerCase();
    list = list.filter(
      (u) =>
        u.email?.toLowerCase().includes(needle) ||
        u.name?.toLowerCase().includes(needle),
    );
  }
  return list;
}
