-- Migration: add_location_tree
-- Safe (IF NOT EXISTS guards on all DDL)

-- LocationType enum
DO $$ BEGIN
  CREATE TYPE "LocationType" AS ENUM (
    'DIVISION','DISTRICT','UPAZILA','THANA','UNION',
    'POURASHAVA','CITY_CORPORATION','CITY_ZONE','WARD','AREA'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Unified location tree table
CREATE TABLE IF NOT EXISTS "location_nodes" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
  "parent_id"   UUID,
  "type"        "LocationType" NOT NULL,
  "name_en"     VARCHAR(255) NOT NULL,
  "name_bn"     VARCHAR(255),
  "slug"        VARCHAR(255) NOT NULL,
  "code"        VARCHAR(50),
  "source"      VARCHAR(100),
  "source_id"   VARCHAR(100),
  "lat"         DECIMAL(10,7),
  "lon"         DECIMAL(10,7),
  "is_active"   BOOLEAN     NOT NULL DEFAULT true,
  "is_verified" BOOLEAN     NOT NULL DEFAULT true,
  "sort_order"  INTEGER     NOT NULL DEFAULT 0,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "location_nodes_pkey" PRIMARY KEY ("id")
);

-- Self-referential FK
DO $$ BEGIN
  ALTER TABLE "location_nodes"
    ADD CONSTRAINT "location_nodes_parent_id_fkey"
    FOREIGN KEY ("parent_id") REFERENCES "location_nodes"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS "location_nodes_type_idx"            ON "location_nodes" ("type");
CREATE INDEX IF NOT EXISTS "location_nodes_parent_id_idx"       ON "location_nodes" ("parent_id");
CREATE INDEX IF NOT EXISTS "location_nodes_source_source_id_idx" ON "location_nodes" ("source","source_id");

-- Nullable location FK columns on users
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "division_id"         UUID,
  ADD COLUMN IF NOT EXISTS "district_id"         UUID,
  ADD COLUMN IF NOT EXISTS "upazila_id"          UUID,
  ADD COLUMN IF NOT EXISTS "union_id"            UUID,
  ADD COLUMN IF NOT EXISTS "city_corporation_id" UUID,
  ADD COLUMN IF NOT EXISTS "city_zone_id"        UUID,
  ADD COLUMN IF NOT EXISTS "ward_id"             UUID,
  ADD COLUMN IF NOT EXISTS "address_line"        TEXT;

-- Nullable location FK columns on pet_owners
ALTER TABLE "pet_owners"
  ADD COLUMN IF NOT EXISTS "division_id"         UUID,
  ADD COLUMN IF NOT EXISTS "district_id"         UUID,
  ADD COLUMN IF NOT EXISTS "upazila_id"          UUID,
  ADD COLUMN IF NOT EXISTS "union_id"            UUID,
  ADD COLUMN IF NOT EXISTS "city_corporation_id" UUID,
  ADD COLUMN IF NOT EXISTS "city_zone_id"        UUID,
  ADD COLUMN IF NOT EXISTS "ward_id"             UUID,
  ADD COLUMN IF NOT EXISTS "address_line"        TEXT;

-- FK constraints for users (soft — SET NULL on delete so existing data never breaks)
DO $$ BEGIN
  ALTER TABLE "users" ADD CONSTRAINT "users_division_id_fkey"
    FOREIGN KEY ("division_id") REFERENCES "location_nodes"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "users" ADD CONSTRAINT "users_district_id_fkey"
    FOREIGN KEY ("district_id") REFERENCES "location_nodes"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "users" ADD CONSTRAINT "users_upazila_id_fkey"
    FOREIGN KEY ("upazila_id") REFERENCES "location_nodes"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "users" ADD CONSTRAINT "users_union_id_fkey"
    FOREIGN KEY ("union_id") REFERENCES "location_nodes"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "users" ADD CONSTRAINT "users_city_corporation_id_fkey"
    FOREIGN KEY ("city_corporation_id") REFERENCES "location_nodes"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "users" ADD CONSTRAINT "users_city_zone_id_fkey"
    FOREIGN KEY ("city_zone_id") REFERENCES "location_nodes"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "users" ADD CONSTRAINT "users_ward_id_fkey"
    FOREIGN KEY ("ward_id") REFERENCES "location_nodes"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- FK constraints for pet_owners
DO $$ BEGIN
  ALTER TABLE "pet_owners" ADD CONSTRAINT "pet_owners_division_id_fkey"
    FOREIGN KEY ("division_id") REFERENCES "location_nodes"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "pet_owners" ADD CONSTRAINT "pet_owners_district_id_fkey"
    FOREIGN KEY ("district_id") REFERENCES "location_nodes"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "pet_owners" ADD CONSTRAINT "pet_owners_upazila_id_fkey"
    FOREIGN KEY ("upazila_id") REFERENCES "location_nodes"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "pet_owners" ADD CONSTRAINT "pet_owners_union_id_fkey"
    FOREIGN KEY ("union_id") REFERENCES "location_nodes"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "pet_owners" ADD CONSTRAINT "pet_owners_city_corporation_id_fkey"
    FOREIGN KEY ("city_corporation_id") REFERENCES "location_nodes"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "pet_owners" ADD CONSTRAINT "pet_owners_city_zone_id_fkey"
    FOREIGN KEY ("city_zone_id") REFERENCES "location_nodes"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "pet_owners" ADD CONSTRAINT "pet_owners_ward_id_fkey"
    FOREIGN KEY ("ward_id") REFERENCES "location_nodes"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
