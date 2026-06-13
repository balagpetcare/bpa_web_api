ALTER TABLE "pet_census_submissions"
  ADD COLUMN IF NOT EXISTS "pet_type" VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "pet_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "breed" VARCHAR(120),
  ADD COLUMN IF NOT EXISTS "notes" TEXT,
  ADD COLUMN IF NOT EXISTS "admin_note" TEXT,
  ADD COLUMN IF NOT EXISTS "source" VARCHAR(80) NOT NULL DEFAULT 'PET_CENSUS_2026',
  ADD COLUMN IF NOT EXISTS "user_agent" TEXT;

ALTER TABLE "pet_census_submissions"
  ALTER COLUMN "status" SET DEFAULT 'new'::"PetCensusStatus";

UPDATE "pet_census_submissions"
SET
  "pet_type" = CASE
    WHEN "pet_type" IS NOT NULL THEN "pet_type"
    WHEN "pet_count_dog" > 0 AND "pet_count_cat" = 0 AND "pet_count_other" = 0 THEN 'dog'
    WHEN "pet_count_cat" > 0 AND "pet_count_dog" = 0 AND "pet_count_other" = 0 THEN 'cat'
    WHEN "pet_count_other" > 0 AND "pet_count_dog" = 0 AND "pet_count_cat" = 0 THEN 'other'
    ELSE "pet_type"
  END,
  "pet_count" = CASE
    WHEN "pet_count" > 0 THEN "pet_count"
    ELSE COALESCE("pet_count_dog", 0) + COALESCE("pet_count_cat", 0) + COALESCE("pet_count_other", 0)
  END,
  "source" = COALESCE(NULLIF("source", ''), 'PET_CENSUS_2026');

CREATE INDEX IF NOT EXISTS "pet_census_submissions_pet_type_idx" ON "pet_census_submissions"("pet_type");
