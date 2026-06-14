-- CreateTable
CREATE TABLE "pet_census_campaigns" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "status" "CampaignStatus" NOT NULL DEFAULT 'draft',
    "registration_start_at" TIMESTAMPTZ NOT NULL,
    "registration_end_at" TIMESTAMPTZ NOT NULL,
    "countdown_target_at" TIMESTAMPTZ,
    "target_submissions" INTEGER NOT NULL DEFAULT 10000,
    "current_submissions" INTEGER NOT NULL DEFAULT 0,
    "settings" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "pet_census_campaigns_pkey" PRIMARY KEY ("id")
);
