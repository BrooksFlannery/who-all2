-- Add keywords and scores to events table
ALTER TABLE "event" ADD COLUMN "keywords" text[] DEFAULT '{}';
ALTER TABLE "event" ADD COLUMN "keyword_scores" jsonb DEFAULT '{}';

-- Add interests and scores to user_profile table
ALTER TABLE "user_profile" ADD COLUMN "interests_json" jsonb DEFAULT '{}';
ALTER TABLE "user_profile" ADD COLUMN "interest_scores" jsonb DEFAULT '{}';
ALTER TABLE "user_profile" ADD COLUMN "last_interest_update" timestamp with time zone DEFAULT now();

-- Create event_recommendation table
CREATE TABLE "event_recommendation" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "event_id" uuid NOT NULL REFERENCES "event"("id") ON DELETE CASCADE,
    "recommended_at" timestamp with time zone DEFAULT now() NOT NULL,
    "context" text,
    CONSTRAINT "event_recommendation_user_event_unique" UNIQUE("user_id", "event_id")
);

-- Add indexes for performance
CREATE INDEX "idx_event_keywords" ON "event" USING GIN ("keywords");
CREATE INDEX "idx_user_profile_interests" ON "user_profile" USING GIN ("interests_json");
CREATE INDEX "idx_event_recommendation_user" ON "event_recommendation" ("user_id");
CREATE INDEX "idx_event_recommendation_event" ON "event_recommendation" ("event_id"); 