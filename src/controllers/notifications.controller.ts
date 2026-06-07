import * as service from '../services/notifications.service';

function sendResult(res: any, result: any) {
  if (result?.error) {
    const status = result.error.includes('not found') ? 404 : result.error === 'forbidden' ? 403 : 400;
    return res.status(status).json(result);
  }
  res.json(result.deviceToken || result.deviceTokens || result.preferences || result.logs || result);
}

export function health(_req: any, res: any) {
  res.json({ module: 'notifications', ok: true });
}

export async function getPreferences(req: any, res: any) {
  sendResult(res, await service.getNotificationPreferences({ ...req.body, actor: req.user }));
}

export async function updatePreferences(req: any, res: any) {
  sendResult(res, await service.upsertNotificationPreferences({ ...req.body, actor: req.user }));
}

export async function registerDeviceToken(req: any, res: any) {
  const result = await service.registerDeviceToken({ ...req.body, actor: req.user });
  if (result?.error) return sendResult(res, result);
  return res.json({
    ok: true,
    deviceTokenId: result.deviceToken.id,
    savedAt: result.deviceToken.updatedAt,
    token: result.deviceToken.token,
    platform: result.deviceToken.platform,
    topics: result.deviceToken.topics
  });
}

export async function listDeviceTokens(req: any, res: any) {
  const result = await service.listDeviceTokens({ ...req.body, actor: req.user });
  if (result?.error) return sendResult(res, result);
  return res.json({
    ok: true,
    deviceTokens: result.deviceTokens.map((token: any) => ({
      id: token.id,
      token: token.token,
      platform: token.platform,
      topics: token.topics,
      lastSeenAt: token.lastSeenAt,
      savedAt: token.updatedAt
    }))
  });
}

export async function unregisterDeviceToken(req: any, res: any) {
  const result = await service.unregisterDeviceToken({ ...req.body, actor: req.user }, req.params);
  if (result?.error) return sendResult(res, result);
  return res.json({
    ok: true,
    deviceTokenId: result.deviceToken.id
  });
}

export async function listLogs(req: any, res: any) {
  const result = await service.listNotificationLogs({
    ...req.query,
    ...req.body,
    userId: req.user?.role === 'admin' ? (req.query.userId || req.body?.userId) : req.user?.id
  });
  sendResult(res, result);
}

export async function hub(req: any, res: any) {
  sendResult(res, await service.listNotificationHub({ ...req.query, actor: req.user }));
}

export async function markRead(req: any, res: any) {
  sendResult(res, await service.markNotificationRead({ ...req.body, actor: req.user }, req.params));
}

export async function readAll(req: any, res: any) {
  sendResult(res, await service.markAllNotificationsRead({ ...req.body, ...req.query, actor: req.user }));
}

export async function unreadCount(req: any, res: any) {
  sendResult(res, await service.getUnreadNotificationCount({ ...req.query, actor: req.user }));
}

export async function deleteAll(req: any, res: any) {
  sendResult(res, await service.deleteAllNotifications({ ...req.body, actor: req.user }));
}

export async function sendPush(req: any, res: any) {
  sendResult(res, await service.sendPush({ ...req.body, actor: req.user }));
}

export async function sendEmail(req: any, res: any) {
  sendResult(res, await service.sendEmailNotification({ ...req.body, actor: req.user }));
}

export async function sendSms(req: any, res: any) {
  sendResult(res, await service.sendSmsNotification({ ...req.body, actor: req.user }));
}
