import { Router } from 'express';
import { z } from 'zod';
import * as controller from '../controllers/chat.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateBody } from '../utils/validate';

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
  }).optional()
}).refine(value => !!value.content || !!value.attachmentUrl || !!value.location, {
  message: 'content, attachmentUrl, or location is required'
});

const typingSchema = z.object({ typing: z.boolean().optional() });
const editSchema = z.object({ content: z.string().min(1).max(5000) });
const reactionSchema = z.object({ emoji: z.string().min(1).max(16) });

const router = Router();
router.get('/health', controller.health);
router.use(requireAuth);
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
export default router;
