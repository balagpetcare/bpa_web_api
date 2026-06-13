export interface ZoneStat {
  id: string;
  name: string;
  slug: string;
  targetContributors: number;
  currentContributors: number;
  targetAmountBdt: number;
  currentAmountBdt: number;
  progressPercent: number;
}

export interface CommunityFundOverview {
  totalContributors: number;
  totalAmountBdt: number;
  zones: {
    id: string;
    name: string;
    slug: string;
    targetContributors: number;
    currentContributors: number;
    targetAmountBdt: number;
    currentAmountBdt: number;
    progressPercent: number;
    clinicAddress: string | null;
    coverImage: { id: string; url: string; altText: string | null } | null;
  }[];
}

export interface CommunityFundDashboard {
  totalContributors: number;
  totalAmountBdt: number;
  totalCards: number;
  totalActiveCards: number;
  totalCensusSubmissions: number;
  zones: ZoneStat[];
  recentContributions: {
    id: string;
    contributionNumber: string;
    contributorName: string | null;
    zoneName: string;
    amountBdt: number;
    status: string;
    createdAt: Date;
  }[];
}
