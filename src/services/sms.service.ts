import { config } from '../config';
import { prisma } from '../database/prisma';
import { SmsStatus } from '@prisma/client';

export interface SmsOptions {
  to: string;
  message: string;
}

export async function sendSms(options: SmsOptions): Promise<void> {
  const provider = 'mock-gateway';
  console.log(`[SmsService] Sending SMS to ${options.to}: ${options.message}`);

  let status: SmsStatus = SmsStatus.sent;
  let failureReason: string | null = null;
  let sentAt: Date | null = new Date();

  if (config.SMS_API_URL && config.SMS_API_KEY) {
    try {
      const response = await fetch(config.SMS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.SMS_API_KEY}`,
        },
        body: JSON.stringify({
          to: options.to,
          message: options.message,
        }),
      });

      if (!response.ok) {
        throw new Error(`Gateway returned HTTP ${response.status}`);
      }
      status = SmsStatus.sent;
      sentAt = new Date();
    } catch (err: any) {
      console.error('[SmsService] SMS gateway call failed:', err);
      status = SmsStatus.failed;
      failureReason = err.message || String(err);
      sentAt = null;
    }
  } else {
    console.warn('[SmsService] SMS API URL/KEY not configured — simulating successful console send');
    status = SmsStatus.sent;
    sentAt = new Date();
  }

  try {
    await prisma.smsLog.create({
      data: {
        to: options.to,
        body: options.message,
        status,
        provider,
        failureReason,
        sentAt,
      },
    });
  } catch (dbErr) {
    console.error('[SmsService] Failed to create database SmsLog record:', dbErr);
  }
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
