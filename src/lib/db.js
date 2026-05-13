import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { getDatabaseUrl, isDatabaseConfigured } from "./env";

export function getDb() {
  if (!isDatabaseConfigured()) {
    throw new Error("Database is not configured. Set DATABASE_URL.");
  }
  const sql = neon(getDatabaseUrl());
  return drizzle(sql);
}
