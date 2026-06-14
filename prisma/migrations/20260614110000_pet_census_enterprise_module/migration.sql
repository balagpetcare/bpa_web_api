ALTER TABLE "pet_census_submissions"
  ADD COLUMN IF NOT EXISTS "user_id" UUID,
  ADD COLUMN IF NOT EXISTS "division" VARCHAR(120),
  ADD COLUMN IF NOT EXISTS "district" VARCHAR(120),
  ADD COLUMN IF NOT EXISTS "city_upazila" VARCHAR(120),
  ADD COLUMN IF NOT EXISTS "is_bpa_member" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "pet_name" VARCHAR(120),
  ADD COLUMN IF NOT EXISTS "pet_gender" "PetGender",
  ADD COLUMN IF NOT EXISTS "approx_age" VARCHAR(80),
  ADD COLUMN IF NOT EXISTS "household_pet_count" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "vaccination_status" VARCHAR(40),
  ADD COLUMN IF NOT EXISTS "neutered_status" VARCHAR(40),
  ADD COLUMN IF NOT EXISTS "health_issue" TEXT,
  ADD COLUMN IF NOT EXISTS "photo_media_id" UUID,
  ADD COLUMN IF NOT EXISTS "photo_url" TEXT;

ALTER TABLE "media_files"
  ALTER COLUMN "uploaded_by" DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'pet_census_submissions_user_id_fkey'
      AND table_name = 'pet_census_submissions'
  ) THEN
    ALTER TABLE "pet_census_submissions"
      ADD CONSTRAINT "pet_census_submissions_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'pet_census_submissions_photo_media_id_fkey'
      AND table_name = 'pet_census_submissions'
  ) THEN
    ALTER TABLE "pet_census_submissions"
      ADD CONSTRAINT "pet_census_submissions_photo_media_id_fkey"
      FOREIGN KEY ("photo_media_id") REFERENCES "media_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "pet_census_submissions_user_id_idx" ON "pet_census_submissions"("user_id");
CREATE INDEX IF NOT EXISTS "pet_census_submissions_division_idx" ON "pet_census_submissions"("division");
CREATE INDEX IF NOT EXISTS "pet_census_submissions_district_idx" ON "pet_census_submissions"("district");
CREATE INDEX IF NOT EXISTS "pet_census_submissions_is_bpa_member_idx" ON "pet_census_submissions"("is_bpa_member");
CREATE INDEX IF NOT EXISTS "pet_census_submissions_vaccination_status_idx" ON "pet_census_submissions"("vaccination_status");
CREATE INDEX IF NOT EXISTS "pet_census_submissions_pet_name_idx" ON "pet_census_submissions"("pet_name");
CREATE INDEX IF NOT EXISTS "pet_census_submissions_photo_media_id_idx" ON "pet_census_submissions"("photo_media_id");
