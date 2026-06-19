import { PrismaClient } from '@prisma/client';

const RESOURCES = [
  'users', 'roles', 'news', 'events', 'committee', 'volunteers', 'contacts',
  'media', 'seo', 'analytics', 'payments', 'members', 'sms_logs', 'email_logs',
  'homepage', 'hero_slides', 'partners', 'footer',
  'locations', 'vaccine_catalog', 'certificate_templates',
  'pet_owners', 'pets', 'doctors',
  'campaigns', 'campaign_sessions', 'campaign_services',
  'campaign_checkin', 'campaign_certificates', 'campaign_analytics',
  'campaign_registrations', 'campaign_waitlist', 'vaccination_records',
  'community_zones', 'contribution_plans', 'care_contributions',
  'care_partner_cards', 'card_verification_logs',
  'pet_census', 'transparency_reports', 'pet_smart_solution',
  'community_fund_dashboard',
  'care_partner_benefits', 'social_impact_programs', 'roadmap_items',
  'diagnostic_center_services', 'site_settings',
  'community_membership_program', 'community_membership_tiers',
  'community_membership_services', 'community_membership_discounts',
  'community_membership_benefits', 'community_membership_purchases',
  'community_membership_cards', 'community_membership_upgrades',
  'community_membership_documents', 'community_membership_dashboard',
  'community_membership_card_verification',
  'donations', 'donation_purposes', 'donation_campaigns',
  'campaign_staff_assignments', 'campaign_scan_logs', 'campaign_vaccinations',
];

const ACTIONS = [
  'create', 'read', 'update', 'delete', 'publish', 'manage',
  'checkin', 'issue', 'assign', 'lifecycle',
];

type RoleDef = {
  name: string;
  description: string;
  resources: string[];
  actions: string[];
};

const ROLE_DEFS: RoleDef[] = [
  {
    name: 'super_admin',
    description: 'Full system access',
    resources: RESOURCES,
    actions: ACTIONS,
  },
  {
    name: 'admin',
    description: 'All CMS and campaign modules, no role management',
    resources: [
      'news', 'events', 'committee', 'media', 'seo', 'volunteers', 'contacts', 'analytics',
      'payments', 'members', 'sms_logs', 'email_logs', 'homepage', 'hero_slides', 'partners', 'footer',
      'locations', 'vaccine_catalog', 'certificate_templates',
      'pet_owners', 'pets', 'doctors',
      'campaigns', 'campaign_sessions', 'campaign_services',
      'campaign_checkin', 'campaign_certificates', 'campaign_analytics',
      'campaign_registrations', 'campaign_waitlist', 'vaccination_records',
      'community_zones', 'contribution_plans', 'care_contributions',
      'care_partner_cards', 'card_verification_logs',
      'pet_census', 'transparency_reports', 'pet_smart_solution',
      'community_fund_dashboard',
      'care_partner_benefits', 'social_impact_programs', 'roadmap_items',
      'diagnostic_center_services', 'site_settings',
      'community_membership_program', 'community_membership_tiers',
      'community_membership_services', 'community_membership_discounts',
      'community_membership_benefits', 'community_membership_purchases',
      'community_membership_cards', 'community_membership_upgrades',
      'community_membership_documents', 'community_membership_dashboard',
      'community_membership_card_verification',
      'donations', 'donation_purposes', 'donation_campaigns',
      'campaign_staff_assignments', 'campaign_scan_logs', 'campaign_vaccinations',
    ],
    actions: ACTIONS,
  },
  {
    name: 'editor',
    description: 'News, Events, Committee, CMS only',
    resources: ['news', 'events', 'committee', 'homepage', 'hero_slides', 'partners', 'footer'],
    actions: ['create', 'read', 'update', 'publish'],
  },
  {
    name: 'viewer',
    description: 'Read-only dashboard access',
    resources: RESOURCES,
    actions: ['read'],
  },
  {
    name: 'campaign_manager',
    description: 'Campaign management — create, publish, and operate campaigns',
    resources: [
      'locations', 'vaccine_catalog', 'certificate_templates',
      'pet_owners', 'pets', 'doctors',
      'campaigns', 'campaign_sessions', 'campaign_services',
      'campaign_checkin', 'campaign_certificates', 'campaign_analytics',
      'campaign_registrations', 'campaign_waitlist', 'vaccination_records',
      'campaign_staff_assignments', 'campaign_scan_logs', 'campaign_vaccinations',
      'analytics', 'sms_logs',
    ],
    actions: ['create', 'read', 'update', 'assign', 'lifecycle', 'checkin', 'issue'],
  },
  {
    name: 'campaign_volunteer',
    description: 'Campaign volunteer — scan QR, check in, mark vaccinated, issue certificate',
    resources: [
      'campaigns', 'campaign_sessions', 'campaign_checkin', 'campaign_certificates',
      'campaign_vaccinations', 'pets', 'pet_owners',
    ],
    actions: ['read', 'checkin', 'issue'],
  },
  {
    name: 'community_fund_admin',
    description: 'Community Pet Care fund — full management of zones, contributions, cards, census, and transparency reports',
    resources: [
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
    ],
    actions: ['create', 'read', 'update', 'delete', 'publish', 'manage'],
  },
  {
    name: 'community_fund_viewer',
    description: 'Community Pet Care fund — read-only dashboard access',
    resources: [
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
    ],
    actions: ['read'],
  },
];

export async function seedRolesAndPermissions(prisma: PrismaClient) {
  let permCreated = 0, permSkipped = 0;
  let mappingCreated = 0, mappingSkipped = 0;

  // 1. Upsert all permissions
  const totalPermDefs = RESOURCES.length * ACTIONS.length;
  for (const resource of RESOURCES) {
    for (const action of ACTIONS) {
      await prisma.permission.upsert({
        where: { resource_action: { resource, action } },
        update: {},
        create: { resource, action },
      });
    }
  }
  permCreated = totalPermDefs;

  const allPermissions = await prisma.permission.findMany();

  // 2. Ensure roles exist and sync permissions
  for (const def of ROLE_DEFS) {
    let role = await prisma.role.findFirst({ where: { name: def.name } });
    if (!role) {
      role = await prisma.role.create({ data: { name: def.name, description: def.description } });
    }

    const expectedPerms = allPermissions.filter(
      (p) => def.resources.includes(p.resource) && def.actions.includes(p.action),
    );

    if (def.name === 'super_admin') {
      // Super admin gets ALL permissions
      for (const perm of allPermissions) {
        try {
          await prisma.rolePermission.upsert({
            where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
            update: {},
            create: { roleId: role.id, permissionId: perm.id },
          });
          mappingCreated++;
        } catch {
          mappingSkipped++;
        }
      }
    } else {
      for (const perm of expectedPerms) {
        try {
          await prisma.rolePermission.upsert({
            where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
            update: {},
            create: { roleId: role.id, permissionId: perm.id },
          });
          mappingCreated++;
        } catch {
          mappingSkipped++;
        }
      }
    }

  }

  return {
    permissions: { total: permCreated, skipped: permSkipped },
    roles: { upserted: ROLE_DEFS.length },
    mappings: { upserted: mappingCreated },
  };
}
