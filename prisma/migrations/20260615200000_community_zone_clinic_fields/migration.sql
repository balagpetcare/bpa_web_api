-- CreateEnum
CREATE TYPE "ZoneClinicStatus" AS ENUM ('planned', 'priority', 'in_progress', 'active', 'paused');

-- AlterTable: add clinic phase fields to community_zones
ALTER TABLE "community_zones"
  ADD COLUMN "name_bn"              VARCHAR(120),
  ADD COLUMN "clinic_status"        "ZoneClinicStatus" NOT NULL DEFAULT 'planned',
  ADD COLUMN "priority_order"       INTEGER,
  ADD COLUMN "target_members"       INTEGER,
  ADD COLUMN "public_visible"       BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "expected_launch_note" TEXT;
