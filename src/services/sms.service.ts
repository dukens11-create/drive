import twilio from 'twilio';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { logNotification } from '../utils/notification-logger';
import { smsTemplates } from '../utils/sms-templates';

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
): Promise<{ ok: boolean; messageSid?: string; error?: string }> {
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

export const sendSms = sendSMS;

export async function sendRideRequestSms(
  to: string,
  data: Parameters<typeof smsTemplates.RIDE_REQUEST>[0],
  userId?: string
) {
  return sendSMS(to, smsTemplates.RIDE_REQUEST(data), { template: 'ride_request', userId });
}

export async function sendDriverArrivingSms(
  to: string,
  data: Parameters<typeof smsTemplates.DRIVER_ARRIVING>[0],
  userId?: string
) {
  return sendSMS(to, smsTemplates.DRIVER_ARRIVING(data), { template: 'driver_arriving', userId });
}

export async function sendPaymentFailedSms(
  to: string,
  data: Parameters<typeof smsTemplates.PAYMENT_FAILED>[0],
  userId?: string
) {
  return sendSMS(to, smsTemplates.PAYMENT_FAILED(data), { template: 'payment_failed', userId });
}

export async function sendOtpSms(
  to: string,
  data: Parameters<typeof smsTemplates.OTP_CODE>[0],
  userId?: string
) {
  return sendSMS(to, smsTemplates.OTP_CODE(data), { template: 'otp_code', userId });
}

export async function sendScheduledRideReminderSms(
  to: string,
  data: Parameters<typeof smsTemplates.SCHEDULED_RIDE_REMINDER>[0],
  userId?: string
) {
  return sendSMS(to, smsTemplates.SCHEDULED_RIDE_REMINDER(data), { template: 'scheduled_ride_reminder', userId });
}

export async function sendDriverEarningsSummarySms(
  to: string,
  data: Parameters<typeof smsTemplates.DRIVER_EARNINGS_SUMMARY>[0],
  userId?: string
) {
  return sendSMS(to, smsTemplates.DRIVER_EARNINGS_SUMMARY(data), { template: 'driver_earnings_summary', userId });
}

export async function sendSupportReplySms(
  to: string,
  data: Parameters<typeof smsTemplates.SUPPORT_REPLY>[0],
  userId?: string
) {
  return sendSMS(to, smsTemplates.SUPPORT_REPLY(data), { template: 'support_reply', userId });
}

export async function sendSupportTicketCreatedSms(
  to: string,
  data: Parameters<typeof smsTemplates.SUPPORT_TICKET_CREATED>[0],
  userId?: string
) {
  return sendSMS(to, smsTemplates.SUPPORT_TICKET_CREATED(data), { template: 'support_ticket_created', userId });
}
