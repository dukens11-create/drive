import twilio from 'twilio';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { logNotification } from '../utils/notification-logger';

let twilioClient: ReturnType<typeof twilio> | null = null;

function getTwilioClient() {
  if (!env.twilioAccountSid || !env.twilioAuthToken) return null;
  if (!twilioClient) {
    twilioClient = twilio(env.twilioAccountSid, env.twilioAuthToken);
  }
  return twilioClient;
}

function normalizePhoneNumber(phone: string) {
  const trimmed = String(phone || '').trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith('+')) return trimmed;
  const digits = trimmed.replace(/\D/g, '');
  return digits.length === 10 ? `+1${digits}` : `+${digits}`;
}

export async function sendSMS(
  to: string,
  message: string,
  data?: Record<string, any>
) {
  const recipient = normalizePhoneNumber(to);
  try {
    const client = getTwilioClient();
    let messageSid = '';
    if (client && env.twilioPhoneNumber) {
      const response = await client.messages.create({
        body: message,
        from: env.twilioPhoneNumber,
        to: recipient
      });
      messageSid = response.sid;
    } else {
      logger.info('[SMS-STUB] Would send SMS via Twilio', { to: recipient, message });
    }

    logNotification({
      channel: 'sms',
      recipient,
      template: String(data?.template || message.slice(0, 50)),
      status: 'sent',
      provider: 'twilio',
      userId: data?.userId,
      messageId: messageSid
    });

    return { ok: true, messageSid };
  } catch (error: any) {
    logNotification({
      channel: 'sms',
      recipient,
      template: String(data?.template || message.slice(0, 50)),
      status: 'failed',
      provider: 'twilio',
      userId: data?.userId,
      errorMessage: error?.message
    });

    logger.warn('SMS send failed', { to: recipient, error: error?.message });
    return { ok: false, error: error?.message || 'sms_send_failed' };
  }
}
