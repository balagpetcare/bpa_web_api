/**
 * BPA Backend API — Master Database Seeder
 *
 * Idempotent: safe to run multiple times. Uses upsert / findFirst guards.
 * No production data is deleted or truncated.
 *
 * Usage:
 *   npm run db:seed
 *
 * Required env vars for admin user:
 *   SEED_ADMIN_EMAIL     (or ROOT_ADMIN_EMAIL)
 *   SEED_ADMIN_PASSWORD  (or ROOT_ADMIN_PASSWORD)
 *   SEED_ADMIN_NAME      (or ROOT_ADMIN_NAME)   — optional, defaults to "BPA Super Admin"
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

import { seedRolesAndPermissions } from './roles-permissions.seed';
import { seedAdminUser } from './users.seed';
import { seedSiteSettings } from './site-settings.seed';
import { seedLocations } from './locations.seed';
import { seedCampaigns } from './campaigns.seed';
import { seedCommunity } from './community.seed';
import { seedDonations } from './donations.seed';
import { seedCms } from './cms.seed';
import { seedPayments } from './payments.seed';
import { seedMailSystem } from './mail.seed';

const prisma = new PrismaClient();

function line(char = '─', width = 60) {
  return char.repeat(width);
}

function section(title: string) {
  console.log(`\n${line()}`);
  console.log(` ${title}`);
  console.log(line());
}

async function main() {
  console.log('\n' + line('═'));
  console.log(' BPA Database Seeder — Complete Idempotent Setup');
  console.log(` Started: ${new Date().toISOString()}`);
  console.log(line('═'));

  // ── 1. Roles & Permissions ────────────────────────────────────────────────
  section('1/10  Roles & Permissions');
  const rolesResult = await seedRolesAndPermissions(prisma);
  console.log(`  ✓ Permissions  : ${rolesResult.permissions.total} (all resources × actions)`);
  console.log(`  ✓ Roles        : ${rolesResult.roles.upserted} upserted`);
  console.log(`  ✓ Role mappings: ${rolesResult.mappings.upserted} synced`);
  console.log(`    Roles: super_admin, admin, editor, viewer, campaign_manager, campaign_volunteer, community_fund_admin, community_fund_viewer`);

  // ── 2. Admin User ──────────────────────────────────────────────────────────
  section('2/10  Admin User');
  const userResult = await seedAdminUser(prisma);
  if (userResult.skipped) {
    console.log(`  ⚠  Admin user skipped: ${userResult.reason}`);
    if (userResult.reason === 'no_password') {
      console.log('     Set SEED_ADMIN_PASSWORD (or ROOT_ADMIN_PASSWORD) in .env and re-run.');
    }
  } else {
    console.log(`  ✓ Admin email  : ${userResult.email}`);
    console.log(`  ✓ Admin role   : ${userResult.role}`);
    console.log(`  ✓ Status       : upserted (password updated if changed in .env)`);
  }

  // ── 3. Site Settings ──────────────────────────────────────────────────────
  section('3/10  Site Settings');
  const settingsResult = await seedSiteSettings(prisma);
  console.log(`  ✓ SiteSettings singleton upserted (id=default): ${settingsResult.upserted} row`);

  // ── 4. Location Hierarchy ─────────────────────────────────────────────────
  section('4/10  Location Hierarchy');
  const locResult = await seedLocations(prisma);
  console.log(`  ✓ Country      : ${locResult.country}`);
  console.log(`  ✓ Divisions    : ${locResult.divisions}`);
  console.log(`  ✓ Districts    : ${locResult.districts}`);
  console.log(`  ✓ City Corps   : ${locResult.cityCorporations} (DNCC, DSCC)`);
  console.log(`  ✓ Zones        : ${locResult.zones} (DNCC×10 + DSCC×10)`);

  // ── 5. Campaigns & Vaccines ───────────────────────────────────────────────
  section('5/10  Campaigns & Vaccine Catalog');
  const campResult = await seedCampaigns(prisma);
  console.log(`  ✓ Vaccines     : ${campResult.vaccines.created} created, ${campResult.vaccines.skipped} already existed`);
  console.log(`  ✓ Cert template: ${campResult.certTemplate}`);
  console.log(`  ✓ Campaign     : Cat Vaccination Dhaka 2026 — ${campResult.campaign}`);
  console.log(`  ✓ Svcs/Sessions: ${campResult.services} services, ${campResult.sessions} session(s)`);

  // ── 6. Community & Membership ─────────────────────────────────────────────
  section('6/10  Community & Membership Engine');
  const commResult = await seedCommunity(prisma);
  console.log(`  ✓ Community zones        : ${commResult.zones}`);
  console.log(`  ✓ Contribution plan      : ${commResult.contributionPlan}`);
  console.log(`  ✓ Membership program     : ${commResult.membershipProgram}`);
  console.log(`  ✓ Membership tiers       : ${commResult.tiers} (Primary, Premium, Enterprise)`);
  console.log(`  ✓ Membership services    : ${commResult.services} new`);
  console.log(`  ✓ Tier discounts         : ${commResult.discounts} synced`);
  console.log(`  ✓ Membership benefits    : ${commResult.benefits} new`);
  console.log(`  ✓ Membership documents   : ${commResult.documents} new`);
  console.log(`  ✓ Diagnostic services    : ${commResult.diagnosticServices} new`);
  console.log(`  ✓ Care partner benefits  : ${commResult.carePartnerBenefits} new`);
  console.log(`  ✓ Social impact programs : ${commResult.socialImpact} new`);
  console.log(`  ✓ Roadmap items          : ${commResult.roadmap} new`);

  // ── 7. Donations ──────────────────────────────────────────────────────────
  section('7/10  Donation System');
  const donResult = await seedDonations(prisma);
  console.log(`  ✓ Purposes         : ${donResult.purposes}`);
  console.log(`  ✓ Campaigns        : ${donResult.campaigns}`);
  console.log(`  ✓ Impact stories   : ${donResult.stories}`);
  console.log(`  ✓ QR codes         : ${donResult.qrCodes}`);
  console.log(`  ✓ Page settings    : ${donResult.pageSetting}`);
  console.log(`  ✓ Transparency rpt : ${donResult.transparency}`);

  // ── 8. CMS ────────────────────────────────────────────────────────────────
  section('8/10  CMS (Homepage, Hero Slides, Footer, News)');
  const cmsResult = await seedCms(prisma);
  console.log(`  ✓ News categories  : ${cmsResult.categories}`);
  console.log(`  ✓ News tags        : ${cmsResult.tags}`);
  console.log(`  ✓ Homepage record  : ${cmsResult.homepage} (locale=en)`);
  console.log(`  ✓ Homepage sections: ${cmsResult.sections} new`);
  console.log(`  ✓ Hero slides      : ${cmsResult.slides} new`);
  console.log(`  ✓ Footer config    : ${cmsResult.footer} (with link groups & links)`);
  console.log(`  ✓ Pet Census setup : ${cmsResult.petCensus}`);

  // ── 9. Payment / Integration Placeholders ─────────────────────────────────
  section('9/10  Payment & Integration Settings');
  const payResult = await seedPayments(prisma);
  console.log(`  ✓ PSS settings: ${payResult.pssSettings.upserted} placeholder keys upserted`);
  console.log(`    (Activate via admin panel → PetSmart → Settings)`);

  // ── 10. Mail & Communications System ──────────────────────────────────────
  section('10/10 Mail & Communications System');
  const mailResult = await seedMailSystem(prisma);
  console.log(`  ✓ Email Layouts    : ${mailResult.emailLayouts} layouts seeded`);
  console.log(`  ✓ Mail Accounts    : ${mailResult.mailAccounts} accounts seeded`);
  console.log('  Mail accounts seeded inactive; update passwords from Admin Panel.');

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n' + line('═'));
  console.log(' SEED COMPLETE');
  console.log(` Finished: ${new Date().toISOString()}`);
  console.log(line('═'));
  console.log('\n Next steps:');
  console.log('  1. Verify admin login at /admin → email from SEED_ADMIN_EMAIL');
  console.log('  2. Upload real images via Admin → Media for hero slides');
  console.log('  3. Set EPS_ENABLED=true and payment credentials in .env for payments');
  console.log('  4. Publish the Cat Vaccination Campaign 2026 from Admin → Campaigns');
  console.log('  5. Run: npx prisma studio  — to inspect seeded data visually');
  console.log('');
}

main()
  .catch((e) => {
    console.error('\n[SEED FAILED]', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
