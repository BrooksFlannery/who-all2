-- Migration: Add user_interests table and remove old interest fields
-- This migration creates the new structured interest system

-- Create new user_interests table
CREATE TABLE "user_interests" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "keyword" text NOT NULL,
    "confidence" decimal(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    "specificity" decimal(3,2) NOT NULL CHECK (specificity >= 0 AND specificity <= 1),
    "last_updated" timestamp with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "user_interests_user_keyword_unique" UNIQUE("user_id", "keyword")
);

-- Create indexes for performance
CREATE INDEX "idx_user_interests_user_id" ON "user_interests" ("user_id");
CREATE INDEX "idx_user_interests_keyword" ON "user_interests" ("keyword");
CREATE INDEX "idx_user_interests_confidence" ON "user_interests" ("confidence");
CREATE INDEX "idx_user_interests_specificity" ON "user_interests" ("specificity");

-- Remove old interest fields from user_profile
ALTER TABLE "user_profile" DROP COLUMN IF EXISTS "interests_json";
ALTER TABLE "user_profile" DROP COLUMN IF EXISTS "interest_scores"; 