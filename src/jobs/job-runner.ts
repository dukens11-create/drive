import cron from 'node-cron';
import type { ScheduledTask } from 'node-cron';
import { runScheduledRidesDispatcher } from './scheduled-rides-dispatcher';
import { runAnalyticsAggregator } from './analytics-aggregator';
import { runFraudMonitor } from './fraud-monitor';
import { logger } from '../utils/logger';

let scheduledRidesTask: ScheduledTask | null = null;
let analyticsTask: ScheduledTask | null = null;
let fraudMonitorTask: ScheduledTask | null = null;

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
}
