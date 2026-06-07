/**
 * Notification service – wraps Twilio (SMS), SendGrid (email), and FCM (push).
 * In production set the environment variables to enable real providers;
 * without them every send is logged as a stub call.
 */
import {
  makeId,
  markStoreDirty,
  store,
  timestamp,
  type DeviceToken,
  type NotificationChannel,
  type NotificationPreference
} from '../database/data.store';
import { logger } from '../utils/logger';
import { env } from '../config/env';
import { sendFCMNotification, subscribeDeviceTokenToTopic } from './fcm.service';

const PUSH_CATEGORIES = ['new_rides', 'trip_updates', 'earnings', 'bonuses', 'support_replies', 'system'] as const;
type PushCategory = typeof PUSH_CATEGORIES[number];
const LEGACY_CATEGORY_MAP: Record<string, PushCategory | undefined> = {
  rides: 'trip_updates',
  orders: 'trip_updates',
  support: 'support_replies',
  earnings: 'earnings',
  promotions: 'bonuses',
  system: 'system'
};

const DEFAULT_CATEGORIES: PushCategory[] = [...PUSH_CATEGORIES];
const DEFAULT_QUIET_HOURS = { enabled: false, start: '22:00', end: '07:00' };
const DEFAULT_DEVICE_TOPICS = ['rides', 'chat', 'support'];

function normalizeDataPayload(data: any) {
  if (!data || typeof data !== 'object') return undefined;
  const entries = Object.entries(data)
    .filter((entry): entry is [string, unknown] => Boolean(entry[0]))
    .map(([key, value]) => {
      if (value == null) return [key, ''] as const;
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return [key, String(value)] as const;
      }
      return [key, JSON.stringify(value)] as const;
    });
  if (entries.length === 0) return undefined;
  return Object.fromEntries(entries);
}

function normalizeDeviceTopics(topics: any) {
  if (Array.isArray(topics) && topics.length > 0) return Array.from(new Set(topics.map((topic: any) => String(topic).trim()).filter(Boolean)));
  return [...DEFAULT_DEVICE_TOPICS];
}

function getActorId(body: any) {
  return body?.actor?.id || body?.userId;
}

function getHubUserId(body: any) {
  const actorId = body?.actor?.id;
  if (body?.actor?.role === 'admin' && body?.userId) return String(body.userId);
  return actorId;
}

function normalizePushCategory(value: any): PushCategory {
  const raw = String(value || '').trim();
  if (PUSH_CATEGORIES.includes(raw as PushCategory)) return raw as PushCategory;
  return LEGACY_CATEGORY_MAP[raw] || 'system';
}

function normalizeHubCategory(value: any) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === 'rides' || normalized === 'payments' || normalized === 'support' || normalized === 'system'
    ? normalized
    : undefined;
}

function inferNotificationHubCategory(template: string, channel: NotificationChannel) {
  const normalized = template.toLowerCase();
  if (normalized.includes('support')) return 'support' as const;
  if (normalized.includes('payment') || normalized.includes('receipt') || normalized.includes('earnings') || normalized.includes('payout')) {
    return 'payments' as const;
  }
  if (channel === 'push' || normalized.includes('ride') || normalized.includes('trip') || normalized.includes('driver')) {
    return 'rides' as const;
  }
  return 'system' as const;
}

function normalizeCategories(categories: any, fallback: string[]) {
  if (!Array.isArray(categories) || categories.length === 0) return fallback;
  const normalized = categories
    .map((category: any) => normalizePushCategory(category))
    .filter(Boolean);
  return normalized.length > 0 ? Array.from(new Set(normalized)) : fallback;
}

function parseMinutes(value: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return (hour * 60) + minute;
}

function isQuietHours(preferences: NotificationPreference, now = new Date()) {
  const quietHours = preferences.quietHours || DEFAULT_QUIET_HOURS;
  if (!quietHours.enabled) return false;
  const start = parseMinutes(quietHours.start);
  const end = parseMinutes(quietHours.end);
  if (start == null || end == null) return false;

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: preferences.timezone || 'UTC',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    const parts = formatter.formatToParts(now);
    const hour = Number(parts.find(part => part.type === 'hour')?.value || 0);
    const minute = Number(parts.find(part => part.type === 'minute')?.value || 0);
    const current = (hour * 60) + minute;

    // When start equals end (e.g. 00:00 === 00:00), it is treated as an all-day quiet-hours window.
    if (start === end) return true;
    if (start < end) return current >= start && current < end;
    return current >= start || current < end;
  } catch {
    return false;
  }
}

function isCategoryAllowed(preferences: NotificationPreference, category: PushCategory) {
  return preferences.categories.length === 0 || preferences.categories.includes(category);
}

function getNotificationPreferencesForUser(userId: string): NotificationPreference {
  const existing = store.notificationPreferences.get(userId);
  if (existing) {
    const normalized: NotificationPreference = {
      ...existing,
      categories: normalizeCategories(existing.categories, DEFAULT_CATEGORIES),
      quietHours: existing.quietHours || { ...DEFAULT_QUIET_HOURS }
    };
    store.notificationPreferences.set(userId, normalized);
    return normalized;
  }
  const created: NotificationPreference = {
    userId,
    emailOptIn: true,
    smsOptIn: true,
    pushOptIn: true,
    frequency: 'instant',
    emailFrequency: 'instant',
    smsFrequency: 'urgent',
    categories: DEFAULT_CATEGORIES,
    timezone: 'UTC',
    quietHoursEnabled: DEFAULT_QUIET_HOURS.enabled,
    quietHoursStart: DEFAULT_QUIET_HOURS.start,
    quietHoursEnd: DEFAULT_QUIET_HOURS.end,
    quietHours: { ...DEFAULT_QUIET_HOURS },
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

async function sendViaFCM(deviceToken: string, title: string, body: string, data?: Record<string, string>) {
  return sendFCMNotification({ token: deviceToken, title, body, data });
}

// ─── Core send function ──────────────────────────────────────────────────────

async function recordAndSend(
  channel: NotificationChannel,
  recipient: string,
  template: string,
  provider: string,
  sendFn: () => Promise<{ messageId?: string; deliveryStatus?: string } | void>,
  userId?: string,
  deviceTokenId?: string
) {
  const base = {
    id: makeId('notif'),
    userId,
    channel,
    category: inferNotificationHubCategory(template, channel),
    recipient,
    template,
    provider,
    createdAt: timestamp()
  };
  try {
    const response = await sendFn();
    const providerResponse = response && typeof response === 'object' ? response as { messageId?: string; deliveryStatus?: string } : undefined;
    store.notificationLogs.push({
      ...base,
      status: 'sent' as const,
      fcmMessageId: providerResponse?.messageId,
      fcmDeliveryStatus: providerResponse?.deliveryStatus || 'sent',
      deviceTokenId
    });
  } catch (err: any) {
    store.notificationLogs.push({ ...base, status: 'failed' as const, errorMessage: err?.message, deviceTokenId, fcmDeliveryStatus: 'failed' });
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

export async function sendPushNotification(deviceToken: string, title: string, body: string, userId?: string, data?: Record<string, string>) {
  await recordAndSend('push', deviceToken, 'generic', 'fcm', () => sendViaFCM(deviceToken, title, body, data), userId);
}

export async function sendRideStatusPush(deviceToken: string, status: string, rideId: string, userId?: string, data?: Record<string, string>) {
  const messages: Record<string, { title: string; body: string }> = {
    accepted: { title: 'Driver accepted your ride', body: 'Your driver is on the way!' },
    started: { title: 'Ride started', body: 'Your trip has begun. Enjoy the ride!' },
    completed: { title: 'Ride completed', body: 'Thanks for riding with Drive. Rate your experience.' },
    canceled: { title: 'Ride canceled', body: 'Your ride has been canceled.' }
  };
  const msg = messages[status] || { title: 'Ride update', body: 'Status: ' + status };
  await recordAndSend('push', deviceToken, 'ride_' + status, 'fcm',
    () => sendViaFCM(deviceToken, msg.title, msg.body, { ...(data || {}), rideId: String(rideId), action: `RIDE_${status.toUpperCase()}` }), userId);
}

// ─── Query helpers ───────────────────────────────────────────────────────────

export async function listNotificationLogs(body: any) {
  const userId = body?.userId;
  const channel = (body?.channel || body?.type) as NotificationChannel | undefined;
  const category = normalizeHubCategory(body?.category);
  const limit = Math.min(Number(body?.limit || 50), 200);

  let logs = [...store.notificationLogs];
  if (userId) logs = logs.filter(l => l.userId === userId);
  if (channel) logs = logs.filter(l => l.channel === channel);
  if (category) logs = logs.filter(l => (l.category || inferNotificationHubCategory(l.template, l.channel)) === category);
  logs = logs.filter(l => !l.deletedAt);
  logs = logs.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);

  return { module: 'notifications', ok: true, total: logs.length, logs };
}

function shouldArchive(log: { createdAt: string; archivedAt?: string; deletedAt?: string }) {
  if (log.archivedAt || log.deletedAt) return false;
  return (Date.now() - new Date(log.createdAt).getTime()) >= (30 * 24 * 60 * 60 * 1000);
}

function normalizeHubLog(log: any) {
  let mutated = false;
  if (shouldArchive(log)) {
    log.archivedAt = timestamp();
    mutated = true;
  }
  if (!log.category) {
    log.category = inferNotificationHubCategory(log.template, log.channel);
    mutated = true;
  }
  if (mutated) markStoreDirty();
  return {
    ...log,
    isRead: Boolean(log.readAt),
    isArchived: Boolean(log.archivedAt)
  };
}

export async function listNotificationHub(body: any) {
  const userId = getHubUserId(body);
  if (!userId) return { module: 'notifications', action: 'hub', error: 'userId required' };
  const category = normalizeHubCategory(body?.category);
  const limit = Math.min(Math.max(Number(body?.limit || 20), 1), 100);
  const offset = Math.max(Number(body?.offset || 0), 0);

  let notifications = store.notificationLogs.filter(log => log.userId === userId && !log.deletedAt);
  if (category) notifications = notifications.filter(log => (log.category || inferNotificationHubCategory(log.template, log.channel)) === category);
  notifications = notifications.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    module: 'notifications',
    action: 'hub',
    ok: true,
    total: notifications.length,
    limit,
    offset,
    notifications: notifications.slice(offset, offset + limit).map(normalizeHubLog)
  };
}

export async function markNotificationRead(body: any, params?: any) {
  const userId = getHubUserId(body);
  if (!userId) return { module: 'notifications', action: 'read', error: 'userId required' };
  const notification = store.notificationLogs.find(log => log.id === params?.id && log.userId === userId && !log.deletedAt);
  if (!notification) return { module: 'notifications', action: 'read', error: 'notification not found' };
  notification.readAt = notification.readAt || timestamp();
  markStoreDirty();
  return { module: 'notifications', action: 'read', ok: true, notification: normalizeHubLog(notification) };
}

export async function markAllNotificationsRead(body: any) {
  const userId = getHubUserId(body);
  if (!userId) return { module: 'notifications', action: 'read-all', error: 'userId required' };
  const category = normalizeHubCategory(body?.category);
  let updatedCount = 0;
  for (const notification of store.notificationLogs) {
    if (notification.userId !== userId || notification.deletedAt) continue;
    if (category && (notification.category || inferNotificationHubCategory(notification.template, notification.channel)) !== category) continue;
    if (!notification.readAt) {
      notification.readAt = timestamp();
      updatedCount += 1;
    }
  }
  if (updatedCount > 0) markStoreDirty();
  return { module: 'notifications', action: 'read-all', ok: true, updatedCount };
}

export async function getUnreadNotificationCount(body: any) {
  const userId = getHubUserId(body);
  if (!userId) return { module: 'notifications', action: 'unread-count', error: 'userId required' };
  const unreadCount = store.notificationLogs.filter(log => log.userId === userId && !log.deletedAt && !log.readAt).length;
  return { module: 'notifications', action: 'unread-count', ok: true, unreadCount };
}

export async function deleteAllNotifications(body: any) {
  const userId = getHubUserId(body);
  if (!userId) return { module: 'notifications', action: 'delete-all', error: 'userId required' };
  let deletedCount = 0;
  const now = timestamp();
  for (const notification of store.notificationLogs) {
    if (notification.userId !== userId || notification.deletedAt) continue;
    if ((Date.now() - new Date(notification.createdAt).getTime()) < (30 * 24 * 60 * 60 * 1000)) continue;
    notification.archivedAt = notification.archivedAt || now;
    notification.deletedAt = now;
    deletedCount += 1;
  }
  if (deletedCount > 0) markStoreDirty();
  return { module: 'notifications', action: 'delete-all', ok: true, deletedCount };
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
    frequency: body?.frequency || body?.emailFrequency || current.frequency,
    emailFrequency: body?.emailFrequency || current.emailFrequency || current.frequency,
    smsFrequency: body?.smsFrequency || current.smsFrequency || 'urgent',
    categories: normalizeCategories(body?.categories, current.categories),
    timezone: body?.timezone || current.timezone,
    quietHoursEnabled: body?.quietHours
      ? !!body.quietHours.enabled
      : (body?.quietHoursEnabled ?? current.quietHoursEnabled ?? current.quietHours?.enabled ?? false),
    quietHoursStart: body?.quietHours?.start || body?.quietHoursStart || current.quietHoursStart || current.quietHours?.start || DEFAULT_QUIET_HOURS.start,
    quietHoursEnd: body?.quietHours?.end || body?.quietHoursEnd || current.quietHoursEnd || current.quietHours?.end || DEFAULT_QUIET_HOURS.end,
    unsubscribedAt: body?.unsubscribedAt || current.unsubscribedAt,
    quietHours: body?.quietHours
      ? {
          enabled: !!body.quietHours.enabled,
          start: String(body.quietHours.start || DEFAULT_QUIET_HOURS.start),
          end: String(body.quietHours.end || DEFAULT_QUIET_HOURS.end)
        }
      : {
          enabled: body?.quietHoursEnabled ?? current.quietHoursEnabled ?? current.quietHours?.enabled ?? DEFAULT_QUIET_HOURS.enabled,
          start: String(body?.quietHoursStart || current.quietHoursStart || current.quietHours?.start || DEFAULT_QUIET_HOURS.start),
          end: String(body?.quietHoursEnd || current.quietHoursEnd || current.quietHours?.end || DEFAULT_QUIET_HOURS.end)
        },
    updatedAt: timestamp()
  };
  store.notificationPreferences.set(userId, preferences);
  return { module: 'notifications', action: 'preferences', ok: true, preferences };
}

async function deliverPushToUser(
  userId: string,
  title: string,
  messageBody: string,
  category: PushCategory,
  template: string,
  data?: Record<string, string>
) {
  const preferences = getNotificationPreferencesForUser(userId);
  if (!preferences.pushOptIn) return { ok: false, error: 'push disabled for user', delivered: 0, queued: 0 };
  const categoryAllowed = isCategoryAllowed(preferences, category);
  if (!categoryAllowed) {
    return { ok: false, error: `category ${category} disabled for user`, delivered: 0, queued: 0 };
  }

  const targets = Array.from(new Map(
    store.deviceTokens
      .filter(entry => entry.userId === userId)
      .map(target => [target.token, target])
  ).values());
  if (targets.length === 0) return { ok: false, error: 'no target devices found', delivered: 0, queued: 0 };

  if (isQuietHours(preferences)) {
    for (const target of targets) {
      store.notificationLogs.push({
        id: makeId('notif'),
        userId,
        channel: 'push',
        recipient: target.token,
        template,
        status: 'queued',
        provider: 'fcm',
        errorMessage: 'queued_due_to_quiet_hours',
        createdAt: timestamp()
      });
    }
    return { ok: true, delivered: 0, queued: targets.length, quietHours: true };
  }

  for (const target of targets) {
    await recordAndSend('push', target.token, template, 'fcm', () => sendViaFCM(target.token, title, messageBody, data), userId, target.id);
  }
  return { ok: true, delivered: targets.length, queued: 0, quietHours: false };
}

export async function sendRealtimePushEvent(body: any) {
  const userId = String(body?.userId || '').trim();
  const title = String(body?.title || '').trim();
  const messageBody = String(body?.body || '').trim();
  if (!userId || !title || !messageBody) return { module: 'notifications', action: 'realtime-push', error: 'userId, title and body are required' };
  const category = normalizePushCategory(body?.category);
  const template = String(body?.template || category).trim();
  const data = normalizeDataPayload(body?.data);
  return {
    module: 'notifications',
    action: 'realtime-push',
    category,
    ...(await deliverPushToUser(userId, title, messageBody, category, template, data))
  };
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
      topics: normalizeDeviceTopics(body?.topics),
      lastSeenAt: timestamp(),
      createdAt: timestamp(),
      updatedAt: timestamp()
    } satisfies DeviceToken;
    store.deviceTokens.push(deviceToken);
  } else {
    deviceToken.platform = body?.platform || deviceToken.platform;
    deviceToken.topics = body?.topics ? normalizeDeviceTopics(body?.topics) : deviceToken.topics;
    deviceToken.lastSeenAt = timestamp();
    deviceToken.updatedAt = timestamp();
  }

  for (const topic of deviceToken.topics) {
    try {
      await subscribeDeviceTokenToTopic(deviceToken.token, topic);
    } catch (error: any) {
      logger.warn('device token topic subscription failed', { userId, topic, error: error?.message });
    }
  }

  return { module: 'notifications', action: 'register-device-token', ok: true, deviceToken };
}

export async function listDeviceTokens(body: any) {
  const userId = getActorId(body);
  if (!userId) return { module: 'notifications', action: 'list-device-tokens', error: 'userId required' };
  return {
    module: 'notifications',
    action: 'list-device-tokens',
    ok: true,
    deviceTokens: store.deviceTokens.filter(entry => entry.userId === userId)
  };
}

export async function unregisterDeviceToken(body: any, params?: any) {
  const userId = getActorId(body);
  if (!userId) return { module: 'notifications', action: 'unregister-device-token', error: 'userId required' };
  const deviceTokenId = params?.deviceTokenId || body?.deviceTokenId;
  const token = typeof body?.token === 'string' ? body.token.trim() : '';
  if (!deviceTokenId && !token) {
    return { module: 'notifications', action: 'unregister-device-token', error: 'deviceTokenId or token required' };
  }
  const index = store.deviceTokens.findIndex(entry =>
    entry.userId === userId && ((deviceTokenId && entry.id === deviceTokenId) || (token && entry.token === token))
  );
  if (index === -1) {
    return { module: 'notifications', action: 'unregister-device-token', error: 'device token not found' };
  }
  const [removed] = store.deviceTokens.splice(index, 1);
  return { module: 'notifications', action: 'unregister-device-token', ok: true, deviceToken: removed };
}

export async function sendPush(body: any) {
  const title = String(body?.title || '').trim();
  const messageBody = String(body?.body || '').trim();
  const actorId = body?.actor?.id;
  const targetUserId = body?.userId || actorId;
  const category = normalizePushCategory(body?.category);
  const template = String(body?.template || `manual_${category}`).trim();
  const data = normalizeDataPayload(body?.data);
  if (!title || !messageBody) return { module: 'notifications', action: 'push', error: 'title and body are required' };
  if (body?.userId && body?.actor?.role !== 'admin' && body.userId !== actorId) {
    return { module: 'notifications', action: 'push', error: 'forbidden' };
  }
  if (body?.topic && body?.actor?.role !== 'admin') {
    return { module: 'notifications', action: 'push', error: 'forbidden' };
  }

  let targets = [] as DeviceToken[];
  if (body?.deviceToken) {
    targets = [{
      id: makeId('devtok'),
      userId: targetUserId,
      token: body.deviceToken,
      platform: 'web',
      topics: [],
      createdAt: timestamp(),
      updatedAt: timestamp()
    }];
  } else if (body?.topic) {
    targets = store.deviceTokens.filter(entry => entry.topics.includes(body.topic));
  } else if (targetUserId) {
    const delivery = await deliverPushToUser(targetUserId, title, messageBody, category, template, data);
    return { module: 'notifications', action: 'push', category, ...delivery };
  }

  if (targets.length === 0) {
    return { module: 'notifications', action: 'push', error: 'no target devices found' };
  }

  const uniqueTargets = Array.from(new Map(targets.map(target => [target.token, target])).values())
    .filter(target => {
      if (!target.userId) return true;
      const preferences = getNotificationPreferencesForUser(target.userId);
      const categoryAllowed = isCategoryAllowed(preferences, category);
      return preferences.pushOptIn && categoryAllowed && !isQuietHours(preferences);
    });
  for (const target of uniqueTargets) {
    await recordAndSend('push', target.token, template, 'fcm', () => sendViaFCM(target.token, title, messageBody, data), target.userId, target.id);
  }

  if (uniqueTargets.length === 0) return { module: 'notifications', action: 'push', category, error: 'no target devices found' };
  return { module: 'notifications', action: 'push', ok: true, category, delivered: uniqueTargets.length, queued: 0 };
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
