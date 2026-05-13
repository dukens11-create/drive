import { Worker } from 'bullmq';
import { connection } from './queues';

new Worker('dispatch', async job => {
  console.log('Dispatch job', job.data);
}, { connection });

new Worker('payouts', async job => {
  console.log('Payout job', job.data);
}, { connection });

new Worker('notifications', async job => {
  console.log('Notification job', job.data);
}, { connection });
