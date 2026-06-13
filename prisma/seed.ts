import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const RESOURCES = [
  // Existing
  'users', 'roles', 'news', 'events', 'committee', 'volunteers', 'contacts',
  'media', 'seo', 'analytics', 'payments', 'members', 'sms_logs', 'email_logs',
  'homepage', 'hero_slides', 'partners', 'footer',
  // Campaign Management
  'locations', 'vaccine_catalog', 'certificate_templates',
  'pet_owners', 'pets', 'doctors',
  'campaigns', 'campaign_sessions', 'campaign_services',
  'campaign_checkin', 'campaign_certificates', 'campaign_analytics',
  'campaign_registrations', 'campaign_waitlist', 'vaccination_records',
];

const ACTIONS = [
  'create', 'read', 'update', 'delete', 'publish', 'manage',
  'checkin', 'issue', 'assign', 'lifecycle',
];

async function upsertCityCorp(name: string, districtId: string) {
  const existing = await prisma.cityCorporation.findFirst({ where: { name, districtId } });
  if (existing) return existing;
  return prisma.cityCorporation.create({ data: { name, districtId } });
}

async function upsertZone(name: string, cityCorporationId: string) {
  const existing = await prisma.zone.findFirst({ where: { name, cityCorporationId } });
  if (existing) return existing;
  return prisma.zone.create({ data: { name, cityCorporationId } });
}

async function main(): Promise<void> {
  console.log('Seeding permissions...');
  for (const resource of RESOURCES) {
    for (const action of ACTIONS) {
      await prisma.permission.upsert({
        where: { resource_action: { resource, action } },
        update: {},
        create: { resource, action },
      });
    }
  }

  console.log('Seeding roles...');
  const allPermissions = await prisma.permission.findMany();

  const superAdminRole = await prisma.role.upsert({
    where: { name: 'super_admin' },
    update: {},
    create: {
      name: 'super_admin',
      description: 'Full system access',
      rolePermissions: { create: allPermissions.map((p) => ({ permissionId: p.id })) },
    },
  });

  const adminResources = [
    'news', 'events', 'committee', 'media', 'seo', 'volunteers', 'contacts', 'analytics',
    'payments', 'members', 'sms_logs', 'email_logs', 'homepage', 'hero_slides', 'partners', 'footer',
    'locations', 'vaccine_catalog', 'certificate_templates',
    'pet_owners', 'pets', 'doctors',
    'campaigns', 'campaign_sessions', 'campaign_services',
    'campaign_checkin', 'campaign_certificates', 'campaign_analytics',
  ];
  const adminPermissions = allPermissions.filter((p) => adminResources.includes(p.resource));
  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: {
      name: 'admin',
      description: 'All CMS and campaign modules, no role management',
      rolePermissions: { create: adminPermissions.map((p) => ({ permissionId: p.id })) },
    },
  });

  const editorPermissions = allPermissions.filter(
    (p) => ['news', 'events', 'committee', 'homepage', 'hero_slides', 'partners', 'footer'].includes(p.resource) && ['create', 'read', 'update', 'publish'].includes(p.action),
  );
  const editorRole = await prisma.role.upsert({
    where: { name: 'editor' },
    update: {},
    create: {
      name: 'editor',
      description: 'News, Events, Committee CMS only',
      rolePermissions: { create: editorPermissions.map((p) => ({ permissionId: p.id })) },
    },
  });

  const viewerPermissions = allPermissions.filter((p) => p.action === 'read');
  const viewerRole = await prisma.role.upsert({
    where: { name: 'viewer' },
    update: {},
    create: {
      name: 'viewer',
      description: 'Read-only dashboard access',
      rolePermissions: { create: viewerPermissions.map((p) => ({ permissionId: p.id })) },
    },
  });

  const campaignManagerResources = [
    'locations', 'vaccine_catalog', 'certificate_templates',
    'pet_owners', 'pets', 'doctors',
    'campaigns', 'campaign_sessions', 'campaign_services',
    'campaign_checkin', 'campaign_certificates', 'campaign_analytics',
    'campaign_registrations', 'campaign_waitlist',
    'analytics', 'sms_logs',
  ];
  const campaignManagerActions = ['create', 'read', 'update', 'assign', 'lifecycle', 'checkin', 'issue'];
  const campaignManagerPermissions = allPermissions.filter(
    (p) => campaignManagerResources.includes(p.resource) && campaignManagerActions.includes(p.action),
  );
  const campaignManagerRole = await prisma.role.upsert({
    where: { name: 'campaign_manager' },
    update: {},
    create: {
      name: 'campaign_manager',
      description: 'Campaign management — create, publish, and operate campaigns',
      rolePermissions: { create: campaignManagerPermissions.map((p) => ({ permissionId: p.id })) },
    },
  });

  const campaignVolunteerResources = [
    'campaigns', 'campaign_sessions', 'campaign_checkin', 'campaign_certificates', 'pets', 'pet_owners',
  ];
  const campaignVolunteerActions = ['read', 'checkin', 'issue'];
  const campaignVolunteerPermissions = allPermissions.filter(
    (p) => campaignVolunteerResources.includes(p.resource) && campaignVolunteerActions.includes(p.action),
  );
  const campaignVolunteerRole = await prisma.role.upsert({
    where: { name: 'campaign_volunteer' },
    update: {},
    create: {
      name: 'campaign_volunteer',
      description: 'Campaign volunteer — scan QR, check in, mark vaccinated, issue certificate',
      rolePermissions: { create: campaignVolunteerPermissions.map((p) => ({ permissionId: p.id })) },
    },
  });

  console.log('Seeding super admin user...');
  const passwordHash = await bcrypt.hash('Admin@1234', 12);
  await prisma.user.upsert({
    where: { email: 'admin@bpa.org' },
    update: {},
    create: {
      name: 'BPA Super Admin',
      email: 'admin@bpa.org',
      passwordHash,
      isActive: true,
      userRoles: { create: { roleId: superAdminRole.id } },
    },
  });

  console.log('Seeding news categories and tags...');
  const newsCategories = [
    { name: 'Association News', slug: 'association-news' },
    { name: 'Pet Health', slug: 'pet-health' },
    { name: 'Events & Activities', slug: 'events-activities' },
    { name: 'Adoption', slug: 'adoption' },
    { name: 'Announcements', slug: 'announcements' },
  ];
  for (const cat of newsCategories) {
    await prisma.newsCategory.upsert({ where: { slug: cat.slug }, update: {}, create: cat });
  }

  const newsTags = [
    { name: 'dogs', slug: 'dogs' }, { name: 'cats', slug: 'cats' },
    { name: 'birds', slug: 'birds' }, { name: 'rabbits', slug: 'rabbits' },
    { name: 'veterinary', slug: 'veterinary' }, { name: 'adoption', slug: 'adoption' },
    { name: 'welfare', slug: 'welfare' }, { name: 'training', slug: 'training' },
  ];
  for (const tag of newsTags) {
    await prisma.newsTag.upsert({ where: { slug: tag.slug }, update: {}, create: tag });
  }

  // ─── Location Hierarchy ───────────────────────────────────────────

  console.log('Seeding location hierarchy...');

  const bangladesh = await prisma.country.upsert({
    where: { code: 'BD' },
    update: {},
    create: { name: 'Bangladesh', code: 'BD' },
  });

  const existingDhakaDivision = await prisma.division.findFirst({ where: { name: 'Dhaka', countryId: bangladesh.id } });
  const dhakaDiv = existingDhakaDivision ?? await prisma.division.create({ data: { name: 'Dhaka', countryId: bangladesh.id } });

  const existingDhakaDistrict = await prisma.district.findFirst({ where: { name: 'Dhaka District', divisionId: dhakaDiv.id } });
  const dhakaDistrict = existingDhakaDistrict ?? await prisma.district.create({ data: { name: 'Dhaka District', divisionId: dhakaDiv.id } });

  const dncc = await upsertCityCorp('DNCC', dhakaDistrict.id);
  const dscc = await upsertCityCorp('DSCC', dhakaDistrict.id);

  const dnccZones = [
    'Zone-1 (Uttara)', 'Zone-2 (Mirpur)', 'Zone-3 (Mohammadpur)', 'Zone-4 (Kafrul)',
    'Zone-5 (Gulshan)', 'Zone-6 (Banani)', 'Zone-7 (Demra)', 'Zone-8 (Sabujbagh)',
    'Zone-9 (Khaijuri)', 'Zone-10 (Cantonment)',
  ];
  for (const name of dnccZones) {
    await upsertZone(name, dncc.id);
  }

  const dsccZones = [
    'Zone-1 (Lalbagh)', 'Zone-2 (Chawkbazar)', 'Zone-3 (Sutrapur)', 'Zone-4 (Motijheel)',
    'Zone-5 (Hazaribagh)', 'Zone-6 (Dhanmondi)', 'Zone-7 (Khilgaon)', 'Zone-8 (Shyampur)',
    'Zone-9 (Kadamtali)', 'Zone-10 (Demra)',
  ];
  for (const name of dsccZones) {
    await upsertZone(name, dscc.id);
  }

  // ─── Vaccine Catalog ──────────────────────────────────────────────

  console.log('Seeding vaccine catalog...');
  const vaccines = [
    { name: 'Rabies Vaccine', species: 'all', standardIntervalDays: 365, manufacturer: 'Merial', description: 'Annual rabies vaccination for dogs and cats' },
    { name: 'FVRCP Combo', species: 'cat', standardIntervalDays: 365, manufacturer: 'Zoetis', description: 'Feline Viral Rhinotracheitis, Calicivirus, Panleukopenia' },
    { name: 'DHPPiL Combo', species: 'dog', standardIntervalDays: 365, manufacturer: 'Merck', description: 'Distemper, Hepatitis, Parvovirus, Parainfluenza, Leptospira' },
    { name: 'Deworming', species: 'all', standardIntervalDays: 90, manufacturer: null, description: 'Broad-spectrum deworming treatment' },
    { name: 'Bordetella', species: 'dog', standardIntervalDays: 365, manufacturer: null, description: 'Kennel cough prevention (Bordetella bronchiseptica)' },
  ];
  for (const v of vaccines) {
    const existing = await prisma.vaccineCatalog.findFirst({ where: { name: v.name } });
    if (!existing) await prisma.vaccineCatalog.create({ data: v });
  }

  console.log('─────────────────────────────────────────────');
  console.log('Seed complete.');
  console.log('Roles: super_admin, admin, editor, viewer, campaign_manager, campaign_volunteer');
  console.log('Default admin: admin@bpa.org / Admin@1234');
  console.log(`Location: Bangladesh › Dhaka › Dhaka District › DNCC (10 zones) + DSCC (10 zones)`);
  console.log(`Vaccines seeded: ${vaccines.length}`);

  void adminRole; void editorRole; void viewerRole; void campaignManagerRole; void campaignVolunteerRole;
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
