import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import { env } from '../config/env';
import { store } from '../database/data.store';

export function registerChatSocket(io: Server) {
  io.on('connection', socket => {
    socket.on('chat:join', ({ conversationId }) => {
      if (!conversationId) return;
      const conversation = store.chatConversations.get(conversationId);
      if (!conversation) return;

      const authHeader = socket.handshake.auth?.token || socket.handshake.headers.authorization;
      const token = typeof authHeader === 'string' ? authHeader.replace(/^Bearer\s+/i, '') : '';
      if (!token) return;

      try {
        const payload = jwt.verify(token, env.jwtSecret) as any;
        if (!conversation.participantIds.includes(payload?.sub)) return;
        socket.join(`chat:${conversationId}`);
      } catch {
        return;
      }
    });

    socket.on('chat:typing', payload => {
      if (!payload?.conversationId) return;
      io.to(`chat:${payload.conversationId}`).emit('chat:typing', {
        conversationId: payload.conversationId,
        userId: payload.userId,
        typing: payload.typing !== false,
        updatedAt: new Date().toISOString()
      });
    });

    socket.on('chat:message', payload => {
      if (!payload?.conversationId) return;
      io.to(`chat:${payload.conversationId}`).emit('chat:message', {
        conversationId: payload.conversationId,
        messageId: payload.messageId,
        senderId: payload.senderId,
        createdAt: new Date().toISOString()
      });
    });
  });
}
