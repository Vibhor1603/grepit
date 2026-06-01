/**
 * Apply drizzle/0005_account_deletion_feedback.sql to DATABASE_URL.
 * Usage: node scripts/apply-0005-deletion-feedback.mjs
 */
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });
config({ path: ".env" });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set (.env.local)");
  process.exit(1);
}

const sql = neon(url);

const steps = [
  [
    "CREATE TABLE",
    `CREATE TABLE IF NOT EXISTS account_deletion_feedback (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      reason text NOT NULL,
      plan text,
      created_at timestamptz DEFAULT now() NOT NULL
    )`,
  ],
  [
    "CREATE INDEX",
    `CREATE INDEX IF NOT EXISTS account_deletion_feedback_created_at_idx
      ON account_deletion_feedback (created_at)`,
  ],
  ["DROP deleted_user_contacts", "DROP TABLE IF EXISTS deleted_user_contacts"],
];

for (const [label, query] of steps) {
  await sql.query(query);
  console.log(`✓ ${label}`);
}

const cols = await sql`
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'account_deletion_feedback'
  ORDER BY ordinal_position`;
console.log("\naccount_deletion_feedback columns:", cols.map((c) => c.column_name).join(", "));
