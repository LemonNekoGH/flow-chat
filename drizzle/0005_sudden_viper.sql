CREATE TABLE "tool_calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"tool_name" text NOT NULL,
	"parameters" jsonb,
	"result" jsonb,
	"position" double precision,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tool_calls_id_unique" UNIQUE("id")
);
--> statement-breakpoint
ALTER TABLE "tool_calls" ADD CONSTRAINT "tool_calls_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;