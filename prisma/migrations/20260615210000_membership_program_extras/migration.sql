-- Add legal disclaimer and card validity label to community membership programs
ALTER TABLE "community_membership_programs"
  ADD COLUMN "legal_disclaimer" TEXT,
  ADD COLUMN "card_validity_label" VARCHAR(120);
