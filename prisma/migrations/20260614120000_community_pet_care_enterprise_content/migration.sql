-- Community Pet Care — Enterprise Content Migration
-- Adds 4 enums and 4 tables: care_partner_benefits, social_impact_programs,
-- roadmap_items, diagnostic_center_services

-- ─── Enums ──────────────────────────────────────────────────────

CREATE TYPE "CarePartnerBenefitCategory" AS ENUM (
  'SERVICE',
  'DISCOUNT',
  'MEMBERSHIP',
  'WELFARE',
  'DIAGNOSTIC',
  'DIGITAL',
  'FUTURE'
);

CREATE TYPE "SocialImpactProgramType" AS ENUM (
  'STRAY_TREATMENT',
  'FEEDING',
  'VACCINATION',
  'RESCUE',
  'SHELTER',
  'LOW_INCOME_SUPPORT',
  'EDUCATION'
);

CREATE TYPE "RoadmapItemStatus" AS ENUM (
  'PLANNED',
  'IN_PROGRESS',
  'LIVE'
);

CREATE TYPE "DiagnosticServiceCategory" AS ENUM (
  'LAB',
  'IMAGING',
  'SPECIALIST',
  'EMERGENCY',
  'FUTURE_TECH'
);

-- ─── care_partner_benefits ───────────────────────────────────────

CREATE TABLE "care_partner_benefits" (
  "id"             UUID        NOT NULL DEFAULT gen_random_uuid(),
  "title_en"       VARCHAR(200) NOT NULL,
  "title_bn"       VARCHAR(200) NOT NULL,
  "description_en" TEXT,
  "description_bn" TEXT,
  "icon"           VARCHAR(100),
  "category"       "CarePartnerBenefitCategory" NOT NULL,
  "sort_order"     INTEGER     NOT NULL DEFAULT 0,
  "is_active"      BOOLEAN     NOT NULL DEFAULT true,
  "created_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"     TIMESTAMPTZ NOT NULL,

  CONSTRAINT "care_partner_benefits_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "care_partner_benefits_is_active_sort_order_idx"
  ON "care_partner_benefits"("is_active", "sort_order");
CREATE INDEX "care_partner_benefits_category_is_active_idx"
  ON "care_partner_benefits"("category", "is_active");

-- ─── social_impact_programs ──────────────────────────────────────

CREATE TABLE "social_impact_programs" (
  "id"             UUID        NOT NULL DEFAULT gen_random_uuid(),
  "title_en"       VARCHAR(200) NOT NULL,
  "title_bn"       VARCHAR(200) NOT NULL,
  "description_en" TEXT,
  "description_bn" TEXT,
  "impact_type"    "SocialImpactProgramType" NOT NULL,
  "icon"           VARCHAR(100),
  "sort_order"     INTEGER     NOT NULL DEFAULT 0,
  "is_active"      BOOLEAN     NOT NULL DEFAULT true,
  "created_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"     TIMESTAMPTZ NOT NULL,

  CONSTRAINT "social_impact_programs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "social_impact_programs_is_active_sort_order_idx"
  ON "social_impact_programs"("is_active", "sort_order");
CREATE INDEX "social_impact_programs_impact_type_is_active_idx"
  ON "social_impact_programs"("impact_type", "is_active");

-- ─── roadmap_items ───────────────────────────────────────────────

CREATE TABLE "roadmap_items" (
  "id"             UUID        NOT NULL DEFAULT gen_random_uuid(),
  "phase"          VARCHAR(80) NOT NULL,
  "year"           INTEGER     NOT NULL,
  "title_en"       VARCHAR(200) NOT NULL,
  "title_bn"       VARCHAR(200) NOT NULL,
  "description_en" TEXT,
  "description_bn" TEXT,
  "status"         "RoadmapItemStatus" NOT NULL DEFAULT 'PLANNED',
  "sort_order"     INTEGER     NOT NULL DEFAULT 0,
  "is_active"      BOOLEAN     NOT NULL DEFAULT true,
  "created_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"     TIMESTAMPTZ NOT NULL,

  CONSTRAINT "roadmap_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "roadmap_items_is_active_sort_order_idx"
  ON "roadmap_items"("is_active", "sort_order");
CREATE INDEX "roadmap_items_year_status_idx"
  ON "roadmap_items"("year", "status");

-- ─── diagnostic_center_services ─────────────────────────────────

CREATE TABLE "diagnostic_center_services" (
  "id"             UUID        NOT NULL DEFAULT gen_random_uuid(),
  "title_en"       VARCHAR(200) NOT NULL,
  "title_bn"       VARCHAR(200) NOT NULL,
  "description_en" TEXT,
  "description_bn" TEXT,
  "category"       "DiagnosticServiceCategory" NOT NULL,
  "icon"           VARCHAR(100),
  "sort_order"     INTEGER     NOT NULL DEFAULT 0,
  "is_active"      BOOLEAN     NOT NULL DEFAULT true,
  "created_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"     TIMESTAMPTZ NOT NULL,

  CONSTRAINT "diagnostic_center_services_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "diagnostic_center_services_is_active_sort_order_idx"
  ON "diagnostic_center_services"("is_active", "sort_order");
CREATE INDEX "diagnostic_center_services_category_is_active_idx"
  ON "diagnostic_center_services"("category", "is_active");
