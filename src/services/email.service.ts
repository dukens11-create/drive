/**
 * Email service – sends transactional emails via SendGrid using HTML templates.
 * Falls back to a stub log when SendGrid credentials are not configured.
 */
import { env } from '../config/env';
import { logNotification } from '../utils/notification-logger';
import { emailTemplates } from '../utils/email-templates';
import { logger } from '../utils/logger';

async function sendViaSendGrid(to: string, subject: string, html: string): Promise<string | undefined> {
  if (env.sendGridApiKey && env.sendGridFromEmail) {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + env.sendGridApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }], subject }],
        from: { email: env.sendGridFromEmail },
        content: [{ type: 'text/html', value: html }],
        tracking_settings: {
          click_tracking: { enable: true },
          open_tracking: { enable: true }
        }
      })
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`SendGrid error ${res.status}: ${body}`);
    }
    const messageId = res.headers.get('x-message-id') ?? undefined;
    return messageId;
  }
  logger.info('[EMAIL-STUB] Would send email via SendGrid', { to, subject });
  return undefined;
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  options?: { template?: string; userId?: string }
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  try {
    const messageId = await sendViaSendGrid(to, subject, html);
    logNotification({
      channel: 'email',
      recipient: to,
      template: options?.template || subject,
      status: 'sent',
      provider: 'sendgrid',
      userId: options?.userId,
      messageId
    });
    return { ok: true, messageId };
  } catch (error: any) {
    logNotification({
      channel: 'email',
      recipient: to,
      template: options?.template || subject,
      status: 'failed',
      provider: 'sendgrid',
      userId: options?.userId,
      errorMessage: error?.message
    });
    logger.error('Email send failed', { to, subject, error: error?.message });
    return { ok: false, error: error?.message };
  }
}

export async function sendRideConfirmationEmail(
  to: string,
  data: Parameters<typeof emailTemplates.RIDE_CONFIRMATION>[0],
  userId?: string
) {
  const { subject, html } = emailTemplates.RIDE_CONFIRMATION(data);
  return sendEmail(to, subject, html, { template: 'ride_confirmation', userId });
}

export async function sendPaymentReceiptEmail(
  to: string,
  data: Parameters<typeof emailTemplates.PAYMENT_RECEIPT>[0],
  userId?: string
) {
  const { subject, html } = emailTemplates.PAYMENT_RECEIPT(data);
  return sendEmail(to, subject, html, { template: 'payment_receipt', userId });
}

export async function sendDriverEarningsEmail(
  to: string,
  data: Parameters<typeof emailTemplates.DRIVER_EARNINGS>[0],
  userId?: string
) {
  const { subject, html } = emailTemplates.DRIVER_EARNINGS(data);
  return sendEmail(to, subject, html, { template: 'driver_earnings', userId });
}

export async function sendDriverPayoutEmail(
  to: string,
  data: Parameters<typeof emailTemplates.DRIVER_PAYOUT>[0],
  userId?: string
) {
  const { subject, html } = emailTemplates.DRIVER_PAYOUT(data);
  return sendEmail(to, subject, html, { template: 'driver_payout', userId });
}

export async function sendSupportReplyEmail(
  to: string,
  data: Parameters<typeof emailTemplates.SUPPORT_REPLY>[0],
  userId?: string
) {
  const { subject, html } = emailTemplates.SUPPORT_REPLY(data);
  return sendEmail(to, subject, html, { template: 'support_reply', userId });
}

export async function sendPasswordResetEmail(
  to: string,
  data: Parameters<typeof emailTemplates.PASSWORD_RESET>[0],
  userId?: string
) {
  const { subject, html } = emailTemplates.PASSWORD_RESET(data);
  return sendEmail(to, subject, html, { template: 'password_reset', userId });
}

export async function sendAccountVerificationEmail(
  to: string,
  data: Parameters<typeof emailTemplates.ACCOUNT_VERIFICATION>[0],
  userId?: string
) {
  const { subject, html } = emailTemplates.ACCOUNT_VERIFICATION(data);
  return sendEmail(to, subject, html, { template: 'account_verification', userId });
}

export async function sendWeeklyEarningsReportEmail(
  to: string,
  data: Parameters<typeof emailTemplates.WEEKLY_EARNINGS_REPORT>[0],
  userId?: string
) {
  const { subject, html } = emailTemplates.WEEKLY_EARNINGS_REPORT(data);
  return sendEmail(to, subject, html, { template: 'weekly_earnings_report', userId });
}

export async function sendPromotionalEmail(
  to: string,
  data: Parameters<typeof emailTemplates.PROMOTIONAL>[0],
  userId?: string
) {
  const { subject, html } = emailTemplates.PROMOTIONAL(data);
  return sendEmail(to, subject, html, { template: 'promotional', userId });
}

export async function sendBulkPromotionalEmail(
  recipients: string[],
  data: Parameters<typeof emailTemplates.PROMOTIONAL>[0]
) {
  const results = await Promise.allSettled(
    recipients.map(to => sendPromotionalEmail(to, data))
  );
  const sent = results.filter(r => r.status === 'fulfilled' && r.value.ok).length;
  const failed = results.length - sent;
  return { ok: true, sent, failed, total: results.length };
}
