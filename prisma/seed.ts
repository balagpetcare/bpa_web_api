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
  // Community Pet Care
  'community_zones', 'contribution_plans', 'care_contributions',
  'care_partner_cards', 'card_verification_logs',
  'pet_census', 'transparency_reports', 'pet_smart_solution',
  'community_fund_dashboard',
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
    'community_zones', 'contribution_plans', 'care_contributions',
    'care_partner_cards', 'card_verification_logs',
    'pet_census', 'transparency_reports', 'pet_smart_solution',
    'community_fund_dashboard',
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

  // ─── Community Fund Roles ─────────────────────────────────────────

  const communityFundResources = [
    'community_zones', 'contribution_plans', 'care_contributions',
    'care_partner_cards', 'card_verification_logs',
    'pet_census', 'transparency_reports', 'pet_smart_solution',
    'community_fund_dashboard', 'payments', 'analytics', 'sms_logs',
  ];
  const communityFundAdminActions = ['create', 'read', 'update', 'delete', 'publish', 'manage'];
  const communityFundAdminPermissions = allPermissions.filter(
    (p) => communityFundResources.includes(p.resource) && communityFundAdminActions.includes(p.action),
  );
  const communityFundAdminRole = await prisma.role.upsert({
    where: { name: 'community_fund_admin' },
    update: {},
    create: {
      name: 'community_fund_admin',
      description: 'Community Pet Care fund — full management of zones, contributions, cards, census, and transparency reports',
      rolePermissions: { create: communityFundAdminPermissions.map((p) => ({ permissionId: p.id })) },
    },
  });

  const communityFundViewerPermissions = allPermissions.filter(
    (p) => communityFundResources.includes(p.resource) && p.action === 'read',
  );
  const communityFundViewerRole = await prisma.role.upsert({
    where: { name: 'community_fund_viewer' },
    update: {},
    create: {
      name: 'community_fund_viewer',
      description: 'Community Pet Care fund — read-only dashboard access',
      rolePermissions: { create: communityFundViewerPermissions.map((p) => ({ permissionId: p.id })) },
    },
  });

  void communityFundAdminRole; void communityFundViewerRole;

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

  // ─── Contribution Plan ────────────────────────────────────────────

  console.log('Seeding contribution plan...');
  const LEGAL_DISCLAIMER = [
    'This Care Partner Card is a contribution recognition and community service benefit card only.',
    'It does not represent ownership, equity, profit-sharing, or any form of investment in BPA or any clinic.',
    'Discounts on products, medicines, food, accessories, or any third-party costs are not guaranteed.',
    'Benefits are subject to availability and BPA policy at the time of service.',
  ].join(' ');

  await prisma.contributionPlan.upsert({
    where: { slug: 'standard-care-partner-3000' },
    update: {},
    create: {
      title: 'Standard Care Partner',
      slug: 'standard-care-partner-3000',
      contributionType: 'care_partner',
      amountBdt: 3000,
      currency: 'BDT',
      description: 'Contribute ৳3,000 to support the establishment of BPA Community 24/7 Pet Clinics in Dhaka. Your contribution helps provide accessible veterinary care for all pets regardless of owner income.',
      benefitsSummaryJson: [
        'Priority service access at BPA Community Pet Clinics (subject to availability)',
        'Digital Care Partner Card with QR verification',
        'Recognition as a founding Care Partner of BPA Community Pet Clinics',
        'Annual transparency report on fund utilisation',
      ],
      legalDisclaimerText: LEGAL_DISCLAIMER,
      isActive: true,
      sortOrder: 0,
    },
  });

  // ─── Community Zones (8 Dhaka Zones) ─────────────────────────────

  console.log('Seeding community zones...');
  const communityZones = [
    {
      name: 'Zone 1 – Uttara & Turag',
      slug: 'zone-1-uttara-turag',
      description: 'Covering Uttara, Turag, and surrounding areas of northern Dhaka.',
      city: 'Dhaka', district: 'Dhaka District', division: 'Dhaka',
      sortOrder: 1,
    },
    {
      name: 'Zone 2 – Mirpur & Pallabi',
      slug: 'zone-2-mirpur-pallabi',
      description: 'Covering Mirpur, Pallabi, Kafrul, and Shah Ali areas.',
      city: 'Dhaka', district: 'Dhaka District', division: 'Dhaka',
      sortOrder: 2,
    },
    {
      name: 'Zone 3 – Mohammadpur & Adabor',
      slug: 'zone-3-mohammadpur-adabor',
      description: 'Covering Mohammadpur, Adabor, Sher-e-Bangla Nagar, and Shyamoli areas.',
      city: 'Dhaka', district: 'Dhaka District', division: 'Dhaka',
      sortOrder: 3,
    },
    {
      name: 'Zone 4 – Gulshan & Banani',
      slug: 'zone-4-gulshan-banani',
      description: 'Covering Gulshan, Banani, Baridhara, and Niketon areas.',
      city: 'Dhaka', district: 'Dhaka District', division: 'Dhaka',
      sortOrder: 4,
    },
    {
      name: 'Zone 5 – Dhanmondi & Kalabagan',
      slug: 'zone-5-dhanmondi-kalabagan',
      description: 'Covering Dhanmondi, Kalabagan, Hazaribagh, and Lalbagh areas.',
      city: 'Dhaka', district: 'Dhaka District', division: 'Dhaka',
      sortOrder: 5,
    },
    {
      name: 'Zone 6 – Rampura & Badda',
      slug: 'zone-6-rampura-badda',
      description: 'Covering Rampura, Badda, Khilgaon, and Bashabo areas.',
      city: 'Dhaka', district: 'Dhaka District', division: 'Dhaka',
      sortOrder: 6,
    },
    {
      name: 'Zone 7 – Motijheel & Wari',
      slug: 'zone-7-motijheel-wari',
      description: 'Covering Motijheel, Wari, Sutrapur, and Kotwali areas.',
      city: 'Dhaka', district: 'Dhaka District', division: 'Dhaka',
      sortOrder: 7,
    },
    {
      name: 'Zone 8 – Demra & Shyampur',
      slug: 'zone-8-demra-shyampur',
      description: 'Covering Demra, Shyampur, Kadamtali, and Jatrabari areas.',
      city: 'Dhaka', district: 'Dhaka District', division: 'Dhaka',
      sortOrder: 8,
    },
  ];

  for (const zone of communityZones) {
    await prisma.communityZone.upsert({
      where: { slug: zone.slug },
      update: {},
      create: {
        ...zone,
        targetContributors: 10000,
        currentContributors: 0,
        targetAmountBdt: 30000000, // 10,000 × ৳3,000
        currentAmountBdt: 0,
        status: 'active',
        isActive: true,
      },
    });
  }

  // ─── Pet Smart Solution Placeholder Settings ──────────────────────

  console.log('Seeding Pet Smart Solution placeholder settings...');
  const pssSettings = [
    { settingKey: 'PSS_API_BASE_URL', description: 'Future Pet Smart Solution API base URL', isSecret: false },
    { settingKey: 'PSS_API_KEY', description: 'Pet Smart Solution API key (keep secret)', isSecret: true },
    { settingKey: 'PSS_SYNC_ENABLED', description: 'Master toggle — set to true to enable sync', isSecret: false },
    { settingKey: 'PSS_SYNC_ENTITIES', description: 'Comma-separated entity types to sync (e.g. care_partner_card)', isSecret: false },
    { settingKey: 'PSS_WEBHOOK_SECRET', description: 'Incoming webhook signature secret from Pet Smart Solution', isSecret: true },
  ];
  for (const s of pssSettings) {
    await prisma.petSmartSyncSetting.upsert({
      where: { settingKey: s.settingKey },
      update: {},
      create: { settingKey: s.settingKey, description: s.description, isSecret: s.isSecret, isActive: false, status: 'not_configured' },
    });
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
