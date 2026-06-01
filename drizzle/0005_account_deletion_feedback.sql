-- Replace deleted-user contact archive with anonymized exit feedback only (no PII).

CREATE TABLE IF NOT EXISTS "account_deletion_feedback" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "reason" text NOT NULL,
  "plan" text,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "account_deletion_feedback_created_at_idx"
  ON "account_deletion_feedback" ("created_at");

DROP TABLE IF EXISTS "deleted_user_contacts";
