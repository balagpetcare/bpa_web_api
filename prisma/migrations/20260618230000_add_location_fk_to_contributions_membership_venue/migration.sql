-- Migration: add_location_fk_to_contributions_membership_venue
-- Phase 2 location integration: adds nullable location_nodes FK columns to
-- care_contributions, community_membership_purchases, and venues.
-- All existing text address fields are kept for backward compatibility.

-- ── care_contributions ──────────────────────────────────────────────────────────

ALTER TABLE "care_contributions"
  ADD COLUMN IF NOT EXISTS "division_id"         UUID,
  ADD COLUMN IF NOT EXISTS "district_id"         UUID,
  ADD COLUMN IF NOT EXISTS "upazila_id"          UUID,
  ADD COLUMN IF NOT EXISTS "union_id"            UUID,
  ADD COLUMN IF NOT EXISTS "city_corporation_id" UUID,
  ADD COLUMN IF NOT EXISTS "city_zone_id"        UUID,
  ADD COLUMN IF NOT EXISTS "ward_id"             UUID;

DO $$ BEGIN
  ALTER TABLE "care_contributions" ADD CONSTRAINT "care_contributions_division_id_fkey"
    FOREIGN KEY ("division_id") REFERENCES "location_nodes"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "care_contributions" ADD CONSTRAINT "care_contributions_district_id_fkey"
    FOREIGN KEY ("district_id") REFERENCES "location_nodes"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "care_contributions" ADD CONSTRAINT "care_contributions_upazila_id_fkey"
    FOREIGN KEY ("upazila_id") REFERENCES "location_nodes"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "care_contributions" ADD CONSTRAINT "care_contributions_union_id_fkey"
    FOREIGN KEY ("union_id") REFERENCES "location_nodes"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "care_contributions" ADD CONSTRAINT "care_contributions_city_corporation_id_fkey"
    FOREIGN KEY ("city_corporation_id") REFERENCES "location_nodes"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "care_contributions" ADD CONSTRAINT "care_contributions_city_zone_id_fkey"
    FOREIGN KEY ("city_zone_id") REFERENCES "location_nodes"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "care_contributions" ADD CONSTRAINT "care_contributions_ward_id_fkey"
    FOREIGN KEY ("ward_id") REFERENCES "location_nodes"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "care_contributions_district_id_idx" ON "care_contributions" ("district_id");

-- ── community_membership_purchases ─────────────────────────────────────────────

ALTER TABLE "community_membership_purchases"
  ADD COLUMN IF NOT EXISTS "division_id"         UUID,
  ADD COLUMN IF NOT EXISTS "district_id"         UUID,
  ADD COLUMN IF NOT EXISTS "upazila_id"          UUID,
  ADD COLUMN IF NOT EXISTS "union_id"            UUID,
  ADD COLUMN IF NOT EXISTS "city_corporation_id" UUID,
  ADD COLUMN IF NOT EXISTS "city_zone_id"        UUID,
  ADD COLUMN IF NOT EXISTS "ward_id"             UUID;

DO $$ BEGIN
  ALTER TABLE "community_membership_purchases" ADD CONSTRAINT "community_membership_purchases_division_id_fkey"
    FOREIGN KEY ("division_id") REFERENCES "location_nodes"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "community_membership_purchases" ADD CONSTRAINT "community_membership_purchases_district_id_fkey"
    FOREIGN KEY ("district_id") REFERENCES "location_nodes"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "community_membership_purchases" ADD CONSTRAINT "community_membership_purchases_upazila_id_fkey"
    FOREIGN KEY ("upazila_id") REFERENCES "location_nodes"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "community_membership_purchases" ADD CONSTRAINT "community_membership_purchases_union_id_fkey"
    FOREIGN KEY ("union_id") REFERENCES "location_nodes"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "community_membership_purchases" ADD CONSTRAINT "community_membership_purchases_city_corporation_id_fkey"
    FOREIGN KEY ("city_corporation_id") REFERENCES "location_nodes"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "community_membership_purchases" ADD CONSTRAINT "community_membership_purchases_city_zone_id_fkey"
    FOREIGN KEY ("city_zone_id") REFERENCES "location_nodes"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "community_membership_purchases" ADD CONSTRAINT "community_membership_purchases_ward_id_fkey"
    FOREIGN KEY ("ward_id") REFERENCES "location_nodes"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "community_membership_purchases_district_id_idx" ON "community_membership_purchases" ("district_id");

-- ── venues ──────────────────────────────────────────────────────────────────────

ALTER TABLE "venues"
  ADD COLUMN IF NOT EXISTS "division_id" UUID,
  ADD COLUMN IF NOT EXISTS "district_id" UUID,
  ADD COLUMN IF NOT EXISTS "upazila_id"  UUID;

DO $$ BEGIN
  ALTER TABLE "venues" ADD CONSTRAINT "venues_division_id_fkey"
    FOREIGN KEY ("division_id") REFERENCES "location_nodes"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "venues" ADD CONSTRAINT "venues_district_id_fkey"
    FOREIGN KEY ("district_id") REFERENCES "location_nodes"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "venues" ADD CONSTRAINT "venues_upazila_id_fkey"
    FOREIGN KEY ("upazila_id") REFERENCES "location_nodes"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
