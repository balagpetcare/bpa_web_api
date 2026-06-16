-- Add is_featured and terms_and_conditions columns to campaigns table.
-- These were present in schema.prisma but never included in a migration,
-- causing Prisma Client queries that reference them to fail on the live DB.

ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "is_featured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "terms_and_conditions" TEXT;
