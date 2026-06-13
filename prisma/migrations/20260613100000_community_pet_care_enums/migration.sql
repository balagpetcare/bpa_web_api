-- Community Pet Care Phase: Extend existing HomepageSectionType enum
-- IMPORTANT: ALTER TYPE ... ADD VALUE cannot run inside a transaction on PostgreSQL < 12.
-- Prisma 5.x runs this migration outside a transaction block automatically.
-- The IF NOT EXISTS guard (PostgreSQL 9.3+) makes this idempotent.

-- AlterEnum: HomepageSectionType — add new CMS section types
ALTER TYPE "HomepageSectionType" ADD VALUE IF NOT EXISTS 'community_pet_care';
ALTER TYPE "HomepageSectionType" ADD VALUE IF NOT EXISTS 'zone_progress';
ALTER TYPE "HomepageSectionType" ADD VALUE IF NOT EXISTS 'pet_census';
ALTER TYPE "HomepageSectionType" ADD VALUE IF NOT EXISTS 'transparency';
ALTER TYPE "HomepageSectionType" ADD VALUE IF NOT EXISTS 'pet_smart_solution';
