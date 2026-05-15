import { appendAuditLog, listUsersByRole, markStoreDirty, store, timestamp } from './data.store';

export async function drivers_pending(_body: any, _params?: any, _query?: any) {
  const pending = Array.from(store.drivers.values()).filter(d => d.status === 'pending');
  return { module: 'admin', action: 'drivers-pending', ok: true, pending };
}

export async function approve_driver(body: any, _params?: any, _query?: any) {
  const profile = store.drivers.get(body?.userId);
  if (!profile) return { module: 'admin', action: 'approve-driver', error: 'driver profile not found' };
  const newStatus = body?.approved === false ? 'rejected' : 'approved';
  profile.status = newStatus;
  markStoreDirty();
  const actor = body?.__actor;
  if (actor) {
    appendAuditLog(actor.sub || actor.id, actor.role, `driver_${newStatus}`, body.userId, 'driver', { approved: body?.approved });
  }
  return { module: 'admin', action: 'approve-driver', ok: true, profile };
}

export async function live_rides(_body: any, _params?: any, _query?: any) {
  const live = Array.from(store.rides.values()).filter(r => r.status === 'requested' || r.status === 'accepted' || r.status === 'started');
  return { module: 'admin', action: 'live-rides', ok: true, live };
}

export async function risk_alerts(_body: any, _params?: any, _query?: any) {
  const alerts = store.safetyIncidents.slice(-50);
  return { module: 'admin', action: 'risk-alerts', ok: true, alerts };
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
      totalRides: rides.length,
      activeRides: rides.filter(r => ['requested', 'accepted', 'started'].includes(r.status)).length,
      completedRides: rides.filter(r => r.status === 'completed').length,
      totalPayments: payments.length,
      totalRevenueCents,
      openTickets: Array.from(store.tickets.values()).filter(t => t.status === 'open').length,
      openIncidents: store.safetyIncidents.filter(i => i.status === 'open' || i.status === 'under_review').length,
      pendingDrivers: Array.from(store.drivers.values()).filter(d => d.status === 'pending').length
    }
  };
}

export async function list_users(body: any, _params?: any, _query?: any) {
  const role = body?.role;
  const users = role ? listUsersByRole(role) : Array.from(store.users.values());
  const safeUsers = users.map(({ password: _pw, ...u }) => u);
  return { module: 'admin', action: 'list-users', ok: true, users: safeUsers };
}

export async function suspend_user(body: any, _params?: any, _query?: any) {
  const user = store.users.get(body?.userId);
  if (!user) return { module: 'admin', action: 'suspend-user', error: 'user not found' };
  const suspend = body?.suspend !== false;
  (user as any).suspended = suspend;
  markStoreDirty();
  const actor = body?.__actor;
  if (actor) {
    appendAuditLog(actor.sub || actor.id, actor.role, suspend ? 'user_suspended' : 'user_unsuspended', body.userId, 'user', { suspend });
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
    appendAuditLog(actor.sub || actor.id, actor.role, 'ticket_updated', ticket.id, 'ticket', { status: ticket.status });
  }
  return { module: 'admin', action: 'update-ticket', ok: true, ticket };
}

export async function audit_log(body: any, _params?: any, _query?: any) {
  const limit = Math.min(Number(body?.limit) || 100, 500);
  const logs = store.auditLogs.slice(-limit).reverse();
  return { module: 'admin', action: 'audit-log', ok: true, logs };
}
