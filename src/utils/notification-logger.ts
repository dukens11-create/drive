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
  provider: string;
  userId?: string;
  messageId?: string;
  errorMessage?: string;
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
}
