-- CreateTable
CREATE TABLE "site_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "site_name" VARCHAR(200) NOT NULL DEFAULT 'Bangladesh Pet Association',
    "site_tagline" VARCHAR(300),
    "organization_name" VARCHAR(200) NOT NULL DEFAULT 'Bangladesh Pet Association',
    "official_phone" VARCHAR(30),
    "support_phone" VARCHAR(30),
    "support_email" VARCHAR(200),
    "office_address" TEXT,
    "primary_logo_url" TEXT,
    "secondary_logo_url" TEXT,
    "favicon_url" TEXT,
    "default_meta_title" VARCHAR(200),
    "default_meta_description" TEXT,
    "facebook_url" TEXT,
    "youtube_url" TEXT,
    "linkedin_url" TEXT,
    "registration_error_title" VARCHAR(300) NOT NULL DEFAULT 'Online registration temporarily unavailable',
    "registration_error_message" TEXT NOT NULL DEFAULT 'Online registration/payment is temporarily unavailable. Please call BPA support for assistance.',
    "emergency_notice" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);

-- Seed default row
INSERT INTO "site_settings" ("id", "updated_at") VALUES ('default', NOW())
ON CONFLICT ("id") DO NOTHING;
