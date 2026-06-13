import { config } from '../config';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  if (!config.EMAIL_HOST || !config.EMAIL_USER) {
    console.warn('[EmailService] Email not configured — skipping send');
    return;
  }

  // Placeholder: integrate nodemailer or an HTTP email provider here.
  // The interface is provider-agnostic; swap the transport without changing callers.
  console.log(`[EmailService] Sending email to ${options.to}: ${options.subject}`);
}

export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  await sendEmail({
    to,
    subject: 'Welcome to Bangladesh Pet Association',
    html: `<p>Dear ${name},</p><p>Welcome to BPA! We are glad to have you.</p>`,
  });
}

export async function sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
  await sendEmail({
    to,
    subject: 'Password Reset Request',
    html: `<p>Click <a href="${resetLink}">here</a> to reset your password. This link expires in 1 hour.</p>`,
  });
}
