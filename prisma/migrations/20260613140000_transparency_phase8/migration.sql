ALTER TABLE "transparency_reports"
  ADD COLUMN IF NOT EXISTS "body_md" TEXT;
