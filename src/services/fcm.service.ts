import admin from 'firebase-admin';
import { env } from '../config/env';
import { logger } from '../utils/logger';

let initialized = false;

function canUseFirebaseAdmin() {
  return Boolean(env.fcmProjectId && env.fcmPrivateKey && env.fcmClientEmail);
}

export function initializeFCM() {
  if (initialized || !canUseFirebaseAdmin()) return;
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.fcmProjectId,
        privateKey: env.fcmPrivateKey?.replace(/\\n/g, '\n'),
        clientEmail: env.fcmClientEmail
      })
    });
    initialized = true;
  } catch (error: any) {
    logger.warn('FCM initialization failed', { error: error?.message });
  }
}

type FCMMessage = {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  clickAction?: string;
};

export async function sendFCMNotification(message: FCMMessage) {
  if (canUseFirebaseAdmin()) {
    initializeFCM();
    const messageId = await admin.messaging().send({
      token: message.token,
      notification: {
        title: message.title,
        body: message.body
      },
      data: message.data,
      android: {
        priority: 'high',
        notification: {
          clickAction: message.clickAction || 'RIDE_NOTIFICATION'
        }
      },
      apns: {
        headers: { 'apns-priority': '10' },
        payload: {
          aps: {
            sound: 'default'
          }
        }
      }
    });
    return { ok: true, messageId, deliveryStatus: 'sent' as const };
  }

  if (!env.fcmServerKey) {
    logger.info('[PUSH-STUB] Would send push via FCM', {
      deviceToken: message.token,
      title: message.title,
      body: message.body,
      data: message.data
    });
    return { ok: true, deliveryStatus: 'stubbed' as const };
  }

  const res = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: { Authorization: 'key=' + env.fcmServerKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: message.token,
      notification: { title: message.title, body: message.body },
      data: message.data || {}
    })
  });

  if (!res.ok) {
    throw new Error(`FCM error ${res.status}`);
  }

  const response = await res.json() as { results?: Array<{ message_id?: string }> };
  return {
    ok: true,
    messageId: response.results?.[0]?.message_id,
    deliveryStatus: 'sent' as const
  };
}

export async function sendFCMMulticast(tokens: string[], title: string, body: string, data?: Record<string, string>) {
  if (!tokens.length) return { ok: true, successCount: 0, failureCount: 0 };
  if (!canUseFirebaseAdmin()) {
    await Promise.all(tokens.map(token => sendFCMNotification({ token, title, body, data })));
    return { ok: true, successCount: tokens.length, failureCount: 0 };
  }
  initializeFCM();
  const result = await admin.messaging().sendEachForMulticast({
    tokens,
    notification: { title, body },
    data
  });
  return { ok: true, successCount: result.successCount, failureCount: result.failureCount };
}

export async function subscribeDeviceTokenToTopic(token: string, topic: string) {
  if (!canUseFirebaseAdmin()) return { ok: true };
  initializeFCM();
  await admin.messaging().subscribeToTopic([token], topic);
  return { ok: true };
}
