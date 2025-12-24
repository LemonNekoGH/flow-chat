ALTER TABLE "messages" ADD COLUMN "memory" text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "templates" DROP COLUMN "developer_system_prompt";--> statement-breakpoint
ALTER TABLE "templates" DROP COLUMN "use_memory";