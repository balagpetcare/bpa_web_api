jest.mock('../../../database/prisma', () => ({
  prisma: {
    donation: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('../donations.repository', () => ({
  findPurposeBySlug: jest.fn(),
  findCampaignBySlug: jest.fn(),
  findQrCodeBySlug: jest.fn(),
  findPurposeById: jest.fn(),
  findCampaignById: jest.fn(),
  updatePaymentForDonation: jest.fn(),
  updateDonation: jest.fn(),
  listPurposes: jest.fn(),
  listCampaigns: jest.fn(),
  getDonationPageSettings: jest.fn(),
  getDonorWall: jest.fn(),
  listImpactStories: jest.fn(),
  listTransparencyReports: jest.fn(),
  getDonationImpactCounters: jest.fn(),
  listQrCodes: jest.fn(),
}));

jest.mock('../../../services/eps.service', () => ({
  generateMerchantTxnId: jest.fn(),
  initializeEpsPayment: jest.fn(),
  isEpsMockModeEnabled: jest.fn(),
}));

jest.mock('../../../services/email.service', () => ({
  sendEmail: jest.fn(),
}));

jest.mock('../../../services/sms.service', () => ({
  sendSms: jest.fn(),
}));

jest.mock('../../../config', () => ({
  config: {
    FRONTEND_URL: 'http://localhost:3000',
  },
}));

import { prisma } from '../../../database/prisma';
import * as repo from '../donations.repository';
import { generateMerchantTxnId, initializeEpsPayment, isEpsMockModeEnabled } from '../../../services/eps.service';
import { getDonationPageData, initializeDonation } from '../donations.service';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockRepo = repo as jest.Mocked<typeof repo>;
const mockGenerateMerchantTxnId = generateMerchantTxnId as jest.MockedFunction<typeof generateMerchantTxnId>;
const mockInitializeEpsPayment = initializeEpsPayment as jest.MockedFunction<typeof initializeEpsPayment>;
const mockIsEpsMockModeEnabled = isEpsMockModeEnabled as jest.MockedFunction<typeof isEpsMockModeEnabled>;

describe('donations.service initializeDonation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateMerchantTxnId.mockReturnValue('20260618112233444');
    mockIsEpsMockModeEnabled.mockReturnValue(false);
    (mockPrisma.donation.findFirst as jest.Mock).mockResolvedValue(null);
    mockRepo.findPurposeById.mockResolvedValue(null as never);
    mockRepo.findCampaignById.mockResolvedValue(null as never);
    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: (tx: any) => Promise<unknown>) => {
      const tx = {
        payment: {
          create: jest.fn().mockResolvedValue({
            id: 'payment-1',
            merchantTxnId: '20260618112233444',
          }),
        },
        donation: {
          create: jest.fn().mockResolvedValue({
            id: 'donation-1',
            referenceNo: 'BPA-DON-2026-00001',
          }),
        },
      };
      return callback(tx);
    });
  });

  it('commits donation rows before calling EPS and returns redirect URL on success', async () => {
    const sequence: string[] = [];
    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: (tx: any) => Promise<unknown>) => {
      const tx = {
        payment: {
          create: jest.fn().mockImplementation(async () => {
            sequence.push('payment:create');
            return { id: 'payment-1', merchantTxnId: '20260618112233444' };
          }),
        },
        donation: {
          create: jest.fn().mockImplementation(async () => {
            sequence.push('donation:create');
            return { id: 'donation-1', referenceNo: 'BPA-DON-2026-00001' };
          }),
        },
      };
      const result = await callback(tx);
      sequence.push('transaction:committed');
      return result;
    });
    mockInitializeEpsPayment.mockImplementation(async () => {
      sequence.push('eps:initialize');
      return {
        RedirectURL: 'https://sandbox.eps/pay/1',
        TransactionId: 'gateway-1',
      } as never;
    });

    const result = await initializeDonation({
      amount: 500,
      donorName: 'Test Donor',
      donorPhone: '01711000000',
    });

    expect(result).toEqual({
      referenceNo: 'BPA-DON-2026-00001',
      paymentUrl: 'https://sandbox.eps/pay/1',
    });
    expect(sequence).toEqual([
      'payment:create',
      'donation:create',
      'transaction:committed',
      'eps:initialize',
    ]);
    expect(mockRepo.updatePaymentForDonation).toHaveBeenCalledWith(
      'payment-1',
      expect.objectContaining({
        gatewayRef: 'gateway-1',
        payload: expect.objectContaining({
          RedirectURL: 'https://sandbox.eps/pay/1',
        }),
      }),
    );
  });

  it('does not roll back committed donation records when EPS is unavailable', async () => {
    mockInitializeEpsPayment.mockRejectedValue(new Error('connect ECONNREFUSED'));

    await expect(
      initializeDonation({
        amount: 500,
        donorName: 'Test Donor',
        donorPhone: '01711000000',
      }),
    ).rejects.toMatchObject({
      statusCode: 503,
      code: 'EPS_UNAVAILABLE',
    });

    expect(mockRepo.updatePaymentForDonation).toHaveBeenCalledWith(
      'payment-1',
      expect.objectContaining({
        status: 'failed',
        payload: expect.objectContaining({
          code: 'EPS_UNAVAILABLE',
        }),
      }),
    );
    expect(mockRepo.updateDonation).toHaveBeenCalledWith(
      'donation-1',
      expect.objectContaining({ status: 'pending' }),
    );
  });

  it('returns a local mock URL when EPS mock mode is enabled', async () => {
    mockIsEpsMockModeEnabled.mockReturnValue(true);

    const result = await initializeDonation({
      amount: 700,
      donorName: 'Mock Donor',
      donorPhone: '01711000000',
    });

    expect(result).toEqual({
      referenceNo: 'BPA-DON-2026-00001',
      paymentUrl: 'http://localhost:3000/donate/thank-you?ref=BPA-DON-2026-00001&mock=1',
      mockMode: true,
    });
    expect(mockInitializeEpsPayment).not.toHaveBeenCalled();
  });
});

describe('donations.service getDonationPageData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the full donation landing payload including aliases and QR section', async () => {
    mockRepo.listPurposes.mockResolvedValue([{ id: 'purpose-1' }] as never);
    mockRepo.listCampaigns.mockResolvedValue([{ id: 'campaign-1' }] as never);
    mockRepo.getDonationPageSettings.mockResolvedValue({
      id: 'settings-1',
      showQrSection: true,
      goalAmount: { toString: () => '5000', toFixed: () => '5000.00', toDecimalPlaces: () => ({}) },
    } as never);
    mockRepo.getDonorWall.mockResolvedValue([{ id: 'donor-1' }] as never);
    mockRepo.listImpactStories.mockResolvedValue([{ id: 'story-1' }] as never);
    mockRepo.listTransparencyReports.mockResolvedValue([{ id: 'report-1' }] as never);
    mockRepo.getDonationImpactCounters.mockResolvedValue({
      successfulDonations: 3,
      totalRaised: 1200,
      donorCount: 2,
    });
    mockRepo.listQrCodes.mockResolvedValue([
      { id: 'qr-1', isActive: true },
      { id: 'qr-2', isActive: false },
    ] as never);

    const result = await getDonationPageData();

    expect(result).toMatchObject({
      purposes: [{ id: 'purpose-1' }],
      campaigns: [{ id: 'campaign-1' }],
      featuredCampaigns: [{ id: 'campaign-1' }],
      recentDonorWall: [{ id: 'donor-1' }],
      impactStories: [{ id: 'story-1' }],
      transparencySummary: { id: 'report-1' },
      impactCounters: {
        successfulDonations: 3,
        totalRaised: 1200,
        donorCount: 2,
        goalAmount: 5000,
      },
      qrSection: {
        enabled: true,
        featured: { id: 'qr-1', isActive: true },
        items: [{ id: 'qr-1', isActive: true }],
      },
    });
  });
});
