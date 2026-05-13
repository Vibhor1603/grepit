CREATE EXTENSION IF NOT EXISTS pgcrypto;
--> statement-breakpoint
CREATE TABLE "analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_email" text,
	"repo_url" text NOT NULL,
	"repo_name" text NOT NULL,
	"source" text DEFAULT 'github' NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"summary" text,
	"total_files" integer DEFAULT 0 NOT NULL,
	"total_lines" integer DEFAULT 0 NOT NULL,
	"is_private" boolean DEFAULT false NOT NULL,
	"error_message" text,
	"languages" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"file_tree" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"architecture" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"results" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "query_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" uuid,
	"owner_email" text,
	"query" text NOT NULL,
	"response" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "query_history" ADD CONSTRAINT "query_history_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analyses_owner_email_idx" ON "analyses" USING btree ("owner_email");--> statement-breakpoint
CREATE INDEX "analyses_created_at_idx" ON "analyses" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "query_history_analysis_id_idx" ON "query_history" USING btree ("analysis_id");--> statement-breakpoint
CREATE INDEX "query_history_owner_email_idx" ON "query_history" USING btree ("owner_email");
