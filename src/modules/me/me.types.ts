// ─── Dashboard Summary Response Types ───────────────────────────────────────

export interface DashboardUserSection {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  memberId: string;
  role: string;
  status: string;
  joinedAt: Date;
  profileCompletion: number;
}

export interface DashboardMembershipSection {
  purchaseId: string;
  tierName: string;
  tierSlug: string;
  status: string;
  amountBdt: number;
  startedAt: string | null;
  expiresAt: string | null;
  renewalDate: string | null;
  canUpgrade: boolean;
  petLimit: number;
  cardNumber: string | null;
  cardStatus: string | null;
  cardQrToken: string | null;
  verifyUrl: string | null;
  preferredZone: string | null;
}

export interface DashboardPetItem {
  id: string;
  name: string;
  petType: string;
  gender: string;
  breed: string | null;
  approxAge: number | null;
  isActive: boolean;
}

export interface DashboardPetsSection {
  total: number;
  items: DashboardPetItem[];
}

export interface DashboardBookingItem {
  id: string;
  bookingNumber: string;
  campaignTitle: string;
  campaignSlug: string;
  sessionDate: string;
  petCount: number;
  status: string;
  paymentStatus: string | null;
  totalAmountBdt: number;
  hasCertificate: boolean;
  certificateNumber: string | null;
  verifyToken: string | null;
  createdAt: Date;
}

export interface DashboardBookingsSection {
  total: number;
  upcoming: number;
  latest: DashboardBookingItem[];
}

export interface DashboardContributionItem {
  id: string;
  contributionNumber: string;
  amountBdt: number;
  status: string;
  planTitle: string;
  zoneName: string;
  zoneSlug: string;
  createdAt: Date;
}

export interface DashboardContributionsSection {
  totalAmount: number;
  totalCount: number;
  paidCount: number;
  pendingCount: number;
  latest: DashboardContributionItem[];
  byZone: Array<{ zoneName: string; amount: number; count: number }>;
}

export interface DashboardCarePartnerCardSection {
  cardId: string;
  cardNumber: string;
  status: string;
  qrToken: string;
  verifyUrl: string;
  issuedAt: string | null;
  expiresAt: string | null;
  zone: string;
  zoneSlug: string;
}

export interface DashboardImpactSection {
  score: number;
  vaccinatedPets: number;
  supportedAnimals: number;
  certificatesIssued: number;
  campaignsParticipated: number;
  contributionsMade: number;
}

export interface DashboardDocumentItem {
  id: string;
  type: string;
  title: string;
  reference: string;
  issuedAt: string;
  downloadUrl: string | null;
  verifyUrl: string | null;
}

export interface DashboardNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  actionUrl: string | null;
}

export interface DashboardTransparencySection {
  totalRaisedBdt: number;
  totalContributors: number;
  userContributionShare: number;
  activeZones: number;
  totalZones: number;
  latestReportTitle: string | null;
  latestReportSlug: string | null;
  latestReportPublishedAt: string | null;
}

export interface DashboardActivity {
  id: string;
  type: string;
  title: string;
  description: string;
  referenceNumber: string | null;
  occurredAt: Date;
}

export interface DashboardSummaryResponse {
  user: DashboardUserSection;
  membership: DashboardMembershipSection | null;
  pets: DashboardPetsSection;
  bookings: DashboardBookingsSection;
  contributions: DashboardContributionsSection;
  carePartnerCard: DashboardCarePartnerCardSection | null;
  impact: DashboardImpactSection;
  documents: DashboardDocumentItem[];
  notifications: DashboardNotification[];
  transparency: DashboardTransparencySection;
  recentActivities: DashboardActivity[];
}
