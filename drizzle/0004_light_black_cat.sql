ALTER TABLE "templates" ADD COLUMN "developer_system_prompt" text;--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN "use_memory" boolean DEFAULT false NOT NULL;