import { dispatchRide } from '../utils/dispatch.engine';
import { markStoreDirty, store, timestamp } from '../database/data.store';
import * as ridesService from '../services/rides.service';
import { logger } from '../utils/logger';

const DISPATCH_WINDOW_MS = 5 * 60 * 1000;
const RETRY_COOLDOWN_MS = 60 * 1000;
const MAX_DISPATCH_ATTEMPTS = 5;
const DEFAULT_FAILURE_REASON = 'No drivers available';

let isRunning = false;

export async function runScheduledRidesDispatcher() {
  if (isRunning) return { ok: true, skipped: true, reason: 'dispatcher already running' };

  isRunning = true;
  try {
    const now = Date.now();
    let attempted = 0;
    let dispatched = 0;
    let failed = 0;
    let canceled = 0;

    for (const scheduledRide of store.scheduledRides.values()) {
      if (scheduledRide.status !== 'scheduled') continue;

      const scheduledAtMs = new Date(scheduledRide.scheduledAt).getTime();
      if (!Number.isFinite(scheduledAtMs) || scheduledAtMs - now > DISPATCH_WINDOW_MS) continue;

      const lastAttemptMs = scheduledRide.last_dispatch_attempt_at
        ? new Date(scheduledRide.last_dispatch_attempt_at).getTime()
        : 0;
      if (Number.isFinite(lastAttemptMs) && now - lastAttemptMs < RETRY_COOLDOWN_MS) continue;

      attempted += 1;
      scheduledRide.dispatch_attempts = (scheduledRide.dispatch_attempts || 0) + 1;
      scheduledRide.last_dispatch_attempt_at = timestamp();

      try {
        const dispatch = await dispatchRide({
          pickupLat: scheduledRide.pickupLat,
          pickupLng: scheduledRide.pickupLng
        });

        if (!dispatch.selected?.driverId) {
          throw new Error(DEFAULT_FAILURE_REASON);
        }

        const result = await ridesService.request({
          riderId: scheduledRide.riderId,
          pickupLat: scheduledRide.pickupLat,
          pickupLng: scheduledRide.pickupLng,
          dropoffLat: scheduledRide.dropoffLat,
          dropoffLng: scheduledRide.dropoffLng,
          pickupAddress: scheduledRide.pickupAddress,
          dropoffAddress: scheduledRide.dropoffAddress
        });

        if (!result?.ok || !result?.ride?.id) {
          throw new Error(result?.error || 'Unable to create ride for scheduled dispatch');
        }

        scheduledRide.status = 'dispatched';
        scheduledRide.rideId = result.ride.id;
        scheduledRide.dispatch_failed_reason = undefined;
        scheduledRide.updatedAt = timestamp();
        dispatched += 1;
      } catch (error: any) {
        failed += 1;
        const reason = String(error?.message || DEFAULT_FAILURE_REASON);
        scheduledRide.dispatch_failed_reason = reason;
        scheduledRide.updatedAt = timestamp();

        if ((scheduledRide.dispatch_attempts || 0) >= MAX_DISPATCH_ATTEMPTS) {
          scheduledRide.status = 'canceled';
          scheduledRide.canceledAt = timestamp();
          scheduledRide.cancellationReason = reason;
          canceled += 1;
        }
      }

      store.scheduledRides.set(scheduledRide.id, scheduledRide);
    }

    if (attempted > 0) markStoreDirty();

    return { ok: true, attempted, dispatched, failed, canceled };
  } catch (error: any) {
    logger.error('scheduled ride dispatcher failed', { error: error?.message });
    return { ok: false, error: error?.message || 'scheduled ride dispatcher failed' };
  } finally {
    isRunning = false;
  }
}
