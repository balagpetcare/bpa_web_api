-- CreateEnum
CREATE TYPE "CampaignRegistrationStatus" AS ENUM ('pending_payment', 'paid', 'checked_in', 'vaccinated', 'certificate_issued', 'completed', 'no_show', 'cancelled');

-- CreateEnum
CREATE TYPE "WaitlistStatus" AS ENUM ('waiting', 'promoted', 'expired', 'cancelled');

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "entity_id" UUID,
ADD COLUMN     "entity_type" VARCHAR(30);

-- CreateTable
CREATE TABLE "campaign_registrations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "booking_number" VARCHAR(30) NOT NULL,
    "campaign_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "status" "CampaignRegistrationStatus" NOT NULL DEFAULT 'pending_payment',
    "total_amount_bdt" DECIMAL(10,2) NOT NULL,
    "payment_id" UUID,
    "is_guest" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "campaign_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pet_bookings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "registration_id" UUID NOT NULL,
    "pet_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "status" "CampaignRegistrationStatus" NOT NULL DEFAULT 'pending_payment',
    "checked_in_at" TIMESTAMPTZ,
    "vaccinated_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "pet_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pet_booking_services" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pet_booking_id" UUID NOT NULL,
    "campaign_service_id" UUID NOT NULL,
    "administered" BOOLEAN NOT NULL DEFAULT false,
    "administered_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pet_booking_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_waitlist" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "campaign_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "pet_count" INTEGER NOT NULL DEFAULT 1,
    "status" "WaitlistStatus" NOT NULL DEFAULT 'waiting',
    "position" INTEGER NOT NULL,
    "notified_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "campaign_waitlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_analytics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "campaign_id" UUID NOT NULL,
    "total_registrations" INTEGER NOT NULL DEFAULT 0,
    "total_paid" INTEGER NOT NULL DEFAULT 0,
    "total_pets" INTEGER NOT NULL DEFAULT 0,
    "total_revenue_bdt" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "campaign_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "campaign_registrations_booking_number_key" ON "campaign_registrations"("booking_number");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_registrations_payment_id_key" ON "campaign_registrations"("payment_id");

-- CreateIndex
CREATE INDEX "campaign_registrations_campaign_id_status_idx" ON "campaign_registrations"("campaign_id", "status");

-- CreateIndex
CREATE INDEX "campaign_registrations_owner_id_idx" ON "campaign_registrations"("owner_id");

-- CreateIndex
CREATE INDEX "campaign_registrations_session_id_idx" ON "campaign_registrations"("session_id");

-- CreateIndex
CREATE INDEX "pet_bookings_registration_id_idx" ON "pet_bookings"("registration_id");

-- CreateIndex
CREATE INDEX "pet_bookings_pet_id_idx" ON "pet_bookings"("pet_id");

-- CreateIndex
CREATE INDEX "pet_bookings_session_id_status_idx" ON "pet_bookings"("session_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "pet_booking_services_pet_booking_id_campaign_service_id_key" ON "pet_booking_services"("pet_booking_id", "campaign_service_id");

-- CreateIndex
CREATE INDEX "campaign_waitlist_campaign_id_session_id_position_idx" ON "campaign_waitlist"("campaign_id", "session_id", "position");

-- CreateIndex
CREATE INDEX "campaign_waitlist_status_idx" ON "campaign_waitlist"("status");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_analytics_campaign_id_key" ON "campaign_analytics"("campaign_id");

-- CreateIndex
CREATE INDEX "payments_entity_type_entity_id_idx" ON "payments"("entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "campaign_registrations" ADD CONSTRAINT "campaign_registrations_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_registrations" ADD CONSTRAINT "campaign_registrations_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "campaign_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_registrations" ADD CONSTRAINT "campaign_registrations_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "pet_owners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_registrations" ADD CONSTRAINT "campaign_registrations_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_bookings" ADD CONSTRAINT "pet_bookings_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "campaign_registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_bookings" ADD CONSTRAINT "pet_bookings_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_bookings" ADD CONSTRAINT "pet_bookings_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "campaign_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_booking_services" ADD CONSTRAINT "pet_booking_services_pet_booking_id_fkey" FOREIGN KEY ("pet_booking_id") REFERENCES "pet_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_booking_services" ADD CONSTRAINT "pet_booking_services_campaign_service_id_fkey" FOREIGN KEY ("campaign_service_id") REFERENCES "campaign_services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_waitlist" ADD CONSTRAINT "campaign_waitlist_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_waitlist" ADD CONSTRAINT "campaign_waitlist_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "campaign_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_waitlist" ADD CONSTRAINT "campaign_waitlist_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "pet_owners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_analytics" ADD CONSTRAINT "campaign_analytics_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
