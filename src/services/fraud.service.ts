/**
 * Fraud detection service – rule-based anomaly detection with a scoring system.
 * Signals are evaluated and combined into a risk score (0-100).
 * In production this would be backed by an ML model or third-party provider.
 */
import {
  appendAuditLog,
  makeId,
  markStoreDirty,
  store,
  timestamp,
  type Chargeback,
  type FraudAlert,
  type FraudRiskLevel
} from '../database/data.store';
import {
  detectChargebackHistory,
  detectExcessiveCancellations,
  detectFrequentRefunds,
  detectHighFrequencyRequests,
  detectImpossibleTravel,
  detectLowRating,
  detectMultipleChargebacks,
  detectMultiplePaymentMethods,
  detectMultipleSupportTickets,
  detectNewAccountHighValue,
  detectPaymentFailures,
  detectPromoAbuse,
  detectRapidBookings,
  detectRecentFailedPayments,
  detectVeryLowRating
} from '../utils/fraud-rules';

// ─── Signal weights ───────────────────────────────────────────────────────────

const SIGNAL_WEIGHTS: Record<string, number> = {
  high_frequency_requests: 20,
  excessive_cancellations: 15,
  payment_failure_streak: 25,
  recent_failed_payments: 30,
  unusual_location_jump: 30,
  new_account_high_value: 15,
  rapid_bookings_detected: 20,
  chargeback_history: 40,
  multiple_chargebacks: 50,
  impossible_travel_detected: 35,
  very_low_rating: 25,
  low_rating: 15,
  frequent_refund_requests: 20,
  multiple_open_support_tickets: 15,
  multiple_payment_methods_used: 25,
  promo_abuse: 20
};

function getRiskLevel(score: number): FraudRiskLevel {
  if (score >= 70) return 'critical';
  if (score >= 45) return 'high';
  if (score >= 20) return 'medium';
  return 'low';
}

// ─── Main fraud evaluation function ──────────────────────────────────────────

export function evaluateFraudRisk(
  userId: string,
  context: { fareAmountCents?: number; rideId?: string; paymentId?: string } = {}
): { score: number; riskLevel: FraudRiskLevel; signals: string[] } {
  const signals: string[] = [];

  if (detectHighFrequencyRequests(userId)) signals.push('high_frequency_requests');
  if (detectExcessiveCancellations(userId)) signals.push('excessive_cancellations');
  if (detectPaymentFailures(userId)) signals.push('payment_failure_streak');
  if (detectRecentFailedPayments(userId)) signals.push('recent_failed_payments');
  if (context.fareAmountCents && detectNewAccountHighValue(userId, context.fareAmountCents)) {
    signals.push('new_account_high_value');
  }
  if (detectPromoAbuse(userId)) signals.push('promo_abuse');
  if (detectRapidBookings(userId)) signals.push('rapid_bookings_detected');
  if (detectMultipleChargebacks(userId)) {
    signals.push('multiple_chargebacks');
  } else if (detectChargebackHistory(userId)) {
    signals.push('chargeback_history');
  }
  if (detectImpossibleTravel(userId)) signals.push('impossible_travel_detected');
  if (detectVeryLowRating(userId)) {
    signals.push('very_low_rating');
  } else if (detectLowRating(userId)) {
    signals.push('low_rating');
  }
  if (detectFrequentRefunds(userId)) signals.push('frequent_refund_requests');
  if (detectMultipleSupportTickets(userId)) signals.push('multiple_open_support_tickets');
  if (detectMultiplePaymentMethods(userId)) signals.push('multiple_payment_methods_used');

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

  // Automatically suspend users with a critical fraud score
  if (riskLevel === 'critical') {
    const user = store.users.get(userId);
    if (user && !(user as any).suspended) {
      (user as any).suspended = true;
      (user as any).suspendReason = 'Fraud detection – automatic suspension';
      (user as any).suspendedAt = timestamp();
      store.users.set(userId, user);

      appendAuditLog(
        'system',
        'system',
        'fraud_auto_suspend',
        userId,
        'user',
        { fraudScore: score, signals }
      );
    }
  }

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
  const reviewerId = body?.reviewerId || body?.adminId || body?.actor?.id;
  const action = body?.action || 'none';

  if (!alertId) return { module: 'fraud', action: 'review', error: 'alertId required' };

  const alert = store.fraudAlerts.find(a => a.id === alertId);
  if (!alert) return { module: 'fraud', action: 'review', error: 'alert not found' };

  alert.reviewed = true;
  alert.reviewedBy = reviewerId;
  alert.reviewedAt = timestamp();
  alert.action = action;

  // If admin clears the alert, unsuspend the user (if suspended by fraud detection)
  if (action === 'none') {
    const user = store.users.get(alert.userId);
    if (user && (user as any).suspended && ((user as any).suspendReason as string | undefined)?.includes('Fraud')) {
      (user as any).suspended = false;
      (user as any).suspendReason = null;
      store.users.set(alert.userId, user);
    }
  }

  markStoreDirty();

  if (reviewerId) {
    appendAuditLog(reviewerId, 'admin', 'fraud_alert_reviewed', alert.userId, 'user', { action });
  }

  return { module: 'fraud', action: 'review', ok: true, alert };
}

export async function checkUser(body: any) {
  const userId = body?.userId;
  if (!userId) return { module: 'fraud', action: 'check', error: 'userId required' };

  const result = evaluateFraudRisk(userId, { fareAmountCents: body?.fareAmountCents });
  return { module: 'fraud', ok: true, ...result };
}

export async function reportChargeback(body: any) {
  const { paymentId, reason } = body;
  const reportedBy = body?.actor?.id || body?.adminId;

  if (!paymentId) return { module: 'fraud', action: 'chargeback', error: 'paymentId required' };
  if (!reason) return { module: 'fraud', action: 'chargeback', error: 'reason required' };

  const payment = store.payments.get(paymentId);
  if (!payment) return { module: 'fraud', action: 'chargeback', error: 'payment not found' };

  const chargeback: Chargeback = {
    id: makeId('chargeback'),
    paymentId,
    userId: payment.riderId ?? '',
    amountCents: payment.amountCents,
    reason,
    status: 'initiated',
    reportedDate: new Date().toISOString().slice(0, 10),
    reportedBy,
    createdAt: timestamp()
  };

  store.chargebacks.push(chargeback);
  markStoreDirty();

  if (reportedBy && payment.riderId) {
    appendAuditLog(reportedBy, 'admin', 'chargeback_reported', payment.riderId, 'user', {
      paymentId,
      reason,
      amountCents: payment.amountCents
    });
  }

  // Re-evaluate fraud risk when a chargeback is filed
  if (payment.riderId) {
    createFraudAlert(payment.riderId, { paymentId });
  }

  return { module: 'fraud', action: 'chargeback', ok: true, chargeback };
}

export async function listChargebacks(body: any) {
  const userId = body?.userId;
  const status = body?.status;
  const limit = Math.min(Number(body?.limit || 50), 200);

  let results = [...store.chargebacks];
  if (userId) results = results.filter(c => c.userId === userId);
  if (status) results = results.filter(c => c.status === status);
  results = results.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);

  return { module: 'fraud', ok: true, total: results.length, chargebacks: results };
}

