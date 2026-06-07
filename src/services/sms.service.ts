<<<<<<< HEAD
/**
 * SMS service – sends transactional SMS messages via Twilio using message templates.
 * Falls back to a stub log when Twilio credentials are not configured.
 */
import { env } from '../config/env';
import { logNotification } from '../utils/notification-logger';
import { smsTemplates } from '../utils/sms-templates';
import { logger } from '../utils/logger';

function normalizePhone(phone: string): string {
  if (phone.startsWith('+')) return phone;
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10 ? `+1${digits}` : `+${digits}`;
}

async function sendViaTwilio(to: string, body: string): Promise<string | undefined> {
  if (env.twilioAccountSid && env.twilioAuthToken && env.twilioFromNumber) {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${env.twilioAccountSid}/Messages.json`;
    const creds = Buffer.from(`${env.twilioAccountSid}:${env.twilioAuthToken}`).toString('base64');
    const payload = new URLSearchParams({ To: to, From: env.twilioFromNumber, Body: body });
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + creds,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: payload.toString()
    });
    if (!res.ok) {
      const responseBody = await res.text().catch(() => '');
      throw new Error(`Twilio error ${res.status}: ${responseBody}`);
    }
    const json = await res.json().catch(() => ({}));
    return json.sid as string | undefined;
  }
  logger.info('[SMS-STUB] Would send SMS via Twilio', { to, body });
  return undefined;
}

export async function sendSms(
  to: string,
  message: string,
  options?: { template?: string; userId?: string }
): Promise<{ ok: boolean; messageSid?: string; error?: string }> {
  const normalizedTo = normalizePhone(to);
  try {
    const messageSid = await sendViaTwilio(normalizedTo, message);
    logNotification({
      channel: 'sms',
      recipient: normalizedTo,
      template: options?.template || message.substring(0, 50),
      status: 'sent',
      provider: 'twilio',
      userId: options?.userId,
      messageId: messageSid
    });
=======
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

>>>>>>> origin/main
    return { ok: true, messageSid };
  } catch (error: any) {
    logNotification({
      channel: 'sms',
<<<<<<< HEAD
      recipient: normalizedTo,
      template: options?.template || message.substring(0, 50),
      status: 'failed',
      provider: 'twilio',
      userId: options?.userId,
      errorMessage: error?.message
    });
    logger.error('SMS send failed', { to: normalizedTo, error: error?.message });
    return { ok: false, error: error?.message };
  }
}

export async function sendRideRequestSms(
  to: string,
  data: Parameters<typeof smsTemplates.RIDE_REQUEST>[0],
  userId?: string
) {
  return sendSms(to, smsTemplates.RIDE_REQUEST(data), { template: 'ride_request', userId });
}

export async function sendDriverArrivingSms(
  to: string,
  data: Parameters<typeof smsTemplates.DRIVER_ARRIVING>[0],
  userId?: string
) {
  return sendSms(to, smsTemplates.DRIVER_ARRIVING(data), { template: 'driver_arriving', userId });
}

export async function sendPaymentFailedSms(
  to: string,
  data: Parameters<typeof smsTemplates.PAYMENT_FAILED>[0],
  userId?: string
) {
  return sendSms(to, smsTemplates.PAYMENT_FAILED(data), { template: 'payment_failed', userId });
}

export async function sendOtpSms(
  to: string,
  data: Parameters<typeof smsTemplates.OTP_CODE>[0],
  userId?: string
) {
  return sendSms(to, smsTemplates.OTP_CODE(data), { template: 'otp_code', userId });
}

export async function sendScheduledRideReminderSms(
  to: string,
  data: Parameters<typeof smsTemplates.SCHEDULED_RIDE_REMINDER>[0],
  userId?: string
) {
  return sendSms(to, smsTemplates.SCHEDULED_RIDE_REMINDER(data), { template: 'scheduled_ride_reminder', userId });
}

export async function sendDriverEarningsSummarySms(
  to: string,
  data: Parameters<typeof smsTemplates.DRIVER_EARNINGS_SUMMARY>[0],
  userId?: string
) {
  return sendSms(to, smsTemplates.DRIVER_EARNINGS_SUMMARY(data), { template: 'driver_earnings_summary', userId });
}

export async function sendSupportReplySms(
  to: string,
  data: Parameters<typeof smsTemplates.SUPPORT_REPLY>[0],
  userId?: string
) {
  return sendSms(to, smsTemplates.SUPPORT_REPLY(data), { template: 'support_reply', userId });
}

export async function sendSupportTicketCreatedSms(
  to: string,
  data: Parameters<typeof smsTemplates.SUPPORT_TICKET_CREATED>[0],
  userId?: string
) {
  return sendSms(to, smsTemplates.SUPPORT_TICKET_CREATED(data), { template: 'support_ticket_created', userId });
}
=======
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
>>>>>>> origin/main
