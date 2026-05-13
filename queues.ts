import { Queue } from 'bullmq';
import IORedis from 'ioredis';

export const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null });

export const dispatchQueue = new Queue('dispatch', { connection });
export const payoutQueue = new Queue('payouts', { connection });
export const notificationQueue = new Queue('notifications', { connection });
