import { store } from '../database/data.store';
import { logger } from '../utils/logger';

export async function handleFCMDeliveryWebhook(payload: any) {
  const messageId = String(payload?.messageId || '').trim();
  const status = String(payload?.status || '').trim();
  if (!messageId || !status) {
    return { module: 'webhooks', action: 'fcm-delivery', error: 'messageId and status are required' };
  }

  const log = store.notificationLogs.find(entry => entry.fcmMessageId === messageId);
  if (!log) {
    logger.warn('FCM webhook notification log not found', { messageId, status });
    return { module: 'webhooks', action: 'fcm-delivery', error: 'notification log not found' };
  }

  log.fcmDeliveryStatus = status;
  return { module: 'webhooks', action: 'fcm-delivery', ok: true, messageId, status };
}
