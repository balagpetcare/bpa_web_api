-- Migration: add_auth_system
-- Adds new auth fields to users table and creates auth support tables

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('GOOGLE', 'FACEBOOK', 'INSTAGRAM', 'TWITTER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'PENDING', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('LOGIN', 'REGISTER', 'RESET_PASSWORD');

-- DropForeignKey (will be re-added after table changes)
ALTER TABLE "community_membership_purchases" DROP CONSTRAINT "community_membership_purchases_preferred_zone_id_fkey";

-- AlterTable: users - add new auth columns, make email/password nullable
ALTER TABLE "users"
ADD COLUMN "avatar_url" TEXT,
ADD COLUMN "email_verified_at" TIMESTAMPTZ,
ADD COLUMN "phone_verified_at" TIMESTAMPTZ,
ADD COLUMN "role" VARCHAR(20) NOT NULL DEFAULT 'USER',
ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "password_hash" DROP NOT NULL;

-- CreateIndex: unique phone (was missing in baseline)
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateTable: auth_accounts (OAuth/social logins)
CREATE TABLE "auth_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "provider_account_id" VARCHAR(255) NOT NULL,
    "provider_email" VARCHAR(255),
    "access_token" TEXT,
    "refresh_token" TEXT,
    "expires_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "auth_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable: otp_codes (phone OTP verification)
CREATE TABLE "otp_codes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "phone" VARCHAR(20) NOT NULL,
    "otp_hash" TEXT NOT NULL,
    "purpose" "OtpPurpose" NOT NULL DEFAULT 'LOGIN',
    "expires_at" TIMESTAMPTZ NOT NULL,
    "consumed_at" TIMESTAMPTZ,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable: password_reset_tokens
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "consumed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable: email_verification_tokens
CREATE TABLE "email_verification_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "consumed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique constraint on auth_accounts (provider, provider_account_id)
CREATE UNIQUE INDEX "auth_accounts_provider_provider_account_id_key" ON "auth_accounts"("provider", "provider_account_id");

-- CreateIndex: otp_codes lookup index
CREATE INDEX "otp_codes_phone_purpose_idx" ON "otp_codes"("phone", "purpose");

-- AddForeignKey: auth_accounts -> users
ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: password_reset_tokens -> users
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: email_verification_tokens -> users
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Re-AddForeignKey: community_membership_purchases preferred_zone_id
ALTER TABLE "community_membership_purchases" ADD CONSTRAINT "community_membership_purchases_preferred_zone_id_fkey"
    FOREIGN KEY ("preferred_zone_id") REFERENCES "community_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
