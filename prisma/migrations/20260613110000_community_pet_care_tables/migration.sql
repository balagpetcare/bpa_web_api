-- Community Pet Care Phase: New enums and tables
-- Covers: CommunityZone, ContributionPlan, CareContribution, CarePartnerCard,
--         CardVerificationLog, PetCensusSubmission, TransparencyReport,
--         PetSmartSyncSetting, PetSmartSyncLog

-- CreateEnum
CREATE TYPE "CommunityZoneStatus" AS ENUM ('active', 'inactive', 'coming_soon');

-- CreateEnum
CREATE TYPE "ContributionType" AS ENUM ('care_partner');

-- CreateEnum
CREATE TYPE "ContributionStatus" AS ENUM ('pending_payment', 'paid', 'refunded', 'cancelled');

-- CreateEnum
CREATE TYPE "CarePartnerCardStatus" AS ENUM ('pending', 'active', 'expired', 'revoked');

-- CreateEnum
CREATE TYPE "PetCensusStatus" AS ENUM ('submitted', 'verified', 'duplicate', 'archived');

-- CreateEnum
CREATE TYPE "TransparencyReportStatus" AS ENUM ('draft', 'published', 'archived');

-- CreateEnum
CREATE TYPE "PetSmartSyncStatus" AS ENUM ('pending', 'success', 'failed', 'skipped');

-- CreateTable
CREATE TABLE "community_zones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(140) NOT NULL,
    "description" TEXT,
    "city" VARCHAR(120) NOT NULL DEFAULT 'Dhaka',
    "district" VARCHAR(120) NOT NULL DEFAULT 'Dhaka District',
    "division" VARCHAR(120) NOT NULL DEFAULT 'Dhaka',
    "target_contributors" INTEGER NOT NULL DEFAULT 10000,
    "current_contributors" INTEGER NOT NULL DEFAULT 0,
    "target_amount_bdt" DECIMAL(14,2) NOT NULL DEFAULT 30000000,
    "current_amount_bdt" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "clinic_address" TEXT,
    "clinic_phone" VARCHAR(20),
    "map_embed_url" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "cover_image_id" UUID,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" "CommunityZoneStatus" NOT NULL DEFAULT 'active',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "community_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contribution_plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(140) NOT NULL,
    "contribution_type" "ContributionType" NOT NULL DEFAULT 'care_partner',
    "amount_bdt" DECIMAL(10,2) NOT NULL DEFAULT 3000,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'BDT',
    "description" TEXT,
    "benefits_summary_json" JSONB,
    "legal_disclaimer_text" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "contribution_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_contributions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contribution_number" VARCHAR(30) NOT NULL,
    "plan_id" UUID NOT NULL,
    "zone_id" UUID NOT NULL,
    "payment_id" UUID,
    "contributor_name" VARCHAR(120) NOT NULL,
    "contributor_mobile" VARCHAR(20) NOT NULL,
    "contributor_email" VARCHAR(255),
    "contributor_address" TEXT,
    "amount_bdt" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'BDT',
    "status" "ContributionStatus" NOT NULL DEFAULT 'pending_payment',
    "is_anonymous" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "care_contributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_partner_cards" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "card_number" VARCHAR(30) NOT NULL,
    "contribution_id" UUID NOT NULL,
    "zone_id" UUID NOT NULL,
    "qr_token" VARCHAR(64) NOT NULL,
    "status" "CarePartnerCardStatus" NOT NULL DEFAULT 'pending',
    "issued_at" TIMESTAMPTZ,
    "expires_at" DATE,
    "revoked_at" TIMESTAMPTZ,
    "revocation_reason" TEXT,
    "legal_disclaimer_snapshot" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "care_partner_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card_verification_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "card_id" UUID NOT NULL,
    "qr_token" VARCHAR(64) NOT NULL,
    "scan_result" VARCHAR(30) NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "card_verification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pet_census_submissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_name" VARCHAR(120) NOT NULL,
    "owner_mobile" VARCHAR(20) NOT NULL,
    "owner_email" VARCHAR(255),
    "owner_address" TEXT,
    "zone_id" UUID,
    "area_text" VARCHAR(255),
    "pet_count_dog" INTEGER NOT NULL DEFAULT 0,
    "pet_count_cat" INTEGER NOT NULL DEFAULT 0,
    "pet_count_other" INTEGER NOT NULL DEFAULT 0,
    "pets_json" JSONB,
    "is_vaccination_interested" BOOLEAN NOT NULL DEFAULT false,
    "is_clinic_interested" BOOLEAN NOT NULL DEFAULT false,
    "is_pet_shop_interested" BOOLEAN NOT NULL DEFAULT false,
    "is_care_partner_interested" BOOLEAN NOT NULL DEFAULT false,
    "has_consented" BOOLEAN NOT NULL DEFAULT false,
    "source_route" VARCHAR(80),
    "status" "PetCensusStatus" NOT NULL DEFAULT 'submitted',
    "ip_address" VARCHAR(45),
    "submitted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "pet_census_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transparency_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(280) NOT NULL,
    "report_type" VARCHAR(60) NOT NULL DEFAULT 'quarterly',
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "total_collected_bdt" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_spent_bdt" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "balance_bdt" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "breakdown_json" JSONB,
    "summary_md" TEXT,
    "attachment_url" TEXT,
    "cover_image_id" UUID,
    "status" "TransparencyReportStatus" NOT NULL DEFAULT 'draft',
    "published_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "transparency_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pet_smart_sync_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "setting_key" VARCHAR(80) NOT NULL,
    "setting_value" TEXT,
    "description" TEXT,
    "is_secret" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "last_sync_at" TIMESTAMPTZ,
    "status" VARCHAR(30) NOT NULL DEFAULT 'not_configured',
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "pet_smart_sync_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pet_smart_sync_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "setting_id" UUID,
    "entity_type" VARCHAR(60) NOT NULL,
    "entity_id" UUID NOT NULL,
    "sync_type" VARCHAR(60) NOT NULL,
    "status" "PetSmartSyncStatus" NOT NULL DEFAULT 'pending',
    "request_summary" TEXT,
    "response_summary" TEXT,
    "error_message" TEXT,
    "metadata" JSONB,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ,

    CONSTRAINT "pet_smart_sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "community_zones_slug_key" ON "community_zones"("slug");

-- CreateIndex
CREATE INDEX "community_zones_status_is_active_sort_order_idx" ON "community_zones"("status", "is_active", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "contribution_plans_slug_key" ON "contribution_plans"("slug");

-- CreateIndex
CREATE INDEX "contribution_plans_is_active_sort_order_idx" ON "contribution_plans"("is_active", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "care_contributions_contribution_number_key" ON "care_contributions"("contribution_number");

-- CreateIndex
CREATE UNIQUE INDEX "care_contributions_payment_id_key" ON "care_contributions"("payment_id");

-- CreateIndex
CREATE INDEX "care_contributions_zone_id_status_idx" ON "care_contributions"("zone_id", "status");

-- CreateIndex
CREATE INDEX "care_contributions_status_created_at_idx" ON "care_contributions"("status", "created_at");

-- CreateIndex
CREATE INDEX "care_contributions_contributor_mobile_idx" ON "care_contributions"("contributor_mobile");

-- CreateIndex
CREATE UNIQUE INDEX "care_partner_cards_card_number_key" ON "care_partner_cards"("card_number");

-- CreateIndex
CREATE UNIQUE INDEX "care_partner_cards_contribution_id_key" ON "care_partner_cards"("contribution_id");

-- CreateIndex
CREATE UNIQUE INDEX "care_partner_cards_qr_token_key" ON "care_partner_cards"("qr_token");

-- CreateIndex
CREATE INDEX "care_partner_cards_status_idx" ON "care_partner_cards"("status");

-- CreateIndex
CREATE INDEX "care_partner_cards_zone_id_status_idx" ON "care_partner_cards"("zone_id", "status");

-- CreateIndex
CREATE INDEX "card_verification_logs_card_id_idx" ON "card_verification_logs"("card_id");

-- CreateIndex
CREATE INDEX "card_verification_logs_created_at_idx" ON "card_verification_logs"("created_at");

-- CreateIndex
CREATE INDEX "pet_census_submissions_owner_mobile_idx" ON "pet_census_submissions"("owner_mobile");

-- CreateIndex
CREATE INDEX "pet_census_submissions_status_submitted_at_idx" ON "pet_census_submissions"("status", "submitted_at");

-- CreateIndex
CREATE INDEX "pet_census_submissions_zone_id_idx" ON "pet_census_submissions"("zone_id");

-- CreateIndex
CREATE UNIQUE INDEX "transparency_reports_slug_key" ON "transparency_reports"("slug");

-- CreateIndex
CREATE INDEX "transparency_reports_status_published_at_idx" ON "transparency_reports"("status", "published_at");

-- CreateIndex
CREATE UNIQUE INDEX "pet_smart_sync_settings_setting_key_key" ON "pet_smart_sync_settings"("setting_key");

-- CreateIndex
CREATE INDEX "pet_smart_sync_logs_entity_type_entity_id_idx" ON "pet_smart_sync_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "pet_smart_sync_logs_status_started_at_idx" ON "pet_smart_sync_logs"("status", "started_at");

-- AddForeignKey
ALTER TABLE "community_zones" ADD CONSTRAINT "community_zones_cover_image_id_fkey" FOREIGN KEY ("cover_image_id") REFERENCES "media_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_contributions" ADD CONSTRAINT "care_contributions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "contribution_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_contributions" ADD CONSTRAINT "care_contributions_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "community_zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_contributions" ADD CONSTRAINT "care_contributions_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_partner_cards" ADD CONSTRAINT "care_partner_cards_contribution_id_fkey" FOREIGN KEY ("contribution_id") REFERENCES "care_contributions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_partner_cards" ADD CONSTRAINT "care_partner_cards_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "community_zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_verification_logs" ADD CONSTRAINT "card_verification_logs_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "care_partner_cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_census_submissions" ADD CONSTRAINT "pet_census_submissions_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "community_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transparency_reports" ADD CONSTRAINT "transparency_reports_cover_image_id_fkey" FOREIGN KEY ("cover_image_id") REFERENCES "media_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_smart_sync_logs" ADD CONSTRAINT "pet_smart_sync_logs_setting_id_fkey" FOREIGN KEY ("setting_id") REFERENCES "pet_smart_sync_settings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
