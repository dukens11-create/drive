<<<<<<< HEAD
/**
 * Notification logger – thin wrapper around the in-memory notification log store.
 * Provides a structured way to record notification delivery outcomes for both
 * email and SMS channels.
 */
import { makeId, store, timestamp, type NotificationChannel } from '../database/data.store';
import { logger } from './logger';

export type LogNotificationOptions = {
  channel: NotificationChannel;
  recipient: string;
  template: string;
  status: 'sent' | 'failed' | 'queued';
=======
import { makeId, store, timestamp, type NotificationChannel } from '../database/data.store';

export type NotificationStatus = 'queued' | 'sending' | 'sent' | 'failed' | 'bounced' | 'undelivered';

export function normalizeNotificationStatus(status: NotificationStatus): 'queued' | 'sent' | 'failed' {
  if (status === 'queued' || status === 'sending') return 'queued';
  if (status === 'sent') return 'sent';
  return 'failed';
}

export function logNotification(entry: {
  channel: NotificationChannel;
  recipient: string;
  template: string;
  status: NotificationStatus;
>>>>>>> origin/main
  provider: string;
  userId?: string;
  messageId?: string;
  errorMessage?: string;
<<<<<<< HEAD
};

/**
 * Records a notification delivery attempt in the in-memory store.
 * Non-throwing – any logging errors are swallowed to avoid disrupting callers.
 */
export function logNotification(options: LogNotificationOptions): void {
  try {
    store.notificationLogs.push({
      id: makeId('notif'),
      userId: options.userId,
      channel: options.channel,
      recipient: options.recipient,
      template: options.template,
      status: options.status,
      provider: options.provider,
      errorMessage: options.errorMessage,
      createdAt: timestamp()
    });
  } catch (err: any) {
    logger.warn('Failed to write notification log entry', { error: err?.message });
  }
=======
}) {
  store.notificationLogs.push({
    id: makeId('notif'),
    userId: entry.userId,
    channel: entry.channel,
    recipient: entry.recipient,
    template: entry.template,
    status: normalizeNotificationStatus(entry.status),
    provider: entry.provider,
    providerMessageId: entry.messageId,
    errorMessage: entry.errorMessage,
    createdAt: timestamp()
  });
>>>>>>> origin/main
}
