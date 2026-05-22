import { boolean, integer, jsonb, pgTable, text, timestamp, uuid, index } from "drizzle-orm/pg-core";

export const analyses = pgTable(
  "analyses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    owner_email: text("owner_email"),
    repo_url: text("repo_url").notNull(),
    repo_name: text("repo_name").notNull(),
    source: text("source").notNull().default("github"),
    status: text("status").notNull().default("PENDING"),
    summary: text("summary"),
    total_files: integer("total_files").notNull().default(0),
    total_lines: integer("total_lines").notNull().default(0),
    is_private: boolean("is_private").notNull().default(false),
    error_message: text("error_message"),
    languages: jsonb("languages").notNull().default({}),
    file_tree: jsonb("file_tree").notNull().default([]),
    architecture: jsonb("architecture").notNull().default({}),
    results: jsonb("results").notNull().default({}),
    created_at: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [
    index("analyses_owner_email_idx").on(table.owner_email),
    index("analyses_created_at_idx").on(table.created_at),
  ],
);

export const query_history = pgTable(
  "query_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    analysis_id: uuid("analysis_id").references(() => analyses.id, { onDelete: "cascade" }),
    conversation_id: uuid("conversation_id").notNull(),
    owner_email: text("owner_email"),
    query: text("query").notNull(),
    response: text("response").notNull(),
    created_at: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [
    index("query_history_analysis_id_idx").on(table.analysis_id),
    index("query_history_owner_email_idx").on(table.owner_email),
    index("query_history_conversation_id_idx").on(table.conversation_id),
  ],
);

/**
 * Subscriptions table — Dodo Payments billing state.
 *
 * Source of truth for access: entitlement_plan + entitlement_ends_at
 *
 * Column naming note: razorpay_* columns are legacy names that now store
 * Dodo Payments data. A future migration will rename them to dodo_*.
 * Do not use the stripe_* columns — they are dead and will be dropped.
 */
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    user_id: text("user_id").notNull().unique(),
    owner_email: text("owner_email"),

    // ─── Dodo Payments billing state ───
    dodo_subscription_id: text("dodo_subscription_id"),
    dodo_payment_id: text("dodo_payment_id"),
    dodo_status: text("dodo_status"),                   // active|on_hold|cancelled|expired
    payment_method: text("payment_method"),
    auto_renew: boolean("auto_renew").notNull().default(true),

    // ─── Entitlement state (source of truth for access) ───
    entitlement_plan: text("entitlement_plan").notNull().default("free"), // free|basic|pro
    entitlement_starts_at: timestamp("entitlement_starts_at", { withTimezone: true, mode: "string" }),
    entitlement_ends_at: timestamp("entitlement_ends_at", { withTimezone: true, mode: "string" }),

    // ─── Scheduled change intent ───
    scheduled_change_type: text("scheduled_change_type"), // downgrade|cancel|null
    scheduled_change_plan: text("scheduled_change_plan"), // target plan
    scheduled_change_at: timestamp("scheduled_change_at", { withTimezone: true, mode: "string" }),

    // ─── Legacy columns (dead — will be dropped in a future migration) ───
    status: text("status").notNull().default("inactive"),
    plan: text("plan").notNull().default("free"),
    current_period_end: timestamp("current_period_end", { withTimezone: true, mode: "string" }),
    cancel_at_period_end: boolean("cancel_at_period_end").notNull().default(false),

    // ─── Metadata ───
    created_at: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [
    index("subscriptions_user_id_idx").on(table.user_id),
    index("subscriptions_email_idx").on(table.owner_email),
    index("subscriptions_entitlement_idx").on(table.entitlement_plan),
  ],
);

/**
 * Webhook events — idempotency and audit trail for Dodo Payments webhooks.
 */
export const webhook_events = pgTable(
  "webhook_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    provider: text("provider").notNull().default("dodo"),
    provider_event_id: text("provider_event_id").notNull().unique(),
    event_type: text("event_type").notNull(),
    payload: jsonb("payload").notNull().default({}),
    processed: boolean("processed").notNull().default(false),
    created_at: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [
    index("webhook_events_provider_event_id_idx").on(table.provider_event_id),
    index("webhook_events_event_type_idx").on(table.event_type),
  ],
);

export const usage_logs = pgTable(
  "usage_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    user_id: text("user_id").notNull(),
    feature: text("feature").notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    created_at: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [
    index("usage_logs_user_id_idx").on(table.user_id),
    index("usage_logs_feature_idx").on(table.feature),
    index("usage_logs_created_at_idx").on(table.created_at),
  ],
);

export const shared_chats = pgTable(
  "shared_chats",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    token: text("token").notNull().unique(),
    conversation_id: uuid("conversation_id").notNull(),
    analysis_id: uuid("analysis_id").references(() => analyses.id, { onDelete: "cascade" }),
    shared_by: text("shared_by").notNull(),
    repo_name: text("repo_name"),
    title: text("title"),
    created_at: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
    expires_at: timestamp("expires_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    index("shared_chats_token_idx").on(table.token),
    index("shared_chats_conversation_id_idx").on(table.conversation_id),
  ],
);
