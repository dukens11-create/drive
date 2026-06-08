import { Worker } from 'bullmq';
import { connection } from './queues';
import { logger } from '../utils';

new Worker('dispatch', async job => {
  logger.info('dispatch job received', { jobData: job.data });
}, { connection });

new Worker('payouts', async job => {
  logger.info('payout job received', { jobData: job.data });
}, { connection });

new Worker('notifications', async job => {
  logger.info('notification job received', { jobData: job.data });
}, { connection });
