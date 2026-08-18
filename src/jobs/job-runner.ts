import cron from 'node-cron';
import type { ScheduledTask } from 'node-cron';
import { runScheduledRidesDispatcher } from './scheduled-rides-dispatcher';
import { runAnalyticsAggregator } from './analytics-aggregator';
import { runFraudMonitor } from './fraud-monitor';
import { runDriverPayoutReconciler } from './driver-payout-reconciler';
import { logger } from '../utils/logger';

let scheduledRidesTask: ScheduledTask | null = null;
let analyticsTask: ScheduledTask | null = null;
let fraudMonitorTask: ScheduledTask | null = null;
let payoutReconcilerTask: ScheduledTask | null = null;

export function startJobRunner() {
  if (scheduledRidesTask) return;

  scheduledRidesTask = cron.schedule('*/30 * * * * *', async () => {
    const result = await runScheduledRidesDispatcher();
    if (result?.ok === false) {
      logger.warn('scheduled rides dispatcher run failed', { error: result.error });
    }
  });

  // Analytics snapshot – every hour at minute 0
  analyticsTask = cron.schedule('0 * * * *', async () => {
    const result = await runAnalyticsAggregator();
    if (result?.ok === false) {
      logger.warn('analytics aggregator run failed', { error: result.error });
    }
  });

  // Fraud monitor – every hour at minute 5
  fraudMonitorTask = cron.schedule('5 * * * *', async () => {
    const result = await runFraudMonitor();
    if (result?.ok === false) {
      logger.warn('fraud monitor run failed', { error: result.error });
    }
  });

  // Retry pending Stripe Connect ride transfers every minute.
  payoutReconcilerTask = cron.schedule('* * * * *', async () => {
    const result = await runDriverPayoutReconciler();
    if (result?.ok === false) {
      logger.warn('driver payout reconciler run failed', {
        error: 'error' in result ? result.error : 'unknown reconciliation error'
      });
    }
  });
  logger.info('background job runner started', {
    scheduledRidesCron: '*/30 * * * * *',
    analyticsCron: '0 * * * *',
    fraudMonitorCron: '5 * * * *'
  });
}

export function stopJobRunner() {
  if (!scheduledRidesTask) return;
  scheduledRidesTask.stop();
  scheduledRidesTask = null;
  analyticsTask?.stop();
  analyticsTask = null;
  fraudMonitorTask?.stop();
  fraudMonitorTask = null;
  payoutReconcilerTask?.stop();
  payoutReconcilerTask = null;
}
