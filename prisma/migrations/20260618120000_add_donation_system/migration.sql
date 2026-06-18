-- Migration: add_donation_system
-- Creates all tables for the public donation module.
-- Safe to apply: uses IF NOT EXISTS / DO-EXCEPTION guards throughout.

-- ─── Enums ───────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "DonationCampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "DonorType" AS ENUM ('INDIVIDUAL', 'ORGANIZATION', 'ANONYMOUS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "DonationImpactStoryType" AS ENUM ('RESCUE', 'VACCINATION', 'FOOD', 'TREATMENT', 'ADOPTION', 'AWARENESS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── donation_purposes ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "donation_purposes" (
    "id"                   UUID          NOT NULL DEFAULT gen_random_uuid(),
    "title_en"             VARCHAR(120)  NOT NULL,
    "title_bn"             VARCHAR(120),
    "slug"                 VARCHAR(140)  NOT NULL,
    "short_description_en" TEXT,
    "short_description_bn" TEXT,
    "icon"                 VARCHAR(100),
    "image_url"            TEXT,
    "suggested_amounts"    JSONB,
    "impact_text_en"       TEXT,
    "impact_text_bn"       TEXT,
    "sort_order"           INTEGER       NOT NULL DEFAULT 0,
    "is_active"            BOOLEAN       NOT NULL DEFAULT true,
    "created_at"           TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"           TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "donation_purposes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "donation_purposes_slug_key"
    ON "donation_purposes"("slug");

CREATE INDEX IF NOT EXISTS "donation_purposes_is_active_sort_order_idx"
    ON "donation_purposes"("is_active", "sort_order");

-- ─── donation_campaigns ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "donation_campaigns" (
    "id"                  UUID                     NOT NULL DEFAULT gen_random_uuid(),
    "title_en"            VARCHAR(255)             NOT NULL,
    "title_bn"            VARCHAR(255),
    "slug"                VARCHAR(280)             NOT NULL,
    "description_en"      TEXT,
    "description_bn"      TEXT,
    "goal_amount"         DECIMAL(14,2)            NOT NULL DEFAULT 0,
    "raised_amount"       DECIMAL(14,2)            NOT NULL DEFAULT 0,
    "start_date"          TIMESTAMPTZ,
    "end_date"            TIMESTAMPTZ,
    "featured_image_url"  TEXT,
    "video_url"           TEXT,
    "status"              "DonationCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "show_on_donate_page" BOOLEAN                  NOT NULL DEFAULT true,
    "allow_custom_amount" BOOLEAN                  NOT NULL DEFAULT true,
    "default_amount"      DECIMAL(10,2),
    "suggested_amounts"   JSONB,
    "purpose_id"          UUID,
    "created_at"          TIMESTAMPTZ              NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"          TIMESTAMPTZ              NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "donation_campaigns_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "donation_campaigns_slug_key"
    ON "donation_campaigns"("slug");

CREATE INDEX IF NOT EXISTS "donation_campaigns_status_show_on_donate_page_idx"
    ON "donation_campaigns"("status", "show_on_donate_page");

DO $$ BEGIN
  ALTER TABLE "donation_campaigns"
    ADD CONSTRAINT "donation_campaigns_purpose_id_fkey"
    FOREIGN KEY ("purpose_id") REFERENCES "donation_purposes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── donation_qr_codes ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "donation_qr_codes" (
    "id"             UUID         NOT NULL DEFAULT gen_random_uuid(),
    "name"           VARCHAR(120) NOT NULL,
    "slug"           VARCHAR(140) NOT NULL,
    "purpose_id"     UUID,
    "campaign_id"    UUID,
    "source"         VARCHAR(100),
    "location"       VARCHAR(255),
    "target_url"     TEXT         NOT NULL,
    "qr_image_url"   TEXT,
    "scan_count"     INTEGER      NOT NULL DEFAULT 0,
    "donation_count" INTEGER      NOT NULL DEFAULT 0,
    "total_raised"   DECIMAL(14,2) NOT NULL DEFAULT 0,
    "is_active"      BOOLEAN      NOT NULL DEFAULT true,
    "created_at"     TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"     TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "donation_qr_codes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "donation_qr_codes_slug_key"
    ON "donation_qr_codes"("slug");

-- ─── donations ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "donations" (
    "id"                     UUID           NOT NULL DEFAULT gen_random_uuid(),
    "reference_no"           VARCHAR(30)    NOT NULL,
    "user_id"                UUID,
    "donor_name"             VARCHAR(120)   NOT NULL,
    "donor_email"            VARCHAR(255),
    "donor_phone"            VARCHAR(20),
    "donor_country"          VARCHAR(120),
    "donor_type"             "DonorType"    NOT NULL DEFAULT 'INDIVIDUAL',
    "organization_name"      VARCHAR(200),
    "amount"                 DECIMAL(10,2)  NOT NULL,
    "currency"               VARCHAR(3)     NOT NULL DEFAULT 'BDT',
    "purpose_id"             UUID,
    "campaign_id"            UUID,
    "source"                 VARCHAR(100),
    "qr_code_id"             UUID,
    "message"                TEXT,
    "is_anonymous"           BOOLEAN        NOT NULL DEFAULT false,
    "show_on_donor_wall"     BOOLEAN        NOT NULL DEFAULT true,
    "status"                 "PaymentStatus" NOT NULL DEFAULT 'pending',
    "payment_provider"       VARCHAR(30)    NOT NULL DEFAULT 'EPS',
    "payment_intent_id"      VARCHAR(100),
    "gateway_transaction_id" VARCHAR(100),
    "paid_at"                TIMESTAMPTZ,
    "payment_id"             UUID,
    "created_at"             TIMESTAMPTZ    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"             TIMESTAMPTZ    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "donations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "donations_reference_no_key"
    ON "donations"("reference_no");

CREATE UNIQUE INDEX IF NOT EXISTS "donations_payment_id_key"
    ON "donations"("payment_id");

CREATE INDEX IF NOT EXISTS "donations_status_created_at_idx"
    ON "donations"("status", "created_at");

CREATE INDEX IF NOT EXISTS "donations_reference_no_idx"
    ON "donations"("reference_no");

DO $$ BEGIN
  ALTER TABLE "donations"
    ADD CONSTRAINT "donations_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "donations"
    ADD CONSTRAINT "donations_purpose_id_fkey"
    FOREIGN KEY ("purpose_id") REFERENCES "donation_purposes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "donations"
    ADD CONSTRAINT "donations_campaign_id_fkey"
    FOREIGN KEY ("campaign_id") REFERENCES "donation_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "donations"
    ADD CONSTRAINT "donations_qr_code_id_fkey"
    FOREIGN KEY ("qr_code_id") REFERENCES "donation_qr_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "donations"
    ADD CONSTRAINT "donations_payment_id_fkey"
    FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "donation_qr_codes"
    ADD CONSTRAINT "donation_qr_codes_purpose_id_fkey"
    FOREIGN KEY ("purpose_id") REFERENCES "donation_purposes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "donation_qr_codes"
    ADD CONSTRAINT "donation_qr_codes_campaign_id_fkey"
    FOREIGN KEY ("campaign_id") REFERENCES "donation_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── donation_impact_stories ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "donation_impact_stories" (
    "id"                    UUID                      NOT NULL DEFAULT gen_random_uuid(),
    "title_en"              VARCHAR(255)              NOT NULL,
    "title_bn"              VARCHAR(255),
    "slug"                  VARCHAR(280)              NOT NULL,
    "story_type"            "DonationImpactStoryType" NOT NULL DEFAULT 'RESCUE',
    "location"              VARCHAR(255),
    "animal_type"           VARCHAR(100),
    "short_description_en"  TEXT,
    "short_description_bn"  TEXT,
    "full_story_en"         TEXT                      NOT NULL,
    "full_story_bn"         TEXT,
    "before_image_url"      TEXT,
    "after_image_url"       TEXT,
    "cost_used"             DECIMAL(12,2),
    "purpose_id"            UUID,
    "campaign_id"           UUID,
    "story_date"            TIMESTAMPTZ,
    "status"                VARCHAR(20)               NOT NULL DEFAULT 'DRAFT',
    "show_on_donation_page" BOOLEAN                   NOT NULL DEFAULT true,
    "sort_order"            INTEGER                   NOT NULL DEFAULT 0,
    "created_at"            TIMESTAMPTZ               NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"            TIMESTAMPTZ               NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "donation_impact_stories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "donation_impact_stories_slug_key"
    ON "donation_impact_stories"("slug");

CREATE INDEX IF NOT EXISTS "donation_impact_stories_status_show_on_donation_page_sort_o_idx"
    ON "donation_impact_stories"("status", "show_on_donation_page", "sort_order");

DO $$ BEGIN
  ALTER TABLE "donation_impact_stories"
    ADD CONSTRAINT "donation_impact_stories_purpose_id_fkey"
    FOREIGN KEY ("purpose_id") REFERENCES "donation_purposes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "donation_impact_stories"
    ADD CONSTRAINT "donation_impact_stories_campaign_id_fkey"
    FOREIGN KEY ("campaign_id") REFERENCES "donation_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── donation_transparency_reports ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "donation_transparency_reports" (
    "id"                           UUID          NOT NULL DEFAULT gen_random_uuid(),
    "report_month"                 VARCHAR(7)    NOT NULL,
    "title_en"                     VARCHAR(255)  NOT NULL,
    "title_bn"                     VARCHAR(255),
    "total_received"               DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_used"                   DECIMAL(14,2) NOT NULL DEFAULT 0,
    "opening_balance"              DECIMAL(14,2) NOT NULL DEFAULT 0,
    "closing_balance"              DECIMAL(14,2) NOT NULL DEFAULT 0,
    "vaccination_expense"          DECIMAL(12,2) NOT NULL DEFAULT 0,
    "food_expense"                 DECIMAL(12,2) NOT NULL DEFAULT 0,
    "treatment_expense"            DECIMAL(12,2) NOT NULL DEFAULT 0,
    "rescue_transport_expense"     DECIMAL(12,2) NOT NULL DEFAULT 0,
    "clinic_fund_allocation"       DECIMAL(14,2) NOT NULL DEFAULT 0,
    "admin_and_processing_expense" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "pdf_url"                      TEXT,
    "status"                       VARCHAR(20)   NOT NULL DEFAULT 'DRAFT',
    "created_at"                   TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"                   TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "donation_transparency_reports_pkey" PRIMARY KEY ("id")
);

-- ─── donation_page_settings ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "donation_page_settings" (
    "id"                    UUID          NOT NULL DEFAULT gen_random_uuid(),
    "hero_title_en"         VARCHAR(255)  NOT NULL DEFAULT 'Give Hope to Street Animals',
    "hero_title_bn"         VARCHAR(255),
    "hero_subtitle_en"      TEXT,
    "hero_subtitle_bn"      TEXT,
    "hero_image_url"        TEXT,
    "hero_video_url"        TEXT,
    "primary_cta_text_en"   VARCHAR(100),
    "primary_cta_text_bn"   VARCHAR(100),
    "secondary_cta_text_en" VARCHAR(100),
    "secondary_cta_text_bn" VARCHAR(100),
    "goal_amount"           DECIMAL(14,2),
    "show_impact_counters"  BOOLEAN       NOT NULL DEFAULT true,
    "show_purpose_cards"    BOOLEAN       NOT NULL DEFAULT true,
    "show_campaigns"        BOOLEAN       NOT NULL DEFAULT true,
    "show_impact_stories"   BOOLEAN       NOT NULL DEFAULT true,
    "show_donor_wall"       BOOLEAN       NOT NULL DEFAULT true,
    "show_transparency"     BOOLEAN       NOT NULL DEFAULT true,
    "show_qr_section"       BOOLEAN       NOT NULL DEFAULT true,
    "faq_json"              JSONB,
    "seo_title"             VARCHAR(255),
    "seo_description"       TEXT,
    "is_active"             BOOLEAN       NOT NULL DEFAULT true,
    "created_at"            TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"            TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "donation_page_settings_pkey" PRIMARY KEY ("id")
);
