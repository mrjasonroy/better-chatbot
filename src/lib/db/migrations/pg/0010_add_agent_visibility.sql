-- Add visibility column to agent table to support sharing
ALTER TABLE "agent" ADD COLUMN "visibility" varchar DEFAULT 'private';

-- Add constraint to ensure valid visibility values
ALTER TABLE "agent" ADD CONSTRAINT "agent_visibility_check" CHECK ("visibility" IN ('public', 'private', 'readonly'));

-- Create generic bookmark table for users to bookmark shared items (agents, workflows, etc)
CREATE TABLE IF NOT EXISTS "bookmark" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "item_id" uuid NOT NULL,
  "item_type" varchar NOT NULL CHECK ("item_type" IN ('agent', 'workflow')),
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE("user_id", "item_id", "item_type")
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS "bookmark_user_id_idx" ON "bookmark" ("user_id");
CREATE INDEX IF NOT EXISTS "bookmark_item_idx" ON "bookmark" ("item_id", "item_type");
CREATE INDEX IF NOT EXISTS "agent_visibility_idx" ON "agent" ("visibility");