import {
  appendAuditLog,
  createGovernanceRequest,
  isPrivilegedOperationsRole,
  makeId,
  markStoreDirty,
  openFraudSignal,
  store,
  timestamp
} from './data.store';
import { env } from './env';

const PRIVACY_REQUEST_TYPES = new Set(['privacy', 'account_deletion', 'data_export', 'privacy_delete', 'privacy_export']);
const REFUND_RELATED_TYPES = new Set(['billing', 'refund', 'chargeback']);
const DAY_MS = 1000 * 60 * 60 * 24;

function actorId(actor: any) {
  return actor?.sub || actor?.id;
}

function isPrivilegedActor(actor: any) {
  return isPrivilegedOperationsRole(actor?.role);
}

function canAccessTicket(actor: any, ticket: { userId: string }) {
  const currentActorId = actorId(actor);
  return Boolean(currentActorId) && (isPrivilegedActor(actor) || ticket.userId === currentActorId);
}

function maybeCreateGovernanceRequest(ticket: { id: string; userId: string; type: string; message: string }, actor: any) {
  if (!PRIVACY_REQUEST_TYPES.has(ticket.type)) return undefined;
  const type = ticket.type === 'data_export' || ticket.type === 'privacy_export'
    ? 'data_export' as const
    : 'account_deletion' as const;
  return createGovernanceRequest({
    userId: ticket.userId,
    type,
    requestedBy: actorId(actor) || ticket.userId,
    ticketId: ticket.id,
    notes: ticket.message
  });
}

function maybeFlagSupportFraudSignal(ticket: { id: string; userId: string; type: string }) {
  if (!REFUND_RELATED_TYPES.has(ticket.type)) return undefined;
  const cutoff = Date.now() - DAY_MS;
  const recentTickets = Array.from(store.tickets.values()).filter(existing =>
    existing.userId === ticket.userId
    && REFUND_RELATED_TYPES.has(existing.type)
    && new Date(existing.createdAt).getTime() >= cutoff
  );
  if (recentTickets.length < env.fraudRepeatedRefundThreshold) return undefined;
  return openFraudSignal({
    kind: 'repeated_refund_requests',
    severity: 'medium',
    userId: ticket.userId,
    ticketId: ticket.id,
    details: { recentTicketCount: recentTickets.length, threshold: env.fraudRepeatedRefundThreshold }
  });
}

export async function create_ticket(body: any, _params?: any, _query?: any) {
  const actor = body?.__actor;
  const currentActorId = actorId(actor);
  const userId = body?.userId || currentActorId;
  if (!userId) return { module: 'support', action: 'create-ticket', error: 'userId is required' };
  if (currentActorId && userId !== currentActorId && !isPrivilegedActor(actor)) {
    return { module: 'support', action: 'create-ticket', error: 'forbidden' };
  }

  const ticket = {
    id: makeId('ticket'),
    userId,
    type: body?.type || 'general',
    message: body?.message || '',
    status: 'open' as const,
    replies: [],
    createdAt: timestamp(),
    updatedAt: timestamp()
  };
  store.tickets.set(ticket.id, ticket);
  const governanceRequest = maybeCreateGovernanceRequest(ticket, actor);
  const fraudSignal = maybeFlagSupportFraudSignal(ticket);
  if (actor) {
    appendAuditLog(actorId(actor), actor.role, 'ticket_created', ticket.id, 'ticket', {
      type: ticket.type,
      governanceRequestId: governanceRequest?.id,
      fraudSignalId: fraudSignal?.id
    });
  }
  return { module: 'support', action: 'create-ticket', ok: true, ticket, governanceRequest, fraudSignal };
}

export async function list_tickets(body: any, _params?: any, _query?: any) {
  const actor = body?.__actor;
  const currentActorId = actorId(actor);
  if (!currentActorId) return { module: 'support', action: 'list-tickets', error: 'forbidden' };

  const status = body?.status;
  let tickets = Array.from(store.tickets.values());
  if (isPrivilegedActor(actor)) {
    if (body?.userId) tickets = tickets.filter(ticket => ticket.userId === body.userId);
  } else {
    tickets = tickets.filter(ticket => ticket.userId === currentActorId);
  }
  if (status) tickets = tickets.filter(ticket => ticket.status === status);
  return { module: 'support', action: 'list-tickets', ok: true, tickets };
}

export async function get_ticket(body: any, _params?: any, _query?: any) {
  const ticket = store.tickets.get(body?.ticketId);
  if (!ticket) return { module: 'support', action: 'get-ticket', error: 'ticket not found' };
  if (!canAccessTicket(body?.__actor, ticket)) return { module: 'support', action: 'get-ticket', error: 'forbidden' };
  return { module: 'support', action: 'get-ticket', ok: true, ticket };
}

export async function reply_ticket(body: any, _params?: any, _query?: any) {
  const ticket = store.tickets.get(body?.ticketId);
  if (!ticket) return { module: 'support', action: 'reply-ticket', error: 'ticket not found' };
  if (!canAccessTicket(body?.__actor, ticket)) return { module: 'support', action: 'reply-ticket', error: 'forbidden' };
  if (ticket.status === 'closed') return { module: 'support', action: 'reply-ticket', error: 'ticket is closed' };
  const actor = body?.__actor;
  const reply = {
    id: makeId('reply'),
    ticketId: ticket.id,
    authorId: actorId(actor) || body?.authorId || ticket.userId,
    authorRole: actor?.role || body?.authorRole || 'rider',
    message: body?.message || '',
    createdAt: timestamp()
  };
  ticket.replies.push(reply);
  if (ticket.status === 'open' && isPrivilegedActor(actor)) {
    ticket.status = 'in_review';
  }
  ticket.updatedAt = timestamp();
  markStoreDirty();
  if (actor) {
    appendAuditLog(actorId(actor), actor.role, 'ticket_replied', ticket.id, 'ticket', { status: ticket.status });
  }
  return { module: 'support', action: 'reply-ticket', ok: true, reply, ticket };
}

export async function close_ticket(body: any, _params?: any, _query?: any) {
  const ticket = store.tickets.get(body?.ticketId);
  if (!ticket) return { module: 'support', action: 'close-ticket', error: 'ticket not found' };
  if (!canAccessTicket(body?.__actor, ticket)) return { module: 'support', action: 'close-ticket', error: 'forbidden' };
  ticket.status = 'closed';
  if (body?.resolution) ticket.resolution = body.resolution;
  ticket.updatedAt = timestamp();
  markStoreDirty();
  const actor = body?.__actor;
  if (actor) {
    appendAuditLog(actorId(actor), actor.role, 'ticket_closed', ticket.id, 'ticket', { resolution: body?.resolution });
  }
  return { module: 'support', action: 'close-ticket', ok: true, ticket };
}

export async function refund_review(body: any, _params?: any, _query?: any) {
  const actor = body?.__actor;
  if (!isPrivilegedActor(actor)) return { module: 'support', action: 'refund-review', error: 'forbidden' };
  const ticketId = body?.ticketId;
  const approved = Boolean(body?.approved);
  const ticket = ticketId ? store.tickets.get(ticketId) : undefined;
  if (!ticket) return { module: 'support', action: 'refund-review', error: 'ticket not found' };
  ticket.status = approved ? 'closed' : 'in_review';
  if (approved) ticket.resolution = 'refund approved';
  ticket.updatedAt = timestamp();
  markStoreDirty();
  appendAuditLog(actorId(actor), actor.role, approved ? 'refund_approved' : 'refund_denied', ticket.id, 'ticket', { approved });
  return { module: 'support', action: 'refund-review', ok: true, ticket, approved };
}
