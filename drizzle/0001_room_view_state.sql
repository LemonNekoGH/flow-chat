ALTER TABLE "rooms" ADD COLUMN "focus_node_id" UUID;
--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "viewport_x" DOUBLE PRECISION;
--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "viewport_y" DOUBLE PRECISION;
--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "viewport_zoom" DOUBLE PRECISION;
