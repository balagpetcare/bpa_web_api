import PDFDocument from 'pdfkit';
import type { Response } from 'express';

type Numeric = number | string | { toString(): string };

type RegistrationData = {
  bookingNumber: string;
  totalAmountBdt: Numeric;
  status: string;
  createdAt: Date;
  campaign: { title: string; basePriceBdt: Numeric } | null;
  session: {
    sessionDate: string | Date;
    startTime: string;
    endTime: string;
    venue: { name: string } | null;
  } | null;
  owner: { ownerName: string; mobile: string; email: string | null } | null;
  payment: { status: string; amount: Numeric } | null;
  petBookings: Array<{
    pet: { name: string; petType: string; breed: string | null } | null;
    services: Array<{ campaignService: { name: string } | null }>;
  }>;
};

function paymentStatusLabel(reg: RegistrationData): { text: string; color: [number, number, number] } {
  const ps = reg.payment?.status?.toLowerCase();
  if (ps === 'success' || ps === 'paid' || reg.status === 'paid') {
    return { text: 'PAID', color: [34, 197, 94] };
  }
  if (reg.status === 'checked_in' || reg.status === 'vaccinated' ||
      reg.status === 'certificate_issued' || reg.status === 'completed') {
    return { text: 'PAID', color: [34, 197, 94] };
  }
  return { text: 'PAY AT CENTER', color: [245, 158, 11] };
}

function fmtDate(val: string | Date | null | undefined): string {
  if (!val) return '—';
  const d = val instanceof Date ? val : new Date(val);
  if (Number.isNaN(d.getTime())) return String(val);
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function fmt12(t: string): string {
  if (!t) return '';
  const parts = t.split(':').map(Number);
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
}

export function streamBookingSlipPdf(reg: RegistrationData, res: Response): void {
  const { text: statusText, color: statusColor } = paymentStatusLabel(reg);
  const amount = Number(String(reg.payment?.amount ?? reg.totalAmountBdt ?? 0));
  const isFree = amount === 0;

  const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: false });
  doc.pipe(res);

  const W = doc.page.width - 100; // usable width (margins on both sides)
  const LEFT = 50;

  // ── Header ─────────────────────────────────────────────────────────────────

  // Green top bar
  doc.rect(0, 0, doc.page.width, 8).fill('#16a34a');

  doc.moveDown(0.5);
  doc
    .fontSize(18)
    .font('Helvetica-Bold')
    .fillColor('#0f2d59')
    .text('Bangladesh Pet Association', LEFT, doc.y, { align: 'center', width: W });

  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor('#6b7280')
    .text('www.bangladeshpetassociation.com', { align: 'center', width: W });

  doc.moveDown(0.3);
  doc
    .fontSize(13)
    .font('Helvetica-Bold')
    .fillColor('#16a34a')
    .text('VACCINATION CAMPAIGN BOOKING SLIP', { align: 'center', width: W });

  doc.moveDown(0.4);
  doc.moveTo(LEFT, doc.y).lineTo(LEFT + W, doc.y).strokeColor('#e5e7eb').lineWidth(1).stroke();
  doc.moveDown(0.5);

  // ── Booking Reference ──────────────────────────────────────────────────────

  const refBoxY = doc.y;
  doc
    .rect(LEFT, refBoxY, W, 60)
    .fillColor('#f0fdf4')
    .fill();
  doc
    .rect(LEFT, refBoxY, W, 60)
    .strokeColor('#bbf7d0')
    .lineWidth(1)
    .stroke();

  doc
    .fontSize(9)
    .font('Helvetica-Bold')
    .fillColor('#6b7280')
    .text('BOOKING REFERENCE', LEFT + 16, refBoxY + 12, { characterSpacing: 1.5 });

  doc
    .fontSize(22)
    .font('Helvetica-Bold')
    .fillColor('#0f2d59')
    .text(reg.bookingNumber, LEFT + 16, refBoxY + 26, { characterSpacing: 2 });

  // Payment status badge
  const badgeX = LEFT + W - 130;
  const badgeY = refBoxY + 18;
  doc
    .rect(badgeX, badgeY, 115, 24)
    .fillColor(statusColor)
    .fill();
  doc
    .fontSize(10)
    .font('Helvetica-Bold')
    .fillColor('#ffffff')
    .text(statusText, badgeX, badgeY + 7, { width: 115, align: 'center' });

  doc.y = refBoxY + 70;
  doc.moveDown(0.6);

  // ── Campaign ───────────────────────────────────────────────────────────────

  if (reg.campaign) {
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#0f2d59')
      .text(reg.campaign.title, LEFT, doc.y, { width: W });
    doc.moveDown(0.4);
  }

  // ── Info sections ──────────────────────────────────────────────────────────

  function sectionLabel(label: string) {
    doc
      .fontSize(8)
      .font('Helvetica-Bold')
      .fillColor('#9ca3af')
      .text(label.toUpperCase(), LEFT, doc.y, { characterSpacing: 1.2, width: W });
    doc.moveDown(0.1);
  }

  function infoRow(label: string, value: string, indent = 0) {
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#374151')
      .text(label + ':', LEFT + indent, doc.y, { continued: true, width: 120 })
      .font('Helvetica')
      .fillColor('#111827')
      .text('  ' + (value || '—'), { width: W - 120 - indent });
  }

  doc.moveTo(LEFT, doc.y).lineTo(LEFT + W, doc.y).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
  doc.moveDown(0.4);

  // Owner
  if (reg.owner) {
    sectionLabel('Owner');
    infoRow('Name', reg.owner.ownerName);
    infoRow('Mobile', reg.owner.mobile);
    if (reg.owner.email) infoRow('Email', reg.owner.email);
    doc.moveDown(0.4);
  }

  // Session / Venue
  if (reg.session) {
    doc.moveTo(LEFT, doc.y).lineTo(LEFT + W, doc.y).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
    doc.moveDown(0.4);
    sectionLabel('Appointment');
    infoRow('Venue', reg.session.venue?.name ?? '—');
    infoRow('Date', fmtDate(reg.session.sessionDate));
    infoRow('Time', `${fmt12(reg.session.startTime)} – ${fmt12(reg.session.endTime)}`);
    doc.moveDown(0.4);
  }

  // Pets
  if (reg.petBookings.length > 0) {
    doc.moveTo(LEFT, doc.y).lineTo(LEFT + W, doc.y).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
    doc.moveDown(0.4);
    sectionLabel(`Pets (${reg.petBookings.length})`);

    for (const pb of reg.petBookings) {
      if (!pb.pet) continue;
      const petLabel = `${pb.pet.name} — ${capitalize(pb.pet.petType)}${pb.pet.breed ? ', ' + pb.pet.breed : ''}`;
      const serviceNames = pb.services
        .map(s => s.campaignService?.name)
        .filter(Boolean)
        .join(', ');
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#0f2d59')
        .text(petLabel, LEFT + 8, doc.y);
      if (serviceNames) {
        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor('#6b7280')
          .text('Services: ' + serviceNames, LEFT + 8, doc.y);
      }
      doc.moveDown(0.2);
    }
    doc.moveDown(0.2);
  }

  // Amount
  doc.moveTo(LEFT, doc.y).lineTo(LEFT + W, doc.y).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
  doc.moveDown(0.4);
  sectionLabel('Payment');

  const amountText = isFree ? 'Free (No charge)' : `BDT ${amount.toLocaleString('en-BD')} /-`;
  infoRow('Amount', amountText);
  infoRow('Status', statusText === 'PAID' ? 'Paid' : 'Pay at vaccination center');
  doc.moveDown(0.8);

  // ── Instructions ───────────────────────────────────────────────────────────

  const instrY = doc.y;
  doc
    .rect(LEFT, instrY, W, statusText === 'PAID' ? 60 : 90)
    .fillColor('#fffbeb')
    .fill();
  doc
    .rect(LEFT, instrY, W, statusText === 'PAID' ? 60 : 90)
    .strokeColor('#fde68a')
    .lineWidth(1)
    .stroke();

  doc
    .fontSize(9)
    .font('Helvetica-Bold')
    .fillColor('#92400e')
    .text('IMPORTANT INSTRUCTIONS', LEFT + 14, instrY + 10, { characterSpacing: 1 });

  doc.y = instrY + 22;
  doc
    .fontSize(9)
    .font('Helvetica')
    .fillColor('#78350f');

  if (statusText === 'PAID') {
    doc.text(
      '• Bring this booking slip (printed or on your phone) to the vaccination center.',
      LEFT + 14, doc.y, { width: W - 28 },
    );
    doc.moveDown(0.3);
    doc.text(
      '• Arrive at your selected time slot. Present your booking reference at the entrance.',
      LEFT + 14, doc.y, { width: W - 28 },
    );
  } else {
    doc.text(
      '• Your booking is confirmed. Payment can be made at the vaccination center.',
      LEFT + 14, doc.y, { width: W - 28 },
    );
    doc.moveDown(0.3);
    doc.text(
      '• Bring this slip (printed or on your phone) and quote your Booking Reference on arrival.',
      LEFT + 14, doc.y, { width: W - 28 },
    );
    doc.moveDown(0.3);
    doc.text(
      '• Amount payable at center: ' + amountText,
      LEFT + 14, doc.y, { width: W - 28 },
    );
  }

  doc.moveDown(1.2);

  // ── Footer ─────────────────────────────────────────────────────────────────

  doc.moveTo(LEFT, doc.y).lineTo(LEFT + W, doc.y).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
  doc.moveDown(0.4);

  const issuedAt = new Date().toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  doc
    .fontSize(8)
    .font('Helvetica')
    .fillColor('#9ca3af')
    .text(`Issued: ${issuedAt}`, LEFT, doc.y, { continued: true, width: W / 2 })
    .text('Bangladesh Pet Association — Official Booking Slip', { align: 'right', width: W / 2 });

  // Green bottom bar
  const pageH = doc.page.height;
  doc.rect(0, pageH - 8, doc.page.width, 8).fill('#16a34a');

  doc.end();
}
