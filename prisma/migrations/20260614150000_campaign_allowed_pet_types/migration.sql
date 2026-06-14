-- Add allowed_pet_types to campaigns table
-- Empty array means all pet types are allowed (no restriction)
ALTER TABLE "campaigns" ADD COLUMN "allowed_pet_types" TEXT[] NOT NULL DEFAULT '{}';
