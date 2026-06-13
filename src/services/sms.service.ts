import { config } from '../config';

export interface SmsOptions {
  to: string;
  message: string;
}

export async function sendSms(options: SmsOptions): Promise<void> {
  if (!config.SMS_API_URL || !config.SMS_API_KEY) {
    console.warn('[SmsService] SMS not configured — skipping send');
    return;
  }

  // Placeholder: integrate with SMS gateway HTTP API here.
  // Replace the fetch call with the provider-specific payload format.
  console.log(`[SmsService] Sending SMS to ${options.to}: ${options.message}`);
}

export async function sendOtp(phone: string, otp: string): Promise<void> {
  await sendSms({
    to: phone,
    message: `Your BPA verification code is: ${otp}. Valid for 10 minutes.`,
  });
}

export async function sendMembershipConfirmation(phone: string, name: string): Promise<void> {
  await sendSms({
    to: phone,
    message: `Dear ${name}, your BPA membership has been activated. Thank you for joining!`,
  });
}
