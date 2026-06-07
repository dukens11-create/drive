import { appendAuditLog, makeId, markStoreDirty, store, timestamp } from '../database/data.store';
import { sendRealtimePushEvent } from './notifications.service';
import { logger } from '../utils/logger';
import { notificationTemplates } from '../utils/fcm-templates';
import { sendEmail } from './email.service';
import { sendSMS, sendSupportTicketCreatedSms } from './sms.service';
import { emailTemplates } from '../utils/email-templates';
import { smsTemplates } from '../utils/sms-templates';
import { env } from '../config/env';

export async function create_ticket(body: any, _params?: any, _query?: any) {
  const ticket = {
    id: makeId('ticket'),
    userId: body?.userId,
    type: body?.type || 'general',
    message: body?.message || '',
    status: 'open' as const,
    replies: [],
    createdAt: timestamp(),
    updatedAt: timestamp()
  };
  store.tickets.set(ticket.id, ticket);
  const actor = body?.__actor;
  if (actor) {
    appendAuditLog(actor.sub || actor.id, actor.role, 'ticket_created', ticket.id, 'ticket', { type: ticket.type });
  }

  // SMS confirmation to user when ticket is created
  if (ticket.userId) {
    const user = store.users.get(ticket.userId);
    if (user?.phone) {
      const ticketNumber = ticket.id.split('_')[1] || ticket.id;
      sendSupportTicketCreatedSms(
        user.phone,
        { ticketNumber },
        ticket.userId
      ).catch(err => logger.warn('support_ticket_created SMS failed', { ticketId: ticket.id, error: err?.message }));
    }
  }

  return { module: 'support', action: 'create-ticket', ok: true, ticket };
}

export async function list_tickets(body: any, _params?: any, _query?: any) {
  const userId = body?.userId;
  const status = body?.status;
  let tickets = Array.from(store.tickets.values());
  if (userId) tickets = tickets.filter(t => t.userId === userId);
  if (status) tickets = tickets.filter(t => t.status === status);
  return { module: 'support', action: 'list-tickets', ok: true, tickets };
}

export async function get_ticket(body: any, _params?: any, _query?: any) {
  const ticket = store.tickets.get(body?.ticketId);
  if (!ticket) return { module: 'support', action: 'get-ticket', error: 'ticket not found' };
  return { module: 'support', action: 'get-ticket', ok: true, ticket };
}

export async function reply_ticket(body: any, _params?: any, _query?: any) {
  const ticket = store.tickets.get(body?.ticketId);
  if (!ticket) return { module: 'support', action: 'reply-ticket', error: 'ticket not found' };
  if (ticket.status === 'closed') return { module: 'support', action: 'reply-ticket', error: 'ticket is closed' };
  const actor = body?.__actor;
  const reply = {
    id: makeId('reply'),
    ticketId: ticket.id,
    authorId: body?.authorId || actor?.id || body?.userId,
    authorRole: body?.authorRole || actor?.role || 'rider',
    message: body?.message || '',
    createdAt: timestamp()
  };
  ticket.replies.push(reply);
  if (ticket.status === 'open' && (reply.authorRole === 'admin' || reply.authorRole === 'support')) {
    ticket.status = 'in_review';
  }
  ticket.updatedAt = timestamp();
  markStoreDirty();
  if (
    ticket.userId &&
    ticket.userId !== reply.authorId &&
    (reply.authorRole === 'admin' || reply.authorRole === 'support')
  ) {
    const ticketUser = store.users.get(ticket.userId);
    const ticketNumber = ticket.id.split('_').pop() || ticket.id;
    if (ticketUser?.email) {
      const supportReplyTemplate = emailTemplates.SUPPORT_REPLY({
        ticketNumber,
        status: ticket.status,
        reply: reply.message,
        ticketLink: `${env.appBaseUrl || 'https://app.drive.com'}/support/tickets/${ticket.id}`
      });
      await sendEmail(ticketUser.email, supportReplyTemplate.subject, supportReplyTemplate.html, { template: 'support_reply', userId: ticket.userId });
    }
    if (ticketUser?.phone && ticket.type === 'urgent') {
      await sendSMS(
        ticketUser.phone,
        smsTemplates.SUPPORT_REPLY({
          ticketNumber,
          preview: reply.message
        }),
        { template: 'support_reply_urgent', userId: ticket.userId }
      );
    }
    try {
      const template = notificationTemplates.SUPPORT_REPLY({
        ticketId: ticket.id,
        replyPreview: reply.message
      });
      await sendRealtimePushEvent({
        userId: ticket.userId,
        category: 'support_replies',
        title: template.title,
        body: template.body,
        template: 'support_reply',
        data: template.data
      });
    } catch (error: any) {
      logger.warn('Support reply push notification failed', { ticketId: ticket.id, userId: ticket.userId, error: error?.message });
    }
  }
  return { module: 'support', action: 'reply-ticket', ok: true, reply, ticket };
}

export async function close_ticket(body: any, _params?: any, _query?: any) {
  const ticket = store.tickets.get(body?.ticketId);
  if (!ticket) return { module: 'support', action: 'close-ticket', error: 'ticket not found' };
  ticket.status = 'closed';
  if (body?.resolution) ticket.resolution = body.resolution;
  ticket.updatedAt = timestamp();
  markStoreDirty();
  const actor = body?.__actor;
  if (actor) {
    appendAuditLog(actor.sub || actor.id, actor.role, 'ticket_closed', ticket.id, 'ticket', { resolution: body?.resolution });
  }
  return { module: 'support', action: 'close-ticket', ok: true, ticket };
}

export async function refund_review(body: any, _params?: any, _query?: any) {
  const ticketId = body?.ticketId;
  const approved = Boolean(body?.approved);
  const ticket = ticketId ? store.tickets.get(ticketId) : undefined;
  if (!ticket) return { module: 'support', action: 'refund-review', error: 'ticket not found' };
  ticket.status = approved ? 'closed' : 'in_review';
  if (approved) ticket.resolution = 'refund approved';
  ticket.updatedAt = timestamp();
  markStoreDirty();
  const actor = body?.__actor;
  if (actor) {
    appendAuditLog(actor.sub || actor.id, actor.role, approved ? 'refund_approved' : 'refund_denied', ticket.id, 'ticket', { approved });
  }
  return { module: 'support', action: 'refund-review', ok: true, ticket, approved };
}
