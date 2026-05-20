import * as Sentry from "@sentry/nextjs";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { getDatabaseUrl, isDatabaseConfigured } from "./env";

// Singleton — reuse the same drizzle instance across requests in the same process.
// Neon HTTP driver is stateless (no persistent TCP connection), but creating
// the drizzle wrapper + neon client has overhead we don't need to repeat.
let _db = null;
let _dbUrl = null;

export function getDb() {
  if (!isDatabaseConfigured()) {
    throw new Error("Database is not configured. Set DATABASE_URL.");
  }

  const url = getDatabaseUrl();

  // Reuse existing instance if URL hasn't changed (handles hot-reload in dev)
  if (_db && _dbUrl === url) return _db;

  try {
    const sql = neon(url);
    _db = drizzle(sql);
    _dbUrl = url;
    return _db;
  } catch (error) {
    Sentry.captureException(error, {
      level: "fatal",
      tags: { source: "database" },
      extra: { configured: isDatabaseConfigured() },
    });
    throw error;
  }
}
