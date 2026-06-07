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
  provider: string;
  userId?: string;
  messageId?: string;
  errorMessage?: string;
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
}
