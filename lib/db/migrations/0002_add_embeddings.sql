-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding columns
ALTER TABLE "user" ADD COLUMN "interest_embedding" text;
ALTER TABLE "event" ADD COLUMN "embedding" text;

-- Create HNSW index for event embeddings (will be created after data is loaded)
-- CREATE INDEX ON "event" USING hnsw (embedding::vector(1536) vector_cosine_ops); 