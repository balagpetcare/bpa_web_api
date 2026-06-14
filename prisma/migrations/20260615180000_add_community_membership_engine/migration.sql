-- CreateEnum
CREATE TYPE "MembershipTierSlug" AS ENUM ('primary', 'premium', 'enterprise');

-- CreateEnum
CREATE TYPE "PriceAfterOffer" AS ENUM ('USE_REGULAR_PRICE', 'HIDE_TIER', 'SHOW_EXPIRED_MESSAGE');

-- CreateEnum
CREATE TYPE "MembershipPurchaseStatus" AS ENUM ('pending_payment', 'paid', 'cancelled', 'refunded');

-- CreateEnum
CREATE TYPE "MembershipCardStatus" AS ENUM ('pending', 'active', 'expired', 'suspended');

-- CreateEnum
CREATE TYPE "MembershipUpgradeStatus" AS ENUM ('pending_payment', 'paid', 'completed', 'cancelled', 'failed');

-- CreateEnum
CREATE TYPE "MembershipDiscountType" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateEnum
CREATE TYPE "CommunityServiceCategory" AS ENUM ('VACCINATION', 'DEWORMING', 'HEALTH_CHECKUP', 'MICROCHIP', 'LAB_TEST', 'IMAGING', 'GROOMING', 'BOARDING', 'TRAINING', 'SURGERY', 'EMERGENCY', 'OTHER');

-- CreateTable
CREATE TABLE "community_membership_programs" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "name_en" VARCHAR(200) NOT NULL DEFAULT 'Community Care Partnership Program',
    "name_bn" VARCHAR(200) NOT NULL DEFAULT 'কমিউনিটি কেয়ার পার্টনারশিপ প্রোগ্রাম',
    "slug" VARCHAR(140) NOT NULL DEFAULT 'community-care-membership',
    "description_en" TEXT,
    "description_bn" TEXT,
    "offer_start_at" TIMESTAMPTZ,
    "offer_end_at" TIMESTAMPTZ,
    "price_after_offer" "PriceAfterOffer" NOT NULL DEFAULT 'USE_REGULAR_PRICE',
    "offer_banner_en" VARCHAR(300),
    "offer_banner_bn" VARCHAR(300),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "community_membership_programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_membership_tiers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name_en" VARCHAR(120) NOT NULL,
    "name_bn" VARCHAR(120) NOT NULL,
    "slug" "MembershipTierSlug" NOT NULL,
    "launch_price_bdt" DECIMAL(10,2) NOT NULL DEFAULT 3000,
    "regular_price_bdt" DECIMAL(10,2) NOT NULL DEFAULT 10000,
    "pet_limit_min" INTEGER NOT NULL DEFAULT 1,
    "pet_limit_max" INTEGER NOT NULL DEFAULT 3,
    "validity_months" INTEGER NOT NULL DEFAULT 12,
    "badge_text_en" VARCHAR(60),
    "badge_text_bn" VARCHAR(60),
    "short_desc_en" TEXT,
    "short_desc_bn" TEXT,
    "full_desc_en" TEXT,
    "full_desc_bn" TEXT,
    "card_theme" VARCHAR(60) DEFAULT 'primary',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "community_membership_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_membership_services" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name_en" VARCHAR(200) NOT NULL,
    "name_bn" VARCHAR(200) NOT NULL,
    "category" "CommunityServiceCategory" NOT NULL,
    "base_price_bdt" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "description_en" TEXT,
    "description_bn" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "community_membership_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_tier_service_discounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tier_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "discount_type" "MembershipDiscountType" NOT NULL,
    "discount_value" DECIMAL(5,2) NOT NULL,
    "min_discount" DECIMAL(10,2),
    "max_discount" DECIMAL(10,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "community_tier_service_discounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_membership_benefits" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title_en" VARCHAR(200) NOT NULL,
    "title_bn" VARCHAR(200) NOT NULL,
    "description_en" TEXT,
    "description_bn" TEXT,
    "icon" VARCHAR(100),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "community_membership_benefits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_tier_benefit_mappings" (
    "tier_id" UUID NOT NULL,
    "benefit_id" UUID NOT NULL,

    CONSTRAINT "community_tier_benefit_mappings_pkey" PRIMARY KEY ("tier_id","benefit_id")
);

-- CreateTable
CREATE TABLE "community_membership_purchases" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tier_id" UUID NOT NULL,
    "payment_id" UUID,
    "member_name" VARCHAR(120) NOT NULL,
    "member_mobile" VARCHAR(20) NOT NULL,
    "member_email" VARCHAR(255),
    "member_address" TEXT,
    "amount_bdt" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'BDT',
    "status" "MembershipPurchaseStatus" NOT NULL DEFAULT 'pending_payment',
    "pet_limit" INTEGER NOT NULL DEFAULT 3,
    "starts_at" DATE,
    "expires_at" DATE,
    "purchased_at" TIMESTAMPTZ,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "community_membership_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_membership_cards" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "purchase_id" UUID NOT NULL,
    "card_number" VARCHAR(30) NOT NULL,
    "qr_token" VARCHAR(64) NOT NULL,
    "status" "MembershipCardStatus" NOT NULL DEFAULT 'active',
    "issued_at" TIMESTAMPTZ,
    "expires_at" DATE,
    "suspended_at" TIMESTAMPTZ,
    "suspension_reason" TEXT,
    "pdf_document_key" VARCHAR(500),
    "download_token" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "community_membership_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_membership_card_verification_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "card_id" UUID NOT NULL,
    "qr_token" VARCHAR(64) NOT NULL,
    "scan_result" VARCHAR(30) NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_membership_card_verification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_membership_upgrades" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "purchase_id" UUID NOT NULL,
    "from_tier_id" UUID NOT NULL,
    "to_tier_id" UUID NOT NULL,
    "payment_id" UUID,
    "upgrade_amount_bdt" DECIMAL(10,2) NOT NULL,
    "original_paid_amount" DECIMAL(10,2) NOT NULL,
    "status" "MembershipUpgradeStatus" NOT NULL DEFAULT 'pending_payment',
    "completed_at" TIMESTAMPTZ,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "community_membership_upgrades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_membership_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "document_type" VARCHAR(60) NOT NULL,
    "title_en" VARCHAR(200) NOT NULL,
    "title_bn" VARCHAR(200) NOT NULL,
    "content_en" TEXT,
    "content_bn" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "community_membership_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "community_membership_programs_slug_key" ON "community_membership_programs"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "community_membership_tiers_slug_key" ON "community_membership_tiers"("slug");

-- CreateIndex
CREATE INDEX "community_membership_tiers_is_active_sort_order_idx" ON "community_membership_tiers"("is_active", "sort_order");

-- CreateIndex
CREATE INDEX "community_membership_services_is_active_sort_order_idx" ON "community_membership_services"("is_active", "sort_order");

-- CreateIndex
CREATE INDEX "community_membership_services_category_idx" ON "community_membership_services"("category");

-- CreateIndex
CREATE UNIQUE INDEX "community_tier_service_discounts_tier_id_service_id_key" ON "community_tier_service_discounts"("tier_id", "service_id");

-- CreateIndex
CREATE INDEX "community_membership_benefits_is_active_sort_order_idx" ON "community_membership_benefits"("is_active", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "community_membership_purchases_payment_id_key" ON "community_membership_purchases"("payment_id");

-- CreateIndex
CREATE INDEX "community_membership_purchases_tier_id_idx" ON "community_membership_purchases"("tier_id");

-- CreateIndex
CREATE INDEX "community_membership_purchases_member_mobile_idx" ON "community_membership_purchases"("member_mobile");

-- CreateIndex
CREATE INDEX "community_membership_purchases_status_idx" ON "community_membership_purchases"("status");

-- CreateIndex
CREATE INDEX "community_membership_purchases_created_at_idx" ON "community_membership_purchases"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "community_membership_cards_purchase_id_key" ON "community_membership_cards"("purchase_id");

-- CreateIndex
CREATE UNIQUE INDEX "community_membership_cards_card_number_key" ON "community_membership_cards"("card_number");

-- CreateIndex
CREATE UNIQUE INDEX "community_membership_cards_qr_token_key" ON "community_membership_cards"("qr_token");

-- CreateIndex
CREATE INDEX "community_membership_cards_status_idx" ON "community_membership_cards"("status");

-- CreateIndex
CREATE INDEX "community_membership_cards_qr_token_idx" ON "community_membership_cards"("qr_token");

-- CreateIndex
CREATE INDEX "community_membership_card_verification_logs_card_id_idx" ON "community_membership_card_verification_logs"("card_id");

-- CreateIndex
CREATE INDEX "community_membership_card_verification_logs_created_at_idx" ON "community_membership_card_verification_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "community_membership_upgrades_payment_id_key" ON "community_membership_upgrades"("payment_id");

-- CreateIndex
CREATE INDEX "community_membership_upgrades_purchase_id_idx" ON "community_membership_upgrades"("purchase_id");

-- CreateIndex
CREATE INDEX "community_membership_upgrades_status_idx" ON "community_membership_upgrades"("status");

-- CreateIndex
CREATE INDEX "community_membership_upgrades_created_at_idx" ON "community_membership_upgrades"("created_at");

-- CreateIndex
CREATE INDEX "community_membership_documents_document_type_is_active_idx" ON "community_membership_documents"("document_type", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "community_membership_documents_document_type_version_key" ON "community_membership_documents"("document_type", "version");

-- AddForeignKey
ALTER TABLE "community_tier_service_discounts" ADD CONSTRAINT "community_tier_service_discounts_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "community_membership_tiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_tier_service_discounts" ADD CONSTRAINT "community_tier_service_discounts_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "community_membership_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_tier_benefit_mappings" ADD CONSTRAINT "community_tier_benefit_mappings_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "community_membership_tiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_tier_benefit_mappings" ADD CONSTRAINT "community_tier_benefit_mappings_benefit_id_fkey" FOREIGN KEY ("benefit_id") REFERENCES "community_membership_benefits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_membership_purchases" ADD CONSTRAINT "community_membership_purchases_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "community_membership_tiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_membership_purchases" ADD CONSTRAINT "community_membership_purchases_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_membership_cards" ADD CONSTRAINT "community_membership_cards_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "community_membership_purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_membership_card_verification_logs" ADD CONSTRAINT "community_membership_card_verification_logs_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "community_membership_cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_membership_upgrades" ADD CONSTRAINT "community_membership_upgrades_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "community_membership_purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_membership_upgrades" ADD CONSTRAINT "community_membership_upgrades_from_tier_id_fkey" FOREIGN KEY ("from_tier_id") REFERENCES "community_membership_tiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_membership_upgrades" ADD CONSTRAINT "community_membership_upgrades_to_tier_id_fkey" FOREIGN KEY ("to_tier_id") REFERENCES "community_membership_tiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_membership_upgrades" ADD CONSTRAINT "community_membership_upgrades_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
