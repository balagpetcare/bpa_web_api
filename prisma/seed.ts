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
  // Community Care Membership Engine
  'community_membership_program', 'community_membership_tiers',
  'community_membership_services', 'community_membership_discounts',
  'community_membership_benefits', 'community_membership_purchases',
  'community_membership_cards', 'community_membership_upgrades',
  'community_membership_documents', 'community_membership_dashboard',
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
    'community_membership_program', 'community_membership_tiers',
    'community_membership_services', 'community_membership_discounts',
    'community_membership_benefits', 'community_membership_purchases',
    'community_membership_cards', 'community_membership_upgrades',
    'community_membership_documents', 'community_membership_dashboard',
    'community_membership_card_verification',
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
    'community_membership_program', 'community_membership_tiers',
    'community_membership_services', 'community_membership_discounts',
    'community_membership_benefits', 'community_membership_purchases',
    'community_membership_cards', 'community_membership_upgrades',
    'community_membership_documents', 'community_membership_dashboard',
    'community_membership_card_verification',
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

  // ─── Community Care Membership Engine ────────────────────────────

  console.log('Seeding Community Care Membership Program...');

  await prisma.communityMembershipProgram.upsert({
    where: { id: 'default' },
    update: {
      nameEn: 'BPA Community Care Partner Card Program',
      nameBn: 'বিপিএ কমিউনিটি কেয়ার পার্টনার কার্ড প্রোগ্রাম',
      slug: 'community-care-partner-card',
      descriptionEn: 'Join BPA Community Care Partner Card Program and get exclusive benefits for your pets.',
      descriptionBn: 'বিপিএ কমিউনিটি কেয়ার পার্টনার কার্ড প্রোগ্রামে যোগ দিন এবং আপনার পোষা প্রাণীর জন্য এক্সক্লুসিভ সুবিধা পান।',
      cardValidityLabel: '5-Year Card Validity',
      legalDisclaimer: 'BPA Community Care Partner Card is a service benefit card only. It does not represent ownership, equity, profit-sharing, investment, or financial return. Service discounts and third-party benefits are subject to availability and partner terms. Clinic zone establishment is subject to sufficient member demand and BPA operational planning.',
    },
    create: {
      id: 'default',
      nameEn: 'BPA Community Care Partner Card Program',
      nameBn: 'বিপিএ কমিউনিটি কেয়ার পার্টনার কার্ড প্রোগ্রাম',
      slug: 'community-care-partner-card',
      descriptionEn: 'Join BPA Community Care Partner Card Program and get exclusive benefits for your pets.',
      descriptionBn: 'বিপিএ কমিউনিটি কেয়ার পার্টনার কার্ড প্রোগ্রামে যোগ দিন এবং আপনার পোষা প্রাণীর জন্য এক্সক্লুসিভ সুবিধা পান।',
      offerStartAt: new Date('2026-01-01'),
      offerEndAt: new Date('2027-12-31'),
      priceAfterOffer: 'USE_REGULAR_PRICE',
      offerBannerEn: 'Founding Member Offer — Limited Time!',
      offerBannerBn: 'প্রতিষ্ঠাতা সদস্য অফার — সীমিত সময়!',
      cardValidityLabel: '5-Year Card Validity',
      legalDisclaimer: 'BPA Community Care Partner Card is a service benefit card only. It does not represent ownership, equity, profit-sharing, investment, or financial return. Service discounts and third-party benefits are subject to availability and partner terms. Clinic zone establishment is subject to sufficient member demand and BPA operational planning.',
      isActive: true,
    },
  });

  // ─── Tiers ────────────────────────────────────────────────────────

  console.log('Seeding membership tiers...');

  const primaryTier = await prisma.communityMembershipTier.upsert({
    where: { slug: 'primary' },
    update: { validityMonths: 60 },
    create: {
      nameEn: 'Primary Card', nameBn: 'প্রাইমারি কার্ড', slug: 'primary',
      launchPriceBdt: 3000, regularPriceBdt: 10000,
      petLimitMin: 1, petLimitMax: 3, validityMonths: 60,
      badgeTextEn: 'Best Value', badgeTextBn: 'সেরা মূল্য',
      shortDescEn: 'Essential care for up to 3 pets with core benefits and service discounts.',
      shortDescBn: '৩টি পোষা প্রাণীর জন্য প্রয়োজনীয় যত্ন ও পরিষেবা ছাড়।',
      fullDescEn: 'The Primary Card is perfect for pet owners with up to 3 pets. Enjoy core veterinary services, diagnostics discounts, and digital membership benefits.',
      fullDescBn: 'প্রাইমারি কার্ডটি ৩টি পর্যন্ত পোষা প্রাণীর মালিকদের জন্য উপযুক্ত। মূল ভেটেরিনারি পরিষেবা, ডায়াগনস্টিক ছাড় এবং ডিজিটাল সদস্যপদ সুবিধা উপভোগ করুন।',
      cardTheme: 'primary', isActive: true, sortOrder: 1,
    },
  });

  const premiumTier = await prisma.communityMembershipTier.upsert({
    where: { slug: 'premium' },
    update: { validityMonths: 60 },
    create: {
      nameEn: 'Premium Card', nameBn: 'প্রিমিয়াম কার্ড', slug: 'premium',
      launchPriceBdt: 5000, regularPriceBdt: 18000,
      petLimitMin: 7, petLimitMax: 10, validityMonths: 60,
      badgeTextEn: 'Most Popular', badgeTextBn: 'সবচেয়ে জনপ্রিয়',
      shortDescEn: 'Extended care for up to 10 pets with premium discounts and priority services.',
      shortDescBn: '১০টি পোষা প্রাণীর জন্য বর্ধিত যত্ন ও প্রিমিয়াম ছাড়।',
      fullDescEn: 'The Premium Card offers comprehensive coverage for households with up to 10 pets. Includes higher service discounts, priority clinic access, and exclusive social impact program participation.',
      fullDescBn: 'প্রিমিয়াম কার্ডটি ১০টি পর্যন্ত পোষা প্রাণীর জন্য ব্যাপক কভারেজ অফার করে। উচ্চতর পরিষেবা ছাড়, অগ্রাধিকার ক্লিনিক অ্যাক্সেস এবং এক্সক্লুসিভ সামাজিক প্রভাব প্রোগ্রাম অন্তর্ভুক্ত।',
      cardTheme: 'premium', isActive: true, sortOrder: 2,
    },
  });

  const enterpriseTier = await prisma.communityMembershipTier.upsert({
    where: { slug: 'enterprise' },
    update: { validityMonths: 60 },
    create: {
      nameEn: 'Enterprise Card', nameBn: 'এন্টারপ্রাইজ কার্ড', slug: 'enterprise',
      launchPriceBdt: 10000, regularPriceBdt: 30000,
      petLimitMin: 20, petLimitMax: 50, validityMonths: 60,
      badgeTextEn: 'Ultimate Care', badgeTextBn: 'আল্টিমেট কেয়ার',
      shortDescEn: 'Maximum coverage for 20-50 pets with highest discounts and VIP services.',
      shortDescBn: '২০-৫০টি পোষা প্রাণীর জন্য সর্বোচ্চ কভারেজ ও ভিআইপি পরিষেবা।',
      fullDescEn: 'The Enterprise Card is designed for breeders, shelters, and multi-pet households. Features maximum service discounts, VIP clinic access, dedicated support, and all future platform benefits.',
      fullDescBn: 'এন্টারপ্রাইজ কার্ডটি ব্রিডার, শেল্টার এবং বহু-পোষা পরিবারের জন্য ডিজাইন করা হয়েছে। সর্বোচ্চ পরিষেবা ছাড়, ভিআইপি ক্লিনিক অ্যাক্সেস এবং সমস্ত ভবিষ্যত প্ল্যাটফর্ম সুবিধা রয়েছে।',
      cardTheme: 'enterprise', isActive: true, sortOrder: 3,
    },
  });

  // ─── Services ──────────────────────────────────────────────────────

  console.log('Seeding membership services...');

  const serviceData = [
    { nameEn: 'General Checkup', nameBn: 'সাধারণ চেকআপ', category: 'HEALTH_CHECKUP' as const, basePriceBdt: 500 },
    { nameEn: 'Vaccination', nameBn: 'টিকা', category: 'VACCINATION' as const, basePriceBdt: 800 },
    { nameEn: 'Deworming', nameBn: 'কৃমিনাশক', category: 'DEWORMING' as const, basePriceBdt: 300 },
    { nameEn: 'Microchipping', nameBn: 'মাইক্রোচিপিং', category: 'MICROCHIP' as const, basePriceBdt: 1000 },
    { nameEn: 'Blood Test', nameBn: 'রক্ত পরীক্ষা', category: 'LAB_TEST' as const, basePriceBdt: 1200 },
    { nameEn: 'X-Ray', nameBn: 'এক্স-রে', category: 'IMAGING' as const, basePriceBdt: 1500 },
    { nameEn: 'Ultrasound', nameBn: 'আল্ট্রাসাউন্ড', category: 'IMAGING' as const, basePriceBdt: 2000 },
    { nameEn: 'Surgery', nameBn: 'অপারেশন', category: 'SURGERY' as const, basePriceBdt: 5000 },
    { nameEn: 'Grooming', nameBn: 'গ্রুমিং', category: 'GROOMING' as const, basePriceBdt: 600 },
    { nameEn: 'Emergency Care', nameBn: 'জরুরি সেবা', category: 'EMERGENCY' as const, basePriceBdt: 3000 },
  ];

  const serviceIds: string[] = [];
  for (const s of serviceData) {
    const existing = await prisma.communityMembershipService.findFirst({ where: { nameEn: s.nameEn } });
    if (existing) { serviceIds.push(existing.id); continue; }
    const created = await prisma.communityMembershipService.create({
      data: { ...s, sortOrder: serviceData.indexOf(s) + 1 },
    });
    serviceIds.push(created.id);
  }

  // ─── Discounts ─────────────────────────────────────────────────────

  console.log('Seeding tier service discounts...');

  const services = await prisma.communityMembershipService.findMany({ where: { isActive: true } });
  const discountConfig = [
    { tierId: primaryTier.id, discountType: 'PERCENTAGE' as const, discountValue: 15, minDiscount: null, maxDiscount: null },
    { tierId: premiumTier.id, discountType: 'PERCENTAGE' as const, discountValue: 20, minDiscount: null, maxDiscount: null },
    { tierId: enterpriseTier.id, discountType: 'PERCENTAGE' as const, discountValue: 25, minDiscount: null, maxDiscount: null },
  ];

  for (const svc of services) {
    for (const cfg of discountConfig) {
      await prisma.communityTierServiceDiscount.upsert({
        where: { tierId_serviceId: { tierId: cfg.tierId, serviceId: svc.id } },
        update: { discountValue: cfg.discountValue },
        create: {
          tierId: cfg.tierId, serviceId: svc.id,
          discountType: cfg.discountType, discountValue: cfg.discountValue,
          minDiscount: cfg.minDiscount, maxDiscount: cfg.maxDiscount,
        },
      });
    }
  }

  // ─── Benefits ─────────────────────────────────────────────────────

  console.log('Seeding tier benefits...');

  // Clear existing tier benefit mappings to start fresh
  await prisma.communityTierBenefitMapping.deleteMany({
    where: {
      tierId: { in: [primaryTier.id, premiumTier.id, enterpriseTier.id] },
    },
  });

  // Delete old benefits that don't match our new naming
  const oldBenefitTitles = [
    'Digital Membership Card',
    'Service Discounts',
    'Priority Clinic Access',
    'Free Health Checkup',
    'VIP Support Line',
    'Event Priority Registration',
    'PDF Membership Document',
  ];
  for (const title of oldBenefitTitles) {
    const old = await prisma.communityMembershipBenefit.findFirst({ where: { titleEn: title } });
    if (old) {
      await prisma.communityTierBenefitMapping.deleteMany({ where: { benefitId: old.id } });
      await prisma.communityMembershipBenefit.delete({ where: { id: old.id } });
    }
  }

  // ── Primary benefits ──
  const primaryBenefits = [
    { titleEn: 'Digital BPA Community Care Partner Card', titleBn: 'ডিজিটাল বিপিএ কমিউনিটি কেয়ার পার্টনার কার্ড', icon: 'mdi:card-account-details' },
    { titleEn: 'QR Code Verification', titleBn: 'কিউআর কোড ভেরিফিকেশন', icon: 'mdi:qrcode' },
    { titleEn: 'Preferred Clinic Zone Vote', titleBn: 'পছন্দের ক্লিনিক জোন ভোট', icon: 'mdi:vote-outline' },
    { titleEn: 'Partner Clinic Service Discounts', titleBn: 'পার্টনার ক্লিনিক সেবা ডিসকাউন্ট', icon: 'mdi:percent' },
    { titleEn: '5-Year Card Validity', titleBn: '৫ বছর কার্ড বৈধতা', icon: 'mdi:calendar-check' },
  ];

  // ── Premium benefits (all primary + additional) ──
  const premiumAdditional = [
    { titleEn: 'Higher Service Discount', titleBn: 'উচ্চতর সেবা ডিসকাউন্ট', icon: 'mdi:sale' },
    { titleEn: 'Priority Service Support', titleBn: 'অগ্রাধিকার সেবা সহায়তা', icon: 'mdi:headphones' },
    { titleEn: 'Coverage for Up to 10 Pets', titleBn: '১০টি পোষা প্রাণী পর্যন্ত কভারেজ', icon: 'mdi:paw' },
    { titleEn: 'Preferred Clinic/Branch Priority', titleBn: 'পছন্দের ক্লিনিক/শাখা অগ্রাধিকার', icon: 'mdi:hospital-box' },
  ];

  // ── Enterprise benefits (all premium + additional) ──
  const enterpriseAdditional = [
    { titleEn: 'Highest Service Discount', titleBn: 'সর্বোচ্চ সেবা ডিসকাউন্ট', icon: 'mdi:sale' },
    { titleEn: 'Multi-Pet/Family/Shelter Support', titleBn: 'একাধিক পোষা/পরিবার/শেল্টার সমর্থন', icon: 'mdi:home-heart' },
    { titleEn: 'Priority Branch Service', titleBn: 'অগ্রাধিকার শাখা সেবা', icon: 'mdi:star' },
    { titleEn: 'Extended Pet Coverage', titleBn: 'বর্ধিত পোষা প্রাণী কভারেজ', icon: 'mdi:shield-check' },
  ];

  async function createBenefitIfNotExists(data: { titleEn: string; titleBn: string; icon: string }) {
    const existing = await prisma.communityMembershipBenefit.findFirst({ where: { titleEn: data.titleEn } });
    if (existing) return existing.id;
    const benefit = await prisma.communityMembershipBenefit.create({
      data: { titleEn: data.titleEn, titleBn: data.titleBn, icon: data.icon, sortOrder: 0 },
    });
    return benefit.id;
  }

  async function assignBenefitToTier(benefitId: string, tierId: string) {
    await prisma.communityTierBenefitMapping.upsert({
      where: { tierId_benefitId: { tierId, benefitId } },
      update: {},
      create: { tierId, benefitId },
    });
  }

  // Assign Primary benefits to Primary tier
  for (const b of primaryBenefits) {
    const id = await createBenefitIfNotExists(b);
    await assignBenefitToTier(id, primaryTier.id);
    await assignBenefitToTier(id, premiumTier.id);
    await assignBenefitToTier(id, enterpriseTier.id);
  }

  // Assign Premium-specific benefits to Premium and Enterprise
  for (const b of premiumAdditional) {
    const id = await createBenefitIfNotExists(b);
    await assignBenefitToTier(id, premiumTier.id);
    await assignBenefitToTier(id, enterpriseTier.id);
  }

  // Assign Enterprise-specific benefits to Enterprise only
  for (const b of enterpriseAdditional) {
    const id = await createBenefitIfNotExists(b);
    await assignBenefitToTier(id, enterpriseTier.id);
  }

  // ─── Document Templates ──────────────────────────────────────────

  console.log('Seeding default membership documents...');

  const documents = [
    {
      documentType: 'terms_and_conditions',
      titleEn: 'Terms & Conditions', titleBn: 'শর্তাবলী',
      contentEn: '1. This membership is non-transferable.\n2. Benefits are subject to availability at BPA-partnered clinics.\n3. BPA reserves the right to modify benefits with prior notice.\n4. Membership fees are non-refundable except as per the refund policy.',
      contentBn: '১. এই সদস্যপদ হস্তান্তরযোগ্য নয়।\n২. সুবিধাগুলি বিপিএ-এর অংশীদার ক্লিনিকগুলিতে প্রাপ্যতা সাপেক্ষে।\n৩. বিপিএ পূর্ব বিজ্ঞপ্তি সহ সুবিধা পরিবর্তনের অধিকার রাখে।\n৪. ফেরত নীতি অনুযায়ী ছাড়া সদস্যপদ ফি ফেরতযোগ্য নয়।',
    },
    {
      documentType: 'refund_policy',
      titleEn: 'Refund Policy', titleBn: 'ফেরত নীতি',
      contentEn: 'Membership fees are refundable within 14 days of purchase if no benefits have been utilized. After 14 days, no refund shall be provided. Processing fees may apply.',
      contentBn: 'কোনো সুবিধা ব্যবহার না করা হলে ক্রয়ের ১৪ দিনের মধ্যে সদস্যপদ ফি ফেরতযোগ্য। ১৪ দিন পর কোন ফেরত প্রদান করা হবে না। প্রক্রিয়াকরণ ফি প্রযোজ্য হতে পারে।',
    },
    {
      documentType: 'service_availability_policy',
      titleEn: 'Service Availability Policy', titleBn: 'পরিষেবার প্রাপ্যতা নীতি',
      contentEn: 'Services are provided at BPA-partnered veterinary clinics. Availability varies by location and clinic capacity. Emergency services are subject to clinic availability.',
      contentBn: 'পরিষেবাগুলি বিপিএ-এর অংশীদার ভেটেরিনারি ক্লিনিকে প্রদান করা হয়। অবস্থান এবং ক্লিনিক সক্ষমতা অনুযায়ী প্রাপ্যতা পরিবর্তিত হয়। জরুরি সেবা ক্লিনিকের প্রাপ্যতা সাপেক্ষে।',
    },
    {
      documentType: 'discount_policy',
      titleEn: 'Discount Policy', titleBn: 'ডিসকাউন্ট নীতি',
      contentEn: 'Tier-based discounts apply to listed services at partner clinics. Discounts cannot be combined with other offers. BPA reserves the right to change discount rates with 30 days notice.',
      contentBn: 'টিয়ার-ভিত্তিক ডিসকাউন্ট অংশীদার ক্লিনিকগুলিতে তালিকাভুক্ত পরিষেবাগুলিতে প্রযোজ্য। ডিসকাউন্ট অন্যান্য অফারের সাথে একত্রিত করা যাবে না। বিপিএ ৩০ দিনের নোটিশে ডিসকাউন্ট হার পরিবর্তনের অধিকার রাখে।',
    },
    {
      documentType: 'welcome_letter',
      titleEn: 'Welcome to BPA Community Care', titleBn: 'বিপিএ কমিউনিটি কেয়ারে স্বাগতম',
      contentEn: 'Dear Member,\n\nWelcome to the BPA Community Care Partnership Program! We are delighted to have you as a valued member of our community. Your membership helps us provide better veterinary care for pets across Bangladesh.\n\nYour digital card and benefits are now active. Please keep your card number and QR code secure.\n\nThank you for your support!\n\n— BPA Team',
      contentBn: 'প্রিয় সদস্য,\n\nবিপিএ কমিউনিটি কেয়ার পার্টনারশিপ প্রোগ্রামে স্বাগতম! আমাদের সম্প্রদায়ের একজন মূল্যবান সদস্য হিসেবে আপনাকে পেয়ে আমরা আনন্দিত। আপনার সদস্যপদ বাংলাদেশ জুড়ে পোষা প্রাণীদের জন্য আরও ভাল ভেটেরিনারি সেবা প্রদানে সহায়তা করে।\n\nআপনার ডিজিটাল কার্ড এবং সুবিধাগুলি এখন সক্রিয়। অনুগ্রহ করে আপনার কার্ড নম্বর এবং কিউআর কোড নিরাপদে রাখুন।\n\nআপনার সমর্থনের জন্য ধন্যবাদ!\n\n— বিপিএ টিম',
    },
  ];

  for (const doc of documents) {
    const existing = await prisma.communityMembershipDocument.findFirst({
      where: { documentType: doc.documentType, isActive: true },
    });
    if (!existing) {
      await prisma.communityMembershipDocument.create({ data: doc });
    }
  }

  console.log('Community Membership Engine seed complete.');
  console.log('Tiers: Primary (৳3,000 → ৳10,000), Premium (৳5,000 → ৳18,000), Enterprise (৳10,000 → ৳30,000)');
  console.log(`Services: ${serviceData.length}`);
  console.log(`Discounts: ${services.length * 3} configured`);
  console.log('Document templates: 5 types');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
