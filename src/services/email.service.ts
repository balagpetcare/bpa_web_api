import { config } from '../config';
import { renderEmailLayout } from '../modules/emails/layouts/render-email-layout';
import { EmailTemplateRegistry } from '../modules/emails/email-template.registry';

export interface EmailOptions {
  to: string | string[];
  subject?: string;
  html?: string;
  text?: string;
  template?: keyof typeof EmailTemplateRegistry;
  data?: any;
  locale?: 'en' | 'bn';
  layoutKey?: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  const locale = options.locale || 'en';
  let finalSubject = options.subject || '';
  let bodyHtml = options.html || '';
  let plainText = options.text || '';
  let previewText = '';

  if (options.template) {
    const templateFn = EmailTemplateRegistry[options.template];
    if (!templateFn) {
      throw new Error(`Email template ${options.template} not found in registry.`);
    }
    const result = templateFn(options.data || {});
    finalSubject = options.subject || result.subject;
    bodyHtml = result.bodyHtml;
    plainText = result.plainText;
    previewText = result.previewText;
  }

  const wrappedHtml = await renderEmailLayout({
    locale,
    subject: finalSubject,
    previewText,
    bodyHtml,
    layoutKey: options.layoutKey
  });

  if (!config.EMAIL_HOST || !config.EMAIL_USER) {
    console.warn('[EmailService] Email not configured — skipping send');
    console.log(`[EmailService] Would send email to ${options.to}: ${finalSubject} | Layout HTML length: ${wrappedHtml.length} | Plain text length: ${plainText.length}`);
    return;
  }

  // Placeholder: integrate nodemailer or an HTTP email provider here.
  // The interface is provider-agnostic; swap the transport without changing callers.
  console.log(`[EmailService] Sending email to ${options.to}: ${finalSubject} | Layout HTML length: ${wrappedHtml.length}`);
}

export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  await sendEmail({
    to,
    template: 'GENERAL_NOTIFICATION',
    data: {
      title: 'Welcome to Bangladesh Pet Association',
      message: `Dear ${name}, welcome to BPA! We are glad to have you.`,
    },
  });
}

export async function sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
  await sendEmail({
    to,
    template: 'PASSWORD_RESET',
    data: {
      name: 'User',
      resetLink,
    },
  });
}

