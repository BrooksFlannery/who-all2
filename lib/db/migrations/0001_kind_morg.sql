CREATE TABLE "event_recommendation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"event_id" uuid NOT NULL,
	"recommended_at" timestamp with time zone DEFAULT now() NOT NULL,
	"context" text
);
--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "keywords" text[] DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "keyword_scores" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "interests_json" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "interest_scores" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "last_interest_update" timestamp with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "event_recommendation" ADD CONSTRAINT "event_recommendation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_recommendation" ADD CONSTRAINT "event_recommendation_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;