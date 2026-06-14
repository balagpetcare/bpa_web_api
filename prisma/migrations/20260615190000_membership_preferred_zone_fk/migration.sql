-- AlterTable: add preferred_zone_id FK to community_membership_purchases
ALTER TABLE "community_membership_purchases"
  ADD COLUMN "preferred_zone_id" UUID REFERENCES "community_zones"("id") ON DELETE SET NULL;

-- CreateIndex
CREATE INDEX "community_membership_purchases_preferred_zone_id_idx" ON "community_membership_purchases"("preferred_zone_id");
