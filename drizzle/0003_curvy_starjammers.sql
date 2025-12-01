CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE TABLE "embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid,
	"content" text NOT NULL,
	"embedding" vector(1024) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "embeddings_id_unique" UNIQUE("id")
);
--> statement-breakpoint
ALTER TABLE "embeddings" ADD CONSTRAINT "embeddings_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "embeddings_message_id_index" ON "embeddings" USING hnsw ("embedding" vector_cosine_ops);
