ALTER TABLE "event" ADD COLUMN "venue" jsonb;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "venue_type" text;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "venue_rating" integer;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "venue_price_level" integer;