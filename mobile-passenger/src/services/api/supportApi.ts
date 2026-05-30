import { apiClient } from './client';
import type { ApiEnvelope } from '../../types/api';

type SupportReply = {
  id: string;
  authorId: string;
  authorRole: string;
  message: string;
  createdAt: string;
};

type SupportTicket = {
  id: string;
  type: string;
  message: string;
  status: 'open' | 'in_review' | 'closed';
  replies: SupportReply[];
  createdAt: string;
  updatedAt: string;
};

export const supportApi = {
  listTickets(userId: string) {
    return apiClient.post<ApiEnvelope<{ tickets: SupportTicket[] }>>('/api/support/list-tickets', { userId }, { auth: true });
  },

  createTicket(userId: string, type: string, message: string) {
    return apiClient.post<ApiEnvelope<{ ticket: SupportTicket }>>('/api/support/create-ticket', { userId, type, message }, { auth: true });
  },

  replyTicket(userId: string, ticketId: string, message: string) {
    return apiClient.post<ApiEnvelope<{ ticket: SupportTicket }>>('/api/support/reply-ticket', { userId, ticketId, message }, { auth: true });
  },
};
