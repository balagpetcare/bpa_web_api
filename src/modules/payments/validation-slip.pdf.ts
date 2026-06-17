import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import type { Response } from 'express';
import { config } from '../../config';

type Numeric = number | string | { toString(): string };

export type ValidationSlipData = {
  bookingNumber: string;
  totalAmountBdt: Numeric;
  status: string;
  createdAt: Date;
  campaign: { title: string } | null;
  session: {
    sessionDate: string | Date;
    startTime: string;
    endTime: string;
    venue: { name: string } | null;
  } | null;
  owner: { ownerName: string; mobile: string; email: string | null } | null;
  payment: {
    status: string;
    amount: Numeric;
    merchantTxnId?: string | null;
    epsTxnId?: string | null;
    createdAt?: Date | null;
  } | null;
  petBookings: Array<{ id: string }>;
};

// ─── Status display config ────────────────────────────────────────

type StatusConfig = {
  label: string;
  bannerBg: [number, number, number];
  bannerText: [number, number, number];
  isPaid: boolean;
  disclaimer: boolean;
};

function resolveStatus(reg: ValidationSlipData): StatusConfig {
  const ps = reg.payment?.status?.toLowerCase() ?? '';
  const rs = reg.status?.toLowerCase() ?? '';

  if (ps === 'success' || rs === 'paid' || rs === 'checked_in' || rs === 'vaccinated' ||
      rs === 'certificate_issued' || rs === 'completed') {
    return {
      label: 'PAID',
      bannerBg: [22, 163, 74],   // green-600
      bannerText: [255, 255, 255],
      isPaid: true,
      disclaimer: false,
    };
  }
  if (ps === 'cancelled' || rs === 'cancelled') {
    return {
      label: 'CANCELLED',
      bannerBg: [239, 68, 68],   // red-500
      bannerText: [255, 255, 255],
      isPaid: false,
      disclaimer: true,
    };
  }
  if (ps === 'failed') {
    return {
      label: 'PAYMENT FAILED',
      bannerBg: [220, 38, 38],   // red-600
      bannerText: [255, 255, 255],
      isPaid: false,
      disclaimer: true,
    };
  }
  if (ps === 'pending_review') {
    return {
      label: 'PENDING REVIEW',
      bannerBg: [217, 119, 6],   // amber-600
      bannerText: [255, 255, 255],
      isPaid: false,
      disclaimer: true,
    };
  }
  // pending or no payment (pay at center)
  return {
    label: 'UNPAID',
    bannerBg: [245, 158, 11],   // amber-400
    bannerText: [0, 0, 0],
    isPaid: false,
    disclaimer: true,
  };
}

function fmtDate(val: string | Date | null | undefined): string {
  if (!val) return '—';
  const d = val instanceof Date ? val : new Date(val);
  if (Number.isNaN(d.getTime())) return String(val);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmt12(t: string): string {
  if (!t) return '';
  const parts = t.split(':').map(Number);
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

export async function streamValidationSlipPdf(reg: ValidationSlipData, res: Response): Promise<void> {
  const sc = resolveStatus(reg);
  const amount = Number(String(reg.payment?.amount ?? reg.totalAmountBdt ?? 0));
  const isFree = amount === 0;

  // QR points to the public payment status page so anyone can verify live status
  let qrDataUri: string | null = null;
  try {
    const frontendBase = config.FRONTEND_URL.replace(/\/$/, '');
    const verifyUrl = `${frontendBase}/payment/status?bookingRef=${encodeURIComponent(reg.bookingNumber)}`;
    qrDataUri = await QRCode.toDataURL(verifyUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 120,
      color: { dark: sc.isPaid ? '#166534' : '#7c2d12', light: '#ffffff' },
    });
  } catch { /* QR failure must not break PDF */ }

  const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: false });
  doc.pipe(res);

  const W = doc.page.width - 100;
  const LEFT = 50;
  const QR_SIZE = 88;

  // ── Top status bar ────────────────────────────────────────────────
  const barColor: [number, number, number] = sc.isPaid ? [22, 163, 74] : [220, 38, 38];
  doc.rect(0, 0, doc.page.width, 8).fill(barColor);

  // ── Header ────────────────────────────────────────────────────────
  doc.moveDown(0.5);
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#0f2d59')
    .text('Bangladesh Pet Association', LEFT, doc.y, { align: 'center', width: W });
  doc.fontSize(9).font('Helvetica').fillColor('#6b7280')
    .text('www.bangladeshpetassociation.com', { align: 'center', width: W });
  doc.moveDown(0.3);
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#374151')
    .text('BOOKING VALIDATION SLIP', { align: 'center', width: W });
  doc.moveDown(0.4);

  doc.moveTo(LEFT, doc.y).lineTo(LEFT + W, doc.y).strokeColor('#e5e7eb').lineWidth(1).stroke();
  doc.moveDown(0.5);

  // ── Big status banner ─────────────────────────────────────────────
  const bannerH = 36;
  const bannerY = doc.y;
  doc.rect(LEFT, bannerY, W, bannerH).fill(sc.bannerBg);
  doc.fontSize(16).font('Helvetica-Bold').fillColor(sc.bannerText)
    .text(sc.label, LEFT, bannerY + 9, { width: W, align: 'center', characterSpacing: 2 });
  doc.y = bannerY + bannerH + 6;

  // ── Disclaimer (for non-paid states) ──────────────────────────────
  if (sc.disclaimer) {
    const disclaimerY = doc.y;
    const disclaimerH = 28;
    doc.rect(LEFT, disclaimerY, W, disclaimerH).fill([254, 243, 199]); // amber-50
    doc.rect(LEFT, disclaimerY, W, disclaimerH).strokeColor([253, 230, 138]).lineWidth(1).stroke();
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor([120, 53, 15])
      .text(
        '⚠  This slip is NOT a payment confirmation unless Payment Status is PAID.',
        LEFT + 12, disclaimerY + 10, { width: W - 24, align: 'center' },
      );
    doc.y = disclaimerY + disclaimerH + 8;
  }

  // ── Booking reference + QR ────────────────────────────────────────
  const refBoxY = doc.y;
  const refBoxH = Math.max(72, QR_SIZE + 18);
  const bgColor: [number, number, number] = sc.isPaid ? [240, 253, 244] : [255, 251, 235];
  const borderColor: [number, number, number] = sc.isPaid ? [187, 247, 208] : [253, 230, 138];

  doc.rect(LEFT, refBoxY, W, refBoxH).fill(bgColor);
  doc.rect(LEFT, refBoxY, W, refBoxH).strokeColor(borderColor).lineWidth(1).stroke();

  doc.fontSize(8).font('Helvetica-Bold').fillColor('#9ca3af')
    .text('BOOKING REFERENCE', LEFT + 14, refBoxY + 10, { characterSpacing: 1.5 });
  doc.fontSize(20).font('Helvetica-Bold').fillColor('#0f2d59')
    .text(reg.bookingNumber, LEFT + 14, refBoxY + 23, { characterSpacing: 1.5 });

  // Payment ref below
  if (reg.payment?.merchantTxnId) {
    doc.fontSize(8).font('Helvetica').fillColor('#6b7280')
      .text(`Payment Ref: ${reg.payment.merchantTxnId}`, LEFT + 14, refBoxY + 50);
  }

  if (qrDataUri) {
    const qrX = LEFT + W - QR_SIZE - 10;
    const qrY = refBoxY + 5;
    const qrImgBuffer = Buffer.from(qrDataUri.split(',')[1]!, 'base64');
    doc.image(qrImgBuffer, qrX, qrY, { width: QR_SIZE, height: QR_SIZE });
    doc.fontSize(6.5).font('Helvetica').fillColor('#6b7280')
      .text('Scan to verify', qrX, qrY + QR_SIZE + 2, { width: QR_SIZE, align: 'center' });
  }

  doc.y = refBoxY + refBoxH + 10;

  // ── Section helpers ───────────────────────────────────────────────
  function divider() {
    doc.moveTo(LEFT, doc.y).lineTo(LEFT + W, doc.y).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
    doc.moveDown(0.4);
  }

  function sectionLabel(label: string) {
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#9ca3af')
      .text(label.toUpperCase(), LEFT, doc.y, { characterSpacing: 1.2, width: W });
    doc.moveDown(0.1);
  }

  function infoRow(label: string, value: string) {
    doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#374151')
      .text(label + ':', LEFT, doc.y, { continued: true, width: 130 })
      .font('Helvetica').fillColor('#111827')
      .text('  ' + (value || '—'), { width: W - 130 });
  }

  // ── Campaign ──────────────────────────────────────────────────────
  if (reg.campaign) {
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#0f2d59')
      .text(reg.campaign.title, LEFT, doc.y, { width: W });
    doc.moveDown(0.5);
  }

  divider();

  // ── Owner ─────────────────────────────────────────────────────────
  if (reg.owner) {
    sectionLabel('Owner');
    infoRow('Name', reg.owner.ownerName);
    infoRow('Mobile', reg.owner.mobile);
    if (reg.owner.email) infoRow('Email', reg.owner.email);
    doc.moveDown(0.4);
  }

  divider();

  // ── Appointment ───────────────────────────────────────────────────
  if (reg.session) {
    sectionLabel('Appointment');
    infoRow('Venue', reg.session.venue?.name ?? '—');
    infoRow('Date', fmtDate(reg.session.sessionDate));
    infoRow('Time', `${fmt12(reg.session.startTime)} – ${fmt12(reg.session.endTime)}`);
    doc.moveDown(0.4);
  }

  divider();

  // ── Payment details ───────────────────────────────────────────────
  sectionLabel('Payment');
  infoRow('Booking Created', fmtDate(reg.createdAt));
  infoRow('Pets', String(reg.petBookings.length));
  infoRow('Amount', isFree ? 'Free' : `BDT ${amount.toLocaleString('en-BD')} /-`);
  infoRow('Payment Status', sc.label);
  if (reg.payment?.merchantTxnId) {
    infoRow('Payment Ref', reg.payment.merchantTxnId);
  }
  if (reg.payment?.epsTxnId) {
    infoRow('Gateway Ref', reg.payment.epsTxnId);
  }
  doc.moveDown(0.8);

  // ── Instructions ─────────────────────────────────────────────────
  const instrY = doc.y;
  const instrLines = sc.isPaid ? 2 : 3;
  const instrH = 14 + instrLines * 18;
  doc.rect(LEFT, instrY, W, instrH).fill([255, 251, 235]);
  doc.rect(LEFT, instrY, W, instrH).strokeColor([253, 230, 138]).lineWidth(1).stroke();
  doc.fontSize(8).font('Helvetica-Bold').fillColor([146, 64, 14])
    .text('IMPORTANT', LEFT + 12, instrY + 7, { characterSpacing: 1 });
  doc.y = instrY + 18;
  doc.fontSize(8).font('Helvetica').fillColor([120, 53, 15]);
  doc.text('EN: Bring this slip or booking reference to the vaccination center.', LEFT + 12, doc.y, { width: W - 24 });
  doc.moveDown(0.2);
  doc.text('BN: ভ্যাকসিনেশন সেন্টারে এই স্লিপ বা বুকিং রেফারেন্স দেখান।', LEFT + 12, doc.y, { width: W - 24 });
  if (!sc.isPaid && !isFree) {
    doc.moveDown(0.2);
    doc.text(`Amount payable at center: BDT ${amount.toLocaleString('en-BD')} /-`, LEFT + 12, doc.y, { width: W - 24 });
  }

  doc.moveDown(1.2);

  // ── Footer ────────────────────────────────────────────────────────
  doc.moveTo(LEFT, doc.y).lineTo(LEFT + W, doc.y).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
  doc.moveDown(0.4);
  const issuedAt = new Date().toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  doc.fontSize(7.5).font('Helvetica').fillColor('#9ca3af')
    .text(`Issued: ${issuedAt}`, LEFT, doc.y, { continued: true, width: W / 2 })
    .text('Bangladesh Pet Association — Validation Slip', { align: 'right', width: W / 2 });

  doc.rect(0, doc.page.height - 8, doc.page.width, 8).fill(barColor);

  doc.end();
}
