import { reconcilePendingRideTransfers } from '../services/driver-payouts.service';

export async function runDriverPayoutReconciler() {
  try {
    return await reconcilePendingRideTransfers(50);
  } catch (error: any) {
    return {
      ok: false,
      error: String(error?.message || 'driver payout reconciliation failed')
    };
  }
}