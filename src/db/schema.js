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
