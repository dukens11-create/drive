/**
 * Fraud monitor – runs hourly to scan all riders and escalate users whose
 * fraud score has risen significantly since the last check.
 */
import { store } from '../database/data.store';
import { createFraudAlert, evaluateFraudRisk } from '../services/fraud.service';
import { logger } from '../utils/logger';

export async function runFraudMonitor(): Promise<{ ok: boolean; checked: number; escalated: number; error?: string }> {
  try {
    const riders = Array.from(store.users.values()).filter(u => u.role === 'rider');

    let checked = 0;
    let escalated = 0;

    for (const user of riders) {
      checked++;
      const { score, riskLevel } = evaluateFraudRisk(user.id);

      // Only act when the score is above 'low'
      if (riskLevel === 'low') continue;

      const previousAlert = [...store.fraudAlerts]
        .filter(a => a.userId === user.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

      // Escalate if there is no previous alert, or the score jumped by >= 20
      if (!previousAlert || score > previousAlert.score + 20) {
        createFraudAlert(user.id);
        escalated++;
      }
    }

    logger.info('fraud monitor run complete', { checked, escalated });
    return { ok: true, checked, escalated };
  } catch (err: any) {
    logger.error('fraud monitor failed', { error: err?.message });
    return { ok: false, checked: 0, escalated: 0, error: err?.message };
  }
}
