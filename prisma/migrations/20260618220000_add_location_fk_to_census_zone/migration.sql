-- Migration: add_location_fk_to_census_zone
-- Adds nullable location_nodes FK columns to community_zones and pet_census_submissions.
-- All existing text fields (division, district, city_upazila, etc.) are KEPT for backward compat.

-- community_zones: add divisionId, districtId, upazilaId
ALTER TABLE "community_zones"
  ADD COLUMN IF NOT EXISTS "division_id" UUID,
  ADD COLUMN IF NOT EXISTS "district_id" UUID,
  ADD COLUMN IF NOT EXISTS "upazila_id"  UUID;

DO $$ BEGIN
  ALTER TABLE "community_zones"
    ADD CONSTRAINT "community_zones_division_id_fkey"
    FOREIGN KEY ("division_id") REFERENCES "location_nodes"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "community_zones"
    ADD CONSTRAINT "community_zones_district_id_fkey"
    FOREIGN KEY ("district_id") REFERENCES "location_nodes"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "community_zones"
    ADD CONSTRAINT "community_zones_upazila_id_fkey"
    FOREIGN KEY ("upazila_id") REFERENCES "location_nodes"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- pet_census_submissions: add full location FK set
ALTER TABLE "pet_census_submissions"
  ADD COLUMN IF NOT EXISTS "division_id"         UUID,
  ADD COLUMN IF NOT EXISTS "district_id"         UUID,
  ADD COLUMN IF NOT EXISTS "upazila_id"          UUID,
  ADD COLUMN IF NOT EXISTS "union_id"            UUID,
  ADD COLUMN IF NOT EXISTS "city_corporation_id" UUID,
  ADD COLUMN IF NOT EXISTS "city_zone_id"        UUID,
  ADD COLUMN IF NOT EXISTS "ward_id"             UUID;

DO $$ BEGIN
  ALTER TABLE "pet_census_submissions"
    ADD CONSTRAINT "pet_census_submissions_division_id_fkey"
    FOREIGN KEY ("division_id") REFERENCES "location_nodes"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "pet_census_submissions"
    ADD CONSTRAINT "pet_census_submissions_district_id_fkey"
    FOREIGN KEY ("district_id") REFERENCES "location_nodes"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "pet_census_submissions"
    ADD CONSTRAINT "pet_census_submissions_upazila_id_fkey"
    FOREIGN KEY ("upazila_id") REFERENCES "location_nodes"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "pet_census_submissions"
    ADD CONSTRAINT "pet_census_submissions_union_id_fkey"
    FOREIGN KEY ("union_id") REFERENCES "location_nodes"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "pet_census_submissions"
    ADD CONSTRAINT "pet_census_submissions_city_corporation_id_fkey"
    FOREIGN KEY ("city_corporation_id") REFERENCES "location_nodes"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "pet_census_submissions"
    ADD CONSTRAINT "pet_census_submissions_city_zone_id_fkey"
    FOREIGN KEY ("city_zone_id") REFERENCES "location_nodes"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "pet_census_submissions"
    ADD CONSTRAINT "pet_census_submissions_ward_id_fkey"
    FOREIGN KEY ("ward_id") REFERENCES "location_nodes"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Indexes for FK columns (speeds up joins and filters)
CREATE INDEX IF NOT EXISTS "community_zones_district_id_idx" ON "community_zones" ("district_id");
CREATE INDEX IF NOT EXISTS "pet_census_district_id_idx"      ON "pet_census_submissions" ("district_id");
CREATE INDEX IF NOT EXISTS "pet_census_division_id_idx"      ON "pet_census_submissions" ("division_id");
