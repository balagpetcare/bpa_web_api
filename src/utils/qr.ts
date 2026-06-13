import { createHmac } from 'crypto';
import { config } from '../config';

export function generateQrToken(petBookingId: string, campaignId: string): string {
  return createHmac('sha256', config.QR_SECRET)
    .update(`${petBookingId}:${campaignId}`)
    .digest('hex');
}

export function buildQrUrl(qrToken: string): string {
  return `${config.FRONTEND_URL}/verify/qr/${qrToken}`;
}
