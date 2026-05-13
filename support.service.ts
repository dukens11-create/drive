import { makeId, store, timestamp } from './data.store';

export async function create_ticket(body: any, _params?: any, _query?: any) {
  const ticket = {
    id: makeId('ticket'),
    userId: body?.userId,
    type: body?.type || 'general',
    message: body?.message || '',
    status: 'open' as const,
    createdAt: timestamp()
  };
  store.tickets.set(ticket.id, ticket);
  return { module: 'support', action: 'create-ticket', ok: true, ticket };
}

export async function list_tickets(body: any, _params?: any, _query?: any) {
  const userId = body?.userId;
  const tickets = Array.from(store.tickets.values()).filter(t => !userId || t.userId === userId);
  return { module: 'support', action: 'list-tickets', ok: true, tickets };
}

export async function refund_review(body: any, _params?: any, _query?: any) {
  const ticketId = body?.ticketId;
  const approved = Boolean(body?.approved);
  const ticket = ticketId ? store.tickets.get(ticketId) : undefined;
  if (!ticket) return { module: 'support', action: 'refund-review', error: 'ticket not found' };
  ticket.status = approved ? 'closed' : 'in_review';
  return { module: 'support', action: 'refund-review', ok: true, ticket, approved };
}
