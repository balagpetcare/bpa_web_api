-- AddColumn staffQrToken and staffQrIssuedAt to campaign_registrations
ALTER TABLE "campaign_registrations" ADD COLUMN "staff_qr_token" VARCHAR(64);
CREATE UNIQUE INDEX "campaign_registrations_staff_qr_token_key" ON "campaign_registrations"("staff_qr_token");
ALTER TABLE "campaign_registrations" ADD COLUMN "staff_qr_issued_at" TIMESTAMPTZ;
