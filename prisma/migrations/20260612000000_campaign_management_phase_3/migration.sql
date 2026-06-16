-- Phase 3: Campaign media gallery, QR check-in, vaccination records, certificates
--
-- This file was corrupted in a prior session (contained PowerShell error output
-- instead of SQL). It was never applied to the database — the deploy failed at
-- position 1. All statements below are safe CREATE / ALTER / ADD COLUMN only.

-- ─── New Enum ──────────────────────────────────────────────────────────────────

CREATE TYPE IF NOT EXISTS "CampaignMediaRole" AS ENUM ('hero', 'thumbnail', 'mobile_banner', 'gallery');

-- ─── campaign_media ────────────────────────────────────────────────────────────
-- Gallery / hero / thumbnail media assets linked to a campaign.

CREATE TABLE IF NOT EXISTS "campaign_media" (
    "id"            UUID               NOT NULL DEFAULT gen_random_uuid(),
    "campaign_id"   UUID               NOT NULL,
    "media_file_id" UUID               NOT NULL,
    "role"          "CampaignMediaRole" NOT NULL,
    "sort_order"    INTEGER            NOT NULL DEFAULT 0,
    "alt_text"      VARCHAR(255),
    "created_at"    TIMESTAMPTZ        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_media_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "campaign_media_campaign_id_role_idx"
    ON "campaign_media"("campaign_id", "role");

ALTER TABLE "campaign_media"
    ADD CONSTRAINT "campaign_media_campaign_id_fkey"
        FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "campaign_media"
    ADD CONSTRAINT "campaign_media_media_file_id_fkey"
        FOREIGN KEY ("media_file_id") REFERENCES "media_files"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── campaigns: add faq column ─────────────────────────────────────────────────

ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "faq" JSONB;

-- ─── pet_bookings: add qr_token column ────────────────────────────────────────
-- qr_token is nullable — assigned when a booking is confirmed and ready to scan.

ALTER TABLE "pet_bookings" ADD COLUMN IF NOT EXISTS "qr_token" VARCHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS "pet_bookings_qr_token_key"
    ON "pet_bookings"("qr_token");

-- ─── campaign_registrations: missing composite index ──────────────────────────

CREATE INDEX IF NOT EXISTS "campaign_registrations_status_created_at_idx"
    ON "campaign_registrations"("status", "created_at");

-- ─── qr_scan_logs ─────────────────────────────────────────────────────────────
-- Audit trail of every QR-code scan attempt at a campaign session.

CREATE TABLE IF NOT EXISTS "qr_scan_logs" (
    "id"             UUID        NOT NULL DEFAULT gen_random_uuid(),
    "qr_token"       VARCHAR(64) NOT NULL,
    "pet_booking_id" UUID,
    "scanned_by_id"  UUID        NOT NULL,
    "scan_result"    VARCHAR(30) NOT NULL,
    "ip_address"     VARCHAR(45),
    "created_at"     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qr_scan_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "qr_scan_logs_pet_booking_id_idx"  ON "qr_scan_logs"("pet_booking_id");
CREATE INDEX IF NOT EXISTS "qr_scan_logs_scanned_by_id_idx"   ON "qr_scan_logs"("scanned_by_id");
CREATE INDEX IF NOT EXISTS "qr_scan_logs_created_at_idx"      ON "qr_scan_logs"("created_at");

ALTER TABLE "qr_scan_logs"
    ADD CONSTRAINT "qr_scan_logs_pet_booking_id_fkey"
        FOREIGN KEY ("pet_booking_id") REFERENCES "pet_bookings"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "qr_scan_logs"
    ADD CONSTRAINT "qr_scan_logs_scanned_by_id_fkey"
        FOREIGN KEY ("scanned_by_id") REFERENCES "users"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── certificates ─────────────────────────────────────────────────────────────
-- Vaccination / service certificates issued after a successful pet booking.

CREATE TABLE IF NOT EXISTS "certificates" (
    "id"                 UUID        NOT NULL DEFAULT gen_random_uuid(),
    "certificate_number" VARCHAR(30) NOT NULL,
    "pet_booking_id"     UUID        NOT NULL,
    "verify_token"       UUID        NOT NULL,
    "issued_by_id"       UUID        NOT NULL,
    "issued_at"          TIMESTAMPTZ NOT NULL,
    "superseded_at"      TIMESTAMPTZ,
    "created_at"         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "certificates_certificate_number_key"
    ON "certificates"("certificate_number");
CREATE UNIQUE INDEX IF NOT EXISTS "certificates_verify_token_key"
    ON "certificates"("verify_token");
CREATE INDEX IF NOT EXISTS "certificates_pet_booking_id_idx"
    ON "certificates"("pet_booking_id");
CREATE INDEX IF NOT EXISTS "certificates_certificate_number_idx"
    ON "certificates"("certificate_number");

ALTER TABLE "certificates"
    ADD CONSTRAINT "certificates_pet_booking_id_fkey"
        FOREIGN KEY ("pet_booking_id") REFERENCES "pet_bookings"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "certificates"
    ADD CONSTRAINT "certificates_issued_by_id_fkey"
        FOREIGN KEY ("issued_by_id") REFERENCES "users"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── vaccination_records ──────────────────────────────────────────────────────
-- Permanent health history: one row per vaccine/service administered to a pet.

CREATE TABLE IF NOT EXISTS "vaccination_records" (
    "id"                     UUID         NOT NULL DEFAULT gen_random_uuid(),
    "pet_id"                 UUID         NOT NULL,
    "pet_booking_id"         UUID,
    "pet_booking_service_id" UUID,
    "campaign_service_id"    UUID,
    "campaign_id"            UUID,
    "vaccine_name"           VARCHAR(120) NOT NULL,
    "batch_number"           VARCHAR(120),
    "administered_at"        TIMESTAMPTZ  NOT NULL,
    "next_due_date"          DATE,
    "doctor_id"              UUID,
    "notes"                  TEXT,
    "created_at"             TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vaccination_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "vaccination_records_pet_booking_service_id_key"
    ON "vaccination_records"("pet_booking_service_id");
CREATE INDEX IF NOT EXISTS "vaccination_records_pet_id_administered_at_idx"
    ON "vaccination_records"("pet_id", "administered_at");
CREATE INDEX IF NOT EXISTS "vaccination_records_campaign_id_idx"
    ON "vaccination_records"("campaign_id");

ALTER TABLE "vaccination_records"
    ADD CONSTRAINT "vaccination_records_pet_id_fkey"
        FOREIGN KEY ("pet_id") REFERENCES "pets"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "vaccination_records"
    ADD CONSTRAINT "vaccination_records_pet_booking_id_fkey"
        FOREIGN KEY ("pet_booking_id") REFERENCES "pet_bookings"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "vaccination_records"
    ADD CONSTRAINT "vaccination_records_pet_booking_service_id_fkey"
        FOREIGN KEY ("pet_booking_service_id") REFERENCES "pet_booking_services"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "vaccination_records"
    ADD CONSTRAINT "vaccination_records_campaign_service_id_fkey"
        FOREIGN KEY ("campaign_service_id") REFERENCES "campaign_services"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "vaccination_records"
    ADD CONSTRAINT "vaccination_records_campaign_id_fkey"
        FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "vaccination_records"
    ADD CONSTRAINT "vaccination_records_doctor_id_fkey"
        FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── campaign_analytics: extend with vaccination / certificate / sms counters ─
-- Phase 2 created this table with only 4 counters; 4 more are added here.

ALTER TABLE "campaign_analytics"
    ADD COLUMN IF NOT EXISTS "total_vaccinated"   INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "total_certificates" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "total_sms_sent"     INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "total_sms_failed"   INTEGER NOT NULL DEFAULT 0;
