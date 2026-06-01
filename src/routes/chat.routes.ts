import { Router } from 'express';
import { z } from 'zod';
import * as controller from '../controllers/chat.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateBody } from '../utils/validate';
import { SUPPORTED_LOCALES } from '../i18n';

const conversationSchema = z.object({
  participantIds: z.array(z.string().min(1)).min(1),
  type: z.enum(['direct', 'group', 'support']).optional(),
  title: z.string().max(120).optional()
});

const messageSchema = z.object({
  content: z.string().max(5000).optional(),
  attachmentUrl: z.string().url().optional(),
  attachmentType: z.string().max(100).optional(),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
    label: z.string().max(200).optional()
  }).optional(),
  voiceNoteUrl: z.string().url().optional(),
  voiceNoteDurationSecs: z.number().nonnegative().optional(),
  transcription: z.string().max(10000).optional()
}).refine(value => !!value.content || !!value.attachmentUrl || !!value.location || !!value.voiceNoteUrl, {
  message: 'content, attachmentUrl, location, or voiceNoteUrl is required'
});

const typingSchema = z.object({ typing: z.boolean().optional() });
const editSchema = z.object({ content: z.string().min(1).max(5000) });
const reactionSchema = z.object({ emoji: z.string().min(1).max(16) });

const quickReplySchema = z.object({
  label: z.string().min(1).max(80),
  content: z.string().min(1).max(500)
});

const callSchema = z.object({
  calleeId: z.string().min(1),
  callType: z.enum(['voip', 'native']).optional(),
  rideId: z.string().optional()
});

const callStatusSchema = z.object({
  status: z.enum(['active', 'ended', 'declined', 'missed'])
});

const translateSchema = z.object({
  targetLocale: z.enum(SUPPORTED_LOCALES)
});

const router = Router();
router.get('/health', controller.health);
router.use(requireAuth);

// Conversations & messages
router.get('/conversations', controller.listConversations);
router.post('/conversations', validateBody(conversationSchema), controller.createConversation);
router.get('/conversations/:id/messages', controller.getMessages);
router.post('/conversations/:id/messages', validateBody(messageSchema), controller.sendMessage);
router.post('/conversations/:id/read', controller.readConversation);
router.post('/conversations/:id/typing', validateBody(typingSchema), controller.setTyping);
router.get('/search', controller.searchMessages);
router.patch('/messages/:id', validateBody(editSchema), controller.editMessage);
router.delete('/messages/:id', controller.deleteMessage);
router.post('/messages/:id/reactions', validateBody(reactionSchema), controller.reactToMessage);
router.post('/messages/:id/translate', validateBody(translateSchema), controller.translateMessage);

// Quick reply templates
router.get('/quick-replies', controller.listQuickReplies);
router.post('/quick-replies', validateBody(quickReplySchema), controller.createQuickReply);
router.delete('/quick-replies/:id', controller.deleteQuickReply);

// Call sessions
router.post('/calls', validateBody(callSchema), controller.initiateCall);
router.get('/calls/:id', controller.getCall);
router.post('/calls/:id/status', validateBody(callStatusSchema), controller.updateCallStatus);

export default router;
