import * as service from '../services/chat.service';

function sendError(res: any, result: any) {
  if (result?.error) {
    const status = result.error.includes('not found') ? 404 : result.error === 'forbidden' ? 403 : 400;
    return res.status(status).json(result);
  }
}

export function health(_req: any, res: any) {
  res.json({ module: 'chat', ok: true, realtime: true });
}

export async function createConversation(req: any, res: any) {
  const result = await service.createConversation({ ...req.body, actor: req.user });
  if (result?.error) return sendError(res, result);
  res.status(201).json(result.conversation);
}

export async function listConversations(req: any, res: any) {
  const result = await service.listConversations({ ...req.body, actor: req.user });
  if (result?.error) return sendError(res, result);
  res.json(result.conversations);
}

export async function getMessages(req: any, res: any) {
  const result = await service.getMessages({ ...req.body, actor: req.user }, req.params, req.query);
  if (result?.error) return sendError(res, result);
  res.json(result);
}

export async function sendMessage(req: any, res: any) {
  const result = await service.sendMessage({ ...req.body, actor: req.user }, req.params);
  if (result?.error) return sendError(res, result);
  res.status(201).json(result.message);
}

export async function readConversation(req: any, res: any) {
  const result = await service.markConversationRead({ ...req.body, actor: req.user }, req.params);
  if (result?.error) return sendError(res, result);
  res.json(result);
}

export async function searchMessages(req: any, res: any) {
  const result = await service.searchMessages({ ...req.body, actor: req.user }, req.query);
  if (result?.error) return sendError(res, result);
  res.json(result);
}

export async function setTyping(req: any, res: any) {
  const result = await service.setTyping({ ...req.body, actor: req.user }, req.params);
  if (result?.error) return sendError(res, result);
  res.json(result);
}

export async function editMessage(req: any, res: any) {
  const result = await service.editMessage({ ...req.body, actor: req.user }, req.params);
  if (result?.error) return sendError(res, result);
  res.json(result.message);
}

export async function deleteMessage(req: any, res: any) {
  const result = await service.deleteMessage({ ...req.body, actor: req.user }, req.params);
  if (result?.error) return sendError(res, result);
  res.json(result.message);
}

export async function reactToMessage(req: any, res: any) {
  const result = await service.reactToMessage({ ...req.body, actor: req.user }, req.params);
  if (result?.error) return sendError(res, result);
  res.json(result.message);
}
