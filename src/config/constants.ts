export const RESOURCES = {
  USERS: 'users',
  ROLES: 'roles',
  NEWS: 'news',
  EVENTS: 'events',
  COMMITTEE: 'committee',
  VOLUNTEERS: 'volunteers',
  CONTACTS: 'contacts',
  MEDIA: 'media',
  SEO: 'seo',
  ANALYTICS: 'analytics',
  PAYMENTS: 'payments',
  MEMBERS: 'members',
  HOMEPAGE: 'homepage',
  HERO_SLIDES: 'hero_slides',
  PARTNERS: 'partners',
  FOOTER: 'footer',
  SMS_LOGS: 'sms_logs',
  EMAIL_LOGS: 'email_logs',
  // Campaign Management
  LOCATIONS: 'locations',
  VACCINE_CATALOG: 'vaccine_catalog',
  CERTIFICATE_TEMPLATES: 'certificate_templates',
  PET_OWNERS: 'pet_owners',
  PETS: 'pets',
  DOCTORS: 'doctors',
  CAMPAIGNS: 'campaigns',
  CAMPAIGN_SESSIONS: 'campaign_sessions',
  CAMPAIGN_SERVICES: 'campaign_services',
  CAMPAIGN_CHECKIN: 'campaign_checkin',
  CAMPAIGN_CERTIFICATES: 'campaign_certificates',
  CAMPAIGN_ANALYTICS: 'campaign_analytics',
  // Community Pet Care
  COMMUNITY_ZONES: 'community_zones',
  CONTRIBUTION_PLANS: 'contribution_plans',
  CARE_CONTRIBUTIONS: 'care_contributions',
  CARE_PARTNER_CARDS: 'care_partner_cards',
  CARD_VERIFICATION_LOGS: 'card_verification_logs',
  PET_CENSUS: 'pet_census',
  TRANSPARENCY_REPORTS: 'transparency_reports',
  PET_SMART_SOLUTION: 'pet_smart_solution',
  COMMUNITY_FUND_DASHBOARD: 'community_fund_dashboard',
  // Community Pet Care — Enterprise Content
  CARE_PARTNER_BENEFITS: 'care_partner_benefits',
  SOCIAL_IMPACT_PROGRAMS: 'social_impact_programs',
  ROADMAP_ITEMS: 'roadmap_items',
  DIAGNOSTIC_CENTER_SERVICES: 'diagnostic_center_services',
  SITE_SETTINGS: 'site_settings',
} as const;

export const ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  PUBLISH: 'publish',
  MANAGE: 'manage',
  // Campaign-specific
  CHECKIN: 'checkin',
  ISSUE: 'issue',
  ASSIGN: 'assign',
  LIFECYCLE: 'lifecycle',
} as const;

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  EDITOR: 'editor',
  VIEWER: 'viewer',
  // Campaign roles
  CAMPAIGN_MANAGER: 'campaign_manager',
  CAMPAIGN_VOLUNTEER: 'campaign_volunteer',
  // Community Pet Care
  COMMUNITY_FUND_ADMIN: 'community_fund_admin',
  COMMUNITY_FUND_VIEWER: 'community_fund_viewer',
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  INTERNAL_ERROR: 500,
} as const;

export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
} as const;
