CREATE TYPE "public"."part_type" AS ENUM('input_audio', 'file', 'image_url', 'text');--> statement-breakpoint
CREATE TABLE "message_parts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"part_type" "part_type" DEFAULT 'text' NOT NULL,
	"message_id" uuid NOT NULL,
	"content" jsonb NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "message_parts_id_unique" UNIQUE("id")
);
--> statement-breakpoint
ALTER TABLE "message_parts" ADD CONSTRAINT "message_parts_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- migrate existing message content to message_parts
INSERT INTO "message_parts" ("part_type", "message_id", "content", "order", "created_at", "updated_at")
SELECT
  'text'::part_type,
  "id",
  jsonb_build_object('type', 'text', 'text', "content"),
  0,
  "created_at",
  "updated_at"
FROM "messages"
WHERE "content" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN "content";
