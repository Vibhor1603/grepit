import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { admin_credentials } from "../db/schema";

const scryptAsync = promisify(scrypt);
const COOKIE_NAME = "grepit_admin_session";
const SESSION_DAYS = 7;

function getSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.CLERK_SECRET_KEY || "grepit-admin-dev-only";
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scryptAsync(password, salt, 64);
  return { salt, hash: derived.toString("hex") };
}

export async function verifyPassword(password, salt, hashHex) {
  const derived = await scryptAsync(password, salt, 64);
  const expected = Buffer.from(hashHex, "hex");
  if (expected.length !== derived.length) return false;
  return timingSafeEqual(expected, derived);
}

export async function verifyAdminCredentials(username, password) {
  const db = getDb();
  const rows = await db
    .select()
    .from(admin_credentials)
    .where(eq(admin_credentials.username, username))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const ok = await verifyPassword(password, row.password_salt, row.password_hash);
  return ok ? row : null;
}

function signPayload(payloadB64) {
  return createHmac("sha256", getSessionSecret()).update(payloadB64).digest("base64url");
}

export function createAdminSessionToken(username) {
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = JSON.stringify({ u: username, exp });
  const payloadB64 = Buffer.from(payload).toString("base64url");
  const sig = signPayload(payloadB64);
  return `${payloadB64}.${sig}`;
}

function parseSessionToken(token) {
  if (!token || typeof token !== "string") return null;
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return null;
  const expected = signPayload(payloadB64);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const { u, exp } = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
    if (!u || !exp || Date.now() > exp) return null;
    return { username: u, exp };
  } catch {
    return null;
  }
}

export async function getAdminSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  return parseSessionToken(token);
}

export async function setAdminSessionCookie(username) {
  const token = createAdminSessionToken(username);
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearAdminSessionCookie() {
  const jar = await cookies();
  jar.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function requireAdminSession() {
  const session = await getAdminSession();
  if (!session) return null;
  return session;
}
