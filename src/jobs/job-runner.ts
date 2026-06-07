import cron from 'node-cron';
import type { ScheduledTask } from 'node-cron';
import { runScheduledRidesDispatcher } from './scheduled-rides-dispatcher';
import { logger } from '../utils/logger';

let scheduledRidesTask: ScheduledTask | null = null;

export function startJobRunner() {
  if (scheduledRidesTask) return;

  scheduledRidesTask = cron.schedule('*/30 * * * * *', async () => {
    const result = await runScheduledRidesDispatcher();
    if (result?.ok === false) {
      logger.warn('scheduled rides dispatcher run failed', { error: result.error });
    }
  });

  logger.info('background job runner started', { scheduledRidesCron: '*/30 * * * * *' });
}

export function stopJobRunner() {
  if (!scheduledRidesTask) return;
  scheduledRidesTask.stop();
  scheduledRidesTask = null;
}
