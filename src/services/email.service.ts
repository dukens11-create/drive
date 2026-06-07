import sgMail from '@sendgrid/mail';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { logNotification } from '../utils/notification-logger';
import { emailTemplates } from '../utils/email-templates';

let initialized = false;

export function initializeEmailService() {
  if (!env.sendGridApiKey || initialized) return;
  sgMail.setApiKey(env.sendGridApiKey);
  initialized = true;
}

export async function sendEmail(
  to: string,
  subject: string,
  htmlContent: string,
  data?: Record<string, any>
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  try {
    initializeEmailService();
    const fromEmail = env.sendGridFromEmail || 'noreply@drive.app';
    const fromName = env.sendGridFromName || 'Drive App';

    let messageId = '';
    if (env.sendGridApiKey) {
      const [response] = await sgMail.send({
        to,
        from: { email: fromEmail, name: fromName },
        subject,
        html: htmlContent,
        trackingSettings: {
          clickTracking: { enable: true },
          openTracking: { enable: true }
        }
      });
      messageId = String(response.headers['x-message-id'] || '');
    } else {
      logger.info('[EMAIL-STUB] Would send email via SendGrid', { to, subject });
    }

    logNotification({
      channel: 'email',
      recipient: to,
      template: String(data?.template || subject),
      status: 'sent',
      provider: 'sendgrid',
      userId: data?.userId,
      messageId
    });

    return { ok: true, messageId };
  } catch (error: any) {
    logNotification({
      channel: 'email',
      recipient: to,
      template: String(data?.template || subject),
      status: 'failed',
      provider: 'sendgrid',
      userId: data?.userId,
      errorMessage: error?.message
    });

    logger.warn('Email send failed', { to, subject, error: error?.message });
    return { ok: false, error: error?.message || 'email_send_failed' };
  }
}

export async function sendBulkEmail(recipients: string[], subject: string, htmlContent: string) {
  const deliveries = await Promise.all(recipients.map(to => sendEmail(to, subject, htmlContent, { template: 'bulk_campaign' })));
  return {
    ok: deliveries.every(delivery => delivery.ok),
    deliveries
  };
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
  const sent = results.filter(r => r.status === 'fulfilled' && (r as any).value.ok).length;
  const failed = results.length - sent;
  return { ok: true, sent, failed, total: results.length };
}
