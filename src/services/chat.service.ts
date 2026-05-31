import {
  makeId,
  markStoreDirty,
  store,
  timestamp,
  type ChatConversation,
  type ChatConversationType,
  type ChatMessage,
  type ChatParticipant
} from '../database/data.store';

const typingState = new Map<string, Map<string, string>>();

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function getActorId(body: any) {
  return body?.actor?.id || body?.userId;
}

function getConversationForUser(conversationId: string, userId: string) {
  const conversation = store.chatConversations.get(conversationId);
  if (!conversation) return { error: 'conversation not found' };
  if (!conversation.participantIds.includes(userId)) return { error: 'forbidden' };
  return { conversation };
}

function listConversationMessages(conversationId: string) {
  return store.chatMessages
    .filter(message => message.conversationId === conversationId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function getParticipant(conversationId: string, userId: string) {
  return store.chatParticipants.find(
    participant => participant.conversationId === conversationId && participant.userId === userId
  );
}

function serializeConversation(conversation: ChatConversation, userId: string) {
  const messages = listConversationMessages(conversation.id);
  const lastMessage = conversation.lastMessageId
    ? store.chatMessages.find(message => message.id === conversation.lastMessageId)
    : messages[messages.length - 1];
  const participant = getParticipant(conversation.id, userId);
  const unreadCount = messages.filter(
    message => message.senderId !== userId && !message.readBy.some(receipt => receipt.userId === userId)
  ).length;

  return {
    ...conversation,
    unreadCount,
    lastMessagePreview: lastMessage?.deletedAt ? '[deleted]' : lastMessage?.content || '',
    lastSeenAt: participant?.lastSeenAt
  };
}

export async function createConversation(body: any) {
  const actorId = getActorId(body);
  if (!actorId) return { module: 'chat', action: 'create-conversation', error: 'userId required' };

  const type: ChatConversationType = body?.type === 'group' || body?.type === 'support' ? body.type : 'direct';
  const participantIds = unique([actorId, ...(Array.isArray(body?.participantIds) ? body.participantIds : [])]);
  if (participantIds.length < 2) {
    return { module: 'chat', action: 'create-conversation', error: 'at least 2 participants required' };
  }

  const missing = participantIds.filter(id => !store.users.has(id));
  if (missing.length > 0) {
    return { module: 'chat', action: 'create-conversation', error: `unknown participants: ${missing.join(',')}` };
  }

  if (type === 'direct' && participantIds.length === 2) {
    const existing = Array.from(store.chatConversations.values()).find(conversation =>
      conversation.type === 'direct' &&
      conversation.participantIds.length === 2 &&
      participantIds.every(id => conversation.participantIds.includes(id))
    );
    if (existing) {
      return { module: 'chat', action: 'create-conversation', ok: true, conversation: serializeConversation(existing, actorId) };
    }
  }

  const now = timestamp();
  const conversation: ChatConversation = {
    id: makeId('conv'),
    type,
    title: typeof body?.title === 'string' ? body.title.trim() || undefined : undefined,
    createdBy: actorId,
    participantIds,
    createdAt: now,
    updatedAt: now
  };

  store.chatConversations.set(conversation.id, conversation);
  for (const userId of participantIds) {
    const participant: ChatParticipant = { conversationId: conversation.id, userId, joinedAt: now };
    store.chatParticipants.push(participant);
  }
  markStoreDirty();

  return { module: 'chat', action: 'create-conversation', ok: true, conversation: serializeConversation(conversation, actorId) };
}

export async function listConversations(body: any) {
  const actorId = getActorId(body);
  if (!actorId) return { module: 'chat', action: 'list-conversations', error: 'userId required' };

  const conversations = Array.from(store.chatConversations.values())
    .filter(conversation => conversation.participantIds.includes(actorId))
    .sort((a, b) => (b.lastMessageAt || b.updatedAt).localeCompare(a.lastMessageAt || a.updatedAt))
    .map(conversation => serializeConversation(conversation, actorId));

  return { module: 'chat', ok: true, conversations };
}

export async function sendMessage(body: any, params?: any) {
  const actorId = getActorId(body);
  const conversationId = params?.id || body?.conversationId;
  if (!actorId || !conversationId) return { module: 'chat', action: 'send-message', error: 'conversationId required' };

  const lookup = getConversationForUser(conversationId, actorId);
  if ('error' in lookup) return { module: 'chat', action: 'send-message', error: lookup.error };

  const content = typeof body?.content === 'string' ? body.content.trim() : '';
  const location = body?.location && Number.isFinite(Number(body.location.lat)) && Number.isFinite(Number(body.location.lng))
    ? { lat: Number(body.location.lat), lng: Number(body.location.lng), label: body.location.label }
    : undefined;

  if (!content && !body?.attachmentUrl && !location) {
    return { module: 'chat', action: 'send-message', error: 'content, attachmentUrl, or location is required' };
  }

  const now = timestamp();
  const message: ChatMessage = {
    id: makeId('msg'),
    conversationId,
    senderId: actorId,
    content,
    attachmentUrl: body?.attachmentUrl || undefined,
    attachmentType: body?.attachmentType || undefined,
    location,
    reactions: [],
    readBy: [{ userId: actorId, readAt: now }],
    createdAt: now,
    updatedAt: now
  };

  store.chatMessages.push(message);
  lookup.conversation.lastMessageId = message.id;
  lookup.conversation.lastMessageAt = now;
  lookup.conversation.updatedAt = now;
  markStoreDirty();

  return { module: 'chat', action: 'send-message', ok: true, message };
}

export async function getMessages(body: any, params?: any, query?: any) {
  const actorId = getActorId(body);
  const conversationId = params?.id || body?.conversationId;
  if (!actorId || !conversationId) return { module: 'chat', action: 'get-messages', error: 'conversationId required' };

  const lookup = getConversationForUser(conversationId, actorId);
  if ('error' in lookup) return { module: 'chat', action: 'get-messages', error: lookup.error };

  const limit = Math.min(Math.max(Number(query?.limit || body?.limit || 50), 1), 200);
  const messages = listConversationMessages(conversationId).slice(-limit);
  return {
    module: 'chat',
    ok: true,
    conversation: serializeConversation(lookup.conversation, actorId),
    messages
  };
}

export async function markConversationRead(body: any, params?: any) {
  const actorId = getActorId(body);
  const conversationId = params?.id || body?.conversationId;
  if (!actorId || !conversationId) return { module: 'chat', action: 'read', error: 'conversationId required' };

  const lookup = getConversationForUser(conversationId, actorId);
  if ('error' in lookup) return { module: 'chat', action: 'read', error: lookup.error };

  const participant = getParticipant(conversationId, actorId);
  const now = timestamp();
  let updatedCount = 0;
  for (const message of listConversationMessages(conversationId)) {
    if (message.senderId === actorId) continue;
    if (message.readBy.some(receipt => receipt.userId === actorId)) continue;
    message.readBy.push({ userId: actorId, readAt: now });
    message.updatedAt = now;
    updatedCount += 1;
  }
  if (participant) participant.lastSeenAt = now;
  markStoreDirty();

  return { module: 'chat', action: 'read', ok: true, updatedCount, lastSeenAt: now };
}

export async function searchMessages(body: any, query?: any) {
  const actorId = getActorId(body);
  const term = String(query?.q || body?.q || '').trim().toLowerCase();
  if (!actorId) return { module: 'chat', action: 'search', error: 'userId required' };
  if (!term) return { module: 'chat', action: 'search', error: 'q required' };

  const conversationIds = new Set(
    Array.from(store.chatConversations.values())
      .filter(conversation => conversation.participantIds.includes(actorId))
      .map(conversation => conversation.id)
  );

  const messages = store.chatMessages.filter(
    message =>
      conversationIds.has(message.conversationId) &&
      !message.deletedAt &&
      message.content.toLowerCase().includes(term)
  );
  return { module: 'chat', ok: true, total: messages.length, messages };
}

export async function setTyping(body: any, params?: any) {
  const actorId = getActorId(body);
  const conversationId = params?.id || body?.conversationId;
  if (!actorId || !conversationId) return { module: 'chat', action: 'typing', error: 'conversationId required' };

  const lookup = getConversationForUser(conversationId, actorId);
  if ('error' in lookup) return { module: 'chat', action: 'typing', error: lookup.error };

  const typing = body?.typing !== false;
  const state = typingState.get(conversationId) || new Map<string, string>();
  if (typing) state.set(actorId, timestamp());
  else state.delete(actorId);
  if (state.size > 0) typingState.set(conversationId, state);
  else typingState.delete(conversationId);

  return { module: 'chat', action: 'typing', ok: true, typingUserIds: Array.from(state.keys()) };
}

export async function editMessage(body: any, params?: any) {
  const actorId = getActorId(body);
  const messageId = params?.id || body?.messageId;
  const content = typeof body?.content === 'string' ? body.content.trim() : '';
  if (!actorId || !messageId) return { module: 'chat', action: 'edit-message', error: 'messageId required' };
  if (!content) return { module: 'chat', action: 'edit-message', error: 'content required' };

  const message = store.chatMessages.find(entry => entry.id === messageId);
  if (!message) return { module: 'chat', action: 'edit-message', error: 'message not found' };
  if (message.senderId !== actorId) return { module: 'chat', action: 'edit-message', error: 'forbidden' };
  if (message.deletedAt) return { module: 'chat', action: 'edit-message', error: 'message already deleted' };

  message.content = content;
  message.editedAt = timestamp();
  message.updatedAt = message.editedAt;
  markStoreDirty();
  return { module: 'chat', action: 'edit-message', ok: true, message };
}

export async function deleteMessage(body: any, params?: any) {
  const actorId = getActorId(body);
  const actorRole = body?.actor?.role;
  const messageId = params?.id || body?.messageId;
  if (!actorId || !messageId) return { module: 'chat', action: 'delete-message', error: 'messageId required' };

  const message = store.chatMessages.find(entry => entry.id === messageId);
  if (!message) return { module: 'chat', action: 'delete-message', error: 'message not found' };
  if (message.senderId !== actorId && actorRole !== 'admin') {
    return { module: 'chat', action: 'delete-message', error: 'forbidden' };
  }

  message.content = '';
  message.deletedAt = timestamp();
  message.updatedAt = message.deletedAt;
  markStoreDirty();
  return { module: 'chat', action: 'delete-message', ok: true, message };
}

export async function reactToMessage(body: any, params?: any) {
  const actorId = getActorId(body);
  const messageId = params?.id || body?.messageId;
  const emoji = String(body?.emoji || '').trim();
  if (!actorId || !messageId) return { module: 'chat', action: 'react-message', error: 'messageId required' };
  if (!emoji) return { module: 'chat', action: 'react-message', error: 'emoji required' };

  const message = store.chatMessages.find(entry => entry.id === messageId);
  if (!message) return { module: 'chat', action: 'react-message', error: 'message not found' };

  const lookup = getConversationForUser(message.conversationId, actorId);
  if ('error' in lookup) return { module: 'chat', action: 'react-message', error: lookup.error };

  message.reactions = message.reactions.filter(reaction => reaction.userId !== actorId);
  message.reactions.push({ userId: actorId, emoji, createdAt: timestamp() });
  message.updatedAt = timestamp();
  markStoreDirty();
  return { module: 'chat', action: 'react-message', ok: true, message };
}
