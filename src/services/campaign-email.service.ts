import { sendEmail } from './email.service';

/**
 * Fire-and-forget campaign email notifications.
 * Never throws — email failure must not affect the main flow.
 */

export function sendRegistrationConfirmationEmail(opts: {
  to: string;
  ownerName: string;
  bookingNumber: string;
  campaignTitle: string;
  sessionDate: string;
  sessionTime: string;
  venueName: string;
  petCount: number;
  totalAmount: string;
  isFree: boolean;
}): void {
  const subject = `Booking Confirmed: ${opts.bookingNumber} — ${opts.campaignTitle}`;
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#1a3c5e">Booking Confirmed!</h2>
      <p>Dear ${opts.ownerName},</p>
      <p>Your booking for <strong>${opts.campaignTitle}</strong> has been confirmed.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px;color:#666">Booking Number</td><td style="padding:8px;font-weight:bold">${opts.bookingNumber}</td></tr>
        <tr style="background:#f9f9f9"><td style="padding:8px;color:#666">Session Date</td><td style="padding:8px">${opts.sessionDate}</td></tr>
        <tr><td style="padding:8px;color:#666">Time</td><td style="padding:8px">${opts.sessionTime}</td></tr>
        <tr style="background:#f9f9f9"><td style="padding:8px;color:#666">Venue</td><td style="padding:8px">${opts.venueName}</td></tr>
        <tr><td style="padding:8px;color:#666">Pets</td><td style="padding:8px">${opts.petCount}</td></tr>
        <tr style="background:#f9f9f9"><td style="padding:8px;color:#666">Amount</td><td style="padding:8px">${opts.isFree ? 'Free' : '৳' + opts.totalAmount}</td></tr>
      </table>
      <p style="color:#666;font-size:14px">Please bring your pets and this booking number on the day of the campaign.</p>
      <p style="color:#666;font-size:14px">Bangladesh Pet Association</p>
    </div>
  `;
  sendEmail({ to: opts.to, subject, html }).catch(() => {});
}

export function sendPaymentConfirmationEmail(opts: {
  to: string;
  ownerName: string;
  bookingNumber: string;
  campaignTitle: string;
  amount: string;
}): void {
  const subject = `Payment Received: ${opts.bookingNumber}`;
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#1a3c5e">Payment Confirmed</h2>
      <p>Dear ${opts.ownerName},</p>
      <p>We have received your payment of ৳${opts.amount} for <strong>${opts.campaignTitle}</strong>.</p>
      <p>Booking reference: <strong>${opts.bookingNumber}</strong></p>
      <p style="color:#666;font-size:14px">Bangladesh Pet Association</p>
    </div>
  `;
  sendEmail({ to: opts.to, subject, html }).catch(() => {});
}
