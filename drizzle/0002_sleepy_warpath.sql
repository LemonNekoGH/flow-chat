ALTER TABLE "messages" ADD COLUMN "summary" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "show_summary" boolean DEFAULT false NOT NULL;