import { AppError } from '../../utils/AppError';
import * as repo from './donations.repository';
import { initializeEpsPayment, generateMerchantTxnId, isEpsMockModeEnabled } from '../../services/eps.service';
import { prisma } from '../../database/prisma';
import { config } from '../../config';
import QRCode from 'qrcode';
import PDFDocument from 'pdfkit';

const BPA_SUPPORT_EMAIL = 'support@bdpetassociation.org';
const BPA_SUPPORT_PHONE = '+880 1700-000000';
const BPA_FULL_NAME = 'Bangladesh Pet Association';
const RECEIPT_POLICY =
  'This receipt confirms your donation has been received and is non-refundable unless cancelled before processing. ' +
  'BPA is a registered non-profit animal welfare organization. Your contribution is used solely for animal care, ' +
  'rescue, vaccination, and welfare programs.';

function buildGatewayUnavailableError(referenceNo: string) {
  return new AppError(
    503,
    'EPS_UNAVAILABLE',
    'Payment gateway is temporarily unavailable. Please try again later.',
    [{ donationReferenceNo: referenceNo }],
  );
}

function buildMockDonationPaymentUrl(referenceNo: string) {
  return `${config.FRONTEND_URL.replace(/\/$/, '')}/donate/thank-you?ref=${encodeURIComponent(referenceNo)}&mock=1`;
}

async function generateReferenceNo() {
  const year = new Date().getFullYear();
  const prefix = `BPA-DON-${year}-`;
  
  const lastDonation = await prisma.donation.findFirst({
    where: { referenceNo: { startsWith: prefix } },
    orderBy: { referenceNo: 'desc' },
    select: { referenceNo: true },
  });

  let nextNumber = 1;
  if (lastDonation) {
    const lastNum = parseInt(lastDonation.referenceNo.split('-').pop() || '0');
    nextNumber = lastNum + 1;
  }

  return `${prefix}${nextNumber.toString().padStart(5, '0')}`;
}

// ─── Public Facing Initialization ───────────────────────────────

export async function initializeDonation(params: {
  amount: number;
  currency?: string;
  purposeId?: string;
  purposeSlug?: string;
  campaignId?: string;
  campaignSlug?: string;
  donorName: string;
  donorEmail?: string;
  donorPhone?: string;
  donorCountry?: string;
  donorType?: 'INDIVIDUAL' | 'ORGANIZATION' | 'ANONYMOUS';
  organizationName?: string;
  isAnonymous?: boolean;
  showOnDonorWall?: boolean;
  message?: string;
  qrSlug?: string;
  source?: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  if (params.amount < 50) throw AppError.badRequest('Minimum donation amount is BDT 50');

  let resolvedPurposeId = params.purposeId;
  if (params.purposeSlug && !resolvedPurposeId) {
    const p = await repo.findPurposeBySlug(params.purposeSlug);
    if (p) resolvedPurposeId = p.id;
  }

  let resolvedCampaignId = params.campaignId;
  if (params.campaignSlug && !resolvedCampaignId) {
    const c = await repo.findCampaignBySlug(params.campaignSlug);
    if (c) resolvedCampaignId = c.id;
  }

  let resolvedQrId = undefined;
  if (params.qrSlug) {
    const q = await repo.findQrCodeBySlug(params.qrSlug);
    if (q) {
      resolvedQrId = q.id;
      // Inherit purpose/campaign from QR code if not explicitly passed
      if (!resolvedPurposeId && q.purposeId) resolvedPurposeId = q.purposeId;
      if (!resolvedCampaignId && q.campaignId) resolvedCampaignId = q.campaignId;
    }
  }

  if (resolvedPurposeId) {
    const purpose = await repo.findPurposeById(resolvedPurposeId);
    if (!purpose || !purpose.isActive) throw AppError.notFound('Donation purpose not found or inactive');
  }
  if (resolvedCampaignId) {
    const campaign = await repo.findCampaignById(resolvedCampaignId);
    if (!campaign || campaign.status !== 'ACTIVE') {
      throw AppError.notFound('Donation campaign not found or not active');
    }
  }

  const merchantTxnId = generateMerchantTxnId();
  const referenceNo = await generateReferenceNo();

  const { payment, donation } = await prisma.$transaction(async (tx) => {
    const createdPayment = await tx.payment.create({
      data: {
        gateway: 'eps',
        merchantTxnId,
        amount: params.amount,
        currency: params.currency || 'BDT',
        status: 'pending',
        purpose: 'donation',
        entityType: 'donation',
      },
    });

    const createdDonation = await tx.donation.create({
      data: {
        referenceNo,
        amount: params.amount,
        currency: params.currency || 'BDT',
        status: 'pending',
        donorName: params.donorName,
        donorEmail: params.donorEmail,
        donorPhone: params.donorPhone,
        donorCountry: params.donorCountry || 'Bangladesh',
        donorType: params.donorType || 'INDIVIDUAL',
        organizationName: params.organizationName,
        isAnonymous: params.isAnonymous || false,
        showOnDonorWall: params.showOnDonorWall ?? true,
        message: params.message,
        userId: params.userId,
        purposeId: resolvedPurposeId,
        campaignId: resolvedCampaignId,
        qrCodeId: resolvedQrId,
        source: params.source,
        paymentId: createdPayment.id,
        paymentProvider: 'EPS',
      },
    });

    return { payment: createdPayment, donation: createdDonation };
  });

  if (isEpsMockModeEnabled()) {
    await repo.updatePaymentForDonation(payment.id, {
      payload: {
        mode: 'mock',
        mockRedirectUrl: buildMockDonationPaymentUrl(referenceNo),
      },
    });

    return {
      referenceNo: donation.referenceNo,
      paymentUrl: buildMockDonationPaymentUrl(referenceNo),
      mockMode: true,
    };
  }

  try {
    const epsResult = await initializeEpsPayment({
      merchantTransactionId: merchantTxnId,
      customerOrderId: referenceNo,
      totalAmount: params.amount,
      customerName: params.donorName,
      customerEmail: params.donorEmail || 'donor@bpa.org.bd',
      customerPhone: params.donorPhone || '01700000000',
      customerAddress: params.donorCountry || 'Bangladesh',
      customerCity: 'Donation',
      customerState: 'Donation',
      customerPostcode: '1000',
      productName: 'Donation to BPA',
      referenceRef: referenceNo,
    });

    const gatewayPayload = epsResult as unknown as Record<string, unknown>;
    await repo.updatePaymentForDonation(payment.id, {
      gatewayRef:
        typeof gatewayPayload.TransactionId === 'string'
          ? gatewayPayload.TransactionId
          : typeof gatewayPayload.EPSTransactionId === 'string'
            ? gatewayPayload.EPSTransactionId
            : undefined,
      epsTxnId:
        typeof gatewayPayload.EPSTransactionId === 'string'
          ? gatewayPayload.EPSTransactionId
          : undefined,
      payload: gatewayPayload as never,
    });

    return {
      referenceNo: donation.referenceNo,
      paymentUrl: String(gatewayPayload.RedirectURL || ''),
    };
  } catch (error) {
    await Promise.all([
      repo.updatePaymentForDonation(payment.id, {
        status: 'failed',
        payload: {
          code: 'EPS_UNAVAILABLE',
          message: error instanceof Error ? error.message : 'Payment gateway initialization failed',
          failedAt: new Date().toISOString(),
        },
      }),
      repo.updateDonation(donation.id, {
        status: 'pending',
      }),
    ]);

    throw buildGatewayUnavailableError(referenceNo);
  }
}

// ─── Payment Callbacks ──────────────────────────────────────────

import { sendEmail } from '../../services/email.service';
import { sendSms } from '../../services/sms.service';

// ...

export async function settleDonationPayment(paymentId: string) {
  const donation = await repo.findDonationByPaymentId(paymentId);
  if (!donation) return;

  if (donation.status === 'success') return;

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });

  await prisma.$transaction(async (tx) => {
    await tx.donation.update({
      where: { id: donation.id },
      data: { 
        status: 'success',
        paidAt: new Date(),
        gatewayTransactionId: payment?.epsTxnId || undefined,
      },
    });

    if (donation.campaignId) {
      await tx.donationCampaign.update({
        where: { id: donation.campaignId },
        data: { raisedAmount: { increment: donation.amount } },
      });
    }

    if (donation.qrCodeId) {
      await tx.donationQrCode.update({
        where: { id: donation.qrCodeId },
        data: {
          donationCount: { increment: 1 },
          totalRaised: { increment: donation.amount },
        },
      });
    }
  });

  const receiptUrl = `${config.FRONTEND_URL}/donation/receipt/${donation.referenceNo}`;
  const amountFmt = `${donation.currency} ${Number(donation.amount).toLocaleString()}`;

  if (donation.donorEmail) {
    void sendEmail({
      to: donation.donorEmail,
      subject: `Donation Receipt — ${donation.referenceNo} | Bangladesh Pet Association`,
      html: buildDonationReceiptEmail({
        donorName: donation.isAnonymous ? 'Valued Donor' : donation.donorName,
        referenceNo: donation.referenceNo,
        amount: amountFmt,
        campaignTitle: donation.campaign?.titleEn,
        purposeTitle: donation.purpose?.titleEn,
        paidAt: donation.paidAt || donation.createdAt,
        gatewayTransactionId: donation.gatewayTransactionId,
        receiptUrl,
      }),
    }).catch(console.error);
  }

  if (donation.donorPhone) {
    const donorName = donation.isAnonymous ? 'Donor' : donation.donorName.split(' ')[0];
    void sendSms({
      to: donation.donorPhone,
      message: `Dear ${donorName}, BPA received your donation of ${amountFmt}. Ref: ${donation.referenceNo}. View receipt: ${receiptUrl}. Thank you!`,
    }).catch(console.error);
  }
}

function buildDonationReceiptEmail(p: {
  donorName: string;
  referenceNo: string;
  amount: string;
  campaignTitle?: string | null;
  purposeTitle?: string | null;
  paidAt: Date;
  gatewayTransactionId?: string | null;
  receiptUrl: string;
}) {
  const dateStr = p.paidAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const supportLine = `${BPA_SUPPORT_EMAIL} | ${BPA_SUPPORT_PHONE}`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:32px 16px">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
  <tr><td style="background:#1a2540;padding:28px 32px;text-align:center">
    <p style="margin:0;color:#ffffff;font-size:20px;font-weight:bold">Bangladesh Pet Association</p>
    <p style="margin:6px 0 0;color:#aabbcc;font-size:12px">Official Donation Receipt</p>
  </td></tr>
  <tr><td style="padding:32px">
    <p style="margin:0 0 16px;font-size:15px;color:#333">Dear ${p.donorName},</p>
    <p style="margin:0 0 24px;font-size:14px;color:#555;line-height:1.6">
      Thank you for your generous donation to BPA. Your contribution directly supports animal welfare programs across Bangladesh.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:24px">
      <tr style="background:#f9fafb"><td colspan="2" style="padding:12px 16px;font-size:11px;font-weight:bold;color:#888;letter-spacing:0.05em">RECEIPT DETAILS</td></tr>
      ${row('Reference No', `<span style="font-family:monospace;font-weight:bold;color:#1a2540">${p.referenceNo}</span>`)}
      ${row('Date Paid', dateStr)}
      ${row('Amount', `<span style="font-weight:bold;color:#1a6b3c;font-size:16px">${p.amount}</span>`)}
      ${p.campaignTitle ? row('Campaign', p.campaignTitle) : ''}
      ${p.purposeTitle ? row('Purpose', p.purposeTitle) : ''}
      ${p.gatewayTransactionId ? row('Gateway Txn Ref', p.gatewayTransactionId) : ''}
    </table>
    <div style="text-align:center;margin-bottom:24px">
      <a href="${p.receiptUrl}" style="display:inline-block;background:#1a6b3c;color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 28px;border-radius:8px">
        View &amp; Download Receipt
      </a>
    </div>
    <p style="margin:0 0 8px;font-size:12px;color:#888;text-align:center">
      ${RECEIPT_POLICY}
    </p>
  </td></tr>
  <tr><td style="background:#1a2540;padding:20px 32px;text-align:center">
    <p style="margin:0;color:#aabbcc;font-size:11px">Questions? Contact us at ${supportLine}</p>
    <p style="margin:6px 0 0;color:#667799;font-size:10px">This is a system-generated email — please do not reply directly.</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function row(label: string, value: string) {
  return `<tr style="border-top:1px solid #e5e7eb">
    <td style="padding:10px 16px;font-size:12px;color:#888;width:40%">${label}</td>
    <td style="padding:10px 16px;font-size:13px;color:#333">${value}</td>
  </tr>`;
}

export async function cancelDonationPayment(paymentId: string) {
  const donation = await repo.findDonationByPaymentId(paymentId);
  if (!donation || donation.status !== 'pending') return;
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  const status = payment?.status === 'failed' ? 'failed' : 'cancelled';
  await repo.updateDonationStatus(donation.id, status);
}

// ─── Public Helpers ─────────────────────────────────────────────

export async function getDonationStatus(referenceNo: string) {
  const donation = await repo.findDonationByReference(referenceNo);
  if (!donation) throw AppError.notFound('Donation record not found');

  return {
    referenceNo: donation.referenceNo,
    status: donation.status,
    amount: Number(donation.amount),
    currency: donation.currency,
    createdAt: donation.createdAt,
    paidAt: donation.paidAt,
    donorName: donation.isAnonymous ? 'Anonymous Kind Donor' : donation.donorName,
    campaignTitle: donation.campaign?.titleEn || null,
    purposeTitle: donation.purpose?.titleEn || null,
  };
}

export async function getReceiptData(referenceNo: string) {
  const donation = await repo.findDonationByReference(referenceNo);
  if (!donation) throw AppError.notFound('Donation record not found');
  if (donation.status !== 'success') throw AppError.badRequest('Receipt only available for successful donations');

  return {
    referenceNo: donation.referenceNo,
    status: donation.status,
    amount: Number(donation.amount),
    currency: donation.currency,
    createdAt: donation.createdAt,
    paidAt: donation.paidAt,
    donorName: donation.isAnonymous ? 'Anonymous Kind Donor' : donation.donorName,
    isAnonymous: donation.isAnonymous,
    donorEmail: donation.isAnonymous ? undefined : donation.donorEmail,
    donorPhone: donation.isAnonymous ? undefined : donation.donorPhone,
    donorCountry: donation.donorCountry,
    organizationName: donation.organizationName,
    campaignTitle: donation.campaign?.titleEn || null,
    purposeTitle: donation.purpose?.titleEn || null,
    gatewayTransactionId: donation.gatewayTransactionId,
    paymentProvider: donation.paymentProvider,
    verifyUrl: `${config.FRONTEND_URL}/donation/receipt/${donation.referenceNo}`,
    supportEmail: BPA_SUPPORT_EMAIL,
    supportPhone: BPA_SUPPORT_PHONE,
    policy: RECEIPT_POLICY,
  };
}

export async function getDonationPageData() {
  const [purposes, campaigns, settings, donors, stories, transparency, impactCounters, qrCodes] = await Promise.all([
    repo.listPurposes({ isActive: true }),
    repo.listCampaigns({ status: 'ACTIVE', showOnDonatePage: true }),
    repo.getDonationPageSettings(),
    repo.getDonorWall(15),
    repo.listImpactStories({ status: 'PUBLISHED', showOnDonationPage: true }),
    repo.listTransparencyReports({ status: 'PUBLISHED' }).then(res => res[0] || null),
    repo.getDonationImpactCounters(),
    repo.listQrCodes(),
  ]);

  const activeQrCodes = qrCodes.filter((qr) => qr.isActive);
  const qrSection = settings.showQrSection
    ? {
        enabled: true,
        featured: activeQrCodes[0] || null,
        items: activeQrCodes,
      }
    : {
        enabled: false,
        featured: null,
        items: [],
      };

  return {
    settings,
    purposes,
    campaigns,
    featuredCampaigns: campaigns,
    impactCounters: {
      ...impactCounters,
      goalAmount: settings.goalAmount ? Number(settings.goalAmount) : null,
    },
    donors,
    recentDonorWall: donors,
    stories,
    impactStories: stories,
    transparencySummary: transparency,
    qrSection,
  };
}

export async function handleQrRedirect(slug: string) {
  const qr = await repo.findQrCodeBySlug(slug);
  if (!qr || !qr.isActive) throw AppError.notFound('QR code not found or inactive');
  await repo.incrementQrScanCount(qr.id);
  return qr.targetUrl;
}

export async function generateReceiptPdf(referenceNo: string): Promise<Buffer> {
  const d = await repo.findDonationByReference(referenceNo);
  if (!d || d.status !== 'success') throw AppError.badRequest('Donation not found or not paid');

  const verifyUrl = `${config.FRONTEND_URL}/donation/receipt/${d.referenceNo}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 120, margin: 1 });
  const qrBuffer = Buffer.from(qrDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');

  const paidAt = d.paidAt || d.createdAt;
  const dateStr = paidAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr = paidAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
  const donorName = d.isAnonymous ? 'Anonymous Kind Donor' : d.donorName;
  const amountFormatted = `${d.currency} ${Number(d.amount).toLocaleString()}`;

  const NAVY = '#1a2540';
  const GREEN = '#1a6b3c';
  const LIGHT_GRAY = '#f5f5f5';
  const MID_GRAY = '#888888';
  const PAGE_W = 595.28;
  const MARGIN = 50;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: MARGIN, info: {
      Title: `Donation Receipt — ${d.referenceNo}`,
      Author: BPA_FULL_NAME,
    }});
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ── Header band ──
    doc.rect(0, 0, PAGE_W, 90).fill(NAVY);
    doc.fillColor('white').fontSize(20).font('Helvetica-Bold')
      .text(BPA_FULL_NAME, MARGIN, 20, { width: CONTENT_W, align: 'center' });
    doc.fontSize(11).font('Helvetica')
      .text('Official Donation Receipt', MARGIN, 46, { width: CONTENT_W, align: 'center' });
    doc.fontSize(9).fillColor('#aabbcc')
      .text(`Receipt verified at: ${verifyUrl}`, MARGIN, 66, { width: CONTENT_W, align: 'center' });

    let y = 110;

    // ── Reference + Date row ──
    doc.fillColor(MID_GRAY).fontSize(7).font('Helvetica-Bold')
      .text('REFERENCE NO', MARGIN, y).text('DATE PAID', MARGIN + CONTENT_W / 2, y);
    y += 12;
    doc.fillColor(NAVY).fontSize(12).font('Helvetica-Bold')
      .text(d.referenceNo, MARGIN, y);
    doc.fillColor(NAVY).fontSize(10).font('Helvetica')
      .text(`${dateStr} ${timeStr}`, MARGIN + CONTENT_W / 2, y);
    y += 28;

    // ── Divider ──
    doc.moveTo(MARGIN, y).lineTo(MARGIN + CONTENT_W, y).strokeColor('#e0e0e0').lineWidth(0.5).stroke();
    y += 14;

    // ── Donor + Payment split ──
    const COL_W = (CONTENT_W - 20) / 2;
    doc.fillColor(MID_GRAY).fontSize(7).font('Helvetica-Bold').text('DONOR', MARGIN, y);
    doc.text('PAYMENT DETAILS', MARGIN + COL_W + 20, y);
    y += 12;

    doc.fillColor(NAVY).fontSize(10).font('Helvetica-Bold').text(donorName, MARGIN, y);
    doc.fillColor('#333333').fontSize(9).font('Helvetica');
    let donorY = y + 14;
    if (!d.isAnonymous && d.organizationName) { doc.text(d.organizationName, MARGIN, donorY); donorY += 13; }
    if (!d.isAnonymous && d.donorEmail) { doc.text(d.donorEmail, MARGIN, donorY); donorY += 13; }
    if (d.donorCountry) { doc.text(d.donorCountry, MARGIN, donorY); }

    let payY = y;
    const payX = MARGIN + COL_W + 20;
    doc.fillColor('#555555').fontSize(9).font('Helvetica');
    const payLines: [string, string][] = [
      ['Status', 'PAID'],
      ['Method', d.paymentProvider || 'EPS Gateway'],
      ['Txn Ref', d.gatewayTransactionId || 'N/A'],
    ];
    for (const [label, val] of payLines) {
      doc.font('Helvetica-Bold').text(label + ': ', payX, payY, { continued: true })
        .font('Helvetica').text(val);
      payY += 13;
    }

    y = Math.max(donorY, payY) + 18;

    // ── Items table ──
    doc.rect(MARGIN, y, CONTENT_W, 22).fill(NAVY);
    doc.fillColor('white').fontSize(8).font('Helvetica-Bold')
      .text('DESCRIPTION', MARGIN + 8, y + 7)
      .text('AMOUNT', MARGIN + CONTENT_W - 70, y + 7);
    y += 22;

    doc.rect(MARGIN, y, CONTENT_W, 60).fill(LIGHT_GRAY);
    doc.fillColor(NAVY).fontSize(10).font('Helvetica-Bold')
      .text(`Donation to ${BPA_FULL_NAME}`, MARGIN + 8, y + 10);
    doc.fillColor('#555555').fontSize(8.5).font('Helvetica');
    let itemSubY = y + 24;
    if (d.campaign?.titleEn) { doc.text(`Campaign: ${d.campaign.titleEn}`, MARGIN + 8, itemSubY); itemSubY += 12; }
    if (d.purpose?.titleEn) { doc.text(`Purpose: ${d.purpose.titleEn}`, MARGIN + 8, itemSubY); }
    if (!d.campaign?.titleEn && !d.purpose?.titleEn) { doc.text('General Fund', MARGIN + 8, itemSubY); }

    doc.fillColor(NAVY).fontSize(12).font('Helvetica-Bold')
      .text(amountFormatted, MARGIN + CONTENT_W - 75, y + 18, { width: 65, align: 'right' });
    y += 60;

    // ── Total row ──
    doc.rect(MARGIN, y, CONTENT_W, 30).fill('#e8f5ee');
    doc.fillColor(GREEN).fontSize(11).font('Helvetica-Bold')
      .text('TOTAL PAID', MARGIN + 8, y + 9)
      .text(amountFormatted, MARGIN + CONTENT_W - 75, y + 9, { width: 65, align: 'right' });
    y += 40;

    // ── QR + Thank you ──
    const QR_SIZE = 80;
    doc.image(qrBuffer, MARGIN, y, { width: QR_SIZE, height: QR_SIZE });
    doc.fillColor(MID_GRAY).fontSize(7).font('Helvetica')
      .text('Scan to verify', MARGIN, y + QR_SIZE + 3, { width: QR_SIZE, align: 'center' });

    const msgX = MARGIN + QR_SIZE + 16;
    const msgW = CONTENT_W - QR_SIZE - 16;
    doc.fillColor(NAVY).fontSize(12).font('Helvetica-Bold')
      .text('Thank you for your generous gift!', msgX, y + 2, { width: msgW });
    doc.fillColor('#555555').fontSize(8.5).font('Helvetica').moveDown(0.3)
      .text(
        'Your contribution creates a compassionate society for animals in Bangladesh. ' +
        'Every donation directly funds veterinary care, food, rescue operations, and vaccination programs.',
        msgX, y + 20, { width: msgW }
      );
    y += QR_SIZE + 20;

    // ── Policy ──
    y += 10;
    doc.moveTo(MARGIN, y).lineTo(MARGIN + CONTENT_W, y).strokeColor('#e0e0e0').lineWidth(0.5).stroke();
    y += 8;
    doc.fillColor(MID_GRAY).fontSize(7).font('Helvetica').text(RECEIPT_POLICY, MARGIN, y, { width: CONTENT_W });

    // ── Footer ──
    const footerY = 760;
    doc.rect(0, footerY, PAGE_W, 82).fill(NAVY);
    doc.fillColor('white').fontSize(8.5).font('Helvetica-Bold')
      .text(BPA_FULL_NAME, MARGIN, footerY + 10, { width: CONTENT_W, align: 'center' });
    doc.fillColor('#aabbcc').fontSize(8).font('Helvetica')
      .text(`Email: ${BPA_SUPPORT_EMAIL}  |  Phone: ${BPA_SUPPORT_PHONE}`, MARGIN, footerY + 26, { width: CONTENT_W, align: 'center' })
      .text(`${config.FRONTEND_URL}`, MARGIN, footerY + 40, { width: CONTENT_W, align: 'center' });
    doc.fillColor('#667799').fontSize(7)
      .text('This is a computer-generated receipt and does not require a signature.', MARGIN, footerY + 56, { width: CONTENT_W, align: 'center' });

    doc.end();
  });
}

// ─── Admin Services ─────────────────────────────────────────────

export async function exportDonationsCsv(): Promise<string> {
  const donations = await repo.getDonationsForExport();
  const header = ['Reference No', 'Date', 'Donor Name', 'Amount', 'Currency', 'Status', 'Campaign', 'Purpose', 'Payment Gateway ID'];
  
  const rows = donations.map(d => [
    d.referenceNo,
    d.createdAt.toISOString(),
    `"${d.donorName.replace(/"/g, '""')}"`,
    d.amount.toString(),
    d.currency,
    d.status,
    `"${d.campaign?.titleEn || ''}"`,
    `"${d.purpose?.titleEn || ''}"`,
    d.gatewayTransactionId || '',
  ]);

  return [header.join(','), ...rows.map(r => r.join(','))].join('\n');
}

export async function generateQrImage(targetUrl: string): Promise<string> {
  return QRCode.toDataURL(targetUrl, { width: 400, margin: 2 });
}
