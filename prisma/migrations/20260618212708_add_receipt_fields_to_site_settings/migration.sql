-- DropForeignKey
ALTER TABLE "care_contributions" DROP CONSTRAINT IF EXISTS "care_contributions_city_corporation_id_fkey";

-- DropForeignKey
ALTER TABLE "care_contributions" DROP CONSTRAINT IF EXISTS "care_contributions_city_zone_id_fkey";

-- DropForeignKey
ALTER TABLE "care_contributions" DROP CONSTRAINT IF EXISTS "care_contributions_district_id_fkey";

-- DropForeignKey
ALTER TABLE "care_contributions" DROP CONSTRAINT IF EXISTS "care_contributions_division_id_fkey";

-- DropForeignKey
ALTER TABLE "care_contributions" DROP CONSTRAINT IF EXISTS "care_contributions_union_id_fkey";

-- DropForeignKey
ALTER TABLE "care_contributions" DROP CONSTRAINT IF EXISTS "care_contributions_upazila_id_fkey";

-- DropForeignKey
ALTER TABLE "care_contributions" DROP CONSTRAINT IF EXISTS "care_contributions_ward_id_fkey";

-- DropForeignKey
ALTER TABLE "community_membership_purchases" DROP CONSTRAINT IF EXISTS "community_membership_purchases_city_corporation_id_fkey";

-- DropForeignKey
ALTER TABLE "community_membership_purchases" DROP CONSTRAINT IF EXISTS "community_membership_purchases_city_zone_id_fkey";

-- DropForeignKey
ALTER TABLE "community_membership_purchases" DROP CONSTRAINT IF EXISTS "community_membership_purchases_district_id_fkey";

-- DropForeignKey
ALTER TABLE "community_membership_purchases" DROP CONSTRAINT IF EXISTS "community_membership_purchases_division_id_fkey";

-- DropForeignKey
ALTER TABLE "community_membership_purchases" DROP CONSTRAINT IF EXISTS "community_membership_purchases_union_id_fkey";

-- DropForeignKey
ALTER TABLE "community_membership_purchases" DROP CONSTRAINT IF EXISTS "community_membership_purchases_upazila_id_fkey";

-- DropForeignKey
ALTER TABLE "community_membership_purchases" DROP CONSTRAINT IF EXISTS "community_membership_purchases_ward_id_fkey";

-- DropForeignKey
ALTER TABLE "community_zones" DROP CONSTRAINT IF EXISTS "community_zones_district_id_fkey";

-- DropForeignKey
ALTER TABLE "community_zones" DROP CONSTRAINT IF EXISTS "community_zones_division_id_fkey";

-- DropForeignKey
ALTER TABLE "community_zones" DROP CONSTRAINT IF EXISTS "community_zones_upazila_id_fkey";

-- DropForeignKey
ALTER TABLE "media_files" DROP CONSTRAINT IF EXISTS "media_files_uploaded_by_fkey";

-- DropForeignKey
ALTER TABLE "pet_census_submissions" DROP CONSTRAINT IF EXISTS "pet_census_submissions_city_corporation_id_fkey";

-- DropForeignKey
ALTER TABLE "pet_census_submissions" DROP CONSTRAINT IF EXISTS "pet_census_submissions_city_zone_id_fkey";

-- DropForeignKey
ALTER TABLE "pet_census_submissions" DROP CONSTRAINT IF EXISTS "pet_census_submissions_district_id_fkey";

-- DropForeignKey
ALTER TABLE "pet_census_submissions" DROP CONSTRAINT IF EXISTS "pet_census_submissions_division_id_fkey";

-- DropForeignKey
ALTER TABLE "pet_census_submissions" DROP CONSTRAINT IF EXISTS "pet_census_submissions_union_id_fkey";

-- DropForeignKey
ALTER TABLE "pet_census_submissions" DROP CONSTRAINT IF EXISTS "pet_census_submissions_upazila_id_fkey";

-- DropForeignKey
ALTER TABLE "pet_census_submissions" DROP CONSTRAINT IF EXISTS "pet_census_submissions_ward_id_fkey";

-- DropForeignKey
ALTER TABLE "pet_owners" DROP CONSTRAINT IF EXISTS "pet_owners_city_corporation_id_fkey";

-- DropForeignKey
ALTER TABLE "pet_owners" DROP CONSTRAINT IF EXISTS "pet_owners_city_zone_id_fkey";

-- DropForeignKey
ALTER TABLE "pet_owners" DROP CONSTRAINT IF EXISTS "pet_owners_district_id_fkey";

-- DropForeignKey
ALTER TABLE "pet_owners" DROP CONSTRAINT IF EXISTS "pet_owners_division_id_fkey";

-- DropForeignKey
ALTER TABLE "pet_owners" DROP CONSTRAINT IF EXISTS "pet_owners_union_id_fkey";

-- DropForeignKey
ALTER TABLE "pet_owners" DROP CONSTRAINT IF EXISTS "pet_owners_upazila_id_fkey";

-- DropForeignKey
ALTER TABLE "pet_owners" DROP CONSTRAINT IF EXISTS "pet_owners_ward_id_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_city_corporation_id_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_city_zone_id_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_district_id_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_division_id_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_union_id_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_upazila_id_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_ward_id_fkey";

-- DropForeignKey
ALTER TABLE "venues" DROP CONSTRAINT IF EXISTS "venues_district_id_fkey";

-- DropForeignKey
ALTER TABLE "venues" DROP CONSTRAINT IF EXISTS "venues_division_id_fkey";

-- DropForeignKey
ALTER TABLE "venues" DROP CONSTRAINT IF EXISTS "venues_upazila_id_fkey";

-- DropIndex
DROP INDEX IF EXISTS "care_contributions_district_id_idx";

-- DropIndex
DROP INDEX IF EXISTS "community_membership_purchases_district_id_idx";

-- DropIndex
DROP INDEX IF EXISTS "community_zones_district_id_idx";

-- DropIndex
DROP INDEX IF EXISTS "pet_census_district_id_idx";

-- DropIndex
DROP INDEX IF EXISTS "pet_census_division_id_idx";

-- AlterTable
ALTER TABLE "donation_campaigns" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "donation_impact_stories" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "donation_page_settings" ALTER COLUMN "hero_title_en" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "donation_purposes" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "donation_qr_codes" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "donation_transparency_reports" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "donations" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "location_nodes" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "site_settings" ADD COLUMN     "address_line" VARCHAR(500),
ADD COLUMN     "contact_email" VARCHAR(200),
ADD COLUMN     "donation_receipt_terms_bn" TEXT,
ADD COLUMN     "donation_receipt_terms_en" TEXT,
ADD COLUMN     "legal_name" VARCHAR(200),
ADD COLUMN     "primary_phone" VARCHAR(30),
ADD COLUMN     "receipt_footer_note" TEXT,
ADD COLUMN     "secondary_phone" VARCHAR(30),
ADD COLUMN     "tagline" VARCHAR(300),
ADD COLUMN     "vaccination_email" VARCHAR(200),
ADD COLUMN     "website_url" VARCHAR(200);

-- AddForeignKey
ALTER TABLE "media_files" ADD CONSTRAINT "media_files_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
