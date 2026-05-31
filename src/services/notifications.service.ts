/**
 * Notification service – wraps Twilio (SMS), SendGrid (email), and FCM (push).
 * In production set the environment variables to enable real providers;
 * without them every send is logged as a stub call.
 */
import {
  makeId,
  store,
  timestamp,
  type DeviceToken,
  type NotificationChannel,
  type NotificationPreference
} from '../database/data.store';
import { logger } from '../utils/logger';
import { env } from '../config/env';

const DEFAULT_CATEGORIES = ['rides', 'orders', 'promotions', 'system'];

function getActorId(body: any) {
  return body?.actor?.id || body?.userId;
}

function getNotificationPreferencesForUser(userId: string): NotificationPreference {
  const existing = store.notificationPreferences.get(userId);
  if (existing) return existing;
  const created: NotificationPreference = {
    userId,
    emailOptIn: true,
    smsOptIn: true,
    pushOptIn: true,
    frequency: 'instant',
    categories: DEFAULT_CATEGORIES,
    timezone: 'UTC',
    updatedAt: timestamp()
  };
  store.notificationPreferences.set(userId, created);
  return created;
}

// ─── Provider stubs ──────────────────────────────────────────────────────────

async function sendViaTwilio(to: string, body: string): Promise<void> {
  if (env.twilioAccountSid && env.twilioAuthToken && env.twilioFromNumber) {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${env.twilioAccountSid}/Messages.json`;
    const creds = Buffer.from(`${env.twilioAccountSid}:${env.twilioAuthToken}`).toString('base64');
    const payload = new URLSearchParams({ To: to, From: env.twilioFromNumber, Body: body });
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: 'Basic ' + creds, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: payload.toString()
    });
    if (!res.ok) throw new Error(`Twilio error ${res.status}`);
  } else {
    logger.info('[SMS-STUB] Would send SMS via Twilio', { to, body });
  }
}

async function sendViaSendGrid(to: string, subject: string, html: string): Promise<void> {
  if (env.sendGridApiKey && env.sendGridFromEmail) {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + env.sendGridApiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }], subject }],
        from: { email: env.sendGridFromEmail },
        content: [{ type: 'text/html', value: html }]
      })
    });
    if (!res.ok) throw new Error(`SendGrid error ${res.status}`);
  } else {
    logger.info('[EMAIL-STUB] Would send email via SendGrid', { to, subject });
  }
}

async function sendViaFCM(deviceToken: string, title: string, body: string): Promise<void> {
  if (env.fcmServerKey) {
    const res = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: { Authorization: 'key=' + env.fcmServerKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: deviceToken, notification: { title, body } })
    });
    if (!res.ok) throw new Error(`FCM error ${res.status}`);
  } else {
    logger.info('[PUSH-STUB] Would send push via FCM', { deviceToken, title, body });
  }
}

// ─── Core send function ──────────────────────────────────────────────────────

async function recordAndSend(
  channel: NotificationChannel,
  recipient: string,
  template: string,
  provider: string,
  sendFn: () => Promise<void>,
  userId?: string
) {
  const base = {
    id: makeId('notif'),
    userId,
    channel,
    recipient,
    template,
    provider,
    createdAt: timestamp()
  };
  try {
    await sendFn();
    store.notificationLogs.push({ ...base, status: 'sent' as const });
  } catch (err: any) {
    store.notificationLogs.push({ ...base, status: 'failed' as const, errorMessage: err?.message });
    logger.warn('Notification send failed', { channel, recipient, template, error: err?.message });
  }
}

// ─── SMS helpers ─────────────────────────────────────────────────────────────

export async function sendSmsOtp(phone: string, otp: string, userId?: string) {
  await recordAndSend('sms', phone, 'otp', 'twilio',
    () => sendViaTwilio(phone, 'Your Drive verification code is: ' + otp + '. Valid for 10 minutes.'),
    userId);
}

export async function sendTripSms(phone: string, message: string, userId?: string) {
  await recordAndSend('sms', phone, 'trip_notification', 'twilio', () => sendViaTwilio(phone, message), userId);
}

export async function sendSms(phone: string, template: string, message: string, userId?: string) {
  await recordAndSend('sms', phone, template, 'twilio', () => sendViaTwilio(phone, message), userId);
}

// ─── Email helpers ───────────────────────────────────────────────────────────

export async function sendWelcomeEmail(email: string, name: string, userId?: string) {
  const subject = 'Welcome to Drive!';
  const html = '<h1>Welcome, ' + name + '!</h1><p>Your account is ready. Start booking rides today.</p>';
  await recordAndSend('email', email, 'welcome', 'sendgrid', () => sendViaSendGrid(email, subject, html), userId);
}

export async function sendRideReceiptEmail(email: string, rideId: string, amountCents: number, userId?: string) {
  const amount = '$' + (amountCents / 100).toFixed(2);
  const subject = 'Your ride receipt – ' + amount;
  const html = '<h2>Ride Receipt</h2><p>Ride ID: ' + rideId + '</p><p>Amount: ' + amount + '</p>';
  await recordAndSend('email', email, 'ride_receipt', 'sendgrid', () => sendViaSendGrid(email, subject, html), userId);
}

export async function sendPasswordResetEmail(email: string, resetToken: string, userId?: string) {
  const link = (env.appBaseUrl || 'https://app.drive.com') + '/reset-password?token=' + resetToken;
  const subject = 'Reset your Drive password';
  const html = '<p>Click the link to reset your password: <a href="' + link + '">Reset Password</a></p>';
  await recordAndSend('email', email, 'password_reset', 'sendgrid', () => sendViaSendGrid(email, subject, html), userId);
}

export async function sendEmail(email: string, template: string, subject: string, html: string, userId?: string) {
  await recordAndSend('email', email, template, 'sendgrid', () => sendViaSendGrid(email, subject, html), userId);
}

// ─── Push notification helpers ────────────────────────────────────────────────

export async function sendPushNotification(deviceToken: string, title: string, body: string, userId?: string) {
  await recordAndSend('push', deviceToken, 'generic', 'fcm', () => sendViaFCM(deviceToken, title, body), userId);
}

export async function sendRideStatusPush(deviceToken: string, status: string, rideId: string, userId?: string) {
  const messages: Record<string, { title: string; body: string }> = {
    accepted: { title: 'Driver accepted your ride', body: 'Your driver is on the way!' },
    started: { title: 'Ride started', body: 'Your trip has begun. Enjoy the ride!' },
    completed: { title: 'Ride completed', body: 'Thanks for riding with Drive. Rate your experience.' },
    canceled: { title: 'Ride canceled', body: 'Your ride has been canceled.' }
  };
  const msg = messages[status] || { title: 'Ride update', body: 'Status: ' + status };
  await recordAndSend('push', deviceToken, 'ride_' + status, 'fcm',
    () => sendViaFCM(deviceToken, msg.title, msg.body), userId);
}

// ─── Query helpers ───────────────────────────────────────────────────────────

export async function listNotificationLogs(body: any) {
  const userId = body?.userId;
  const channel = body?.channel as NotificationChannel | undefined;
  const limit = Math.min(Number(body?.limit || 50), 200);

  let logs = [...store.notificationLogs];
  if (userId) logs = logs.filter(l => l.userId === userId);
  if (channel) logs = logs.filter(l => l.channel === channel);
  logs = logs.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);

  return { module: 'notifications', ok: true, total: logs.length, logs };
}

export async function getNotificationPreferences(body: any) {
  const userId = getActorId(body);
  if (!userId) return { module: 'notifications', action: 'preferences', error: 'userId required' };
  return { module: 'notifications', ok: true, preferences: getNotificationPreferencesForUser(userId) };
}

export async function upsertNotificationPreferences(body: any) {
  const userId = getActorId(body);
  if (!userId) return { module: 'notifications', action: 'preferences', error: 'userId required' };

  const current = getNotificationPreferencesForUser(userId);
  const preferences: NotificationPreference = {
    ...current,
    emailOptIn: body?.emailOptIn ?? current.emailOptIn,
    smsOptIn: body?.smsOptIn ?? current.smsOptIn,
    pushOptIn: body?.pushOptIn ?? current.pushOptIn,
    frequency: body?.frequency || current.frequency,
    categories: Array.isArray(body?.categories) && body.categories.length > 0 ? Array.from(new Set(body.categories)) : current.categories,
    timezone: body?.timezone || current.timezone,
    updatedAt: timestamp()
  };
  store.notificationPreferences.set(userId, preferences);
  return { module: 'notifications', action: 'preferences', ok: true, preferences };
}

export async function registerDeviceToken(body: any) {
  const userId = getActorId(body);
  const token = String(body?.token || '').trim();
  if (!userId) return { module: 'notifications', action: 'register-device-token', error: 'userId required' };
  if (!token) return { module: 'notifications', action: 'register-device-token', error: 'token required' };

  let deviceToken = store.deviceTokens.find(entry => entry.userId === userId && entry.token === token);
  if (!deviceToken) {
    deviceToken = {
      id: makeId('devtok'),
      userId,
      token,
      platform: body?.platform === 'ios' || body?.platform === 'android' ? body.platform : 'web',
      topics: Array.isArray(body?.topics) ? Array.from(new Set(body.topics)) : [],
      createdAt: timestamp(),
      updatedAt: timestamp()
    } satisfies DeviceToken;
    store.deviceTokens.push(deviceToken);
  } else {
    deviceToken.platform = body?.platform || deviceToken.platform;
    deviceToken.topics = Array.isArray(body?.topics) ? Array.from(new Set(body.topics)) : deviceToken.topics;
    deviceToken.updatedAt = timestamp();
  }

  return { module: 'notifications', action: 'register-device-token', ok: true, deviceToken };
}

export async function sendPush(body: any) {
  const title = String(body?.title || '').trim();
  const messageBody = String(body?.body || '').trim();
  const actorId = body?.actor?.id;
  const targetUserId = body?.userId || actorId;
  if (!title || !messageBody) return { module: 'notifications', action: 'push', error: 'title and body are required' };
  if (body?.userId && body?.actor?.role !== 'admin' && body.userId !== actorId) {
    return { module: 'notifications', action: 'push', error: 'forbidden' };
  }
  if (body?.topic && body?.actor?.role !== 'admin') {
    return { module: 'notifications', action: 'push', error: 'forbidden' };
  }

  let targets = [] as DeviceToken[];
  if (body?.deviceToken) {
    targets = [{ id: makeId('devtok'), userId: targetUserId, token: body.deviceToken, platform: 'web', topics: [], createdAt: timestamp(), updatedAt: timestamp() }];
  } else if (body?.topic) {
    targets = store.deviceTokens.filter(entry => entry.topics.includes(body.topic));
  } else if (targetUserId) {
    const preferences = getNotificationPreferencesForUser(targetUserId);
    if (!preferences.pushOptIn) return { module: 'notifications', action: 'push', error: 'push disabled for user' };
    targets = store.deviceTokens.filter(entry => entry.userId === targetUserId);
  }

  if (targets.length === 0) {
    return { module: 'notifications', action: 'push', error: 'no target devices found' };
  }

  const uniqueTargets = Array.from(new Map(targets.map(target => [target.token, target])).values());
  for (const target of uniqueTargets) {
    await sendPushNotification(target.token, title, messageBody, target.userId);
  }

  return { module: 'notifications', action: 'push', ok: true, delivered: uniqueTargets.length };
}

export async function sendEmailNotification(body: any) {
  const userId = body?.userId || body?.actor?.id;
  if (userId && body?.actor?.role !== 'admin' && userId !== body?.actor?.id) {
    return { module: 'notifications', action: 'email', error: 'forbidden' };
  }
  const email = body?.email || (userId ? store.users.get(userId)?.email : undefined);
  if (!email) return { module: 'notifications', action: 'email', error: 'email required' };
  if (userId && !getNotificationPreferencesForUser(userId).emailOptIn) {
    return { module: 'notifications', action: 'email', error: 'email disabled for user' };
  }
  await sendEmail(email, body?.template || 'custom', body?.subject, body?.html, userId);
  return { module: 'notifications', action: 'email', ok: true, recipient: email };
}

export async function sendSmsNotification(body: any) {
  const userId = body?.userId || body?.actor?.id;
  if (userId && body?.actor?.role !== 'admin' && userId !== body?.actor?.id) {
    return { module: 'notifications', action: 'sms', error: 'forbidden' };
  }
  const phone = body?.phone || (userId ? store.users.get(userId)?.phone : undefined);
  if (!phone) return { module: 'notifications', action: 'sms', error: 'phone required' };
  if (userId && !getNotificationPreferencesForUser(userId).smsOptIn) {
    return { module: 'notifications', action: 'sms', error: 'sms disabled for user' };
  }
  await sendSms(phone, body?.template || 'custom', body?.message, userId);
  return { module: 'notifications', action: 'sms', ok: true, recipient: phone };
}
