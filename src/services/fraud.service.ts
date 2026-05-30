/**
 * Fraud detection service – rule-based anomaly detection with a scoring system.
 * Signals are evaluated and combined into a risk score (0-100).
 * In production this would be backed by an ML model or third-party provider.
 */
import {
  makeId,
  markStoreDirty,
  store,
  timestamp,
  type FraudAlert,
  type FraudRiskLevel
} from '../database/data.store';

// ─── Signal weights ───────────────────────────────────────────────────────────

const SIGNAL_WEIGHTS: Record<string, number> = {
  high_frequency_requests: 20,        // >10 ride requests in 1 hour
  excessive_cancellations: 15,         // >5 cancellations in last 24h
  payment_failure_streak: 25,          // >3 consecutive payment failures
  unusual_location_jump: 30,           // >100 miles between consecutive rides in <30 min
  new_account_high_value: 15,         // account <24h old with fare >$100
  multiple_accounts_same_device: 35,   // detected via device fingerprint (stub)
  chargeback_history: 40,             // prior chargebacks on account
  promo_abuse: 20                      // using >3 promos in 24h
};

function getRiskLevel(score: number): FraudRiskLevel {
  if (score >= 70) return 'critical';
  if (score >= 45) return 'high';
  if (score >= 20) return 'medium';
  return 'low';
}

// ─── Rule evaluators ─────────────────────────────────────────────────────────

function checkHighFrequencyRequests(userId: string): boolean {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const recentRides = Array.from(store.rides.values()).filter(
    r => r.riderId === userId && r.createdAt >= oneHourAgo
  );
  return recentRides.length > 10;
}

function checkExcessiveCancellations(userId: string): boolean {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const recentCancels = Array.from(store.rides.values()).filter(
    r => r.riderId === userId && r.status === 'canceled' && r.createdAt >= oneDayAgo
  );
  return recentCancels.length > 5;
}

function checkPaymentFailures(userId: string): boolean {
  const userPayments = Array.from(store.payments.values())
    .filter(p => p.riderId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);
  const recentFailed = userPayments.filter(p => p.status === 'failed');
  return recentFailed.length >= 3;
}

function checkNewAccountHighValue(userId: string, fareAmountCents: number): boolean {
  const user = store.users.get(userId);
  if (!user) return false;
  const accountAgeMs = Date.now() - new Date(user.createdAt).getTime();
  const isNewAccount = accountAgeMs < 24 * 60 * 60 * 1000;
  return isNewAccount && fareAmountCents > 10000;
}

function checkPromoAbuse(userId: string): boolean {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const promoRides = Array.from(store.rides.values()).filter(
    r => r.riderId === userId && r.promoId && r.createdAt >= oneDayAgo
  );
  return promoRides.length > 3;
}

// ─── Main fraud evaluation function ──────────────────────────────────────────

export function evaluateFraudRisk(
  userId: string,
  context: { fareAmountCents?: number; rideId?: string; paymentId?: string } = {}
): { score: number; riskLevel: FraudRiskLevel; signals: string[] } {
  const signals: string[] = [];

  if (checkHighFrequencyRequests(userId)) signals.push('high_frequency_requests');
  if (checkExcessiveCancellations(userId)) signals.push('excessive_cancellations');
  if (checkPaymentFailures(userId)) signals.push('payment_failure_streak');
  if (context.fareAmountCents && checkNewAccountHighValue(userId, context.fareAmountCents)) {
    signals.push('new_account_high_value');
  }
  if (checkPromoAbuse(userId)) signals.push('promo_abuse');

  const score = Math.min(
    signals.reduce((sum, signal) => sum + (SIGNAL_WEIGHTS[signal] || 0), 0),
    100
  );

  return { score, riskLevel: getRiskLevel(score), signals };
}

export function createFraudAlert(
  userId: string,
  context: { fareAmountCents?: number; rideId?: string; paymentId?: string } = {}
): FraudAlert | null {
  const { score, riskLevel, signals } = evaluateFraudRisk(userId, context);
  if (riskLevel === 'low') return null;

  const alert: FraudAlert = {
    id: makeId('fraud'),
    userId,
    rideId: context.rideId,
    paymentId: context.paymentId,
    riskLevel,
    signals,
    score,
    reviewed: false,
    createdAt: timestamp()
  };

  store.fraudAlerts.push(alert);
  markStoreDirty();
  return alert;
}

// ─── Service endpoints ────────────────────────────────────────────────────────

export async function listFraudAlerts(body: any) {
  const riskLevel = body?.riskLevel as FraudRiskLevel | undefined;
  const reviewed = body?.reviewed;
  const userId = body?.userId;
  const limit = Math.min(Number(body?.limit || 50), 200);

  let alerts = [...store.fraudAlerts];
  if (riskLevel) alerts = alerts.filter(a => a.riskLevel === riskLevel);
  if (typeof reviewed === 'boolean') alerts = alerts.filter(a => a.reviewed === reviewed);
  if (userId) alerts = alerts.filter(a => a.userId === userId);
  alerts = alerts.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);

  return { module: 'fraud', ok: true, total: alerts.length, alerts };
}

export async function reviewFraudAlert(body: any, params?: any) {
  const alertId = params?.id || body?.alertId;
  const reviewerId = body?.reviewerId || body?.adminId;
  const action = body?.action || 'none';

  if (!alertId) return { module: 'fraud', action: 'review', error: 'alertId required' };

  const alert = store.fraudAlerts.find(a => a.id === alertId);
  if (!alert) return { module: 'fraud', action: 'review', error: 'alert not found' };

  alert.reviewed = true;
  alert.reviewedBy = reviewerId;
  alert.reviewedAt = timestamp();
  alert.action = action;
  markStoreDirty();

  return { module: 'fraud', action: 'review', ok: true, alert };
}

export async function checkUser(body: any) {
  const userId = body?.userId;
  if (!userId) return { module: 'fraud', action: 'check', error: 'userId required' };

  const result = evaluateFraudRisk(userId, { fareAmountCents: body?.fareAmountCents });
  return { module: 'fraud', ok: true, ...result };
}
