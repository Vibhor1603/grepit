-- Internal admin credentials + deleted-user contact archive
-- Run against your Neon/Postgres database.

CREATE TABLE IF NOT EXISTS "admin_credentials" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "username" text NOT NULL UNIQUE,
  "password_hash" text NOT NULL,
  "password_salt" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "deleted_user_contacts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "clerk_user_id" text,
  "email" text NOT NULL,
  "name" text,
  "deleted_at" timestamptz DEFAULT now() NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "deleted_user_contacts_email_idx" ON "deleted_user_contacts" ("email");
CREATE INDEX IF NOT EXISTS "deleted_user_contacts_deleted_at_idx" ON "deleted_user_contacts" ("deleted_at");

-- Seed admin user: username Vibhor1603
-- Password hash is scrypt(password, salt, 64) — change only via updating password_hash + password_salt in DB.
INSERT INTO "admin_credentials" ("username", "password_hash", "password_salt")
VALUES (
  'Vibhor1603',
  'c1a11fea9c2f79fe7d676677283f86e43dd1f33ed4fa7ba71d9ef6be48531c78a53abf215b4d1d13566954623dffaa80d84cf419e1b2ab4d63f12fcdc128a8fb',
  'd2cd3709b80ae1fb5aa9bd81ddd472f2'
)
ON CONFLICT ("username") DO NOTHING;
