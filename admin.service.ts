import { env } from './env';
import {
  anonymizeUser,
  appendAuditLog,
  isComplianceRole,
  listUsersByRole,
  markStoreDirty,
  store,
  timestamp
} from './data.store';

const DAY_MS = 1000 * 60 * 60 * 24;

function actorId(actor: any) {
  return actor?.sub || actor?.id;
}

function sanitizeUser(user: any) {
  const { password, ...safe } = user;
  return safe;
}

function removeClosedTicketsOlderThan(cutoff: number) {
  let removed = 0;
  for (const [ticketId, ticket] of Array.from(store.tickets.entries())) {
    if (ticket.status !== 'closed') continue;
    if (new Date(ticket.updatedAt).getTime() > cutoff) continue;
    if (store.tickets.delete(ticketId)) removed += 1;
  }
  return removed;
}

function removeResolvedFraudSignalsOlderThan(cutoff: number) {
  const retainedSignals = store.fraudSignals.filter(signal => {
    const effectiveTimestamp = signal.reviewedAt || signal.createdAt;
    return signal.status === 'open' || new Date(effectiveTimestamp).getTime() > cutoff;
  });
  const removed = store.fraudSignals.length - retainedSignals.length;
  if (removed > 0) {
    store.fraudSignals.splice(0, store.fraudSignals.length, ...retainedSignals);
  }
  return removed;
}

function removeCompletedGovernanceRequestsOlderThan(cutoff: number) {
  const retainedRequests = store.governanceRequests.filter(request => {
    const effectiveTimestamp = request.completedAt || request.reviewedAt || request.requestedAt;
    if (request.status === 'requested' || request.status === 'under_review') return true;
    return new Date(effectiveTimestamp).getTime() > cutoff;
  });
  const removed = store.governanceRequests.length - retainedRequests.length;
  if (removed > 0) {
    store.governanceRequests.splice(0, store.governanceRequests.length, ...retainedRequests);
  }
  return removed;
}

function removeExpiredRefreshTokens() {
  let revoked = 0;
  for (const [tokenHash, session] of Array.from(store.refreshTokens.entries())) {
    if (new Date(session.expiresAt).getTime() > Date.now()) continue;
    if (store.refreshTokens.delete(tokenHash)) revoked += 1;
  }
  return revoked;
}

export async function drivers_pending(_body: any, _params?: any, _query?: any) {
  const pending = Array.from(store.drivers.values()).filter(d => d.status === 'pending');
  return { module: 'admin', action: 'drivers-pending', ok: true, pending };
}

export async function approve_driver(body: any, _params?: any, _query?: any) {
  const profile = store.drivers.get(body?.userId);
  if (!profile) return { module: 'admin', action: 'approve-driver', error: 'driver profile not found' };
  const newStatus = body?.approved === false ? 'rejected' : 'approved';
  profile.status = newStatus;
  if (newStatus === 'rejected') {
    profile.verificationState = 'rejected';
    profile.availabilityStatus = 'unavailable';
    profile.available = false;
  } else {
    profile.verificationState = 'verified';
    if (!profile.availabilityStatus || profile.availabilityStatus === 'unavailable') profile.availabilityStatus = 'offline';
    profile.available = profile.availabilityStatus === 'online';
  }
  markStoreDirty();
  const actor = body?.__actor;
  if (actor) {
    appendAuditLog(actorId(actor), actor.role, `driver_${newStatus}`, body.userId, 'driver', { approved: body?.approved });
  }
  return { module: 'admin', action: 'approve-driver', ok: true, profile };
}

export async function live_rides(_body: any, _params?: any, _query?: any) {
  const live = Array.from(store.rides.values()).filter(r => r.status === 'requested' || r.status === 'accepted' || r.status === 'started');
  return { module: 'admin', action: 'live-rides', ok: true, live };
}

export async function risk_alerts(body: any, _params?: any, _query?: any) {
  const status = body?.status;
  const severity = body?.severity;
  let fraudSignals = [...store.fraudSignals];
  if (status) fraudSignals = fraudSignals.filter(signal => signal.status === status);
  if (severity) fraudSignals = fraudSignals.filter(signal => signal.severity === severity);
  const incidents = store.safetyIncidents.slice(-50);
  return { module: 'admin', action: 'risk-alerts', ok: true, alerts: { incidents, fraudSignals } };
}

export async function refunds(_body: any, _params?: any, _query?: any) {
  const refunds = Array.from(store.payments.values()).filter(p => p.status === 'refunded');
  return { module: 'admin', action: 'refunds', ok: true, refunds, riders: listUsersByRole('rider') };
}

export async function platform_stats(_body: any, _params?: any, _query?: any) {
  const users = Array.from(store.users.values());
  const rides = Array.from(store.rides.values());
  const payments = Array.from(store.payments.values());
  const totalRevenueCents = payments.filter(p => p.status === 'captured').reduce((s, p) => s + p.amountCents, 0);
  return {
    module: 'admin',
    action: 'platform-stats',
    ok: true,
    stats: {
      totalUsers: users.length,
      riders: users.filter(u => u.role === 'rider').length,
      drivers: users.filter(u => u.role === 'driver').length,
      merchants: users.filter(u => u.role === 'merchant').length,
      supportAgents: users.filter(u => u.role === 'support').length,
      complianceUsers: users.filter(u => u.role === 'compliance').length,
      totalRides: rides.length,
      activeRides: rides.filter(r => ['requested', 'accepted', 'started'].includes(r.status)).length,
      completedRides: rides.filter(r => r.status === 'completed').length,
      totalPayments: payments.length,
      totalRevenueCents,
      openTickets: Array.from(store.tickets.values()).filter(t => t.status === 'open').length,
      openIncidents: store.safetyIncidents.filter(i => i.status === 'open' || i.status === 'under_review').length,
      pendingDrivers: Array.from(store.drivers.values()).filter(d => d.status === 'pending').length,
      openFraudSignals: store.fraudSignals.filter(signal => signal.status === 'open').length,
      governanceQueue: store.governanceRequests.filter(request => request.status === 'requested' || request.status === 'under_review').length
    }
  };
}

export async function list_users(body: any, _params?: any, _query?: any) {
  const role = body?.role;
  const users = role ? listUsersByRole(role) : Array.from(store.users.values());
  return { module: 'admin', action: 'list-users', ok: true, users: users.map(sanitizeUser) };
}

export async function suspend_user(body: any, _params?: any, _query?: any) {
  const user = store.users.get(body?.userId);
  if (!user) return { module: 'admin', action: 'suspend-user', error: 'user not found' };
  const suspend = body?.suspend !== false;
  user.suspended = suspend;
  markStoreDirty();
  const actor = body?.__actor;
  if (actor) {
    appendAuditLog(actorId(actor), actor.role, suspend ? 'user_suspended' : 'user_unsuspended', body.userId, 'user', { suspend });
  }
  return { module: 'admin', action: 'suspend-user', ok: true, userId: body.userId, suspended: suspend };
}

export async function update_ticket(body: any, _params?: any, _query?: any) {
  const ticket = store.tickets.get(body?.ticketId);
  if (!ticket) return { module: 'admin', action: 'update-ticket', error: 'ticket not found' };
  const allowedStatuses = ['open', 'in_review', 'closed'] as const;
  if (body?.status && allowedStatuses.includes(body.status)) {
    ticket.status = body.status;
    ticket.updatedAt = timestamp();
    if (body?.resolution) ticket.resolution = body.resolution;
  }
  markStoreDirty();
  const actor = body?.__actor;
  if (actor) {
    appendAuditLog(actorId(actor), actor.role, 'ticket_updated', ticket.id, 'ticket', { status: ticket.status });
  }
  return { module: 'admin', action: 'update-ticket', ok: true, ticket };
}

export async function audit_log(body: any, _params?: any, _query?: any) {
  const limit = Math.min(Number(body?.limit) || 100, 500);
  const logs = store.auditLogs.slice(-limit).reverse();
  return { module: 'admin', action: 'audit-log', ok: true, logs };
}

export async function governance_requests(body: any, _params?: any, _query?: any) {
  const status = body?.status;
  const type = body?.type;
  const userId = body?.userId;
  let requests = [...store.governanceRequests];
  if (status) requests = requests.filter(request => request.status === status);
  if (type) requests = requests.filter(request => request.type === type);
  if (userId) requests = requests.filter(request => request.userId === userId);
  return { module: 'admin', action: 'governance-requests', ok: true, requests };
}

export async function review_governance_request(body: any, _params?: any, _query?: any) {
  const actor = body?.__actor;
  if (!isComplianceRole(actor?.role)) return { module: 'admin', action: 'review-governance-request', error: 'forbidden' };

  const request = store.governanceRequests.find(entry => entry.id === body?.requestId);
  if (!request) return { module: 'admin', action: 'review-governance-request', error: 'governance request not found' };

  const approve = body?.approve !== false;
  request.reviewedAt = timestamp();
  request.reviewedBy = actorId(actor);
  request.notes = body?.notes || request.notes;

  if (!approve) {
    request.status = 'rejected';
    markStoreDirty();
    appendAuditLog(actorId(actor), actor.role, 'governance_request_rejected', request.id, 'governance_request', { type: request.type });
    return { module: 'admin', action: 'review-governance-request', ok: true, request };
  }

  request.status = 'under_review';
  let affectedUser: any;
  let revokedTokens = 0;
  if (request.type === 'account_deletion') {
    const anonymized = anonymizeUser(request.userId);
    if (!anonymized) return { module: 'admin', action: 'review-governance-request', error: 'user not found' };
    affectedUser = sanitizeUser(anonymized.user);
    revokedTokens = anonymized.revokedTokens;
  } else {
    const user = store.users.get(request.userId);
    if (!user) return { module: 'admin', action: 'review-governance-request', error: 'user not found' };
    affectedUser = sanitizeUser(user);
  }
  request.status = 'completed';
  request.completedAt = timestamp();
  markStoreDirty();
  appendAuditLog(actorId(actor), actor.role, 'governance_request_completed', request.id, 'governance_request', {
    type: request.type,
    userId: request.userId,
    revokedTokens
  });
  return { module: 'admin', action: 'review-governance-request', ok: true, request, user: affectedUser, revokedTokens };
}

export async function retention_sweep(body: any, _params?: any, _query?: any) {
  const actor = body?.__actor;
  if (!isComplianceRole(actor?.role)) return { module: 'admin', action: 'retention-sweep', error: 'forbidden' };

  const expiredRefreshTokensRevoked = removeExpiredRefreshTokens();
  const closedTicketsDeleted = removeClosedTicketsOlderThan(Date.now() - env.supportTicketRetentionDays * DAY_MS);
  const resolvedFraudSignalsDeleted = removeResolvedFraudSignalsOlderThan(Date.now() - env.fraudSignalRetentionDays * DAY_MS);
  const completedGovernanceRequestsDeleted = removeCompletedGovernanceRequestsOlderThan(Date.now() - env.governanceRequestRetentionDays * DAY_MS);
  markStoreDirty();
  appendAuditLog(actorId(actor), actor.role, 'retention_sweep_run', undefined, 'retention_sweep', {
    expiredRefreshTokensRevoked,
    closedTicketsDeleted,
    resolvedFraudSignalsDeleted,
    completedGovernanceRequestsDeleted
  });

  return {
    module: 'admin',
    action: 'retention-sweep',
    ok: true,
    summary: {
      expiredRefreshTokensRevoked,
      closedTicketsDeleted,
      resolvedFraudSignalsDeleted,
      completedGovernanceRequestsDeleted
    }
  };
}

export async function backup_plan(_body: any, _params?: any, _query?: any) {
  return {
    module: 'admin',
    action: 'backup-plan',
    ok: true,
    plan: {
      dataStoreMode: env.dataStoreMode,
      dataStoreFile: env.dataStoreFile,
      backupExportDir: env.backupExportDir,
      recommendations: [
        'Take externally encrypted snapshots of the primary store before deployments and at least daily when DATA_STORE_MODE=file.',
        'Test restore into a clean environment and verify /readyz plus admin governance statistics after recovery.',
        'Keep backup access restricted to admin/compliance operators and store secrets outside the repository.'
      ]
    }
  };
}
