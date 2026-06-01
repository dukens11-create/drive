import {
  makeId,
  markStoreDirty,
  store,
  timestamp,
  type CallSession,
  type CallSessionStatus,
  type ChatConversation,
  type ChatConversationType,
  type ChatMessage,
  type ChatParticipant,
  type QuickReplyTemplate
} from '../database/data.store';
import { isSupportedLocale, SUPPORTED_LOCALES } from '../i18n';

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

  const voiceNoteUrl = typeof body?.voiceNoteUrl === 'string' ? body.voiceNoteUrl.trim() || undefined : undefined;
  const voiceNoteDurationSecs = Number.isFinite(Number(body?.voiceNoteDurationSecs)) ? Number(body.voiceNoteDurationSecs) : undefined;
  const transcription = typeof body?.transcription === 'string' ? body.transcription.trim() || undefined : undefined;

  if (!content && !body?.attachmentUrl && !location && !voiceNoteUrl) {
    return { module: 'chat', action: 'send-message', error: 'content, attachmentUrl, location, or voiceNoteUrl is required' };
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
    voiceNoteUrl,
    voiceNoteDurationSecs,
    transcription,
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

// ─── Quick Reply Templates ─────────────────────────────────────────────────

export async function listQuickReplies(body: any) {
  const actorId = getActorId(body);
  if (!actorId) return { module: 'chat', action: 'list-quick-replies', error: 'userId required' };

  const templates = store.quickReplyTemplates.filter(template => template.ownerId === actorId);
  return { module: 'chat', action: 'list-quick-replies', ok: true, templates };
}

export async function createQuickReply(body: any) {
  const actorId = getActorId(body);
  if (!actorId) return { module: 'chat', action: 'create-quick-reply', error: 'userId required' };

  const label = typeof body?.label === 'string' ? body.label.trim() : '';
  const content = typeof body?.content === 'string' ? body.content.trim() : '';
  if (!label) return { module: 'chat', action: 'create-quick-reply', error: 'label is required' };
  if (!content) return { module: 'chat', action: 'create-quick-reply', error: 'content is required' };

  const now = timestamp();
  const template: QuickReplyTemplate = {
    id: makeId('qr'),
    ownerId: actorId,
    label,
    content,
    createdAt: now,
    updatedAt: now
  };
  store.quickReplyTemplates.push(template);
  markStoreDirty();
  return { module: 'chat', action: 'create-quick-reply', ok: true, template };
}

export async function deleteQuickReply(body: any, params?: any) {
  const actorId = getActorId(body);
  const templateId = params?.id || body?.templateId;
  if (!actorId || !templateId) return { module: 'chat', action: 'delete-quick-reply', error: 'templateId required' };

  const index = store.quickReplyTemplates.findIndex(
    template => template.id === templateId && template.ownerId === actorId
  );
  if (index === -1) {
    const exists = store.quickReplyTemplates.some(template => template.id === templateId);
    return { module: 'chat', action: 'delete-quick-reply', error: exists ? 'forbidden' : 'template not found' };
  }
  store.quickReplyTemplates.splice(index, 1);
  markStoreDirty();
  return { module: 'chat', action: 'delete-quick-reply', ok: true };
}

// ─── Call Sessions ─────────────────────────────────────────────────────────

export async function initiateCall(body: any) {
  const actorId = getActorId(body);
  if (!actorId) return { module: 'chat', action: 'initiate-call', error: 'userId required' };

  const calleeId = typeof body?.calleeId === 'string' ? body.calleeId.trim() : '';
  if (!calleeId) return { module: 'chat', action: 'initiate-call', error: 'calleeId is required' };
  if (!store.users.has(calleeId)) return { module: 'chat', action: 'initiate-call', error: 'callee not found' };

  const callType: 'voip' | 'native' = body?.callType === 'native' ? 'native' : 'voip';
  const now = timestamp();
  const call: CallSession = {
    id: makeId('call'),
    rideId: typeof body?.rideId === 'string' ? body.rideId : undefined,
    callerId: actorId,
    calleeId,
    status: 'ringing',
    callType,
    createdAt: now,
    updatedAt: now
  };
  store.callSessions.push(call);
  markStoreDirty();
  return { module: 'chat', action: 'initiate-call', ok: true, call };
}

export async function getCall(body: any, params?: any) {
  const actorId = getActorId(body);
  const callId = params?.id || body?.callId;
  if (!actorId || !callId) return { module: 'chat', action: 'get-call', error: 'callId required' };

  const call = store.callSessions.find(c => c.id === callId);
  if (!call) return { module: 'chat', action: 'get-call', error: 'call not found' };
  if (call.callerId !== actorId && call.calleeId !== actorId) {
    return { module: 'chat', action: 'get-call', error: 'forbidden' };
  }
  return { module: 'chat', action: 'get-call', ok: true, call };
}

export async function updateCallStatus(body: any, params?: any) {
  const actorId = getActorId(body);
  const callId = params?.id || body?.callId;
  if (!actorId || !callId) return { module: 'chat', action: 'update-call', error: 'callId required' };

  const call = store.callSessions.find(c => c.id === callId);
  if (!call) return { module: 'chat', action: 'update-call', error: 'call not found' };
  if (call.callerId !== actorId && call.calleeId !== actorId) {
    return { module: 'chat', action: 'update-call', error: 'forbidden' };
  }

  const allowed: CallSessionStatus[] = ['active', 'ended', 'declined', 'missed'];
  const status: CallSessionStatus = allowed.includes(body?.status) ? body.status : 'ended';

  const now = timestamp();
  if (status === 'active' && !call.startedAt) call.startedAt = now;
  if ((status === 'ended' || status === 'declined' || status === 'missed') && !call.endedAt) {
    call.endedAt = now;
    if (call.startedAt) {
      call.durationSecs = Math.round((new Date(now).getTime() - new Date(call.startedAt).getTime()) / 1000);
    }
  }
  call.status = status;
  call.updatedAt = now;
  markStoreDirty();
  return { module: 'chat', action: 'update-call', ok: true, call };
}

// ─── Message Translation ───────────────────────────────────────────────────

const TRANSLATION_TABLE: Record<string, Record<string, string>> = {
  'I am on my way': { es: 'Estoy en camino', fr: 'Je suis en route', de: 'Ich bin auf dem Weg', pt: 'Estou a caminho', ru: 'Я в пути', zh: '我在路上', ja: '向かっています', ar: 'أنا في الطريق', hi: 'मैं रास्ते में हूँ', ko: '가고 있습니다' },
  'I will arrive soon': { es: 'Llegaré pronto', fr: "J'arriverai bientôt", de: 'Ich komme bald an', pt: 'Vou chegar em breve', ru: 'Я скоро прибуду', zh: '我很快就到', ja: 'もうすぐ到着します', ar: 'سأصل قريباً', hi: 'मैं जल्द ही पहुंचूंगा', ko: '곧 도착합니다' },
  'Please wait for me': { es: 'Por favor espérame', fr: 'Veuillez m\'attendre', de: 'Bitte warten Sie auf mich', pt: 'Por favor, espere por mim', ru: 'Пожалуйста, подождите меня', zh: '请等我一下', ja: '待っていてください', ar: 'من فضلك انتظرني', hi: 'कृपया मेरा इंतजार करें', ko: '기다려 주세요' },
  'I have arrived': { es: 'He llegado', fr: 'Je suis arrivé', de: 'Ich bin angekommen', pt: 'Cheguei', ru: 'Я приехал', zh: '我到了', ja: '到着しました', ar: 'لقد وصلت', hi: 'मैं पहुंच गया', ko: '도착했습니다' },
};

/**
 * mockTranslate provides a simple lookup-based translation for a small set of
 * common phrases. This is a development/testing placeholder — replace with a
 * real translation API (e.g. Google Translate, DeepL) in production.
 */
function mockTranslate(text: string, targetLocale: string): string {
  const langCode = targetLocale.split('-')[0];
  for (const [source, translations] of Object.entries(TRANSLATION_TABLE)) {
    if (text.toLowerCase().includes(source.toLowerCase())) {
      const translated = translations[langCode] || translations[targetLocale];
      if (translated) return text.replace(new RegExp(source, 'i'), translated);
    }
  }
  return `[${targetLocale}] ${text}`;
}

export async function translateMessage(body: any, params?: any) {
  const actorId = getActorId(body);
  const messageId = params?.id || body?.messageId;
  const targetLocale = typeof body?.targetLocale === 'string' ? body.targetLocale.trim() : '';

  if (!actorId || !messageId) return { module: 'chat', action: 'translate-message', error: 'messageId required' };
  if (!targetLocale) return { module: 'chat', action: 'translate-message', error: 'targetLocale required' };
  if (!isSupportedLocale(targetLocale)) {
    return {
      module: 'chat', action: 'translate-message',
      error: `unsupported locale: ${targetLocale}. Supported: ${SUPPORTED_LOCALES.join(', ')}`
    };
  }

  const message = store.chatMessages.find(entry => entry.id === messageId);
  if (!message) return { module: 'chat', action: 'translate-message', error: 'message not found' };

  const lookup = getConversationForUser(message.conversationId, actorId);
  if ('error' in lookup) return { module: 'chat', action: 'translate-message', error: lookup.error };

  if (!message.translations) message.translations = {};
  if (!message.translations[targetLocale]) {
    message.translations[targetLocale] = mockTranslate(message.content, targetLocale);
    message.updatedAt = timestamp();
    markStoreDirty();
  }
  return {
    module: 'chat', action: 'translate-message', ok: true,
    messageId, targetLocale, translatedContent: message.translations[targetLocale]
  };
}
