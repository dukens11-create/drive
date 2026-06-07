import sgMail from '@sendgrid/mail';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { logNotification } from '../utils/notification-logger';

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
) {
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
