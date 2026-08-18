import { createSign } from 'node:crypto';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const GOOGLE_OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';

type CachedToken = {
  value: string;
  expiresAtMs: number;
};

let cachedToken: CachedToken | null = null;

type FCMMessage = {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  clickAction?: string;
};

function canUseFcmHttpV1() {
  return Boolean(env.fcmProjectId && env.fcmPrivateKey && env.fcmClientEmail);
}

function base64UrlJson(value: unknown) {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function serviceAccountPrivateKey() {
  const privateKey = String(env.fcmPrivateKey || '').replace(/\\n/g, '\n').trim();
  if (!privateKey.includes('BEGIN PRIVATE KEY')) {
    throw new Error('FIREBASE_PRIVATE_KEY is not a valid PEM private key');
  }
  return privateKey;
}

async function getFcmAccessToken() {
  if (cachedToken && cachedToken.expiresAtMs - Date.now() > 60_000) {
    return cachedToken.value;
  }

  if (!canUseFcmHttpV1()) {
    throw new Error('Firebase service account credentials are incomplete');
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const header = base64UrlJson({ alg: 'RS256', typ: 'JWT' });
  const claims = base64UrlJson({
    iss: env.fcmClientEmail,
    scope: FCM_SCOPE,
    aud: GOOGLE_OAUTH_TOKEN_URL,
    iat: nowSeconds,
    exp: nowSeconds + 3600
  });

  const unsignedJwt = `${header}.${claims}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsignedJwt);
  signer.end();

  const signature = signer.sign(serviceAccountPrivateKey()).toString('base64url');
  const assertion = `${unsignedJwt}.${signature}`;

  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    }),
    signal: AbortSignal.timeout(12_000)
  });

  const raw = await response.text();
  let payload: any = {};
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    payload = { raw };
  }

  if (!response.ok) {
    throw new Error(
      String(
        payload?.error_description ||
        payload?.error ||
        `Google OAuth returned HTTP ${response.status}`
      )
    );
  }

  const accessToken = String(payload?.access_token || '').trim();
  const expiresIn = Number(payload?.expires_in || 3600);

  if (!accessToken) {
    throw new Error('Google OAuth did not return an access token');
  }

  cachedToken = {
    value: accessToken,
    expiresAtMs: Date.now() + Math.max(60, expiresIn) * 1000
  };

  return accessToken;
}

async function sendHttpV1Message(message: any) {
  if (!env.fcmProjectId) {
    throw new Error('FIREBASE_PROJECT_ID is missing');
  }

  const accessToken = await getFcmAccessToken();
  const endpoint =
    `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(env.fcmProjectId)}/messages:send`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ message }),
    signal: AbortSignal.timeout(12_000)
  });

  const raw = await response.text();
  let payload: any = {};
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    payload = { raw };
  }

  if (!response.ok) {
    throw new Error(
      String(
        payload?.error?.message ||
        payload?.error ||
        `FCM HTTP v1 returned HTTP ${response.status}`
      )
    );
  }

  return payload;
}

export function initializeFCM() {
  // HTTP v1 is stateless. This function remains for compatibility with callers
  // that previously initialized the Firebase Admin SDK.
  return { configured: canUseFcmHttpV1(), transport: 'http-v1' as const };
}

export async function sendFCMNotification(message: FCMMessage) {
  if (!canUseFcmHttpV1()) {
    logger.info('[PUSH-STUB] Would send push via FCM HTTP v1', {
      deviceToken: message.token,
      title: message.title,
      body: message.body,
      data: message.data
    });

    return {
      ok: true,
      deliveryStatus: 'stubbed' as const
    };
  }

  const result = await sendHttpV1Message({
    token: message.token,
    notification: {
      title: message.title,
      body: message.body
    },
    data: message.data,
    android: {
      priority: 'HIGH',
      notification: {
        click_action: message.clickAction || 'RIDE_NOTIFICATION'
      }
    },
    apns: {
      headers: {
        'apns-priority': '10'
      },
      payload: {
        aps: {
          sound: 'default'
        }
      }
    }
  });

  return {
    ok: true,
    messageId: result?.name,
    deliveryStatus: 'sent' as const
  };
}

export async function sendFCMMulticast(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
) {
  if (!tokens.length) {
    return { ok: true, successCount: 0, failureCount: 0 };
  }

  if (!canUseFcmHttpV1()) {
    await Promise.all(
      tokens.map(token =>
        sendFCMNotification({ token, title, body, data })
      )
    );

    return {
      ok: true,
      successCount: tokens.length,
      failureCount: 0
    };
  }

  // FCM HTTP v1 sends one device message per request. Keep concurrency bounded
  // so large batches cannot overwhelm the process/provider.
  let successCount = 0;
  let failureCount = 0;
  const queue = Array.from(new Set(tokens.filter(Boolean)));
  const concurrency = Math.min(10, queue.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= queue.length) return;

      try {
        await sendFCMNotification({
          token: queue[index],
          title,
          body,
          data
        });
        successCount += 1;
      } catch (error: any) {
        failureCount += 1;
        logger.warn('FCM multicast device send failed', {
          error: error?.message,
          tokenSuffix: String(queue[index]).slice(-8)
        });
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  return {
    ok: failureCount === 0,
    successCount,
    failureCount
  };
}

export async function subscribeDeviceTokenToTopic(token: string, topic: string) {
  // Server-side topic subscription requires a separate topic-management API.
  // FlupFlap currently sends dispatch notifications directly to registered
  // device tokens, so do not pretend a topic subscription succeeded.
  logger.info('FCM topic subscription skipped; direct-token delivery is active', {
    tokenSuffix: String(token || '').slice(-8),
    topic
  });

  return {
    ok: true,
    skipped: true,
    deliveryMode: 'direct-token' as const
  };
}